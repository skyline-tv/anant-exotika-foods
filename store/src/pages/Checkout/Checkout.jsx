import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Lock, Truck } from 'lucide-react';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import {
  createAddress,
  deleteAddress,
  getAddresses,
  setDefaultAddress,
  updateAddress,
} from '../../services/addressService';
import { validateCoupon } from '../../services/couponService';
import { createOrder } from '../../services/orderService';
import { toTitleCase } from '../../utils/titleCase';
import HamperSelections from '../../components/product/HamperSelections';
import { failPayment, getPaymentConfig, loadRazorpayScript, verifyPayment } from '../../services/paymentService';
import { checkPincode, quoteShipping } from '../../services/shippingService';
import { useStoreContent } from '../../context/ContentContext';
import { ADDRESS_TYPES, PAYMENT_METHODS } from '../../utils/constants';
import {
  addressFieldError,
  collectAddressErrors,
  formatMobile,
  normalizePhone,
  normalizePostalCode,
  validateAddressForm,
  validatePhone,
} from '../../utils/addressValidation';
import { formatCurrency } from '../../utils/formatCurrency';
import { couponDiscountAmount, couponDiscountLabel } from '../../utils/couponDiscount';
import { formatWeight, getPrimaryImage } from '../../utils/productHelpers';
import { getErrorMessage, getFieldErrors } from '../../utils/getErrorMessage';

const EMPTY_FORM = {
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  landmark: '',
  addressType: 'home',
  isDefault: false,
};

const ADDRESS_FIELDS = {
  fullName: 'Full name',
  phone: 'Mobile number',
  addressLine1: 'Flat / house / building',
  addressLine2: 'Area / street',
  landmark: 'Landmark',
  city: 'City',
  state: 'State',
  postalCode: 'Pincode',
};

const addressTypeLabel = (value) =>
  ADDRESS_TYPES.find((type) => type.value === value)?.label || 'Home';

