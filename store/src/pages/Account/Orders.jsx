import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AccountNav from '../../components/account/AccountNav';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import { getMyOrders, getOrderById } from '../../services/orderService';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, SHIPMENT_STEPS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { resolveAssetUrl } from '../../utils/assetUrl';

const stepIndexForStatus = (status) => {
  const index = SHIPMENT_STEPS.findIndex((step) => step.key === status);
  if (index >= 0) return index;
  if (status === 'pending') return 0;
  return -1;
};

const Orders = () => {
  const { id } = useParams();
  const [orders, setOrders] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const load = id ? getOrderById(id, { refreshTracking: true }) : getMyOrders({ limit: 20 });
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

  const handleRefreshTracking = async () => {
    if (!id) return;
    setRefreshing(true);
    try {
      const next = await getOrderById(id, { refreshTracking: true });
      setOrder(next);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to refresh tracking.'));
    } finally {
      setRefreshing(false);
    }
  };

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
                <p>
                  {order.payment?.method === 'cod' ? 'Cash on Delivery' : 'Online payment'} ·{' '}
                  {PAYMENT_STATUS_LABELS[order.payment?.paymentStatus] || order.payment?.paymentStatus}
                </p>

                <div className="checkout-block" style={{ marginTop: '1.25rem', padding: '1.1rem' }}>
                  <div className="checkout-block__head">
                    <h3 style={{ margin: 0 }}>Shipment status</h3>
                    {order.shipment?.awbNumber ? (
                      <button type="button" className="link-quiet" onClick={handleRefreshTracking} disabled={refreshing}>
                        {refreshing ? 'Refreshing…' : 'Refresh tracking'}
                      </button>
                    ) : null}
                  </div>
                  {order.shipment?.awbNumber ? (
                    <p>
                      {order.shipment.partner === 'delhivery' ? 'Delhivery' : order.shipment.partner || 'Courier'} · AWB{' '}
                      <strong>{order.shipment.awbNumber}</strong>
                      {order.shipment.trackingUrl ? (
                        <>
                          {' '}
                          ·{' '}
                          <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer">
                            Track package
                          </a>
                        </>
                      ) : null}
                    </p>
                  ) : (
                    <p>Tracking details will appear once the shipment is created with Delhivery.</p>
                  )}
                  <ol className="shipment-timeline">
                    {SHIPMENT_STEPS.map((step, index) => {
                      const current = stepIndexForStatus(order.orderStatus);
                      const done = current >= index;
                      const isCurrent = current === index;
                      return (
                        <li key={step.key} className={done ? (isCurrent ? 'is-current' : 'is-done') : ''}>
                          <span className="shipment-timeline__dot" />
                          <span>{step.label}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>

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
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.pricing?.subtotal)}</span>
                </div>
                {order.pricing?.discount ? (
                  <div className="summary-row">
                    <span>{order.coupon?.code ? `Discount (${order.coupon.code})` : 'Discount'}</span>
                    <span>-{formatCurrency(order.pricing.discount)}</span>
                  </div>
                ) : null}
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>
                    {order.pricing?.shipping > 0 ? formatCurrency(order.pricing.shipping) : 'Free'}
                  </span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <strong>{formatCurrency(order.pricing?.total)}</strong>
                </div>
                <p>
                  {order.shippingAddress?.fullName}, {order.shippingAddress?.addressLine1}
                  {order.shippingAddress?.landmark ? `, ${order.shippingAddress.landmark}` : ''},{' '}
                  {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}
                </p>
                <p>{order.shippingAddress?.phone}</p>
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
