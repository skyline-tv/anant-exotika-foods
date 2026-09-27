import { useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import { getProducts } from '../../services/productService';

const SuggestedProducts = ({ title = 'Continue exploring', eyebrow = 'From the collection' }) => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let active = true;
    getProducts({ limit: 4, sort: 'newest' })
      .then((data) => {
        if (active) setProducts((data.products || []).slice(0, 4));
      })
      .catch(() => {
        if (active) setProducts([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!products.length) return null;

  return (
    <section className="suggested">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
};

export default SuggestedProducts;
