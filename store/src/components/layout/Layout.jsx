import { Outlet, useLocation } from 'react-router-dom';
import AnnouncementBar from './AnnouncementBar';
import Header from './Header';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import CartDrawer from './CartDrawer';

const HIDE_BOTTOM_NAV = ['/checkout', '/login', '/register', '/forgot-password'];

const Layout = () => {
  const { pathname } = useLocation();
  const hideBottomNav = HIDE_BOTTOM_NAV.includes(pathname);

  return (
    <div className={`app-layout${hideBottomNav ? ' app-layout--bare' : ''}`}>
      <AnnouncementBar />
      <Header />
      <main className="app-main" id="main-content">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      {hideBottomNav ? null : <MobileBottomNav />}
    </div>
  );
};

export default Layout;
