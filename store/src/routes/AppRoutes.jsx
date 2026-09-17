import { Routes, Route } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Home from '../pages/Home/Home';
import Shop from '../pages/Shop/Shop';
import ProductDetails from '../pages/Product/ProductDetails';
import Cart from '../pages/Cart/Cart';
import Wishlist from '../pages/Wishlist/Wishlist';
import Checkout from '../pages/Checkout/Checkout';
import Login from '../pages/Auth/Login';
import Register from '../pages/Auth/Register';
import ForgotPassword from '../pages/Auth/ForgotPassword';
import Account from '../pages/Account/Account';
import Orders from '../pages/Account/Orders';
import Addresses from '../pages/Account/Addresses';
import Profile from '../pages/Account/Profile';
import About from '../pages/Information/About';
import Contact from '../pages/Information/Contact';
import Privacy from '../pages/Information/Privacy';
import Terms from '../pages/Information/Terms';
import Shipping from '../pages/Information/Shipping';
import Returns from '../pages/Information/Returns';
import Search from '../pages/Search/Search';
import PagePlaceholder from '../components/common/PagePlaceholder';
import ProtectedRoute from './ProtectedRoute';

const NotFound = () => (
  <PagePlaceholder
    title="Page Not Found"
    description="The page you are looking for does not exist or has been moved."
    route="404"
    ctaLabel="Return Home"
    ctaTo="/"
  />
);

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="shop/:category" element={<Shop />} />
        <Route path="product/:slug" element={<ProductDetails />} />
        <Route path="search" element={<Search />} />
        <Route path="cart" element={<Cart />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="privacy-policy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="shipping-policy" element={<Shipping />} />
        <Route path="returns-policy" element={<Returns />} />
        <Route element={<ProtectedRoute />}>
          <Route path="checkout" element={<Checkout />} />
          <Route path="account" element={<Account />} />
          <Route path="account/orders" element={<Orders />} />
          <Route path="account/orders/:id" element={<Orders />} />
          <Route path="account/addresses" element={<Addresses />} />
          <Route path="account/profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
