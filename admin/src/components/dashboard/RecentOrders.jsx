import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { getUserName } from '../../utils/productHelpers';
import StatusBadge from '../common/StatusBadge';

function RecentOrders({ orders = [] }) {
  return (
    <section className="card">
      <div className="card-header">
        <h2>Recent Orders</h2>
        <Link className="linkish" to="/orders">
          View all
        </Link>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order Number</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Payment Status</th>
              <th>Order Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order._id}>
                <td>
                  <Link className="linkish" to={`/orders/${order._id}`}>
                    {order.orderNumber}
                  </Link>
                </td>
                <td>{getUserName(order.user)}</td>
                <td>{formatCurrency(order.pricing?.total)}</td>
                <td>
                  <StatusBadge status={order.payment?.paymentStatus} />
                </td>
                <td>
                  <StatusBadge status={order.orderStatus} />
                </td>
                <td>{formatDate(order.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default RecentOrders;
