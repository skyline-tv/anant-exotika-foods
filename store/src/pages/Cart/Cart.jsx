import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import QuantitySelector from '../../components/common/QuantitySelector';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { getMrp, getPrimaryImage } from '../../utils/productHelpers';

const Cart = () => {
  const { isAuthenticated } = useAuth();
  const { cart, loading, updateItem, removeItem } = useCart();
  const toast = useToast();

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

  if (loading) return <Loader label="Loading bag" />;

  if (!cart.items.length) {
    return (
      <section className="page-shell">
        <div className="container">
          <EmptyState
            eyebrow="Shopping bag"
            title="Your bag is waiting for something extraordinary."
            message="Discover the collection and add a piece that feels like yours."
            actionLabel="Continue Shopping"
            actionTo="/shop"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="container">
        <PageHeader eyebrow="Shopping bag" title="Bag" subtitle="Review your selection, then continue to checkout." />
        <div className="cart-layout">
          <div>
            {cart.items.map((item) => {
              const product = item.product;
              const productId = product?._id;
              const image = getPrimaryImage(product);
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
          </aside>
        </div>
      </div>
    </section>
  );
};

export default Cart;
