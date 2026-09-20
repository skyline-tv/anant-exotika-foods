import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
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
import { failPayment, getPaymentConfig, loadRazorpayScript, verifyPayment } from '../../services/paymentService';
import { quoteShipping } from '../../services/shippingService';
import { useStoreContent } from '../../context/ContentContext';
import { ADDRESS_TYPES, PAYMENT_METHODS } from '../../utils/constants';
import { validateAddressForm } from '../../utils/addressValidation';
import { formatCurrency } from '../../utils/formatCurrency';
import { getErrorMessage } from '../../utils/getErrorMessage';

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

const FIELD_LABELS = {
  fullName: 'Full name',
  phone: 'Mobile number',
  addressLine1: 'Address line 1',
  addressLine2: 'Address line 2',
  landmark: 'Landmark',
  city: 'City',
  state: 'State',
  postalCode: 'Pincode',
};

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
  const [savingAddress, setSavingAddress] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
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
  }, [shippingAddressId, paymentMethod, coupon?.coupon?.code]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const openNewAddress = () => {
    setEditingId('');
    setForm({
      ...EMPTY_FORM,
      fullName: user?.name || '',
      phone: user?.phone || '',
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
    setFormOpen(true);
  };

  const handleSaveAddress = async (event) => {
    event.preventDefault();
    const validated = validateAddressForm(form);
    if (!validated.valid) {
      toast.error(validated.message);
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
      setEditingId('');
      setFormOpen(false);
    } catch (err) {
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
    if (!couponCode.trim()) return;
    try {
      const result = await validateCoupon(couponCode.trim());
      setCoupon(result);
      const gift = result?.coupon?.kind === 'gift_voucher';
      toast.success(
        gift
          ? 'Gift voucher applied. Final discount is confirmed when the order is created.'
          : 'Coupon applied. Final discount is confirmed when the order is created.'
      );
    } catch (err) {
      setCoupon(null);
      toast.error(getErrorMessage(err, 'This code could not be applied.'));
    }
  };

  const completeOrder = async (order) => {
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
        name: 'Anant Exotika Foods',
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
    setError('');
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

    setSubmitting(true);
    try {
      const result = await createOrder({
        shippingAddressId,
        billingAddressId: shippingAddressId,
        paymentMethod,
        couponCode: coupon?.coupon?.code || undefined,
        notes,
      });
      const order = result.order;
      if (result.payment?.method === 'razorpay') {
        const confirmed = await openRazorpay(order, result.payment);
        await completeOrder(confirmed);
        return;
      }
      await completeOrder(order);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to place order.'));
    } finally {
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

  return (
    <section className="page-shell">
      <div className="container">
        <PageHeader
          eyebrow="Checkout"
          title="Checkout"
          subtitle="A simple, secure close to your order — delivery, payment and confirmation."
        />
        <ol className="checkout-steps">
          <li className="is-active">Bag</li>
          <li className="is-active">Delivery</li>
          <li className="is-active">Payment</li>
        </ol>
        <form className="checkout-layout" onSubmit={handlePlaceOrder}>
          <div className="checkout-form">
            {error ? <div className="alert alert-error">{error}</div> : null}
            {storeClosed ? (
              <div className="alert">The store is temporarily closed. Orders cannot be placed right now.</div>
            ) : null}

            <section className="checkout-block">
              <div className="checkout-block__head">
                <h2>Delivery address</h2>
                {!formOpen ? (
                  <Button type="button" variant="secondary" size="sm" onClick={openNewAddress}>
                    Add new address
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
                        <span>
                          {address.fullName}
                          {address.isDefault ? ' · Default' : ''}
                          <em>
                            {address.addressLine1}
                            {address.addressLine2 ? `, ${address.addressLine2}` : ''}
                            {address.landmark ? `, ${address.landmark}` : ''}
                            <br />
                            {address.city}, {address.state} {address.postalCode}
                            <br />
                            {address.phone}
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
                  <div className="form-grid two">
                    {['fullName', 'phone', 'addressLine1', 'addressLine2', 'landmark', 'city', 'state', 'postalCode'].map(
                      (field) => (
                        <div className="field" key={field}>
                          <label htmlFor={`checkout-${field}`}>{FIELD_LABELS[field]}</label>
                          <input
                            id={`checkout-${field}`}
                            value={form[field]}
                            onChange={(event) => updateField(field, event.target.value)}
                            required={field !== 'addressLine2' && field !== 'landmark'}
                            inputMode={field === 'phone' || field === 'postalCode' ? 'numeric' : undefined}
                            autoComplete={
                              field === 'fullName'
                                ? 'name'
                                : field === 'phone'
                                  ? 'tel'
                                  : field === 'postalCode'
                                    ? 'postal-code'
                                    : field === 'city'
                                      ? 'address-level2'
                                      : field === 'state'
                                        ? 'address-level1'
                                        : field === 'addressLine1'
                                          ? 'address-line1'
                                          : field === 'addressLine2'
                                            ? 'address-line2'
                                            : undefined
                            }
                          />
                        </div>
                      )
                    )}
                    <div className="field">
                      <label htmlFor="checkout-addressType">Type</label>
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
              <h2>Shipping</h2>
              {shippingLoading ? (
                <p>Calculating shipping for your delivery address…</p>
              ) : shippingError ? (
                <div className="alert alert-error">{shippingError}</div>
              ) : shippingQuote ? (
                <div className="checkout-shipping-summary">
                  <p>
                    {shippingQuote.freeShipping
                      ? 'Free shipping applies to this order.'
                      : `Delhivery shipping to ${shippingQuote.postalCode}.`}
                  </p>
                  <p>
                    Shipping charge:{' '}
                    <strong>
                      {shippingQuote.shipping > 0 ? formatCurrency(shippingQuote.shipping) : 'Free'}
                    </strong>
                  </p>
                  {freeShippingThreshold > 0 && !shippingQuote.freeShipping ? (
                    <p className="checkout-shipping-hint">
                      Free shipping on orders of {formatCurrency(freeShippingThreshold)} and above.
                    </p>
                  ) : null}
                  {!shippingQuote.codAvailable ? (
                    <p className="checkout-shipping-hint">Cash on Delivery is not available for this pincode.</p>
                  ) : null}
                </div>
              ) : (
                <p>Select a delivery address to see shipping charges.</p>
              )}
            </section>

            <section className="checkout-block">
              <h2>Payment</h2>
              {paymentMethods
                .filter((method) => method.value !== 'cod' || shippingQuote?.codAvailable !== false)
                .map((method) => (
                <label key={method.value} className={`choice-card ${paymentMethod === method.value ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === method.value}
                    onChange={() => setPaymentMethod(method.value)}
                  />
                  <span>
                    {method.label}
                    {method.value === 'razorpay' ? <em>UPI, cards, netbanking and wallets</em> : null}
                    {method.value === 'cod' ? <em>Pay when your order arrives</em> : null}
                  </span>
                </label>
              ))}
            </section>

            <section className="checkout-block">
              <h2>Coupon or gift voucher</h2>
              <div className="coupon-row">
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleValidateCoupon(event);
                    }
                  }}
                  placeholder="Enter coupon or gift voucher code"
                  aria-label="Coupon or gift voucher code"
                />
                <Button type="button" variant="secondary" onClick={handleValidateCoupon}>
                  Apply
                </Button>
              </div>
              {coupon ? (
                <p>
                  {coupon.coupon.kind === 'gift_voucher' ? 'Gift voucher' : 'Coupon'}{' '}
                  {coupon.coupon.code}: estimated discount {formatCurrency(coupon.discount)}.
                </p>
              ) : null}
            </section>

            <section className="checkout-block">
              <div className="field">
                <label htmlFor="notes">Order notes</label>
                <textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
              </div>
            </section>
          </div>

          <aside className="cart-summary">
            <h2>Order summary</h2>
            {cart.items.map((item) => (
              <div key={item.product?._id} className="summary-row">
                <span>
                  {item.product?.name} × {item.quantity}
                </span>
                <span>{formatCurrency(item.lineTotal)}</span>
              </div>
            ))}
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatCurrency(cart.subtotal)}</span>
            </div>
            {coupon ? (
              <div className="summary-row">
                <span>
                  {coupon.coupon.kind === 'gift_voucher' ? 'Gift voucher' : 'Estimated discount'}
                </span>
                <span>-{formatCurrency(coupon.discount)}</span>
              </div>
            ) : null}
            <div className="summary-row">
              <span>Shipping</span>
              <span>
                {shippingLoading
                  ? '…'
                  : shippingQuote
                    ? shippingQuote.shipping > 0
                      ? formatCurrency(shippingQuote.shipping)
                      : 'Free'
                    : '—'}
              </span>
            </div>
            {shippingQuote?.estimatedTotal !== undefined ? (
              <div className="summary-row total">
                <span>Estimated total</span>
                <strong>{formatCurrency(shippingQuote.estimatedTotal)}</strong>
              </div>
            ) : null}
            <p>
              Final totals are confirmed when the order is created.
              {paymentMethods.some((method) => method.value === 'cod') ? ' Cash on Delivery may be available by pincode.' : ''}
            </p>
            <Button
              type="submit"
              disabled={
                submitting ||
                !shippingAddressId ||
                storeClosed ||
                shippingLoading ||
                Boolean(shippingError) ||
                !shippingQuote?.serviceable
              }
              className="btn--full"
            >
              {submitting ? 'Placing order...' : paymentMethod === 'razorpay' ? 'Pay securely' : 'Place order'}
            </Button>
            <p className="checkout-secure">
              <Lock size={13} strokeWidth={1.6} /> Secure checkout
              {paymentMethods.some((method) => method.value === 'cod') ? ' · COD' : ''}
            </p>
          </aside>
        </form>
      </div>
    </section>
  );
};

export default Checkout;
