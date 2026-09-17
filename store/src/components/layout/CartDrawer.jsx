import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import Button from '../common/Button';
import QuantitySelector from '../common/QuantitySelector';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useUi } from '../../context/UiContext';
import { formatCurrency } from '../../utils/formatCurrency';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { getPrimaryImage } from '../../utils/productHelpers';
import './CartDrawer.css';

const CartDrawer = () => {
  const location = useLocation();
  const { cartOpen, closeCart } = useUi();
  const { isAuthenticated } = useAuth();
  const { cart, updateItem, removeItem } = useCart();
  const toast = useToast();

  useEffect(() => {
    closeCart();
  }, [location.pathname, closeCart]);

  useEffect(() => {
    document.body.style.overflow = cartOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [cartOpen]);

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

  return (
    <>
      <div
        className={`cart-drawer-overlay ${cartOpen ? 'is-open' : ''}`}
        onClick={closeCart}
        aria-hidden={!cartOpen}
      />
      <aside
        className={`cart-drawer ${cartOpen ? 'is-open' : ''}`}
        aria-hidden={!cartOpen}
        aria-label="Shopping bag"
      >
        <div className="cart-drawer__header">
          <div>
            <p className="eyebrow">Shopping</p>
            <h2>Bag</h2>
          </div>
          <button type="button" className="site-header__icon-btn" aria-label="Close bag" onClick={closeCart}>
            <X size={20} strokeWidth={1.4} />
          </button>
        </div>

        <div className="cart-drawer__body">
          {!cart.items.length ? (
            <div className="cart-drawer__empty">
              <h3>Your bag is waiting for something extraordinary.</h3>
              <Button as={Link} to="/shop" variant="primary" onClick={closeCart}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            cart.items.map((item) => {
              const product = item.product;
              const productId = product?._id;
              const image = getPrimaryImage(product);
              return (
                <article key={productId} className="cart-drawer__item">
                  <Link to={`/product/${product?.slug}`} onClick={closeCart}>
                    {image ? <img src={image} alt={product?.name} /> : <span className="cart-drawer__thumb" />}
                  </Link>
                  <div>
                    <h3>
                      <Link to={`/product/${product?.slug}`} onClick={closeCart}>
                        {product?.name}
                      </Link>
                    </h3>
                    <p>{formatCurrency(item.price)}</p>
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
            })
          )}
        </div>

        {cart.items.length ? (
          <div className="cart-drawer__footer">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatCurrency(cart.subtotal)}</span>
            </div>
            <p>Shipping and taxes are confirmed at checkout.</p>
            {isAuthenticated ? (
              <Button as={Link} to="/checkout" variant="primary" className="btn--full" onClick={closeCart}>
                Checkout
              </Button>
            ) : (
              <Button as={Link} to="/login" state={{ from: '/checkout' }} variant="primary" className="btn--full" onClick={closeCart}>
                Login to checkout
              </Button>
            )}
            <Button as={Link} to="/cart" variant="ghost" className="btn--full" onClick={closeCart}>
              View bag
            </Button>
          </div>
        ) : null}
      </aside>
    </>
  );
};

export default CartDrawer;
