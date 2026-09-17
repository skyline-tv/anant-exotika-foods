import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Trash2, Upload } from 'lucide-react';
import { PRODUCT_STATUSES } from '../../utils/constants';
import { getFieldErrors, getErrorMessage } from '../../utils/getErrorMessage';
import { slugify } from '../../utils/slugify';
import { createProduct, updateProduct } from '../../services/productService';
import { uploadImages } from '../../services/uploadService';
import { useToast } from '../../context/ToastContext';
import { resolveAssetUrl } from '../../utils/assetUrl';
import Button from '../common/Button';

const EMPTY_FORM = {
  name: '',
  slug: '',
  shortDescription: '',
  description: '',
  category: '',
  subCategory: '',
  brand: 'ANANT EXOTIKA',
  tags: '',
  price: '',
  compareAtPrice: '',
  costPrice: '',
  discount: '',
  sku: '',
  stock: '0',
  lowStockThreshold: '5',
  weight: '',
  length: '',
  width: '',
  height: '',
  unit: 'cm',
  status: 'draft',
  isFeatured: false,
  isNewArrival: false,
  isBestSeller: false,
  displayOrder: '0',
  seoTitle: '',
  seoDescription: '',
};

function toFormValues(product) {
  if (!product) return EMPTY_FORM;

  return {
    name: product.name || '',
    slug: product.slug || '',
    shortDescription: product.shortDescription || '',
    description: product.description || '',
    category: product.category?._id || product.category || '',
    subCategory: product.subCategory?._id || product.subCategory || '',
    brand: product.brand || 'ANANT EXOTIKA',
    tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
    price: product.price ?? product.sellingRate ?? '',
    compareAtPrice: product.compareAtPrice || product.mrp || '',
    costPrice: product.costPrice || '',
    discount: product.discount || '',
    sku: product.sku || '',
    stock: product.stock ?? '0',
    lowStockThreshold: product.lowStockThreshold ?? '5',
    weight: product.weight || '',
    length: product.dimensions?.length || '',
    width: product.dimensions?.width || '',
    height: product.dimensions?.height || '',
    unit: product.dimensions?.unit || 'cm',
    status: product.status || 'draft',
    isFeatured: Boolean(product.isFeatured),
    isNewArrival: Boolean(product.isNewArrival),
    isBestSeller: Boolean(product.isBestSeller),
    displayOrder: product.displayOrder ?? '0',
    seoTitle: product.seoTitle || '',
    seoDescription: product.seoDescription || '',
  };
}

