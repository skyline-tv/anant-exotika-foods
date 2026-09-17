import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import { useToast } from '../../context/ToastContext';
import useDebounce from '../../hooks/useDebounce';
import { getProducts, updateProductStock } from '../../services/productService';
import { formatCurrency } from '../../utils/formatCurrency';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { getPrimaryImage, getStockStatus } from '../../utils/productHelpers';

function Inventory() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState('');
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: 12, sort: 'newest' };
        if (debouncedSearch) params.search = debouncedSearch;
        const data = await getProducts(params);
        if (!active) return;
        setProducts(data.products || []);
        setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
        setDrafts({});
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

  const saveStock = async (product) => {
    const nextStock = drafts[product._id];
    if (nextStock === undefined || nextStock === '') return;

    setSavingId(product._id);
    try {
      const updated = await updateProductStock(product._id, nextStock);
      setProducts((current) =>
        current.map((item) => (item._id === product._id ? { ...item, ...updated } : item))
      );
      toast.success(`Stock updated for ${product.name}.`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to update stock.'));
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p>Monitor stock levels and make quick updates.</p>
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
            placeholder="Search product or SKU"
          />
        </div>

        {loading ? (
          <Loader label="Loading inventory..." />
        ) : error ? (
          <div className="error-state">
            <h3>Unable to load inventory</h3>
            <p>{error}</p>
          </div>
        ) : products.length === 0 ? (
          <EmptyState icon={Package} title="No Products" message="Add products to manage inventory." />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>MRP</th>
                    <th>Selling Rate</th>
                    <th>Current Stock</th>
                    <th>Low Stock Threshold</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const stockStatus = getStockStatus(product);
                    const rowClass =
                      stockStatus === 'out_of_stock'
                        ? 'stock-out'
                        : stockStatus === 'low_stock'
                          ? 'stock-low'
                          : '';
                    return (
                      <tr key={product._id} className={rowClass}>
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
                        <td>{formatCurrency(product.compareAtPrice || product.mrp)}</td>
                        <td>{formatCurrency(product.price)}</td>
                        <td>
                          <input
                            className="input"
                            type="number"
                            min="0"
                            style={{ minHeight: 36, width: 96 }}
                            value={drafts[product._id] ?? product.stock}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [product._id]: event.target.value,
                              }))
                            }
                            aria-label={`Stock for ${product.name}`}
                          />
                        </td>
                        <td>{product.lowStockThreshold}</td>
                        <td>
                          <StatusBadge status={stockStatus} />
                        </td>
                        <td>
                          <Button
                            size="sm"
                            onClick={() => saveStock(product)}
                            loading={savingId === product._id}
                            disabled={drafts[product._id] === undefined}
                          >
                            Update
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
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

export default Inventory;
