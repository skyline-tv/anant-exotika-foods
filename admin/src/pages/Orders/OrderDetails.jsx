import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Loader from '../../components/common/Loader';
import StatusBadge from '../../components/common/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { getOrderById, updateOrderStatus } from '../../services/orderService';
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  SENSITIVE_ORDER_STATUSES,
} from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDateTime } from '../../utils/formatDate';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { getUserName } from '../../utils/productHelpers';

function formatAddress(address) {
  if (!address) return '—';
  return [
    address.fullName,
    address.addressLine1,
    address.addressLine2,
    address.landmark,
    [address.city, address.state, address.postalCode].filter(Boolean).join(', '),
    address.country,
    address.phone,
  ]
    .filter(Boolean)
    .join('\n');
}

function OrderDetails() {
  const { id } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const next = await getOrderById(id);
        if (!active) return;
        setOrder(next);
        setStatus(next.orderStatus);
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'Unable to load order.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id]);

  const applyStatus = async () => {
    setSaving(true);
    try {
      const next = await updateOrderStatus(id, { status, note });
      setOrder(next);
      setNote('');
      setConfirmOpen(false);
      toast.success('Order status updated.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to update order status.'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusSubmit = (event) => {
    event.preventDefault();
    if (SENSITIVE_ORDER_STATUSES.includes(status)) {
      setConfirmOpen(true);
      return;
    }
    applyStatus();
  };

  if (loading) return <Loader label="Loading order..." />;
  if (error || !order) {
    return (
      <div className="error-state">
        <h3>Order not found</h3>
        <p>{error}</p>
      </div>
    );
  }

  const history = order.statusHistory || [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{order.orderNumber}</h1>
          <p>Placed on {formatDateTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.orderStatus} />
      </div>

      <div className="detail-grid">
        <section className="card">
          <div className="card-header">
            <h2>Order Information</h2>
          </div>
          <div className="card-body dl-grid">
            <div>
              <span>Order Number</span>
              <strong>{order.orderNumber}</strong>
            </div>
            <div>
              <span>Date</span>
              <strong>{formatDateTime(order.createdAt)}</strong>
            </div>
            <div>
              <span>Customer</span>
              <strong>{getUserName(order.user)}</strong>
            </div>
            <div>
              <span>Items</span>
              <strong>{order.items?.length || 0}</strong>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Customer Information</h2>
          </div>
          <div className="card-body dl-grid">
            <div>
              <span>Name</span>
              <strong>{order.user?.name || order.shippingAddress?.fullName || '—'}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{order.user?.email || '—'}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{order.user?.phone || order.shippingAddress?.phone || '—'}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <h2>Shipping Address</h2>
        </div>
        <div className="card-body">
          <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>
            {formatAddress(order.shippingAddress)}
          </pre>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Order Items</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, index) => (
                <tr key={`${item.sku}-${index}`}>
                  <td>
                    {item.image ? (
                      <img className="thumb" src={item.image} alt={item.name} />
                    ) : (
                      <div className="thumb thumb-placeholder">AE</div>
                    )}
                  </td>
                  <td className="cell-wrap">{item.name}</td>
                  <td>{item.sku}</td>
                  <td>{formatCurrency(item.price)}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="detail-grid">
        <section className="card">
          <div className="card-header">
            <h2>Order Summary</h2>
          </div>
          <div className="card-body dl-grid">
            <div>
              <span>Subtotal</span>
              <strong>{formatCurrency(order.pricing?.subtotal)}</strong>
            </div>
            <div>
              <span>Discount</span>
              <strong>{formatCurrency(order.pricing?.discount)}</strong>
            </div>
            <div>
              <span>Shipping</span>
              <strong>{formatCurrency(order.pricing?.shipping)}</strong>
            </div>
            <div>
              <span>Tax</span>
              <strong>{formatCurrency(order.pricing?.tax)}</strong>
            </div>
            <div>
              <span>Total</span>
              <strong>{formatCurrency(order.pricing?.total)}</strong>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Payment Information</h2>
          </div>
          <div className="card-body dl-grid">
            <div>
              <span>Payment Method</span>
              <strong>
                {PAYMENT_METHODS.find((item) => item.value === order.payment?.method)?.label ||
                  order.payment?.method ||
                  '—'}
              </strong>
            </div>
            <div>
              <span>Transaction ID</span>
              <strong>{order.payment?.transactionId || '—'}</strong>
            </div>
            <div>
              <span>Payment Status</span>
              <StatusBadge status={order.payment?.paymentStatus} />
            </div>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <h2>Order Status</h2>
        </div>
        <div className="card-body">
          <ol className="timeline">
            {ORDER_STATUSES.map((item) => {
              const occurred = history.find((entry) => entry.status === item);
              const isCurrent = order.orderStatus === item;
              return (
                <li key={item}>
                  <span className={`timeline-dot ${occurred ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}`} />
                  <div>
                    <strong style={{ textTransform: 'capitalize' }}>{item.replace(/_/g, ' ')}</strong>
                    <p className="muted">
                      {occurred ? formatDateTime(occurred.at) : isCurrent ? 'Current status' : 'Not reached'}
                    </p>
                    {occurred?.note ? <p>{occurred.note}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>

          <form className="form-grid" style={{ marginTop: '1.5rem' }} onSubmit={handleStatusSubmit}>
            <div className="field">
              <label htmlFor="status">Update status</label>
              <select
                id="status"
                className="select"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {ORDER_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="note">Note</label>
              <input
                id="note"
                className="input"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional note"
              />
            </div>
            <div className="field" style={{ justifyContent: 'flex-end' }}>
              <label className="sr-only" htmlFor="updateStatus">
                Save status
              </label>
              <Button id="updateStatus" type="submit" loading={saving}>
                Update Status
              </Button>
            </div>
          </form>
        </div>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm status change"
        message={`Change this order to “${status.replace(/_/g, ' ')}”? This is a sensitive update.`}
        confirmLabel="Confirm"
        danger
        loading={saving}
        onConfirm={applyStatus}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}

export default OrderDetails;
