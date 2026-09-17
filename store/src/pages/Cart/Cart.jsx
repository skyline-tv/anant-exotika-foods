import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import QuantitySelector from '../../components/common/QuantitySelector';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { validateCoupon } from '../../services/couponService';
import { formatCurrency } from '../../utils/formatCurrency';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { formatWeight, getMrp, getPrimaryImage } from '../../utils/productHelpers';

const Cart = () => {
  const { isAuthenticated } = useAuth();
  const { cart, loading, updateItem, removeItem } = useCart();
  const toast = useToast();
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);

  const handleQuantity = async (productId, quantity) => {
    try {
      await updateItem(productId, quantity);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to update cart.'));
    }
  };

  const handleRemove = async (productId) => {
    try {
      await removeItem(productId);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to remove item.'));
    }
  };

  const handleCoupon = async (event) => {
    event.preventDefault();
    if (!couponCode.trim()) return;
    try {
      const result = await validateCoupon(couponCode.trim());
      setCoupon(result);
      toast.success('Code applied. Final discount is confirmed at checkout.');
    } catch (err) {
      setCoupon(null);
      toast.error(getErrorMessage(err, 'This code could not be applied.'));
    }
  };

  if (loading) return <Loader label="Loading bag" />;

  if (!cart.items.length) {
    return (
      <section className="page-shell">
        <div className="container">
          <EmptyState
            eyebrow="Shopping bag"
            title="Your bag is waiting for something special."
            message="Discover dry fruits and hampers, then add a gift that feels considered."
            actionLabel="Continue shopping"
            actionTo="/shop"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="container">
        <PageHeader eyebrow="Shopping bag" title="Bag" subtitle="Review your selection, then continue to a simple checkout." />
        {cart.warnings?.length ? (
          <div className="alert" style={{ marginBottom: '1.25rem' }}>
            {cart.warnings[0]}
          </div>
        ) : null}
        <div className="cart-layout">
          <div>
            {cart.items.map((item) => {
              const product = item.product;
              const productId = product?._id;
              const image = getPrimaryImage(product);
              const weight = formatWeight(product?.weight);
              return (
                <article key={productId} className="cart-item">
                  {image ? (
                    <img src={image} alt={product?.name} />
                  ) : (
                    <div className="product-card__placeholder" style={{ width: 88, height: 88 }}>
                      <span>AE</span>
                    </div>
                  )}
                  <div>
                    <h2>
                      <Link to={`/product/${product?.slug}`}>{product?.name}</Link>
                    </h2>
                    {weight ? <p>{weight}</p> : null}
                    <p>{product?.status === 'out_of_stock' || Number(product?.stock) <= 0 ? 'Out of Stock' : 'In Stock'}</p>
                    <p>
                      {formatCurrency(item.price)}
                      {getMrp(product) > item.price ? <s>{formatCurrency(getMrp(product))}</s> : null}
                    </p>
                    <QuantitySelector
                      value={item.quantity}
                      min={1}
                      max={product?.stock || 99}
                      label=""
                      onChange={(quantity) => handleQuantity(productId, quantity)}
                    />
                    <button type="button" className="text-link" onClick={() => handleRemove(productId)}>
                      Remove
                    </button>
                  </div>
                  <strong>{formatCurrency(item.lineTotal)}</strong>
                </article>
              );
            })}
          </div>

          <aside className="cart-summary">
            <h2>Order summary</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatCurrency(cart.subtotal)}</span>
            </div>
            {coupon ? (
              <div className="summary-row">
                <span>{coupon.coupon.kind === 'gift_voucher' ? 'Gift voucher' : 'Estimated discount'}</span>
                <span>-{formatCurrency(coupon.discount)}</span>
              </div>
            ) : null}
            {isAuthenticated ? (
              <form className="coupon-row" onSubmit={handleCoupon}>
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="Coupon or gift voucher"
                  aria-label="Coupon or gift voucher"
                />
                <Button type="submit" variant="outline" size="sm">
                  Apply
                </Button>
              </form>
            ) : (
              <p>Log in at checkout to apply a coupon. Final discount is always confirmed by the server.</p>
            )}
            <p>Shipping is calculated at checkout. Complimentary premium packaging is included on selected orders.</p>
            {isAuthenticated ? (
              <Button as={Link} to="/checkout" variant="primary" className="btn--full">
                Checkout
              </Button>
            ) : (
              <Button as={Link} to="/login" state={{ from: '/checkout' }} variant="primary" className="btn--full">
                Login to checkout
              </Button>
            )}
            <p className="checkout-secure">
              <Lock size={13} strokeWidth={1.6} /> Secure checkout · COD available
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default Cart;
