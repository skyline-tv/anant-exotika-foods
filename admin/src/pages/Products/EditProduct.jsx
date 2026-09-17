import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import ProductForm from '../../components/products/ProductForm';
import Loader from '../../components/common/Loader';
import { getCategories } from '../../services/categoryService';
import { getProductById, getProductBySlug } from '../../services/productService';
import { getErrorMessage } from '../../utils/getErrorMessage';

function EditProduct() {
  const { id } = useParams();
  const location = useLocation();
  const [product, setProduct] = useState(location.state?.product || null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(!location.state?.product);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const cats = await getCategories(true);
        if (active) setCategories(cats);

        if (location.state?.product?._id === id) {
          setLoading(false);
          return;
        }

        let next = null;
        const slug = location.state?.product?.slug;
        if (slug) {
          try {
            next = await getProductBySlug(slug);
          } catch {
            next = null;
          }
        }
        if (!next) {
          next = await getProductById(id);
        }
        if (active) setProduct(next);
      } catch (err) {
        if (active) setError(getErrorMessage(err, 'Unable to load product.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id, location.state]);

  if (loading) return <Loader label="Loading product..." />;
  if (error || !product) {
    return (
      <div className="error-state">
        <h3>Product not found</h3>
        <p>{error || 'This product could not be loaded.'}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Edit Product</h1>
          <p>{product.name}</p>
        </div>
      </div>
      <ProductForm mode="edit" product={product} categories={categories} />
    </div>
  );
}

export default EditProduct;
