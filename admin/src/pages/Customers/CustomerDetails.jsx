import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Loader from '../../components/common/Loader';
import StatusBadge from '../../components/common/StatusBadge';
import { getCustomerById } from '../../services/customerService';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { getErrorMessage } from '../../utils/getErrorMessage';

function CustomerDetails() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getCustomerById(id)
      .then((data) => {
        if (active) setCustomer(data);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Unable to load customer.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <Loader label="Loading customer..." />;
  if (error || !customer) {
    return (
      <div className="error-state">
        <h3>Customer not found</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>{customer.name}</h1>
          <p>Joined {formatDate(customer.joinedAt)}</p>
        </div>
        <StatusBadge status={customer.status} />
      </div>

      <div className="detail-grid">
        <section className="card">
          <div className="card-header">
            <h2>Customer Profile</h2>
          </div>
          <div className="card-body dl-grid">
            <div>
              <span>Name</span>
              <strong>{customer.name}</strong>
            </div>
            <div>
              <span>Account status</span>
              <StatusBadge status={customer.status} />
            </div>
            <div>
              <span>Orders</span>
              <strong>{customer.ordersCount}</strong>
            </div>
            <div>
              <span>Total spent</span>
              <strong>{formatCurrency(customer.totalSpent)}</strong>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Contact Information</h2>
          </div>
          <div className="card-body dl-grid">
            <div>
              <span>Email</span>
              <strong>{customer.email || '—'}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{customer.phone || '—'}</strong>
            </div>
            <div>
              <span>Joined date</span>
              <strong>{formatDate(customer.joinedAt)}</strong>
            </div>
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <h2>Addresses</h2>
        </div>
        {(customer.addresses || []).length === 0 ? (
          <div className="card-body muted">No saved addresses yet.</div>
        ) : (
          <div className="card-body" style={{ display: 'grid', gap: '1rem' }}>
            {(customer.addresses || []).map((address) => (
              <article key={address._id || address._key} className="card" style={{ boxShadow: 'none' }}>
                <div className="card-body">
                  <strong>{address.fullName}</strong>
                  <p>
                    {address.addressLine1}
                    {address.addressLine2 ? `, ${address.addressLine2}` : ''}
                  </p>
                  <p>
                    {address.city}, {address.state} {address.postalCode}
                  </p>
                  <p className="muted">{address.phone}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Order History</h2>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(customer.orders || []).map((order) => (
                <tr key={order._id}>
                  <td>
                    <Link className="linkish" to={`/orders/${order._id}`}>
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>{formatCurrency(order.pricing?.total)}</td>
                  <td>
                    <StatusBadge status={order.orderStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default CustomerDetails;
