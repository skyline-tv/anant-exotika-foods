import { useEffect, useState } from 'react';
import { Inbox } from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import { getLeads } from '../../services/leadService';
import { formatDateTime } from '../../utils/formatDate';
import { getErrorMessage } from '../../utils/getErrorMessage';

const OCCASIONS = [
  'Corporate Gifting',
  'Weddings',
  'Birthdays & Anniversaries',
  'Festivals & Celebrations',
  'Return Gifts',
  'Housewarming',
  'Baby Celebrations',
  'Special Moments',
];

function Leads() {
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [occasion, setOccasion] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getLeads({
          page,
          limit: 20,
          search: search.trim(),
          occasion,
        });
        if (!active) return;
        setLeads(data.leads);
        setPagination(data.pagination);
      } catch (err) {
        if (active) setError(getErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    };

    const timer = window.setTimeout(load, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [page, search, occasion]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Leads</h1>
          <p>Gift enquiries submitted from the storefront.</p>
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
            placeholder="Search name, phone, email or note"
          />
          <label className="field" htmlFor="lead-occasion">
            <span className="sr-only">Occasion</span>
            <select
              id="lead-occasion"
              className="input"
              value={occasion}
              onChange={(event) => {
                setOccasion(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All occasions</option>
              {OCCASIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <Loader label="Loading leads..." />
        ) : error ? (
          <div className="error-state">
            <h3>Unable to load leads</h3>
            <p>{error}</p>
          </div>
        ) : leads.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No Leads"
            message="Enquiries from the customised gifts section will appear here."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Received</th>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Occasion</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead._id}>
                      <td>{formatDateTime(lead.createdAt)}</td>
                      <td>{lead.name}</td>
                      <td>{lead.phone}</td>
                      <td>{lead.email}</td>
                      <td>{lead.occasion}</td>
                      <td className="cell-wrap">{lead.message || '—'}</td>
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

export default Leads;
