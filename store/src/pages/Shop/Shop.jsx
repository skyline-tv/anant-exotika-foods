import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import ProductCard from '../../components/product/ProductCard';
import ProductSkeleton from '../../components/common/ProductSkeleton';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import { getCategories } from '../../services/categoryService';
import { getProducts } from '../../services/productService';
import { PRODUCT_SORT_OPTIONS } from '../../utils/constants';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { getParentCategories } from '../../utils/categories';
import { isOutOfStock } from '../../utils/productHelpers';

const SPECIAL_SLUGS = {
  'new-arrivals': { title: 'New Arrivals', newArrival: true },
  featured: { title: 'Featured Collection', featured: true },
};

const Shop = () => {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftMin, setDraftMin] = useState('');
  const [draftMax, setDraftMax] = useState('');

  const page = Number(searchParams.get('page') || 1);
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const search = searchParams.get('search') || '';
  const availability = searchParams.get('availability') || '';
  const special = SPECIAL_SLUGS[category];

  const parentCategories = getParentCategories(categories);
  const activeCategory = parentCategories.find((item) => item.slug === category);

  const title = useMemo(() => {
    if (special) return special.title;
    if (activeCategory) return activeCategory.name;
    if (category) return category.replace(/-/g, ' ');
    return 'The Collection';
  }, [activeCategory, category, special]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setDraftMin(minPrice);
    setDraftMax(maxPrice);
  }, [minPrice, maxPrice]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit: 12, sort };
        if (search) params.search = search;
        if (minPrice) params.minPrice = minPrice;
        if (maxPrice) params.maxPrice = maxPrice;
        if (special?.featured) params.featured = true;
        if (special?.newArrival) params.newArrival = true;
        if (category && !special) params.category = category;

        const data = await getProducts(params);
        if (!active) return;
        setProducts(data.products || []);
        setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'Unable to load products.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [category, page, sort, minPrice, maxPrice, search, special]);

  useEffect(() => {
    document.body.style.overflow = filtersOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [filtersOpen]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  const applyPrice = () => {
    const next = new URLSearchParams(searchParams);
    if (draftMin) next.set('minPrice', draftMin);
    else next.delete('minPrice');
    if (draftMax) next.set('maxPrice', draftMax);
    else next.delete('maxPrice');
    next.delete('page');
    setSearchParams(next);
    setFiltersOpen(false);
  };

  const visibleProducts = useMemo(() => {
    if (availability === 'in_stock') return products.filter((item) => !isOutOfStock(item));
    if (availability === 'out_of_stock') return products.filter((item) => isOutOfStock(item));
    return products;
  }, [availability, products]);

  const crumbs = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/shop' },
    ...(category ? [{ label: title }] : []),
  ];

  const filters = (
    <>
      <div className="filter-group">
        <strong>Category</strong>
        <Link to="/shop" className={!category ? 'is-active' : undefined} onClick={() => setFiltersOpen(false)}>
          All products
        </Link>
        {parentCategories.map((item) => (
          <Link
            key={item._id}
            to={`/shop/${item.slug}`}
            className={category === item.slug ? 'is-active' : undefined}
            onClick={() => setFiltersOpen(false)}
          >
            {item.name}
          </Link>
        ))}
      </div>
      <div className="filter-group">
        <strong>Price range</strong>
        <label htmlFor="minPrice">Minimum</label>
        <input id="minPrice" type="number" min="0" value={draftMin} onChange={(event) => setDraftMin(event.target.value)} />
        <label htmlFor="maxPrice">Maximum</label>
        <input id="maxPrice" type="number" min="0" value={draftMax} onChange={(event) => setDraftMax(event.target.value)} />
        <Button type="button" variant="secondary" size="sm" onClick={applyPrice}>
          Apply
        </Button>
      </div>
      <div className="filter-group">
        <strong>Availability</strong>
        <button type="button" className={!availability ? 'is-active' : undefined} onClick={() => updateParam('availability', '')}>
          All
        </button>
        <button
          type="button"
          className={availability === 'in_stock' ? 'is-active' : undefined}
          onClick={() => updateParam('availability', 'in_stock')}
        >
          In stock
        </button>
      </div>
    </>
  );

  return (
    <section className="page-shell">
      <div className="container">
        <PageHeader
          title={title}
          subtitle={
            activeCategory?.description ||
            'Discover exceptional pieces curated for elegance, beauty and exclusivity.'
          }
          crumbs={crumbs}
        />

        <div className="shop-layout">
          <div>
            <div className="shop-toolbar">
              <p>{pagination.total || 0} pieces</p>
              <div className="shop-toolbar__actions">
                <button type="button" className="filter-trigger" onClick={() => setFiltersOpen(true)}>
                  <SlidersHorizontal size={16} strokeWidth={1.5} />
                  Filter
                </button>
                <label className="sr-only" htmlFor="shop-sort">
                  Sort
                </label>
                <select id="shop-sort" value={sort} onChange={(event) => updateParam('sort', event.target.value)}>
                  {PRODUCT_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <ProductSkeleton count={8} />
            ) : error ? (
              <EmptyState title="Unable to load shop" message={error} />
            ) : visibleProducts.length === 0 ? (
              <EmptyState
                title="No products found"
                message="Try another collection or refine your filters."
                actionLabel="Clear filters"
                actionTo="/shop"
              />
            ) : (
              <>
                <div className="product-grid">
                  {visibleProducts.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
                {pagination.pages > 1 ? (
                  <div className="pagination">
                    {Array.from({ length: pagination.pages }, (_, index) => index + 1).map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={item === pagination.page ? 'is-active' : undefined}
                        onClick={() => updateParam('page', String(item))}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      <div className={`filter-overlay ${filtersOpen ? 'is-open' : ''}`} onClick={() => setFiltersOpen(false)} />
      <aside className={`filter-drawer ${filtersOpen ? 'is-open' : ''}`} aria-hidden={!filtersOpen} aria-label="Filters">
        <div className="filter-drawer__header">
          <h2>Filters</h2>
          <button type="button" className="site-header__icon-btn" aria-label="Close filters" onClick={() => setFiltersOpen(false)}>
            <X size={20} strokeWidth={1.4} />
          </button>
        </div>
        {filters}
      </aside>
    </section>
  );
};

export default Shop;
