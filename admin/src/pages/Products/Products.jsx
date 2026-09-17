import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ImageOff, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import { useToast } from '../../context/ToastContext';
import useDebounce from '../../hooks/useDebounce';
import { deleteProduct, getProducts } from '../../services/productService';
import { getCategories } from '../../services/categoryService';
import { PRODUCT_SORT_OPTIONS, PRODUCT_STATUSES } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { getCategoryName, getPrimaryImage } from '../../utils/productHelpers';

function Products() {
  const navigate = useNavigate();
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 12 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    getCategories(true)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {
          page,
          limit: 12,
          sort,
        };
        if (debouncedSearch) params.search = debouncedSearch;
        if (category) params.category = category;
        if (status) params.status = status;

        const data = await getProducts(params);
        if (!active) return;
        setProducts(data.products || []);
        setPagination(data.pagination || { page: 1, pages: 1, total: 0, limit: 12 });
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
  }, [debouncedSearch, category, status, sort, page]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteProduct(pendingDelete._id);
      setProducts((current) => current.filter((item) => item._id !== pendingDelete._id));
      toast.success('Product deleted.');
      setPendingDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to delete product.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Manage catalogue, pricing, and visibility.</p>
        </div>
        <div className="page-actions">
          <Button onClick={() => navigate('/products/add')}>
            <Plus size={16} />
            Add Product
          </Button>
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
            placeholder="Search products, SKU or brand"
          />
          <div className="field">
            <label className="sr-only" htmlFor="categoryFilter">
              Category
            </label>
            <select
              id="categoryFilter"
              className="select"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="statusFilter">
              Status
            </label>
            <select
              id="statusFilter"
              className="select"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {PRODUCT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="sr-only" htmlFor="sort">
              Sort
            </label>
            <select
              id="sort"
              className="select"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              {PRODUCT_SORT_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <Loader label="Loading products..." />
        ) : error ? (
          <div className="error-state">
            <h3>Unable to load products</h3>
            <p>{error}</p>
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No Products"
            message="Start by adding your first catalogue piece."
            actionLabel="Add Product"
            onAction={() => navigate('/products/add')}
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>MRP</th>
                    <th>Selling Rate</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const image = getPrimaryImage(product);
                    return (
                      <tr key={product._id}>
                        <td>
                          {image ? (
                            <img className="thumb" src={image} alt={product.name} />
                          ) : (
                            <div className="thumb thumb-placeholder" aria-hidden="true">
                              <ImageOff size={16} />
                            </div>
                          )}
                        </td>
                        <td className="cell-wrap">{product.name}</td>
                        <td>{product.sku}</td>
                        <td>{getCategoryName(product.category)}</td>
                        <td>{formatCurrency(product.compareAtPrice || product.mrp)}</td>
                        <td>{formatCurrency(product.price)}</td>
                        <td>{product.stock}</td>
                        <td>
                          <StatusBadge status={product.status} />
                        </td>
                        <td>
                          <div className="row-actions">
                            <Link
                              className="btn btn--ghost btn--icon"
                              to={`/products/${product._id}/edit`}
                              state={{ product }}
                              aria-label={`Edit ${product.name}`}
                            >
                              <Pencil size={16} />
                            </Link>
                            <button
                              type="button"
                              className="btn btn--ghost btn--icon"
                              onClick={() => setPendingDelete(product)}
                              aria-label={`Delete ${product.name}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
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

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete product"
        message={`Delete “${pendingDelete?.name}”? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

export default Products;
