import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Loader from '../components/common/Loader';
import AdminLayout from '../components/layout/AdminLayout';
import { useAuth } from '../context/AuthContext';
import Login from '../pages/Auth/Login';
import ProtectedRoute from './ProtectedRoute';

const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard'));
const Products = lazy(() => import('../pages/Products/Products'));
const AddProduct = lazy(() => import('../pages/Products/AddProduct'));
const EditProduct = lazy(() => import('../pages/Products/EditProduct'));
const Categories = lazy(() => import('../pages/Categories/Categories'));
const Orders = lazy(() => import('../pages/Orders/Orders'));
const OrderDetails = lazy(() => import('../pages/Orders/OrderDetails'));
const Customers = lazy(() => import('../pages/Customers/Customers'));
const CustomerDetails = lazy(() => import('../pages/Customers/CustomerDetails'));
const Inventory = lazy(() => import('../pages/Inventory/Inventory'));
const Coupons = lazy(() => import('../pages/Coupons/Coupons'));
const Settings = lazy(() => import('../pages/Settings/Settings'));

function RootRedirect() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <Loader label="Loading..." />;
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<Loader label="Loading page..." />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RootRedirect />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/add" element={<AddProduct />} />
            <Route path="/products/:id/edit" element={<EditProduct />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetails />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetails />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
