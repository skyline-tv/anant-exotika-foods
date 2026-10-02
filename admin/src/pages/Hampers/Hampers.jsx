import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import StatusBadge from '../../components/common/StatusBadge';
import { getProducts } from '../../services/productService';
import { formatCurrency } from '../../utils/formatCurrency';
import { getErrorMessage } from '../../utils/getErrorMessage';

function Hampers() {
  const [hampers, setHampers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getProducts({ isPersonalizedHamper: true, limit: 100, sort: 'newest' })
      .then((data) => setHampers(data.products || []))
      .catch((err) => setError(getErrorMessage(err, 'Unable to load hampers.')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Personalized Gift Hampers</h1>
          <p>Fixed hampers. Customers only choose from the products you allow in each slot.</p>
        </div>
        <Link className="btn btn--primary" to="/hampers/new">
          <Plus size={16} /> New hamper
        </Link>
      </header>

      {loading ? <Loader label="Loading hampers" /> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {!loading && !error && hampers.length === 0 ? (
        <EmptyState title="No hampers yet" message="Create a predefined hamper and choose which products belong in each slot." />
      ) : null}

      {hampers.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Hamper</th>
                <th>Price</th>
                <th>Slots</th>
                <th>Stock</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {hampers.map((hamper) => (
                <tr key={hamper._id}>
                  <td>{hamper.name}</td>
                  <td>{formatCurrency(hamper.price)}</td>
                  <td>{hamper.slots?.length || 0}</td>
                  <td>{hamper.stock}</td>
                  <td><StatusBadge status={hamper.status} /></td>
                  <td>
                    <Link to={`/hampers/${hamper._id}`}>Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export default Hampers;
