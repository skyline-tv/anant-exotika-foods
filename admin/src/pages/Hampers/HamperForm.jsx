import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useToast } from '../../context/ToastContext';
import { createProduct, getProductById, getProducts, updateProduct } from '../../services/productService';
import { uploadImages } from '../../services/uploadService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { resolveAssetUrl } from '../../utils/assetUrl';

const emptySlot = () => ({ label: '', required: true, products: [] });

const productId = (value) => String(value?._id || value || '');

function HamperForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const editing = Boolean(id);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [values, setValues] = useState({
    name: '',
    sku: '',
    shortDescription: '',
    packaging: '',
    price: '',
    stock: '20',
    status: 'active',
    images: [],
    slots: [emptySlot()],
  });

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      const products = [];
      let page = 1;
      let pages = 1;

      while (page <= pages) {
        const data = await getProducts({
          isPersonalizedHamper: false,
          status: 'active',
          limit: 50,
          page,
          sort: 'name_asc',
        });
        products.push(...(data.products || []));
        pages = data.pagination?.pages || 1;
        page += 1;
      }

      return products;
    };

    loadCatalog()
      .then((products) => {
        if (active) setCatalog(products);
      })
      .catch((error) => {
        if (!active) return;
        setCatalog([]);
        toast.error(getErrorMessage(error, 'Unable to load products for the slots.'));
      });

    return () => {
      active = false;
    };
  }, [toast]);

  useEffect(() => {
    if (!id) return undefined;
    let active = true;
    getProductById(id)
      .then((product) => {
        if (!active) return;
        setValues({
          name: product.name || '',
          sku: product.sku || '',
          shortDescription: product.shortDescription || '',
          packaging: product.packaging || '',
          price: product.price ?? '',
          stock: product.stock ?? 0,
          status: product.status || 'active',
          images: product.images || [],
          slots: (product.slots || []).map((slot) => ({
            label: slot.label || '',
            required: slot.required !== false,
            products: (slot.products || []).map(productId).filter(Boolean),
          })),
        });
      })
      .catch((error) => toast.error(getErrorMessage(error, 'Unable to load hamper.')))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, toast]);

  const catalogById = useMemo(() => new Map(catalog.map((item) => [item._id, item])), [catalog]);

  const updateSlot = (index, patch) => {
    setValues((current) => ({
      ...current,
      slots: current.slots.map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...patch } : slot)),
    }));
  };

  const handleUpload = async (event) => {
    const files = event.target.files;
    if (!files?.length) return;
    try {
      const uploaded = await uploadImages(files);
      setValues((current) => ({
        ...current,
        images: [
          ...current.images,
          ...uploaded.map((image, index) => ({
            url: image.url,
            altText: values.name,
            isPrimary: current.images.length === 0 && index === 0,
          })),
        ],
      }));
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to upload the image.'));
    } finally {
      event.target.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!values.images.length) {
      toast.error('Add a hamper image.');
      return;
    }
    setSaving(true);
    const payload = {
      name: values.name.trim(),
      sku: values.sku.trim() || `HMP-${values.name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toUpperCase()}`,
      shortDescription: values.shortDescription.trim(),
      description: values.shortDescription.trim(),
      packaging: values.packaging.trim(),
      price: Number(values.price),
      stock: Number(values.stock),
      status: values.status,
      images: values.images,
      isPersonalizedHamper: true,
      slots: values.slots.map((slot) => ({
        label: slot.label.trim(),
        required: slot.required,
        products: slot.products,
      })),
    };

    try {
      if (editing) await updateProduct(id, payload);
      else await createProduct(payload);
      toast.success(editing ? 'Hamper updated.' : 'Hamper created.');
      navigate('/hampers');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to save the hamper.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader label="Loading hamper" />;

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>{editing ? 'Edit hamper' : 'New hamper'}</h1>
          <p>The price, packaging and number of slots stay fixed. Customers only pick from the products in each slot.</p>
        </div>
        <Link to="/hampers">Back to hampers</Link>
      </header>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <label className="field">
          Hamper name
          <input className="input" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} required />
        </label>
        <label className="field">
          SKU
          <input className="input" value={values.sku} onChange={(event) => setValues({ ...values, sku: event.target.value })} placeholder="Generated from the name if left blank" />
        </label>
        <label className="field">
          Short description
          <textarea className="input" value={values.shortDescription} onChange={(event) => setValues({ ...values, shortDescription: event.target.value })} />
        </label>
        <label className="field">
          Packaging
          <input className="input" value={values.packaging} onChange={(event) => setValues({ ...values, packaging: event.target.value })} placeholder="Gold gift box" />
        </label>
        <label className="field">
          Base price (₹)
          <input className="input" type="number" min="0" step="1" value={values.price} onChange={(event) => setValues({ ...values, price: event.target.value })} required />
        </label>
        <label className="field">
          Available quantity
          <input className="input" type="number" min="0" step="1" value={values.stock} onChange={(event) => setValues({ ...values, stock: event.target.value })} required />
        </label>
        <label className="field">
          Availability
          <select className="input" value={values.status} onChange={(event) => setValues({ ...values, status: event.target.value })}>
            <option value="active">Available</option>
            <option value="inactive">Hidden</option>
            <option value="draft">Draft</option>
          </select>
        </label>
        <label className="field">
          Hamper image
          <input type="file" accept="image/*" onChange={handleUpload} />
        </label>
        {values.images[0]?.url ? <img src={resolveAssetUrl(values.images[0].url)} alt="" style={{ width: 120, height: 120, objectFit: 'cover' }} /> : null}

        <div>
          <h2>Selection slots</h2>
          {values.slots.map((slot, index) => (
            <div key={index} className="card" style={{ marginTop: '0.8rem' }}>
              <label className="field">
                Slot name
                <input
                  className="input"
                  value={slot.label}
                  placeholder="Select Almonds"
                  onChange={(event) => updateSlot(index, { label: event.target.value })}
                  required
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={slot.required}
                  onChange={(event) => updateSlot(index, { required: event.target.checked })}
                />
                Required selection
              </label>
              <label className="field">
                Add an allowed product
                <select
                  className="input"
                  value=""
                  onChange={(event) => {
                    const nextId = event.target.value;
                    if (!nextId || slot.products.includes(nextId)) return;
                    updateSlot(index, { products: [...slot.products, nextId] });
                  }}
                >
                  <option value="">Choose a product</option>
                  {catalog
                    .filter((item) => !slot.products.includes(item._id))
                    .map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </label>
              <ul>
                {slot.products.map((itemId) => (
                  <li key={itemId}>
                    {catalogById.get(itemId)?.name || itemId}{' '}
                    <button
                      type="button"
                      onClick={() => updateSlot(index, { products: slot.products.filter((entry) => entry !== itemId) })}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              {values.slots.length > 1 ? (
                <Button
                  variant="ghost"
                  onClick={() => setValues((current) => ({ ...current, slots: current.slots.filter((_, slotIndex) => slotIndex !== index) }))}
                >
                  Remove slot
                </Button>
              ) : null}
            </div>
          ))}
          <Button variant="secondary" onClick={() => setValues((current) => ({ ...current, slots: [...current.slots, emptySlot()] }))}>
            Add slot
          </Button>
        </div>

        <Button type="submit" loading={saving}>
          {editing ? 'Save hamper' : 'Create hamper'}
        </Button>
      </form>
    </section>
  );
}

export default HamperForm;
