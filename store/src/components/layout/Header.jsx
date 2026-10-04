import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import BrandMark from '../brand/BrandMark';
import SearchOverlay from '../common/SearchOverlay';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useUi } from '../../context/UiContext';
import { useWishlist } from '../../context/WishlistContext';
import { matchCategoryPath } from '../../data/brandContent';
import { toTitleCase } from '../../utils/titleCase';
import { getCategories } from '../../services/categoryService';
import { getParentCategories } from '../../utils/categories';
import { orderedHomeCategories } from '../home/CollectionShowcase';
import { useStoreContent } from '../../context/ContentContext';
import './Header.css';

const Header = () => {
  const location = useLocation();
  const { content } = useStoreContent();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const shopTimer = useRef(null);
  const prevCount = useRef(0);
  const [categories, setCategories] = useState([]);
  const { isAuthenticated } = useAuth();
  const { itemCount } = useCart();
  const { openCart } = useUi();
  const { count: wishlistCount } = useWishlist();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setShopOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  useEffect(() => {
    getCategories()
      .then((items) => setCategories(items || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (itemCount > prevCount.current) {
      setPulse(true);
      const timer = window.setTimeout(() => setPulse(false), 520);
      prevCount.current = itemCount;
      return () => window.clearTimeout(timer);
    }
    prevCount.current = itemCount;
    return undefined;
  }, [itemCount]);

  const parents = getParentCategories(categories);
  const menuCategories = orderedHomeCategories(categories, content);
  const closeDrawer = () => setDrawerOpen(false);
  const dryFruitsTo = matchCategoryPath(parents, ['dry fruit', 'dryfruit', 'nuts', 'almond', 'cashew']);
  const hampersTo = matchCategoryPath(
    parents.filter((category) => category.slug !== 'personalized-gift-hampers'),
    ['hamper', 'box', 'combo', 'gift']
  );
  const navClass = ({ isActive }) => `site-header__nav-link${isActive ? ' is-active' : ''}`;
  const drawerLinkClass = ({ isActive }) => `nav-drawer__link${isActive ? ' is-active' : ''}`;

  return (
    <>
      <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="container site-header__inner">
          <button
            type="button"
            className="site-header__icon-btn show-mobile-only"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={20} strokeWidth={1.4} />
          </button>

          <div className="site-header__logo">
            <BrandMark compact />
          </div>

          <nav className="site-header__nav hide-mobile" aria-label="Primary">
            <ul className="site-header__nav-list">
              <li>
                <NavLink to="/" end className={navClass}>
                  Home
                </NavLink>
              </li>
              <li
                className={`site-header__shop ${shopOpen ? 'is-open' : ''}`}
                onMouseEnter={() => {
                  window.clearTimeout(shopTimer.current);
                  setShopOpen(true);
                }}
                onMouseLeave={() => {
                  shopTimer.current = window.setTimeout(() => setShopOpen(false), 160);
                }}
              >
                <NavLink
                  to="/shop"
                  className={navClass}
                  onFocus={() => setShopOpen(true)}
                  aria-expanded={shopOpen}
                  aria-haspopup="true"
                >
                  Shop
                </NavLink>
                <div className="mega-menu" hidden={!shopOpen}>
                  <div className="mega-menu__inner container">
                    <div>
                      <p className="mega-menu__label">Categories</p>
                      <ul>
                        <li>
                          <Link to="/shop" onClick={() => setShopOpen(false)}>
                            All Products
                          </Link>
                        </li>
                        {menuCategories.map((category) => (
                          <li key={category._id}>
                            <Link to={`/shop/${category.slug}`} onClick={() => setShopOpen(false)}>
                              {toTitleCase(category.name)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mega-menu__label">Collections</p>
                      <ul>
                        <li>
                          <Link to={dryFruitsTo} onClick={() => setShopOpen(false)}>
                            Premium Dry Fruits
                          </Link>
                        </li>
                        <li>
                          <Link to={hampersTo} onClick={() => setShopOpen(false)}>
                            Gift Hampers
                          </Link>
                        </li>
                        <li>
                          <Link to="/shop/featured" onClick={() => setShopOpen(false)}>
                            Featured
                          </Link>
                        </li>
                        <li>
                          <Link to="/shop/new-arrivals" onClick={() => setShopOpen(false)}>
                            New Arrivals
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </li>
              <li>
                <NavLink to="/about" className={navClass}>
                  About Us
                </NavLink>
              </li>
              <li>
                <NavLink to="/contact" className={navClass}>
                  Contact Us
                </NavLink>
              </li>
            </ul>
          </nav>

          <div className="site-header__actions">
            <button
              type="button"
              className="site-header__icon-btn"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={18} strokeWidth={1.4} />
            </button>

            <Link
              to="/wishlist"
              className="site-header__icon-btn site-header__icon-btn--badge hide-mobile"
              aria-label={`Wishlist${wishlistCount ? `, ${wishlistCount} items` : ''}`}
            >
              <Heart size={18} strokeWidth={1.4} />
              {wishlistCount > 0 ? <span className="site-header__badge">{wishlistCount}</span> : null}
            </Link>

            <Link
              to={isAuthenticated ? '/account' : '/login'}
              className="site-header__icon-btn hide-mobile"
              aria-label="Account"
            >
              <User size={18} strokeWidth={1.4} />
            </Link>

            <button
              type="button"
              className="site-header__icon-btn site-header__icon-btn--badge"
              aria-label={`Shopping bag${itemCount ? `, ${itemCount} items` : ''}`}
              onClick={openCart}
            >
              <ShoppingBag size={18} strokeWidth={1.4} />
              {itemCount > 0 ? (
                <span className={`site-header__badge${pulse ? ' is-pulse' : ''}`}>{itemCount}</span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      <div
        className={`nav-overlay ${drawerOpen ? 'is-open' : ''}`}
        onClick={closeDrawer}
        aria-hidden={!drawerOpen}
      />

      <aside
        id="mobile-nav-drawer"
        className={`nav-drawer ${drawerOpen ? 'is-open' : ''}`}
        aria-hidden={!drawerOpen}
        aria-modal={drawerOpen || undefined}
        role="dialog"
        inert={!drawerOpen}
        aria-label="Mobile navigation"
      >
        <div className="nav-drawer__header">
          <span onClick={closeDrawer}>
            <BrandMark compact to="/" />
          </span>
          <button type="button" className="nav-drawer__close" aria-label="Close menu" onClick={closeDrawer}>
            <X size={20} strokeWidth={1.6} />
          </button>
        </div>

        <nav className="nav-drawer__nav" aria-label="Mobile primary">
          <p className="nav-drawer__label">Main</p>
          <ul>
            <li>
              <NavLink to="/" end className={drawerLinkClass} onClick={closeDrawer}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/shop" end className={drawerLinkClass} onClick={closeDrawer}>
                Shop
              </NavLink>
            </li>
            {hampersTo !== '/shop' ? (
              <li>
                <NavLink to={hampersTo} className={drawerLinkClass} onClick={closeDrawer}>
                  Hampers
                </NavLink>
              </li>
            ) : null}
            <li>
              <NavLink to="/account/orders" className={drawerLinkClass} onClick={closeDrawer}>
                My Orders
              </NavLink>
            </li>
          </ul>

          <p className="nav-drawer__label">Support</p>
          <ul>
            <li>
              <NavLink to="/contact" className={drawerLinkClass} onClick={closeDrawer}>
                Contact Us
              </NavLink>
            </li>
            <li>
              <NavLink to="/shipping-policy" className={drawerLinkClass} onClick={closeDrawer}>
                Shipping &amp; Delivery
              </NavLink>
            </li>
            <li>
              <NavLink to="/returns-policy" className={drawerLinkClass} onClick={closeDrawer}>
                Returns &amp; Refunds
              </NavLink>
            </li>
          </ul>
        </nav>
      </aside>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} categories={menuCategories} />
    </>
  );
};

export default Header;
