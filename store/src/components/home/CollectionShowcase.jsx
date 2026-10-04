import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';
import ProductCard from '../product/ProductCard';
import ProductSkeleton from '../common/ProductSkeleton';
import SectionTitle from '../common/SectionTitle';
import { useStoreContent } from '../../context/ContentContext';
import { getProducts } from '../../services/productService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { toTitleCase } from '../../utils/titleCase';

const SHOWCASE_LIMIT = 4;

const haystack = (category) => `${category?.name || ''} ${category?.slug || ''}`.toLowerCase();

const takeBest = (categories, used, score) => {
  const match = categories
    .filter((category) => !used.has(String(category._id)) && category.isActive !== false)
    .map((category) => ({ category, score: score(category) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0];
  return match?.category || null;
};

export function buildCollectionTabs(categories = []) {
  const parents = categories.filter((category) => !category.parentCategory && category.isActive !== false);
  const used = new Set();
  const tabs = [{ id: 'all', slug: '', label: 'All' }];

  const groups = [
    {
      label: 'Almonds',
      score: (category) => (/almond/.test(haystack(category)) && !/hamper/.test(haystack(category)) ? 1 : 0),
    },
    {
      label: 'Cashews',
      score: (category) => (/cashew/.test(haystack(category)) && !/hamper/.test(haystack(category)) ? 1 : 0),
    },
    {
      label: 'Apricots',
      score: (category) => (/apricot/.test(haystack(category)) && !/hamper/.test(haystack(category)) ? 1 : 0),
    },
    {
      label: 'Raisins',
      score: (category) => (/raisin/.test(haystack(category)) && !/hamper/.test(haystack(category)) ? 1 : 0),
    },
    {
      label: 'Mukhwas',
      score: (category) => (/mukhwas/.test(haystack(category)) ? 1 : 0),
    },
    {
      label: 'Gift Hampers',
      score: (category) => {
        const text = haystack(category);
        if (!/hamper/.test(text) || /personal/.test(text)) return 0;
        if (/^gift[-\s]?hampers?$/.test(category.slug || '') || /^gift hampers?$/.test(String(category.name || '').trim().toLowerCase())) {
          return 3;
        }
        return 2;
      },
    },
  ];

  groups.forEach((group) => {
    const category = takeBest(parents, used, group.score);
    if (!category) return;
    used.add(String(category._id));
    tabs.push({ id: String(category._id), slug: category.slug, label: group.label });
  });

  parents.forEach((category) => {
    if (used.has(String(category._id))) return;
    tabs.push({
      id: String(category._id),
      slug: category.slug,
      label: toTitleCase(category.name),
    });
  });

  return tabs;
}

export function orderedHomeCategories(categories = [], content) {
  const featuredIds = (content?.featuredCategoryIds || [])
    .map((item) => item?._id || item)
    .filter(Boolean);
  const ordered = orderCollectionTabs(buildCollectionTabs(categories), content?.collectionOrder)
    .filter((tab) => tab.id !== 'all')
    .map((tab) => categories.find((category) => String(category._id) === tab.id))
    .filter((category) => category && category.isActive !== false);

  if (!featuredIds.length) return ordered;
  const featured = ordered.filter((category) => featuredIds.some((id) => String(id) === String(category._id)));
  return featured.length ? featured : ordered;
}

export function orderCollectionTabs(tabs, order = []) {
  const rank = new Map((order || []).map((id, index) => [String(id), index]));
  if (!rank.size) return tabs;
  return tabs
    .map((tab, index) => ({ tab, index }))
    .sort((left, right) => {
      const leftRank = rank.has(left.tab.id) ? rank.get(left.tab.id) : Number.MAX_SAFE_INTEGER;
      const rightRank = rank.has(right.tab.id) ? rank.get(right.tab.id) : Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return left.index - right.index;
    })
    .map((item) => item.tab);
}

const chosenProducts = (collection, tab) => {
  const match = (collection || []).find((entry) => {
    const id = entry?.category?._id || entry?.category || '';
    if (tab.id === 'all') return !id;
    return String(id) === String(tab.id);
  });
  return (match?.products || [])
    .filter((product) => product && typeof product === 'object' && product.name && product.status !== 'inactive' && product.status !== 'draft')
    .slice(0, SHOWCASE_LIMIT);
};

const CollectionShowcase = ({ categories = [] }) => {
  const { content } = useStoreContent();
  const tabs = useMemo(
    () => orderCollectionTabs(buildCollectionTabs(categories), content?.collectionOrder),
    [categories, content?.collectionOrder]
  );
  const [activeId, setActiveId] = useState('all');
  const [products, setProducts] = useState([]);
  const cacheRef = useRef({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const active = tabs.find((tab) => tab.id === activeId) || tabs[0];
  const viewAllTo = active.slug ? `/shop/${active.slug}` : '/shop';

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeId)) setActiveId('all');
  }, [tabs, activeId]);

  useEffect(() => {
    const chosen = chosenProducts(content?.collection, active);
    if (chosen.length) {
      cacheRef.current[active.id] = chosen;
      setProducts(chosen);
      setLoading(false);
      setError('');
      return undefined;
    }

    const cached = cacheRef.current[active.id];
    if (cached) {
      setProducts(cached);
      setLoading(false);
      setError('');
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    const params = { limit: SHOWCASE_LIMIT, sort: 'featured' };
    if (active.slug) params.category = active.slug;

    getProducts(params)
      .then((data) => {
        if (cancelled) return;
        const next = (data.products || []).slice(0, SHOWCASE_LIMIT);
        cacheRef.current[active.id] = next;
        setProducts(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setProducts([]);
          setError(getErrorMessage(err, 'Unable to load this collection.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active.id, active.slug, content?.collection]);

  return (
    <section className="section section--ivory" aria-label="The Collection">
      <div className="container">
        <div className="section-heading-row">
          <SectionTitle
            align="left"
            title="The Collection"
            subtitle="Four pieces from the category you choose. New products appear here as they are added."
          />
          <Button as={Link} to={viewAllTo} variant="ghost" className="hide-mobile">
            View All
          </Button>
        </div>

        <div className="collection-tabs" role="tablist" aria-label="Collection categories">
          {tabs.map((tab) => {
            const selected = tab.id === active.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`collection-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls="collection-panel"
                className={selected ? 'is-active' : undefined}
                onClick={() => setActiveId(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          id="collection-panel"
          role="tabpanel"
          aria-labelledby={`collection-tab-${active.id}`}
          className={loading && products.length ? 'collection-panel is-switching' : 'collection-panel'}
        >
          {loading && !products.length ? (
            <ProductSkeleton count={SHOWCASE_LIMIT} />
          ) : error ? (
            <EmptyState title="Unable To Load Products" message={error} actionLabel="View All" actionTo={viewAllTo} />
          ) : products.length === 0 ? (
            <EmptyState
              title="Nothing In This Category Yet"
              message="Products published in this category will appear here."
              actionLabel="View All"
              actionTo={viewAllTo}
            />
          ) : (
            <div className="product-grid collection-grid">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>

        <div className="home-view-all show-mobile-only">
          <Button as={Link} to={viewAllTo} variant="outline" className="btn--full">
            View All
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CollectionShowcase;
