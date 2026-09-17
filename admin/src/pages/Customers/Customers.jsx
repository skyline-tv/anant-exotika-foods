import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import useDebounce from '../../hooks/useDebounce';
import { getCustomers } from '../../services/customerService';
import { formatDate } from '../../utils/formatDate';
import { getErrorMessage } from '../../utils/getErrorMessage';

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
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
        const data = await getCustomers({ page, limit: 12, search: debouncedSearch });
        if (!active) return;
        setCustomers(data.customers);
        setPagination(data.pagination);
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
  }, [page, debouncedSearch]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>View registered store customers.</p>
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
            placeholder="Search name, email or phone"
          />
        </div>

        {loading ? (
          <Loader label="Loading customers..." />
        ) : error ? (
          <div className="error-state">
            <h3>Unable to load customers</h3>
            <p>{error}</p>
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Customers"
            message="Registered customers will appear here."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Orders</th>
                    <th>Joined Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer._id}>
                      <td>{customer.name}</td>
                      <td>{customer.email || '—'}</td>
                      <td>{customer.phone || '—'}</td>
                      <td>{customer.ordersCount}</td>
                      <td>{formatDate(customer.joinedAt)}</td>
                      <td>
                        <StatusBadge status={customer.status} />
                      </td>
                      <td>
                        <Link className="linkish" to={`/customers/${customer._id}`}>
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

export default Customers;
