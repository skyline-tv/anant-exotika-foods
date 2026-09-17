import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { searchProducts } from '../../services/productService';
import { getPrimaryImage } from '../../utils/productHelpers';
import { formatCurrency } from '../../utils/formatCurrency';
import './SearchOverlay.css';

const RECENT_KEY = 'anant_recent_searches';

const readRecent = () => {
  try {
    const stored = JSON.parse(sessionStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(stored) ? stored.slice(0, 6) : [];
  } catch {
    return [];
  }
};

const SearchOverlay = ({ open, onClose, categories = [] }) => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recent, setRecent] = useState(readRecent);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setResults([]);
    setRecent(readRecent());
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const value = query.trim();
    if (value.length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    const timer = window.setTimeout(() => {
      searchProducts({ q: value, limit: 6 })
        .then((data) => {
          if (active) setResults(data.products || []);
        })
        .catch(() => {
          if (active) setResults([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, open]);

  const persistQuery = (value) => {
    const next = [value, ...readRecent().filter((item) => item !== value)].slice(0, 6);
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const goToSearch = (value) => {
    const next = (value || query).trim();
    if (!next) return;
    persistQuery(next);
    onClose();
    navigate(`/search?q=${encodeURIComponent(next)}`);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    goToSearch(query);
  };

  if (!open) return null;

  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search">
      <button type="button" className="search-overlay__backdrop" aria-label="Close search" onClick={onClose} />
      <div className="search-overlay__panel">
        <form className="search-overlay__form" onSubmit={handleSubmit}>
          <Search size={22} strokeWidth={1.4} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products"
            aria-label="Search products"
          />
          <button type="button" onClick={onClose} aria-label="Close search">
            <X size={22} strokeWidth={1.4} />
          </button>
        </form>

        <div className="search-overlay__body">
          {query.trim().length >= 2 ? (
            <div>
              <p className="search-overlay__label">{loading ? 'Searching' : 'Results'}</p>
              {results.length ? (
                <ul className="search-overlay__results">
                  {results.map((product) => (
                    <li key={product._id}>
                      <Link
                        to={`/product/${product.slug}`}
                        onClick={() => {
                          persistQuery(query.trim());
                          onClose();
                        }}
                      >
                        {getPrimaryImage(product) ? (
                          <img src={getPrimaryImage(product)} alt="" />
                        ) : (
                          <span className="search-overlay__thumb" />
                        )}
                        <span>
                          <strong>{product.name}</strong>
                          <em>{formatCurrency(product.price)}</em>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : !loading ? (
                <p className="search-overlay__empty">No products matched that search.</p>
              ) : null}
              <button type="button" className="text-link" onClick={() => goToSearch(query)}>
                View all results
              </button>
            </div>
          ) : (
            <div className="search-overlay__suggest">
              {recent.length ? (
                <div>
                  <p className="search-overlay__label">Recent</p>
                  <ul>
                    {recent.map((item) => (
                      <li key={item}>
                        <button type="button" onClick={() => goToSearch(item)}>
                          {item}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {categories.length ? (
                <div>
                  <p className="search-overlay__label">Explore</p>
                  <ul>
                    {categories.slice(0, 6).map((category) => (
                      <li key={category._id}>
                        <Link to={`/shop/${category.slug}`} onClick={onClose}>
                          {category.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
