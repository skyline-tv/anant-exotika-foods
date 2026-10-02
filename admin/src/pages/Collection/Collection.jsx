import { useEffect, useMemo, useState } from 'react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useToast } from '../../context/ToastContext';
import { getCategories } from '../../services/categoryService';
import { getStoreContent, updateStoreContent } from '../../services/contentService';
import { getProducts } from '../../services/productService';
import { getErrorMessage } from '../../utils/getErrorMessage';

const LIMIT = 4;

const categoryId = (value) => String(value?._id || value || '');

const productCategoryIds = (product) =>
  [product?.category, ...(product?.categories || []), product?.subCategory]
    .map(categoryId)
    .filter(Boolean);

const picksFromContent = (collection = []) => {
  const picks = { all: [] };
  collection.forEach((entry) => {
    const key = categoryId(entry.category) || 'all';
    picks[key] = (entry.products || []).map(categoryId).filter(Boolean).slice(0, LIMIT);
  });
  return picks;
};

function Collection() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [picks, setPicks] = useState({ all: [] });
  const [active, setActive] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      const products = [];
      let page = 1;
      let pages = 1;
      while (page <= pages) {
        const data = await getProducts({ status: 'active', limit: 50, page, sort: 'name_asc' });
        products.push(...(data.products || []));
        pages = data.pagination?.pages || 1;
        page += 1;
      }
      return products;
    };

    Promise.all([getCategories(true), getStoreContent(), loadCatalog()])
      .then(([categoryList, content, products]) => {
        if (cancelled) return;
        setCategories((categoryList || []).filter((category) => category.isActive !== false && !category.parentCategory));
        setCatalog(products);
        setPicks(picksFromContent(content?.collection));
      })
      .catch((error) => toast.error(getErrorMessage(error, 'Unable to load The Collection.')))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [toast]);

  const selected = picks[active] || [];
  const query = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      catalog.filter((product) => {
        const matchesCategory = active === 'all' || productCategoryIds(product).includes(active);
        const matchesSearch = !query || String(product.name || '').toLowerCase().includes(query);
        return matchesCategory && matchesSearch;
      }),
    [catalog, active, query]
  );
  const catalogById = useMemo(() => new Map(catalog.map((product) => [product._id, product])), [catalog]);

  const toggleProduct = (id) => {
    const list = picks[active] || [];
    if (!list.includes(id) && list.length >= LIMIT) {
      toast.error('Choose only 4 products for this category.');
      return;
    }
    setPicks((current) => {
      const next = current[active] || [];
      return {
        ...current,
        [active]: next.includes(id) ? next.filter((entry) => entry !== id) : [...next, id],
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const collection = Object.entries(picks)
        .filter(([, products]) => products.length)
        .map(([key, products]) => ({
          category: key === 'all' ? null : key,
          products: products.slice(0, LIMIT),
        }));
      const saved = await updateStoreContent({ collection });
      setPicks(picksFromContent(saved?.collection));
      toast.success('The Collection was saved.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to save The Collection.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader label="Loading collection" />;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>The Collection</h1>
          <p>Choose 4 products for each category. The homepage shows those products when that category is selected.</p>
        </div>
        <Button type="button" onClick={handleSave} loading={saving}>
          Save collection
        </Button>
      </header>

      <div className="card">
        <div className="card-body form-section">
          <div className="hamper-filters" role="tablist" aria-label="Collection categories">
            <button type="button" className={active === 'all' ? 'is-active' : undefined} onClick={() => setActive('all')}>
              All
            </button>
            {categories.map((category) => (
              <button
                key={category._id}
                type="button"
                className={active === category._id ? 'is-active' : undefined}
                onClick={() => setActive(category._id)}
              >
                {category.name}
              </button>
            ))}
          </div>

          <p className="hint">{selected.length} of 4 selected</p>
          <ol className="collection-selected">
            {Array.from({ length: LIMIT }, (_, index) => {
              const product = catalogById.get(selected[index]);
              return <li key={selected[index] || `empty-${index}`}>{product?.name || 'Empty'}</li>;
            })}
          </ol>

          <input className="input" value={search} placeholder="Search products" onChange={(event) => setSearch(event.target.value)} />

          <div className="category-picker" role="group" aria-label="Products for this category">
            {visible.length === 0 ? (
              <p className="hint">No products in this category.</p>
            ) : (
              visible.map((product) => {
                const checked = selected.includes(product._id);
                return (
                  <label key={product._id} className="checkbox-row">
                    <input type="checkbox" checked={checked} onChange={() => toggleProduct(product._id)} />
                    {product.name}
                    {checked ? ` · ${selected.indexOf(product._id) + 1}` : ''}
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Collection;
