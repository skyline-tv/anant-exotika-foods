import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import ProductCard from '../../components/product/ProductCard';
import { searchProducts } from '../../services/productService';
import { getErrorMessage } from '../../utils/getErrorMessage';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [draft, setDraft] = useState(query);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(query);
    if (!query.trim()) {
      setProducts([]);
      setError('');
      return;
    }

    let active = true;
    setLoading(true);
    setError('');
    searchProducts({ q: query.trim(), limit: 12 })
      .then((data) => {
        if (active) setProducts(data.products || []);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Unable to search products.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [query]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSearchParams(draft.trim() ? { q: draft.trim() } : {});
  };

  return (
    <section className="page-shell">
      <div className="container">
        <PageHeader eyebrow="Search" title="Search" subtitle="Find dry fruits, hampers and gifts by name." />
        <form className="search-page-form" onSubmit={handleSubmit}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search products"
            aria-label="Search products"
          />
          <Button type="submit">Search</Button>
        </form>
        {!query ? (
          <EmptyState title="Begin with a word" message="Enter a product name or category." />
        ) : loading ? (
          <Loader label="Searching" />
        ) : error ? (
          <EmptyState title="Search unavailable" message={error} />
        ) : products.length === 0 ? (
          <EmptyState title="No matches" message={`Nothing found for “${query}”.`} actionLabel="Explore collection" actionTo="/shop" />
        ) : (
          <div className="product-grid" style={{ marginTop: '2rem' }}>
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Search;
