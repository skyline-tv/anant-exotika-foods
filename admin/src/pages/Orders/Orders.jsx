import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import useDebounce from '../../hooks/useDebounce';
import { getOrders } from '../../services/orderService';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { getUserName } from '../../utils/productHelpers';

function Orders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: 12 };
        if (status) params.status = status;
        if (paymentStatus) params.paymentStatus = paymentStatus;
        if (debouncedSearch) params.search = debouncedSearch;

        const data = await getOrders(params);
        if (!active) return;

        let next = data.orders || [];
        if (debouncedSearch) {
          const query = debouncedSearch.toLowerCase();
          next = next.filter((order) => {
            const customer = getUserName(order.user).toLowerCase();
            const phone = String(order.user?.phone || order.shippingAddress?.phone || '');
            return (
              String(order.orderNumber || '').toLowerCase().includes(query) ||
              customer.includes(query) ||
              phone.includes(query)
            );
          });
        }
        if (date) {
          next = next.filter((order) => String(order.createdAt || '').startsWith(date));
        }

        setOrders(next);
        setPagination(data.pagination || { page: 1, pages: 1, total: next.length });
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
  }, [debouncedSearch, status, paymentStatus, date, page]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Orders</h1>
          <p>Track fulfilment, payments, and customer purchases.</p>
        </div>
      </div>

      <section className="card">
        <div className="card-body toolbar">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search order number, customer or phone"
          />
          <div className="field">
            <label className="sr-only" htmlFor="orderStatus">
              Order status
            </label>
            <select
              id="orderStatus"
              className="select"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All order statuses</option>
              {ORDER_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="paymentStatus">
              Payment status
            </label>
            <select
              id="paymentStatus"
              className="select"
              value={paymentStatus}
              onChange={(event) => {
                setPaymentStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All payment statuses</option>
              {PAYMENT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="orderDate">
              Date
            </label>
            <input
              id="orderDate"
              type="date"
              className="input"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {loading ? (
          <Loader label="Loading orders..." />
        ) : error ? (
          <div className="error-state">
            <h3>Unable to load orders</h3>
            <p>{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="No Orders" message="Orders will appear here as customers check out." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order Number</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment Status</th>
                    <th>Order Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td>{order.orderNumber}</td>
                      <td>{getUserName(order.user)}</td>
                      <td>{order.items?.length || 0}</td>
                      <td>{formatCurrency(order.pricing?.total)}</td>
                      <td>
                        <StatusBadge status={order.payment?.paymentStatus} />
                      </td>
                      <td>
                        <StatusBadge status={order.orderStatus} />
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>
                        <Link className="linkish" to={`/orders/${order._id}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={pagination.page}
              pages={pagination.pages}
              total={pagination.total}
              onPageChange={setPage}
            />
          </>
        )}
      </section>
    </div>
  );
}

export default Orders;
