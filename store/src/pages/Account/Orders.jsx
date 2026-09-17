import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AccountNav from '../../components/account/AccountNav';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import { getMyOrders, getOrderById } from '../../services/orderService';
import { ORDER_STATUS_LABELS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { resolveAssetUrl } from '../../utils/assetUrl';

const Orders = () => {
  const { id } = useParams();
  const [orders, setOrders] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const load = id ? getOrderById(id) : getMyOrders({ limit: 20 });
    load
      .then((data) => {
        if (!active) return;
        if (id) setOrder(data);
        else setOrders(data.orders || []);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Unable to load orders.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <section className="page-shell">
      <div className="container">
        <PageHeader eyebrow="Account" title={id ? 'Order details' : 'My Orders'} />
        <div className="account-layout">
          <AccountNav />
          <div>
            {loading ? (
              <Loader label="Loading orders" />
            ) : error ? (
              <EmptyState title="Unable to load orders" message={error} actionLabel="Back to account" actionTo="/account" />
            ) : id && order ? (
              <div className="account-card">
                <p className="eyebrow">{order.orderNumber}</p>
                <h2>{ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus}</h2>
                <p>Placed on {formatDate(order.createdAt)}</p>
                {order.items.map((item) => (
                  <article key={`${item.sku}-${item.name}`} className="order-item">
                    {item.image ? <img src={resolveAssetUrl(item.image)} alt={item.name} /> : <div />}
                    <div>
                      <strong>{item.name}</strong>
                      <p>
                        {item.quantity} × {formatCurrency(item.price)}
                      </p>
                    </div>
                    <span>{formatCurrency(item.total)}</span>
                  </article>
                ))}
                <div className="summary-row total">
                  <span>Total</span>
                  <strong>{formatCurrency(order.pricing?.total)}</strong>
                </div>
                <p>
                  {order.shippingAddress?.fullName}, {order.shippingAddress?.addressLine1}, {order.shippingAddress?.city}
                </p>
              </div>
            ) : orders.length === 0 ? (
              <EmptyState title="No orders yet" message="Your purchases will appear here." actionLabel="Shop now" actionTo="/shop" />
            ) : (
              <div className="form-grid">
                {orders.map((item) => (
                  <article key={item._id} className="order-card">
                    <h2>
                      <Link to={`/account/orders/${item._id}`}>{item.orderNumber}</Link>
                    </h2>
                    <p>{formatDate(item.createdAt)}</p>
                    <span className="status-pill">{ORDER_STATUS_LABELS[item.orderStatus] || item.orderStatus}</span>
                    <p>{formatCurrency(item.pricing?.total)}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Orders;