function ProductForm({ mode = 'create', product, categories = [] }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [values, setValues] = useState(() => toFormValues(product));
  const [images, setImages] = useState(product?.images || []);
  const [slugLocked, setSlugLocked] = useState(Boolean(product?.slug));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    setValues(toFormValues(product));
    setImages(product?.images || []);
    setSlugLocked(Boolean(product?.slug));
  }, [product]);

  const subCategories = useMemo(
    () =>
      categories.filter((category) => {
        const parentId = category.parentCategory?._id || category.parentCategory;
        return parentId && String(parentId) === String(values.category);
      }),
    [categories, values.category]
  );

  const updateField = (name, value) => {
    setValues((current) => {
      const next = { ...current, [name]: value };
      if (name === 'name' && !slugLocked) {
        next.slug = slugify(value);
      }
      if (name === 'slug') {
        setSlugLocked(true);
      }
      if (name === 'category') {
        next.subCategory = '';
      }
      return next;
    });
  };

  const validate = () => {
    const next = {};
    if (!values.name.trim()) next.name = 'Product name is required.';
    if (!values.sku.trim()) next.sku = 'SKU is required.';
    if (values.price === '' || Number(values.price) <= 0) next.price = 'A valid selling rate is required.';
    if (values.compareAtPrice === '' || Number(values.compareAtPrice) <= 0) {
      next.compareAtPrice = 'A valid MRP is required.';
    } else if (Number(values.compareAtPrice) < Number(values.price)) {
      next.compareAtPrice = 'MRP cannot be lower than selling rate.';
    }
    if (!values.category) next.category = 'Category is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = (status) => ({
    name: values.name.trim(),
    slug: values.slug.trim() || undefined,
    shortDescription: values.shortDescription.trim(),
    description: values.description.trim(),
    category: values.category,
    subCategory: values.subCategory || null,
    brand: values.brand.trim() || 'ANANT EXOTIKA',
    tags: values.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    price: Number(values.price),
    compareAtPrice: Number(values.compareAtPrice) || 0,
    costPrice: Number(values.costPrice) || 0,
    discount: Number(values.discount) || 0,
    sku: values.sku.trim().toUpperCase(),
    stock: Number(values.stock) || 0,
    lowStockThreshold: Number(values.lowStockThreshold) || 0,
    weight: Number(values.weight) || 0,
    dimensions: {
      length: Number(values.length) || 0,
      width: Number(values.width) || 0,
      height: Number(values.height) || 0,
      unit: values.unit || 'cm',
    },
    images,
    status,
    isFeatured: values.isFeatured,
    isNewArrival: values.isNewArrival,
    isBestSeller: values.isBestSeller,
    displayOrder: Number(values.displayOrder) || 0,
    seoTitle: values.seoTitle.trim(),
    seoDescription: values.seoDescription.trim(),
  });

  const submit = async (status) => {
    setFormError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = buildPayload(status);
      if (mode === 'edit' && product?._id) {
        await updateProduct(product._id, payload);
        toast.success('Product updated successfully.');
      } else {
        await createProduct(payload);
        toast.success(status === 'draft' ? 'Product saved as draft.' : 'Product published.');
      }
      navigate('/products');
    } catch (error) {
      setErrors((current) => ({ ...current, ...getFieldErrors(error) }));
      setFormError(getErrorMessage(error, 'Unable to save product.'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (event) => {
    const files = event.target.files;
    if (!files?.length) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      const uploaded = await uploadImages(files, setUploadProgress);
      setImages((current) => {
        const mapped = uploaded.map((image, index) => ({
          url: image.url,
          altText: values.name || '',
          isPrimary: current.length === 0 && index === 0,
        }));
        return [...current, ...mapped];
      });
      toast.success('Images uploaded.');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to upload images.'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  };

  const setPrimary = (index) => {
    setImages((current) =>
      current.map((image, imageIndex) => ({
        ...image,
        isPrimary: imageIndex === index,
      }))
    );
  };

  const removeImage = (index) => {
    setImages((current) => {
      const next = current.filter((_, imageIndex) => imageIndex !== index);
      if (next.length && !next.some((image) => image.isPrimary)) {
        next[0].isPrimary = true;
      }
      return next;
    });
  };

  return (
    <form
      className="page"
      onSubmit={(event) => {
        event.preventDefault();
        submit(values.status === 'draft' ? 'active' : values.status);
      }}
    >
      {formError ? <div className="alert alert-error">{formError}</div> : null}

      <section className="card">
        <div className="card-body form-section">
          <h2>Basic Information</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Product Name</label>
              <input
                id="name"
                className={`input ${errors.name ? 'is-invalid' : ''}`}
                value={values.name}
                onChange={(event) => updateField('name', event.target.value)}
                required
              />
              {errors.name ? <span className="field-error">{errors.name}</span> : null}
            </div>
            <div className="field">
              <label htmlFor="slug">Slug</label>
              <input
                id="slug"
                className="input"
                value={values.slug}
                onChange={(event) => updateField('slug', slugify(event.target.value))}
              />
            </div>
            <div className="field span-2">
              <label htmlFor="shortDescription">Short Description</label>
              <textarea
                id="shortDescription"
                className="textarea"
                value={values.shortDescription}
                onChange={(event) => updateField('shortDescription', event.target.value)}
              />
            </div>
            <div className="field span-2">
              <label htmlFor="description">Full Description</label>
              <textarea
                id="description"
                className="textarea"
                style={{ minHeight: 160 }}
                value={values.description}
                onChange={(event) => updateField('description', event.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body form-section">
          <h2>Organization</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                className={`select ${errors.category ? 'is-invalid' : ''}`}
                value={values.category}
                onChange={(event) => updateField('category', event.target.value)}
                required
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category ? <span className="field-error">{errors.category}</span> : null}
            </div>
            <div className="field">
              <label htmlFor="subCategory">Sub Category</label>
              <select
                id="subCategory"
                className="select"
                value={values.subCategory}
                onChange={(event) => updateField('subCategory', event.target.value)}
              >
                <option value="">None</option>
                {subCategories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="brand">Brand</label>
              <input
                id="brand"
                className="input"
                value={values.brand}
                onChange={(event) => updateField('brand', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="tags">Tags</label>
              <input
                id="tags"
                className="input"
                value={values.tags}
                onChange={(event) => updateField('tags', event.target.value)}
                placeholder="comma separated"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body form-section">
          <h2>Pricing</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="compareAtPrice">MRP</label>
              <input
                id="compareAtPrice"
                type="number"
                min="0"
                step="1"
                className={`input ${errors.compareAtPrice ? 'is-invalid' : ''}`}
                value={values.compareAtPrice}
                onChange={(event) => updateField('compareAtPrice', event.target.value)}
                required
              />
              {errors.compareAtPrice ? <span className="field-error">{errors.compareAtPrice}</span> : null}
            </div>
            <div className="field">
              <label htmlFor="price">Selling Rate</label>
              <input
                id="price"
                type="number"
                min="0"
                step="1"
                className={`input ${errors.price ? 'is-invalid' : ''}`}
                value={values.price}
                onChange={(event) => updateField('price', event.target.value)}
                required
              />
              {errors.price ? <span className="field-error">{errors.price}</span> : null}
            </div>
            <div className="field">
              <label htmlFor="costPrice">Cost Price</label>
              <input
                id="costPrice"
                type="number"
                min="0"
                className="input"
                value={values.costPrice}
                onChange={(event) => updateField('costPrice', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="discount">Discount</label>
              <input
                id="discount"
                type="number"
                min="0"
                className="input"
                value={values.discount}
                onChange={(event) => updateField('discount', event.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body form-section">
          <h2>Inventory</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="sku">SKU</label>
              <input
                id="sku"
                className={`input ${errors.sku ? 'is-invalid' : ''}`}
                value={values.sku}
                onChange={(event) => updateField('sku', event.target.value)}
                required
              />
              {errors.sku ? <span className="field-error">{errors.sku}</span> : null}
            </div>
            <div className="field">
              <label htmlFor="stock">Stock</label>
              <input
                id="stock"
                type="number"
                min="0"
                className="input"
                value={values.stock}
                onChange={(event) => updateField('stock', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="lowStockThreshold">Low Stock Threshold</label>
              <input
                id="lowStockThreshold"
                type="number"
                min="0"
                className="input"
                value={values.lowStockThreshold}
                onChange={(event) => updateField('lowStockThreshold', event.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body form-section">
          <h2>Physical Details</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="weight">Weight</label>
              <input
                id="weight"
                type="number"
                min="0"
                className="input"
                value={values.weight}
                onChange={(event) => updateField('weight', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="length">Length</label>
              <input
                id="length"
                type="number"
                min="0"
                className="input"
                value={values.length}
                onChange={(event) => updateField('length', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="width">Width</label>
              <input
                id="width"
                type="number"
                min="0"
                className="input"
                value={values.width}
                onChange={(event) => updateField('width', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="height">Height</label>
              <input
                id="height"
                type="number"
                min="0"
                className="input"
                value={values.height}
                onChange={(event) => updateField('height', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="unit">Unit</label>
              <input
                id="unit"
                className="input"
                value={values.unit}
                onChange={(event) => updateField('unit', event.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body form-section">
          <h2>Product Images</h2>
          <div className="field">
            <label htmlFor="images">Upload images</label>
            <input
              id="images"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleUpload}
              disabled={uploading || saving}
            />
            <span className="hint">JPEG, PNG, WebP or GIF. Max 5MB each.</span>
          </div>
          {uploading ? (
            <p className="muted">Uploading images… {uploadProgress}%</p>
          ) : null}
          <div className="image-grid">
            {images.map((image, index) => (
              <div key={`${image.url}-${index}`} className={`image-tile ${image.isPrimary ? 'is-primary' : ''}`}>
                <img src={resolveAssetUrl(image.url)} alt={image.altText || values.name || 'Product'} />
                <div className="image-tile-actions">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setPrimary(index)}
                    aria-label="Set as primary image"
                  >
                    <Star size={14} />
                    {image.isPrimary ? 'Primary' : 'Set'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => removeImage(index)}
                    aria-label="Remove image"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {images.length === 0 ? (
            <p className="muted">
              <Upload size={14} /> No images yet. Upload at least one product image.
            </p>
          ) : null}
        </div>
      </section>

      <section className="card">
        <div className="card-body form-section">
          <h2>Product Visibility</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                className="select"
                value={values.status}
                onChange={(event) => updateField('status', event.target.value)}
              >
                {PRODUCT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body form-section">
          <h2>Feature Flags</h2>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={values.isFeatured}
              onChange={(event) => updateField('isFeatured', event.target.checked)}
            />
            Featured Product
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={values.isNewArrival}
              onChange={(event) => updateField('isNewArrival', event.target.checked)}
            />
            New Arrival
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={values.isBestSeller}
              onChange={(event) => updateField('isBestSeller', event.target.checked)}
            />
            Best Seller
          </label>
          <div className="field" style={{ marginTop: '1rem' }}>
            <label htmlFor="displayOrder">Display order</label>
            <input
              id="displayOrder"
              type="number"
              className="input"
              value={values.displayOrder}
              onChange={(event) => updateField('displayOrder', event.target.value)}
            />
            <span className="hint">Lower numbers appear first in featured and manual sorts.</span>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-body form-section">
          <h2>SEO</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="seoTitle">SEO Title</label>
              <input
                id="seoTitle"
                className="input"
                value={values.seoTitle}
                onChange={(event) => updateField('seoTitle', event.target.value)}
              />
            </div>
            <div className="field span-2">
              <label htmlFor="seoDescription">SEO Description</label>
              <textarea
                id="seoDescription"
                className="textarea"
                value={values.seoDescription}
                onChange={(event) => updateField('seoDescription', event.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="form-actions">
        <Button variant="secondary" onClick={() => navigate('/products')} disabled={saving}>
          Cancel
        </Button>
        <Button variant="secondary" onClick={() => submit('draft')} loading={saving}>
          Save as Draft
        </Button>
        <Button onClick={() => submit('active')} loading={saving}>
          {mode === 'edit' ? 'Save Changes' : 'Publish Product'}
        </Button>
      </div>
    </form>
  );
}

export default ProductForm;
