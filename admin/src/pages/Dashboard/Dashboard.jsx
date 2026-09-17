import { useEffect, useMemo, useState } from 'react';
import { IndianRupee, Package, ShoppingBag, Users } from 'lucide-react';
import StatCard from '../../components/dashboard/StatCard';
import SalesChart from '../../components/dashboard/SalesChart';
import RecentOrders from '../../components/dashboard/RecentOrders';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import { getOrders } from '../../services/orderService';
import { getProducts } from '../../services/productService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { getPrimaryImage, getStockStatus } from '../../utils/productHelpers';
import { getCustomers } from '../../services/customerService';
import '../../styles/dashboard.css';

function buildSalesData(orders) {
  const buckets = new Map();

  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const label = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    buckets.set(label, (buckets.get(label) || 0) + (Number(order.pricing?.total) || 0));
  });

  return [...buckets.entries()]
    .slice(-8)
    .map(([label, total]) => ({ label, total }));
}

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [products, setProducts] = useState([]);
  const [productTotal, setProductTotal] = useState(0);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [recentCustomers, setRecentCustomers] = useState([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [orderData, productData, customerData] = await Promise.all([
          getOrders({ page: 1, limit: 50 }),
          getProducts({ page: 1, limit: 50, sort: 'newest' }),
          getCustomers({ page: 1, limit: 5 }),
        ]);

        if (!active) return;

        setOrders(orderData.orders || []);
        setOrderTotal(orderData.pagination?.total || 0);
        setProducts(productData.products || []);
        setProductTotal(productData.pagination?.total || 0);
        setCustomerTotal(customerData.pagination?.total || 0);
        setRecentCustomers(customerData.customers || []);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const revenue = useMemo(
    () => orders.reduce((sum, order) => sum + (Number(order.pricing?.total) || 0), 0),
    [orders]
  );
  const chartData = useMemo(() => buildSalesData(orders), [orders]);
  const lowStock = useMemo(
    () =>
      products.filter((product) => {
        const status = getStockStatus(product);
        return status === 'low_stock' || status === 'out_of_stock';
      }).slice(0, 6),
    [products]
  );

  if (loading) return <Loader label="Loading dashboard..." />;

  if (error) {
    return (
      <div className="error-state">
        <h3>Unable to load dashboard</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back. A quiet view of the house.</p>
        </div>
      </div>

      <section className="dashboard-stats">
        <StatCard icon={IndianRupee} label="Total Revenue" value={formatCurrency(revenue)} />
        <StatCard icon={ShoppingBag} label="Total Orders" value={orderTotal} />
        <StatCard icon={Users} label="Total Customers" value={customerTotal} />
        <StatCard icon={Package} label="Total Products" value={productTotal} />
      </section>

      <div className="dashboard-main">
        <SalesChart data={chartData} />
        {orders.length ? (
          <RecentOrders orders={orders.slice(0, 6)} />
        ) : (
          <section className="card">
            <div className="card-header">
              <h2>Recent Orders</h2>
            </div>
            <EmptyState title="No Orders" message="New customer orders will appear here." />
          </section>
        )}
      </div>

      <div className="dashboard-side">
        <section className="card">
          <div className="card-header">
            <h2>Low Stock Products</h2>
          </div>
          {lowStock.length === 0 ? (
            <EmptyState title="Healthy inventory" message="No low stock products right now." />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Current Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((product) => (
                    <tr key={product._id}>
                      <td>
                        <div className="table-product">
                          {getPrimaryImage(product) ? (
                            <img className="thumb" src={getPrimaryImage(product)} alt={product.name} />
                          ) : (
                            <div className="thumb thumb-placeholder">AE</div>
                          )}
                          <span>{product.name}</span>
                        </div>
                      </td>
                      <td>{product.sku}</td>
                      <td>{product.stock}</td>
                      <td>
                        <StatusBadge status={getStockStatus(product)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Recent Customers</h2>
          </div>
          {recentCustomers.length === 0 ? (
            <EmptyState title="No Customers" message="Customers will appear after they register." />
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Email</th>
                    <th>Orders</th>
                    <th>Joined Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCustomers.map((customer) => (
                    <tr key={customer._id}>
                      <td>{customer.name}</td>
                      <td>{customer.email}</td>
                      <td>{customer.ordersCount}</td>
                      <td>{formatDate(customer.joinedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
