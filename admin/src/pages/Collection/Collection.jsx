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

const toTitleCase = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/(^|[\s\-/])([a-z0-9])/g, (match, separator, character) => separator + character.toUpperCase());

const haystack = (category) => `${category?.name || ''} ${category?.slug || ''}`.toLowerCase();

const takeBest = (categories, used, score) => {
  const match = categories
    .filter((category) => !used.has(String(category._id)) && category.isActive !== false)
    .map((category) => ({ category, score: score(category) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0];
  return match?.category || null;
};

function buildCollectionTabs(categories = []) {
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

const orderTabs = (tabs, order = []) => {
  const byId = new Map(tabs.map((tab) => [tab.id, tab]));
  const saved = order.filter((id) => byId.has(id)).map((id) => byId.get(id));
  const rest = tabs.filter((tab) => !order.includes(tab.id));
  return [...saved, ...rest];
};

const picksFromContent = (collection = []) => {
  const picks = { all: [] };
  collection.forEach((entry) => {
    const key = categoryId(entry.category) || 'all';
    picks[key] = (entry.products || []).map(categoryId).filter(Boolean).slice(0, LIMIT);
  });
  return picks;
};

const productCategoryIds = (product) =>
  [product?.category, ...(product?.categories || []), product?.subCategory]
    .map(categoryId)
    .filter(Boolean);

function Collection() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [picks, setPicks] = useState({ all: [] });
  const [order, setOrder] = useState([]);
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
        setOrder((content?.collectionOrder || []).map((id) => String(id)));
      })
      .catch((error) => toast.error(getErrorMessage(error, 'Unable to load The Collection.')))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [toast]);

  const tabs = useMemo(() => buildCollectionTabs(categories), [categories]);
  const orderedTabs = useMemo(() => orderTabs(tabs, order), [tabs, order]);
  const activeTab = orderedTabs.find((tab) => tab.id === active) || orderedTabs[0];
  const selected = picks[activeTab?.id || 'all'] || [];
  const query = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      catalog.filter((product) => {
        const matchesCategory = !activeTab || activeTab.id === 'all' || productCategoryIds(product).includes(activeTab.id);
        const matchesSearch = !query || String(product.name || '').toLowerCase().includes(query);
        return matchesCategory && matchesSearch;
      }),
    [catalog, activeTab, query]
  );
  const catalogById = useMemo(() => new Map(catalog.map((product) => [product._id, product])), [catalog]);

  useEffect(() => {
    if (orderedTabs.length && !orderedTabs.some((tab) => tab.id === active)) {
      setActive(orderedTabs[0].id);
    }
  }, [orderedTabs, active]);

  const currentOrder = () => {
    const ids = orderedTabs.map((tab) => tab.id);
    return ids.length ? ids : tabs.map((tab) => tab.id);
  };

  const moveTab = (id, direction) => {
    const list = currentOrder();
    const index = list.indexOf(id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= list.length) return;
    const copy = [...list];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    setOrder(copy);
  };

  const toggleProduct = (id) => {
    const key = activeTab?.id || 'all';
    const list = picks[key] || [];
    if (!list.includes(id) && list.length >= LIMIT) {
      toast.error('Choose only 4 products for this category.');
      return;
    }
    setPicks((current) => {
      const next = current[key] || [];
      return {
        ...current,
        [key]: next.includes(id) ? next.filter((entry) => entry !== id) : [...next, id],
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
      const saved = await updateStoreContent({
        collection,
        collectionOrder: currentOrder(),
      });
      setPicks(picksFromContent(saved?.collection));
      setOrder((saved?.collectionOrder || []).map((id) => String(id)));
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
          <p>Set which category comes first, then choose 4 products for each category. The homepage uses this order.</p>
        </div>
        <Button type="button" onClick={handleSave} loading={saving}>
          Save collection
        </Button>
      </header>

      <div className="card">
        <div className="card-body form-section">
          <p className="field-label">Category order</p>
          <p className="hint">The category at the top is shown first. Select a category to choose its products.</p>
          <ol className="collection-order">
            {orderedTabs.map((tab, index) => (
              <li key={tab.id} className={tab.id === activeTab?.id ? 'is-active' : undefined}>
                <button type="button" className="collection-order__name" onClick={() => setActive(tab.id)}>
                  <span>{index + 1}</span>
                  {tab.label}
                </button>
                <div className="collection-order__actions">
                  <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => moveTab(tab.id, -1)}>
                    Up
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === orderedTabs.length - 1}
                    onClick={() => moveTab(tab.id, 1)}
                  >
                    Down
                  </Button>
                </div>
              </li>
            ))}
          </ol>

          <p className="field-label">Products for {activeTab?.label || 'All'}</p>
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
