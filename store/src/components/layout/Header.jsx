import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import BrandMark from '../brand/BrandMark';
import SearchOverlay from '../common/SearchOverlay';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useUi } from '../../context/UiContext';
import { useWishlist } from '../../context/WishlistContext';
import { matchCategoryPath } from '../../data/brandContent';
import { getCategories } from '../../services/categoryService';
import { getChildCategories, getParentCategories } from '../../utils/categories';
import './Header.css';

const Header = () => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [openMobileShop, setOpenMobileShop] = useState(false);
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
  const closeDrawer = () => setDrawerOpen(false);
  const dryFruitsTo = matchCategoryPath(parents, ['dry fruit', 'dryfruit', 'nuts', 'almond', 'cashew']);
  const hampersTo = matchCategoryPath(parents, ['hamper', 'box', 'combo', 'gift']);
  const navClass = ({ isActive }) => `site-header__nav-link${isActive ? ' is-active' : ''}`;

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
                            All products
                          </Link>
                        </li>
                        {parents.map((category) => (
                          <li key={category._id}>
                            <Link to={`/shop/${category.slug}`} onClick={() => setShopOpen(false)}>
                              {category.name}
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
                            New arrivals
                          </Link>
                        </li>
                      </ul>
                    </div>
                    <Link to={{ pathname: '/', hash: 'gifting' }} className="mega-menu__promo" onClick={() => setShopOpen(false)}>
                      <span>
                        <em>Gifting</em>
                        Hampers for festivals, weddings and the boardroom.
                      </span>
                    </Link>
                  </div>
                </div>
              </li>
              <li>
                <NavLink
                  to="/about"
                  className={({ isActive }) =>
                    `site-header__nav-link${isActive && location.hash !== '#our-story' ? ' is-active' : ''}`
                  }
                >
                  About Us
                </NavLink>
              </li>
              <li>
                <NavLink
                  to={{ pathname: '/about', hash: 'our-story' }}
                  className={() =>
                    `site-header__nav-link${location.pathname === '/about' && location.hash === '#our-story' ? ' is-active' : ''}`
                  }
                >
                  Our Story
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
        aria-label="Mobile navigation"
      >
        <div className="nav-drawer__header">
          <BrandMark compact to="/" />
          <button type="button" className="site-header__icon-btn" aria-label="Close menu" onClick={closeDrawer}>
            <X size={20} strokeWidth={1.4} />
          </button>
        </div>

        <nav className="nav-drawer__nav" aria-label="Mobile primary">
          <ul>
            <li>
              <NavLink to="/" end className={({ isActive }) => `nav-drawer__link${isActive ? ' is-active' : ''}`} onClick={closeDrawer}>
                Home
              </NavLink>
            </li>
            <li>
              <button
                type="button"
                className="nav-drawer__link nav-drawer__toggle"
                aria-expanded={openMobileShop}
                onClick={() => setOpenMobileShop((value) => !value)}
              >
                Shop
                <ChevronDown size={16} strokeWidth={1.4} />
              </button>
              {openMobileShop ? (
                <ul className="nav-drawer__sub">
                  <li>
                    <Link to="/shop" onClick={closeDrawer}>
                      All products
                    </Link>
                  </li>
                  {parents.map((category) => {
                    const children = getChildCategories(categories, category._id);
                    return (
                      <li key={category._id}>
                        <Link to={`/shop/${category.slug}`} onClick={closeDrawer}>
                          {category.name}
                        </Link>
                        {children.length ? (
                          <ul>
                            {children.map((child) => (
                              <li key={child._id}>
                                <Link to={`/shop/${child.slug}`} onClick={closeDrawer}>
                                  {child.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
            <li>
              <NavLink
                to="/about"
                className={({ isActive }) =>
                  `nav-drawer__link${isActive && location.hash !== '#our-story' ? ' is-active' : ''}`
                }
                onClick={closeDrawer}
              >
                About Us
              </NavLink>
            </li>
            <li>
              <NavLink
                to={{ pathname: '/about', hash: 'our-story' }}
                className={() =>
                  `nav-drawer__link${location.pathname === '/about' && location.hash === '#our-story' ? ' is-active' : ''}`
                }
                onClick={closeDrawer}
              >
                Our Story
              </NavLink>
            </li>
            <li>
              <NavLink to="/contact" className={({ isActive }) => `nav-drawer__link${isActive ? ' is-active' : ''}`} onClick={closeDrawer}>
                Contact Us
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="nav-drawer__meta">
          <button type="button" className="nav-drawer__meta-link" onClick={() => { closeDrawer(); setSearchOpen(true); }}>
            Search
          </button>
          <Link to={isAuthenticated ? '/account' : '/login'} className="nav-drawer__meta-link" onClick={closeDrawer}>
            {isAuthenticated ? 'My Account' : 'Account'}
          </Link>
          <Link to="/wishlist" className="nav-drawer__meta-link" onClick={closeDrawer}>
            Wishlist
          </Link>
        </div>
      </aside>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} categories={parents} />
    </>
  );
};

export default Header;
