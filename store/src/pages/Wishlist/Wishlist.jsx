import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import ProductCard from '../../components/product/ProductCard';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';

const Wishlist = () => {
  const { isAuthenticated } = useAuth();
  const { products, loading } = useWishlist();

  if (!isAuthenticated) {
    return (
      <section className="page-shell">
        <div className="container">
          <EmptyState
            title="Save what you love."
            message="Log in to keep a wishlist of dry fruits and hampers."
            actionLabel="Login"
            actionTo="/login"
          />
        </div>
      </section>
    );
  }

  if (loading) return <Loader label="Loading wishlist" />;

  if (!products.length) {
    return (
      <section className="page-shell">
        <div className="container">
          <EmptyState
            title="Save what you love."
            message="Tap the heart on any product to return to it later."
            actionLabel="Explore the collection"
            actionTo="/shop"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <div className="container">
        <PageHeader eyebrow="Wishlist" title="Saved for later" />
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
        <div style={{ marginTop: '2rem' }}>
          <Button as={Link} to="/shop" variant="secondary">
            Continue shopping
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Wishlist;
