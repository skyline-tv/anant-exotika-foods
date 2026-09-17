import { useEffect, useState } from 'react';
import ProductForm from '../../components/products/ProductForm';
import Loader from '../../components/common/Loader';
import { getCategories } from '../../services/categoryService';
import { getErrorMessage } from '../../utils/getErrorMessage';

function AddProduct() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories(true)
      .then(setCategories)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Loading product form..." />;
  if (error) {
    return (
      <div className="error-state">
        <h3>Unable to load categories</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Add Product</h1>
          <p>Create a new catalogue item.</p>
        </div>
      </div>
      <ProductForm mode="create" categories={categories} />
    </div>
  );
}

export default AddProduct;