const CheckoutField = ({ id, label, optional, error, hint, wide, children }) => (
  <div className={`field${error ? ' has-error' : ''}${wide ? ' field--wide' : ''}`}>
    <label htmlFor={id}>
      {label}
      {optional ? <span className="field-optional">Optional</span> : <span className="field-required">*</span>}
    </label>
    {children}
    {error ? <p className="field-error">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
  </div>
);

const Checkout = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { cart, loading: cartLoading, refresh } = useCart();
  const { content } = useStoreContent();
  const storeClosed = content?.storeStatus === 'closed';
  const [addresses, setAddresses] = useState([]);
  const [shippingAddressId, setShippingAddressId] = useState('');
  const [paymentMethods, setPaymentMethods] = useState(PAYMENT_METHODS);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef('');
  const checkoutSignatureRef = useRef('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [pinStatus, setPinStatus] = useState('');
  const [contactDraft, setContactDraft] = useState(null);
  const accountPhone = normalizePhone(user?.phone || '');
  const contactKnown = validatePhone(accountPhone).valid;
  const contactPhone = contactKnown ? accountPhone : contactDraft ?? accountPhone;
  const [contactError, setContactError] = useState('');
  const [couponMessage, setCouponMessage] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [shippingQuote, setShippingQuote] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(0);

  const applyAddressList = (items) => {
    setAddresses(items);
    const preferred =
      items.find((item) => item._id === shippingAddressId) ||
      items.find((item) => item.isDefault) ||
      items[0];
    setShippingAddressId(preferred?._id || '');
    if (!items.length) {
      setFormOpen(true);
    }
  };

  const loadAddresses = async () => {
    const items = await getAddresses();
    applyAddressList(items);
    return items;
  };

  useEffect(() => {
    let active = true;
    Promise.all([getAddresses(), getPaymentConfig().catch(() => ({ methods: PAYMENT_METHODS }))])
      .then(([items, config]) => {
        if (!active) return;
        applyAddressList(items);
        const methods = config.methods?.length ? config.methods : PAYMENT_METHODS;
        setPaymentMethods(methods);
        setFreeShippingThreshold(Number(config.shipping?.freeShippingThreshold) || 0);
        const preferred =
          methods.find((method) => method.value === 'razorpay') ||
          methods.find((method) => method.value === paymentMethod) ||
          methods[0];
        if (preferred) setPaymentMethod(preferred.value);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Unable to load addresses.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!shippingAddressId) {
      setShippingQuote(null);
      setShippingError('');
      return undefined;
    }

    setShippingLoading(true);
    setShippingError('');
    quoteShipping({
      shippingAddressId,
      paymentMethod,
      couponCode: coupon?.coupon?.code || undefined,
    })
      .then((quote) => {
        if (!active) return;
        setShippingQuote(quote);
        if (paymentMethod === 'cod' && quote.codAvailable === false) {
          const online = paymentMethods.find((method) => method.value === 'razorpay');
          if (online) {
            setPaymentMethod('razorpay');
            toast.error('Cash on Delivery is not available for this pincode.');
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setShippingQuote(null);
        setShippingError(getErrorMessage(err, 'Unable to calculate shipping for this address.'));
      })
      .finally(() => {
        if (active) setShippingLoading(false);
      });

    return () => {
      active = false;
    };
  }, [shippingAddressId, paymentMethod, coupon?.coupon?.code, cart.subtotal]);

  useEffect(() => {
    const signature = `${shippingAddressId}|${paymentMethod}|${coupon?.coupon?.code || ''}|${cart.subtotal}`;
    if (checkoutSignatureRef.current && checkoutSignatureRef.current !== signature) {
      idempotencyKeyRef.current = '';
    }
    checkoutSignatureRef.current = signature;
  }, [shippingAddressId, paymentMethod, coupon?.coupon?.code, cart.subtotal]);

  useEffect(() => {
    if (!formOpen) return undefined;
    const pin = normalizePostalCode(form.postalCode);
    if (!/^[1-9]\d{5}$/.test(pin)) return undefined;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setPinStatus('checking');
      checkPincode(pin, { subtotal: cart.subtotal })
        .then((quote) => {
          if (cancelled) return;
          const detectedCity = String(quote.city || '').trim();
          const detectedState = String(quote.state || '').trim();
          setPinStatus(detectedCity || detectedState ? 'ok' : 'checked');
          setForm((current) => {
            if (normalizePostalCode(current.postalCode) !== pin) return current;
            return {
              ...current,
              city: detectedCity || current.city,
              state: detectedState || current.state,
            };
          });
          setFieldErrors((current) => {
            const next = { ...current };
            if (detectedCity) delete next.city;
            if (detectedState) delete next.state;
            delete next.postalCode;
            return next;
          });
        })
        .catch((err) => {
          if (cancelled) return;
          setPinStatus('error');
          setFieldErrors((current) => ({
            ...current,
            postalCode: getErrorMessage(err, 'Please enter a valid 6-digit pincode.'),
          }));
        });
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.postalCode, formOpen, cart.subtotal]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === 'postalCode') {
      setPinStatus(/^[1-9]\d{5}$/.test(normalizePostalCode(value)) ? 'checking' : '');
    }
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const blurField = (field) => {
    const message = addressFieldError(field, form[field], { requireStreet: true });
    setFieldErrors((current) => ({ ...current, [field]: message }));
  };

  const openNewAddress = () => {
    setEditingId('');
    setFieldErrors({});
    setPinStatus('');
    setForm({
      ...EMPTY_FORM,
      fullName: user?.name || '',
      phone: user?.phone || contactPhone || '',
      isDefault: addresses.length === 0,
    });
    setFormOpen(true);
  };

  const openEditAddress = (address) => {
    setEditingId(address._id);
    setForm({
      fullName: address.fullName || '',
      phone: address.phone || '',
      addressLine1: address.addressLine1 || '',
      addressLine2: address.addressLine2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: address.country || 'India',
      landmark: address.landmark || '',
      addressType: address.addressType || 'home',
      isDefault: Boolean(address.isDefault),
    });
    setFieldErrors({});
    setPinStatus('');
    setFormOpen(true);
  };

  const handleSaveAddress = async (event) => {
    event.preventDefault();
    const errors = collectAddressErrors(form, { requireStreet: true });
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    const validated = validateAddressForm(form);
    if (!validated.valid) {
      setFieldErrors({ form: validated.message });
      return;
    }

    setSavingAddress(true);
    try {
      let saved;
      if (editingId) {
        saved = await updateAddress(editingId, validated.value);
        toast.success('Address updated.');
      } else {
        saved = await createAddress(validated.value);
        toast.success('Address saved.');
      }
      const items = await loadAddresses();
      setShippingAddressId(saved?._id || shippingAddressId);
      if (!items.find((item) => item._id === saved?._id) && saved?._id) {
        setShippingAddressId(saved._id);
      }
      setForm(EMPTY_FORM);
      setFieldErrors({});
      setPinStatus('');
      setEditingId('');
      setFormOpen(false);
    } catch (err) {
      const serverFields = getFieldErrors(err);
      if (Object.keys(serverFields).length) setFieldErrors(serverFields);
      toast.error(getErrorMessage(err, 'Unable to save address.'));
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await deleteAddress(id);
      toast.success('Address deleted.');
      const items = await loadAddresses();
      if (shippingAddressId === id) {
        setShippingAddressId(items[0]?._id || '');
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to delete address.'));
    }
  };

  const handleDefaultAddress = async (id) => {
    try {
      await setDefaultAddress(id);
      await loadAddresses();
      setShippingAddressId(id);
      toast.success('Default address updated.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to update default address.'));
    }
  };

  const handleValidateCoupon = async (event) => {
    event.preventDefault();
    if (!couponCode.trim() || couponBusy) return;
    setCouponBusy(true);
    setCouponMessage('');
    try {
      const result = await validateCoupon(couponCode.trim());
      setCoupon(result);
      setCouponMessage('');
    } catch (err) {
      setCoupon(null);
      setCouponMessage(getErrorMessage(err, 'This coupon cannot be applied.'));
    } finally {
      setCouponBusy(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon(null);
    setCouponCode('');
    setCouponMessage('');
  };

  const completeOrder = async (order) => {
    idempotencyKeyRef.current = '';
    await refresh();
    toast.success('Order placed successfully.');
    navigate(`/account/orders/${order._id}`);
  };

  const openRazorpay = async (order, payment) => {
    const Razorpay = await loadRazorpayScript();
    return new Promise((resolve, reject) => {
      const checkout = new Razorpay({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency || 'INR',
        name: 'Anant Exotika',
        description: order.orderNumber,
        order_id: payment.razorpayOrderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        handler: async (response) => {
          try {
            const confirmed = await verifyPayment({
              orderId: order._id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            resolve(confirmed);
          } catch (err) {
            reject(err);
          }
        },
        modal: {
          ondismiss: async () => {
            try {
              await failPayment(order._id);
            } catch {
              // Cart is still intact; the unpaid order is marked failed on the server when possible.
            }
            reject(new Error('Payment was cancelled. Your order has not been confirmed.'));
          },
        },
      });
      checkout.on('payment.failed', async () => {
        try {
          await failPayment(order._id);
        } catch {
          // Ignore follow-up errors; the UI already shows a failed-payment message.
        }
        reject(new Error('Payment verification failed. Your order has not been confirmed.'));
      });
      checkout.open();
    });
  };

  const handlePlaceOrder = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setError('');
    const phoneCheck = validatePhone(contactPhone);
    if (!phoneCheck.valid) {
      setContactError('Please enter a valid 10-digit mobile number.');
      document.getElementById('checkout-contact')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setContactError('');
    if (!shippingAddressId) {
      setError('Please add a delivery address before placing an order.');
      setFormOpen(true);
      return;
    }
    if (shippingError || !shippingQuote?.serviceable) {
      setError(shippingError || 'Delivery is not available for the selected address.');
      return;
    }
    if (storeClosed) {
      setError('The store is temporarily closed. Orders cannot be placed right now.');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID();
    }
    try {
      const result = await createOrder({
        shippingAddressId,
        billingAddressId: shippingAddressId,
        paymentMethod,
        couponCode: coupon?.coupon?.code || undefined,
        notes,
        idempotencyKey: idempotencyKeyRef.current,
      });
      const order = result.order;
      if (result.payment?.method === 'razorpay') {
        const confirmed = await openRazorpay(order, result.payment);
        await completeOrder(confirmed);
        return;
      }
      await completeOrder(order);
    } catch (err) {
      const failedPayment = paymentMethod === 'razorpay' && !err.response;
      setError(
        failedPayment
          ? 'Payment could not be completed. Your order has not been placed. Please try again or choose Cash on Delivery.'
          : getErrorMessage(err, 'Unable to place order.')
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (cartLoading || loading) return <Loader label="Preparing checkout" />;

  if (!cart.items.length) {
    return (
      <section className="page-shell">
        <div className="container">
          <EmptyState title="Your bag is empty" message="Add a gift or a jar of dry fruits before checking out." actionLabel="Shop" actionTo="/shop" />
        </div>
      </section>
    );
  }

  const itemCount = cart.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const discountAmount =
    Number(shippingQuote?.discount) > 0
      ? Number(shippingQuote.discount)
      : coupon
        ? couponDiscountAmount(coupon)
        : 0;
  const payable = shippingQuote?.estimatedTotal !== undefined ? shippingQuote.estimatedTotal : cart.subtotal;
  const codOffered = paymentMethods.some((method) => method.value === 'cod');
  const placeDisabled =
    submitting ||
    !shippingAddressId ||
    storeClosed ||
    shippingLoading ||
    Boolean(shippingError) ||
    !shippingQuote?.serviceable;
  const placeLabel = submitting
    ? paymentMethod === 'razorpay'
      ? 'Opening secure payment...'
      : 'Processing...'
    : paymentMethod === 'razorpay'
      ? `Pay ${formatCurrency(payable)}`
      : 'Place order';
  const shippingLabel = shippingLoading
    ? 'Checking...'
    : shippingQuote
      ? shippingQuote.shipping > 0
        ? formatCurrency(shippingQuote.shipping)
        : 'FREE'
      : '—';

  return (
    <section className="page-shell checkout-page">
      <div className="container">
        <PageHeader
          eyebrow="Checkout"
          title="Checkout"
          subtitle="Contact, delivery and payment on one page."
        />
        <form
          className="checkout-layout"
          onSubmit={handlePlaceOrder}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.target.tagName === 'TEXTAREA') return;
            if (event.target.closest('.checkout-address-form, .coupon-row')) return;
            event.preventDefault();
          }}
        >
          <div className="checkout-form">
            {error ? <div className="alert alert-error">{error}</div> : null}
            {storeClosed ? (
              <div className="alert">The store is temporarily closed. Orders cannot be placed right now.</div>
            ) : null}

            <section className="checkout-block" id="checkout-contact">
              <h2>Contact</h2>
              <CheckoutField
                id="checkout-contact-phone"
                label="Mobile number"
                error={contactError}
                hint={
                  contactKnown
                    ? 'Saved to your account. You can still use a different number for delivery.'
                    : validatePhone(contactPhone).valid
                      ? 'Valid mobile number'
                      : 'We’ll use this for delivery updates.'
                }
              >
                <div className="phone-field">
                  <span>+91</span>
                  <input
                    id="checkout-contact-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    readOnly={contactKnown}
                    value={formatMobile(contactPhone)}
                    aria-invalid={contactError ? 'true' : 'false'}
                    onChange={(event) => {
                      setContactDraft(normalizePhone(event.target.value).slice(0, 10));
                      setContactError('');
                    }}
                    onBlur={() => {
                      if (contactKnown) return;
                      setContactError(
                        validatePhone(contactPhone).valid ? '' : 'Please enter a valid 10-digit mobile number.'
                      );
                    }}
                  />
                </div>
              </CheckoutField>
              <CheckoutField id="checkout-contact-email" label="Email" optional>
                <input
                  id="checkout-contact-email"
                  type="email"
                  autoComplete="email"
                  readOnly
                  value={user?.email || ''}
                  placeholder="Optional"
                />
              </CheckoutField>
            </section>

            <section className="checkout-block">
              <div className="checkout-block__head">
                <h2>Delivery address</h2>
                {!formOpen ? (
                  <Button type="button" variant="secondary" size="sm" onClick={openNewAddress}>
                    + Add new address
                  </Button>
                ) : null}
              </div>

              {addresses.length === 0 && !formOpen ? (
                <p>Add a delivery address to continue.</p>
              ) : null}

              {addresses.length > 0 ? (
                <div className="checkout-address-list">
                  {addresses.map((address) => (
                    <div
                      key={address._id}
                      className={`choice-card checkout-address-card ${shippingAddressId === address._id ? 'is-active' : ''}`}
                    >
                      <label className="checkout-address-card__select">
                        <input
                          type="radio"
                          name="shippingAddress"
                          checked={shippingAddressId === address._id}
                          onChange={() => setShippingAddressId(address._id)}
                        />
                        <span className="address-mark" aria-hidden="true">
                          {shippingAddressId === address._id ? <Check size={14} strokeWidth={2.4} /> : null}
                        </span>
                        <span>
                          <span className="address-type">{addressTypeLabel(address.addressType)}</span>
                          {address.fullName}
                          {address.isDefault ? ' · Default' : ''}
                          <em>
                            {address.addressLine1}
                            {address.addressLine2 ? `, ${address.addressLine2}` : ''}
                            {address.landmark ? `, ${address.landmark}` : ''}
                            <br />
                            {address.city}, {address.state} - {address.postalCode}
                            <br />
                            +91 {formatMobile(address.phone)}
                          </em>
                        </span>
                      </label>
                      <div className="checkout-address-card__actions">
                        <Button type="button" variant="ghost" size="sm" onClick={() => openEditAddress(address)}>
                          Edit
                        </Button>
                        {!address.isDefault ? (
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleDefaultAddress(address._id)}>
                            Set default
                          </Button>
                        ) : null}
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteAddress(address._id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {formOpen ? (
                <div
                  className="checkout-address-form"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
                      event.preventDefault();
                      handleSaveAddress(event);
                    }
                  }}
                >
                  <h3>{editingId ? 'Edit address' : 'Add new address'}</h3>
                  {fieldErrors.form ? <p className="field-error">{fieldErrors.form}</p> : null}
                  <div className="form-grid two">
                    <CheckoutField id="checkout-fullName" label={ADDRESS_FIELDS.fullName} error={fieldErrors.fullName}>
                      <input
                        id="checkout-fullName"
                        autoComplete="name"
                        value={form.fullName}
                        aria-invalid={fieldErrors.fullName ? 'true' : 'false'}
                        onChange={(event) => updateField('fullName', event.target.value)}
                        onBlur={() => blurField('fullName')}
                      />
                    </CheckoutField>
                    <CheckoutField id="checkout-phone" label={ADDRESS_FIELDS.phone} error={fieldErrors.phone}>
                      <div className="phone-field">
                        <span>+91</span>
                        <input
                          id="checkout-phone"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          value={formatMobile(form.phone)}
                          aria-invalid={fieldErrors.phone ? 'true' : 'false'}
                          onChange={(event) => updateField('phone', normalizePhone(event.target.value).slice(0, 10))}
                          onBlur={() => blurField('phone')}
                        />
                      </div>
                    </CheckoutField>
                    <CheckoutField
                      id="checkout-addressLine1"
                      label={ADDRESS_FIELDS.addressLine1}
                      error={fieldErrors.addressLine1}
                      wide
                    >
                      <input
                        id="checkout-addressLine1"
                        autoComplete="address-line1"
                        value={form.addressLine1}
                        aria-invalid={fieldErrors.addressLine1 ? 'true' : 'false'}
                        onChange={(event) => updateField('addressLine1', event.target.value)}
                        onBlur={() => blurField('addressLine1')}
                      />
                    </CheckoutField>
                    <CheckoutField
                      id="checkout-addressLine2"
                      label={ADDRESS_FIELDS.addressLine2}
                      error={fieldErrors.addressLine2}
                      wide
                    >
                      <input
                        id="checkout-addressLine2"
                        autoComplete="address-line2"
                        value={form.addressLine2}
                        aria-invalid={fieldErrors.addressLine2 ? 'true' : 'false'}
                        onChange={(event) => updateField('addressLine2', event.target.value)}
                        onBlur={() => blurField('addressLine2')}
                      />
                    </CheckoutField>
                    <CheckoutField id="checkout-landmark" label={ADDRESS_FIELDS.landmark} optional wide>
                      <input
                        id="checkout-landmark"
                        value={form.landmark}
                        onChange={(event) => updateField('landmark', event.target.value)}
                      />
                    </CheckoutField>
                    <CheckoutField
                      id="checkout-postalCode"
                      label={ADDRESS_FIELDS.postalCode}
                      error={fieldErrors.postalCode}
                      hint={
                        fieldErrors.postalCode
                          ? ''
                          : pinStatus === 'checking'
                            ? 'Checking...'
                            : pinStatus === 'ok'
                              ? 'City and state filled from this pincode. You can correct them.'
                              : pinStatus === 'checked'
                                ? 'Pincode checked.'
                                : ''
                      }
                    >
                      <input
                        id="checkout-postalCode"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={6}
                        value={form.postalCode}
                        aria-invalid={fieldErrors.postalCode ? 'true' : 'false'}
                        onChange={(event) =>
                          updateField('postalCode', event.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        onBlur={() => blurField('postalCode')}
                      />
                    </CheckoutField>
                    <CheckoutField
                      id="checkout-city"
                      label={ADDRESS_FIELDS.city}
                      error={fieldErrors.city}
                      hint={pinStatus === 'ok' && form.city ? 'Automatically detected' : ''}
                    >
                      <input
                        id="checkout-city"
                        autoComplete="address-level2"
                        value={form.city}
                        aria-invalid={fieldErrors.city ? 'true' : 'false'}
                        onChange={(event) => updateField('city', event.target.value)}
                        onBlur={() => blurField('city')}
                      />
                    </CheckoutField>
                    <CheckoutField
                      id="checkout-state"
                      label={ADDRESS_FIELDS.state}
                      error={fieldErrors.state}
                      hint={pinStatus === 'ok' && form.state ? 'Automatically detected' : ''}
                    >
                      <input
                        id="checkout-state"
                        autoComplete="address-level1"
                        value={form.state}
                        aria-invalid={fieldErrors.state ? 'true' : 'false'}
                        onChange={(event) => updateField('state', event.target.value)}
                        onBlur={() => blurField('state')}
                      />
                    </CheckoutField>
                    <div className="field">
                      <label htmlFor="checkout-addressType">
                        Address type
                        <span className="field-optional">Optional</span>
                      </label>
                      <select
                        id="checkout-addressType"
                        value={form.addressType}
                        onChange={(event) => updateField('addressType', event.target.value)}
                      >
                        {ADDRESS_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.isDefault}
                      onChange={(event) => updateField('isDefault', event.target.checked)}
                    />
                    Set as default address
                  </label>
                  <div className="checkout-address-form__actions">
                    <Button type="button" onClick={handleSaveAddress} disabled={savingAddress}>
                      {savingAddress ? 'Saving...' : editingId ? 'Update address' : 'Save address'}
                    </Button>
                    {addresses.length > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setFormOpen(false);
                          setEditingId('');
                          setFieldErrors({});
                          setPinStatus('');
                          setForm(EMPTY_FORM);
                        }}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="checkout-block">
              <h2>Delivery</h2>
              {shippingLoading ? (
                <p>Checking...</p>
              ) : shippingError ? (
                <div className="alert alert-error">{shippingError}</div>
              ) : shippingQuote ? (
                <div className={`choice-card is-active delivery-card`}>
                  <Truck size={18} strokeWidth={1.6} />
                  <span>
                    Standard delivery
                    <em>Estimated delivery: 3–7 business days</em>
                  </span>
                  <strong>{shippingLabel}</strong>
                </div>
              ) : (
                <p>Add a delivery address to see the shipping charge.</p>
              )}
              {shippingQuote && freeShippingThreshold > 0 && !shippingQuote.freeShipping ? (
                <p className="checkout-shipping-hint">
                  Free shipping on orders of {formatCurrency(freeShippingThreshold)} and above.
                </p>
              ) : null}
              {shippingQuote && !shippingQuote.codAvailable ? (
                <p className="checkout-shipping-hint">Cash on Delivery is not available for this pincode.</p>
              ) : null}
              {paymentMethod === 'cod' && shippingQuote?.codFee > 0 ? (
                <p className="checkout-shipping-hint">
                  Cash on Delivery fee: {formatCurrency(shippingQuote.codFee)}
                </p>
              ) : null}
            </section>

            <section className="checkout-block">
              <h2>Payment</h2>
              {paymentMethods
                .filter((method) => method.value !== 'cod' || shippingQuote?.codAvailable !== false)
                .map((method) => (
                <label key={method.value} className={`choice-card payment-card ${paymentMethod === method.value ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === method.value}
                    onChange={() => setPaymentMethod(method.value)}
                  />
                  <span className="address-mark" aria-hidden="true">
                    {paymentMethod === method.value ? <Check size={14} strokeWidth={2.4} /> : null}
                  </span>
                  <span>
                    {method.value === 'cod' ? 'Cash on Delivery' : 'Online payment'}
                    {method.value === 'razorpay' ? <em>UPI, cards, netbanking and wallets</em> : null}
                    {method.value === 'cod' ? (
                      <em>
                        Pay when your order arrives
                        {shippingQuote?.codFee > 0 ? ` · Fee ${formatCurrency(shippingQuote.codFee)}` : ''}
                      </em>
                    ) : null}
                  </span>
                </label>
              ))}
            </section>

            <section className="checkout-block checkout-block--quiet">
              <CheckoutField id="notes" label="Order notes" optional>
                <textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
              </CheckoutField>
            </section>
          </div>

          <aside className="cart-summary">
            <h2>Order summary</h2>
            <div className="checkout-coupon">
              <p>Have a coupon?</p>
              <div className="coupon-row">
                <input
                  value={couponCode}
                  onChange={(event) => {
                    setCouponCode(event.target.value);
                    setCouponMessage('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleValidateCoupon(event);
                    }
                  }}
                  placeholder="Enter coupon"
                  aria-label="Coupon or gift voucher code"
                  disabled={couponBusy}
                />
                <Button type="button" variant="secondary" onClick={handleValidateCoupon} disabled={couponBusy}>
                  {couponBusy ? 'Applying...' : 'Apply'}
                </Button>
              </div>
              {couponMessage ? <p className="field-error">{couponMessage}</p> : null}
              {coupon ? (
                <button type="button" className="text-link checkout-coupon__remove" onClick={handleRemoveCoupon}>
                  Remove {coupon.coupon.code}
                </button>
              ) : null}
            </div>
            {coupon && discountAmount > 0 ? (
              <p className="field-ok">
                {coupon.coupon.code} · {couponDiscountLabel(coupon)} · -{formatCurrency(discountAmount)}
              </p>
            ) : coupon ? (
              <p className="field-ok">{coupon.coupon.code} applied</p>
            ) : null}

            <details className="order-lines">
              <summary>
                <span>
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
                <strong>{formatCurrency(payable)}</strong>
              </summary>
              <div className="order-lines__body">
                {cart.items.map((item) => {
                  const image = getPrimaryImage(item.product);
                  const weight = formatWeight(item.product?.weight);
                  return (
                    <div key={`${item.product?._id}-${item.selectionKey || ''}`} className="summary-item">
                      {image ? <img src={image} alt="" /> : <span className="summary-item__fallback" aria-hidden="true" />}
                      <div>
                        <strong>{toTitleCase(item.product?.name)}</strong>
                        <span>
                          {weight ? `${weight} · ` : ''}Qty {item.quantity}
                        </span>
                        {item.selections?.length ? (
                          <details className="summary-hamper">
                            <summary>Selected</summary>
                            <HamperSelections selections={item.selections} />
                          </details>
                        ) : null}
                      </div>
                      <span>{formatCurrency(item.lineTotal)}</span>
                    </div>
                  );
                })}
              </div>
            </details>

            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatCurrency(cart.subtotal)}</span>
            </div>
            {discountAmount > 0 ? (
              <div className="summary-row">
                <span>
                  {coupon?.coupon?.code
                    ? `${coupon.coupon.kind === 'gift_voucher' ? 'Gift voucher' : 'Coupon'} (${coupon.coupon.code})`
                    : 'Coupon discount'}
                </span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            ) : null}
            <div className="summary-row">
              <span>Shipping</span>
              <span>{shippingLabel}</span>
            </div>
            {shippingQuote?.packaging > 0 ? (
              <div className="summary-row">
                <span>Packaging</span>
                <span>{formatCurrency(shippingQuote.packaging)}</span>
              </div>
            ) : null}
            {shippingQuote?.handling > 0 ? (
              <div className="summary-row">
                <span>Handling</span>
                <span>{formatCurrency(shippingQuote.handling)}</span>
              </div>
            ) : null}
            {paymentMethod === 'cod' && shippingQuote?.codFee > 0 ? (
              <div className="summary-row">
                <span>COD fee</span>
                <span>{formatCurrency(shippingQuote.codFee)}</span>
              </div>
            ) : null}
            {shippingQuote?.tax > 0 ? (
              <div className="summary-row">
                <span>Tax</span>
                <span>{formatCurrency(shippingQuote.tax)}</span>
              </div>
            ) : null}
            <div className="summary-row total">
              <span>Total</span>
              <strong>{formatCurrency(payable)}</strong>
            </div>
            <Button type="submit" disabled={placeDisabled} className="btn--full checkout-place">
              {placeLabel}
            </Button>
            <ul className="checkout-trust">
              <li>
                <Lock size={13} strokeWidth={1.6} /> Secure checkout
              </li>
              {codOffered ? (
                <li>
                  <Check size={13} strokeWidth={1.8} /> COD available
                </li>
              ) : null}
              <li>
                <Truck size={13} strokeWidth={1.6} /> Reliable delivery
              </li>
              <li>Easy support</li>
            </ul>
          </aside>
          <div className="checkout-dock">
            <ul className="checkout-trust checkout-trust--dock">
              <li>Secure checkout</li>
              {codOffered ? <li>COD available</li> : null}
              <li>Reliable delivery</li>
            </ul>
            <div>
              <span>Total</span>
              <strong>{formatCurrency(payable)}</strong>
            </div>
            <Button type="submit" disabled={placeDisabled}>
              {placeLabel}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default Checkout;
