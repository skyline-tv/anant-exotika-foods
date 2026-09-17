import { NavLink } from 'react-router-dom';
import { Heart, Home, ShoppingBag, Store, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useUi } from '../../context/UiContext';
import { useWishlist } from '../../context/WishlistContext';
import './MobileBottomNav.css';

const MobileBottomNav = () => {
  const { isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const { openCart } = useUi();
  const { count } = useWishlist();

  return (
    <nav className="mobile-bottom-nav show-mobile-only" aria-label="Mobile">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
        <Home size={18} strokeWidth={1.5} />
        Home
      </NavLink>
      <NavLink to="/shop" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
        <Store size={18} strokeWidth={1.5} />
        Shop
      </NavLink>
      <NavLink to="/wishlist" className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
        <span className="mobile-bottom-nav__icon">
          <Heart size={18} strokeWidth={1.5} />
          {count > 0 ? <i>{count}</i> : null}
        </span>
        Wishlist
      </NavLink>
      <NavLink
        to={isAuthenticated ? '/account' : '/login'}
        className={({ isActive }) => (isActive ? 'is-active' : undefined)}
      >
        <User size={18} strokeWidth={1.5} />
        Account
      </NavLink>
      <button type="button" onClick={openCart}>
        <span className="mobile-bottom-nav__icon">
          <ShoppingBag size={18} strokeWidth={1.5} />
          {itemCount > 0 ? <i>{itemCount}</i> : null}
        </span>
        Cart
      </button>
    </nav>
  );
};

export default MobileBottomNav;
