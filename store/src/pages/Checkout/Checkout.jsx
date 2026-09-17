import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { getAddresses } from '../../services/addressService';
import { validateCoupon } from '../../services/couponService';
import { createOrder } from '../../services/orderService';
import { PAYMENT_METHODS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { getErrorMessage } from '../../utils/getErrorMessage';

const Checkout = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { cart, loading: cartLoading, refresh } = useCart();
  const [addresses, setAddresses] = useState([]);
  const [shippingAddressId, setShippingAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getAddresses()
      .then((items) => {
        if (!active) return;
        setAddresses(items);
        const defaultAddress = items.find((item) => item.isDefault) || items[0];
        setShippingAddressId(defaultAddress?._id || '');
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

  const handlePlaceOrder = async (event) => {
    event.preventDefault();
    setError('');
    if (!shippingAddressId) {
      setError('Please add a shipping address before placing an order.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await createOrder({
        shippingAddressId,
        billingAddressId: shippingAddressId,
        paymentMethod,
        couponCode: coupon?.coupon?.code || undefined,
        notes,
      });
      await refresh();
      toast.success('Order placed successfully.');
      navigate(`/account/orders/${order._id}`);
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
          <EmptyState title="Your bag is empty" message="Add a piece before checking out." actionLabel="Shop" actionTo="/shop" />
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
          subtitle="Review delivery, payment and your bag — then place the order."
        />
        <ol className="checkout-steps">
          <li className="is-active">Bag</li>
          <li className="is-active">Delivery</li>
          <li className="is-active">Payment</li>
        </ol>
        <form className="checkout-layout" onSubmit={handlePlaceOrder}>
          <div className="checkout-form">
            {error ? <div className="alert alert-error">{error}</div> : null}

            <section className="checkout-block">
              <h2>Delivery address</h2>
              {addresses.length === 0 ? (
                <p>
                  No saved addresses. <Link to="/account/addresses">Add an address</Link> to continue.
                </p>
              ) : (
                <div>
                  {addresses.map((address) => (
                    <label key={address._id} className={`choice-card ${shippingAddressId === address._id ? 'is-active' : ''}`}>
                      <input
                        type="radio"
                        name="shippingAddress"
                        checked={shippingAddressId === address._id}
                        onChange={() => setShippingAddressId(address._id)}
                      />
                      <span>
                        {address.fullName}
                        <em>
                          {address.addressLine1}, {address.city}, {address.state} {address.postalCode}
                        </em>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            <section className="checkout-block">
              <h2>Shipping</h2>
              <p>Pan India delivery. Final shipping is confirmed when the order is created.</p>
            </section>

            <section className="checkout-block">
              <h2>Payment</h2>
              {PAYMENT_METHODS.map((method) => (
                <label key={method.value} className={`choice-card ${paymentMethod === method.value ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === method.value}
                    onChange={() => setPaymentMethod(method.value)}
                  />
                  {method.label}
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
            <p>Taxes and shipping are confirmed when the order is created.</p>
            <Button type="submit" disabled={submitting || !shippingAddressId} className="btn--full">
              {submitting ? 'Placing order...' : 'Place order'}
            </Button>
          </aside>
        </form>
      </div>
    </section>
  );
};

export default Checkout;
