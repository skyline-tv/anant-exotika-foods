import { useEffect, useState } from 'react';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useToast } from '../../context/ToastContext';
import { getStoreContent, updateStoreContent } from '../../services/contentService';
import { getCategories } from '../../services/categoryService';
import { uploadImages } from '../../services/uploadService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { resolveAssetUrl } from '../../utils/assetUrl';

const EMPTY_TILE = { title: '', text: '', image: '', to: '/shop', isActive: true, displayOrder: 0 };

const toForm = (content) => ({
  storeName: content?.storeName || 'Anant Exotika Foods',
  storeEmail: content?.storeEmail || '',
  phone: content?.phone || '',
  address: content?.address || '',
  seoTitle: content?.seoTitle || '',
  seoDescription: content?.seoDescription || '',
  storeStatus: content?.storeStatus || 'open',
  hero: {
    image: content?.hero?.image || '',
    heading: content?.hero?.heading || '',
    subheading: content?.hero?.subheading || '',
    primaryCta: {
      label: content?.hero?.primaryCta?.label || 'Shop Hampers',
      to: content?.hero?.primaryCta?.to || '/shop',
    },
    secondaryCta: {
      label: content?.hero?.secondaryCta?.label || 'Explore Dry Fruits',
      to: content?.hero?.secondaryCta?.to || '/shop',
    },
  },
  brandStory: {
    image: content?.brandStory?.image || '',
    eyebrow: content?.brandStory?.eyebrow || 'Our story',
    heading: content?.brandStory?.heading || '',
    body: content?.brandStory?.body || '',
    cta: {
      label: content?.brandStory?.cta?.label || 'Discover our story',
      to: content?.brandStory?.cta?.to || '/about',
    },
  },
  gifting: content?.gifting?.length ? content.gifting : [{ ...EMPTY_TILE }],
  banners: content?.banners?.length ? content.banners : [],
  featuredCategoryIds: (content?.featuredCategoryIds || []).map((item) => item?._id || item).filter(Boolean),
  newsletter: {
    heading: content?.newsletter?.heading || '',
    body: content?.newsletter?.body || '',
  },
});

function Settings() {
  const toast = useToast();
  const [values, setValues] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getStoreContent(), getCategories(true)])
      .then(([content, categoryList]) => {
        if (!active) return;
        setValues(toForm(content));
        setCategories(categoryList || []);
      })
      .catch((err) => {
        toast.error(getErrorMessage(err, 'Unable to load store content.'));
        if (active) setValues(toForm(null));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [toast]);

  const updateField = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  const updateNested = (section, field, value) => {
    setValues((current) => ({
      ...current,
      [section]: { ...current[section], [field]: value },
    }));
  };

  const updateCta = (section, key, field, value) => {
    setValues((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: { ...current[section][key], [field]: value },
      },
    }));
  };

  const updateTile = (listKey, index, field, value) => {
    setValues((current) => ({
      ...current,
      [listKey]: current[listKey].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addTile = (listKey) => {
    setValues((current) => ({
      ...current,
      [listKey]: [...current[listKey], { ...EMPTY_TILE }],
    }));
  };

  const removeTile = (listKey, index) => {
    setValues((current) => ({
      ...current,
      [listKey]: current[listKey].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const uploadTo = async (path, files) => {
    if (!files?.length) return;
    setUploading(path);
    try {
      const uploaded = await uploadImages(files);
      const url = uploaded[0]?.url;
      if (!url) return;
      if (path === 'hero') updateNested('hero', 'image', url);
      else if (path === 'brandStory') updateNested('brandStory', 'image', url);
      else if (path.startsWith('gifting:')) updateTile('gifting', Number(path.split(':')[1]), 'image', url);
      else if (path.startsWith('banners:')) updateTile('banners', Number(path.split(':')[1]), 'image', url);
      toast.success('Image uploaded.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to upload image.'));
    } finally {
      setUploading('');
    }
  };

  const toggleFeaturedCategory = (id) => {
    setValues((current) => {
      const exists = current.featuredCategoryIds.some((item) => String(item) === String(id));
      return {
        ...current,
        featuredCategoryIds: exists
          ? current.featuredCategoryIds.filter((item) => String(item) !== String(id))
          : [...current.featuredCategoryIds, id],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await updateStoreContent({
        ...values,
        gifting: values.gifting.filter((item) => item.title.trim()),
        banners: values.banners.filter((item) => item.title.trim() || item.image),
      });
      setValues(toForm(saved));
      toast.success('Storefront content saved. The website will use this on the next load.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to save storefront content.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !values) return <Loader label="Loading settings" />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>These fields update the live storefront through the API and database.</p>
        </div>
      </div>

      <form className="page" onSubmit={handleSubmit}>
        <section className="card">
          <div className="card-body form-section">
            <h2>Store information</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="storeName">Store name</label>
                <input id="storeName" className="input" value={values.storeName} onChange={(event) => updateField('storeName', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="storeEmail">Store email</label>
                <input id="storeEmail" type="email" className="input" value={values.storeEmail} onChange={(event) => updateField('storeEmail', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input id="phone" className="input" value={values.phone} onChange={(event) => updateField('phone', event.target.value)} />
              </div>
              <div className="field span-2">
                <label htmlFor="address">Address</label>
                <textarea id="address" className="textarea" value={values.address} onChange={(event) => updateField('address', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="storeStatus">Store status</label>
                <select id="storeStatus" className="select" value={values.storeStatus} onChange={(event) => updateField('storeStatus', event.target.value)}>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-body form-section">
            <h2>Homepage SEO</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="seoTitle">Meta title</label>
                <input id="seoTitle" className="input" value={values.seoTitle} onChange={(event) => updateField('seoTitle', event.target.value)} />
              </div>
              <div className="field span-2">
                <label htmlFor="seoDescription">Meta description</label>
                <textarea id="seoDescription" className="textarea" value={values.seoDescription} onChange={(event) => updateField('seoDescription', event.target.value)} />
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-body form-section">
            <h2>Hero</h2>
            <div className="form-grid">
              <div className="field span-2">
                <label htmlFor="heroHeading">Heading</label>
                <input id="heroHeading" className="input" value={values.hero.heading} onChange={(event) => updateNested('hero', 'heading', event.target.value)} />
              </div>
              <div className="field span-2">
                <label htmlFor="heroSubheading">Description</label>
                <textarea id="heroSubheading" className="textarea" value={values.hero.subheading} onChange={(event) => updateNested('hero', 'subheading', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="heroPrimaryLabel">Primary CTA text</label>
                <input id="heroPrimaryLabel" className="input" value={values.hero.primaryCta.label} onChange={(event) => updateCta('hero', 'primaryCta', 'label', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="heroPrimaryTo">Primary CTA destination</label>
                <input id="heroPrimaryTo" className="input" value={values.hero.primaryCta.to} onChange={(event) => updateCta('hero', 'primaryCta', 'to', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="heroSecondaryLabel">Secondary CTA text</label>
                <input id="heroSecondaryLabel" className="input" value={values.hero.secondaryCta.label} onChange={(event) => updateCta('hero', 'secondaryCta', 'label', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="heroSecondaryTo">Secondary CTA destination</label>
                <input id="heroSecondaryTo" className="input" value={values.hero.secondaryCta.to} onChange={(event) => updateCta('hero', 'secondaryCta', 'to', event.target.value)} />
              </div>
              <div className="field span-2">
                <label>Hero image</label>
                {values.hero.image ? <img src={resolveAssetUrl(values.hero.image)} alt="" style={{ width: 180, marginBottom: 8 }} /> : null}
                <input type="file" accept="image/*" onChange={(event) => uploadTo('hero', event.target.files)} />
                {uploading === 'hero' ? <span className="hint">Uploading…</span> : null}
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-body form-section">
            <h2>Featured categories</h2>
            <p className="hint">If none are selected, the storefront shows all active parent categories.</p>
            <div className="form-grid">
              {categories.filter((category) => !category.parentCategory).map((category) => (
                <label key={category._id} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={values.featuredCategoryIds.some((item) => String(item) === String(category._id))}
                    onChange={() => toggleFeaturedCategory(category._id)}
                  />
                  {category.name}
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-body form-section">
            <h2>Brand story</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="storyEyebrow">Eyebrow</label>
                <input id="storyEyebrow" className="input" value={values.brandStory.eyebrow} onChange={(event) => updateNested('brandStory', 'eyebrow', event.target.value)} />
              </div>
              <div className="field span-2">
                <label htmlFor="storyHeading">Heading</label>
                <input id="storyHeading" className="input" value={values.brandStory.heading} onChange={(event) => updateNested('brandStory', 'heading', event.target.value)} />
              </div>
              <div className="field span-2">
                <label htmlFor="storyBody">Story</label>
                <textarea id="storyBody" className="textarea" value={values.brandStory.body} onChange={(event) => updateNested('brandStory', 'body', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="storyCtaLabel">CTA text</label>
                <input id="storyCtaLabel" className="input" value={values.brandStory.cta.label} onChange={(event) => updateCta('brandStory', 'cta', 'label', event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="storyCtaTo">CTA destination</label>
                <input id="storyCtaTo" className="input" value={values.brandStory.cta.to} onChange={(event) => updateCta('brandStory', 'cta', 'to', event.target.value)} />
              </div>
              <div className="field span-2">
                <label>Lifestyle image</label>
                {values.brandStory.image ? <img src={resolveAssetUrl(values.brandStory.image)} alt="" style={{ width: 180, marginBottom: 8 }} /> : null}
                <input type="file" accept="image/*" onChange={(event) => uploadTo('brandStory', event.target.files)} />
                {uploading === 'brandStory' ? <span className="hint">Uploading…</span> : null}
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-body form-section">
            <h2>Gifting & festival tiles</h2>
            {values.gifting.map((tile, index) => (
              <div key={tile._id || index} className="form-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="field">
                  <label>Title</label>
                  <input className="input" value={tile.title} onChange={(event) => updateTile('gifting', index, 'title', event.target.value)} />
                </div>
                <div className="field">
                  <label>Link</label>
                  <input className="input" value={tile.to} onChange={(event) => updateTile('gifting', index, 'to', event.target.value)} />
                </div>
                <div className="field span-2">
                  <label>Text</label>
                  <input className="input" value={tile.text} onChange={(event) => updateTile('gifting', index, 'text', event.target.value)} />
                </div>
                <div className="field">
                  <label>Image</label>
                  {tile.image ? <img src={resolveAssetUrl(tile.image)} alt="" style={{ width: 120, marginBottom: 8 }} /> : null}
                  <input type="file" accept="image/*" onChange={(event) => uploadTo(`gifting:${index}`, event.target.files)} />
                </div>
                <label className="checkbox-row">
                  <input type="checkbox" checked={tile.isActive !== false} onChange={(event) => updateTile('gifting', index, 'isActive', event.target.checked)} />
                  Visible
                </label>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeTile('gifting', index)}>
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={() => addTile('gifting')}>
              Add gifting tile
            </Button>
          </div>
        </section>

        <section className="card">
          <div className="card-body form-section">
            <h2>Promotional banners</h2>
            {values.banners.map((tile, index) => (
              <div key={tile._id || index} className="form-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="field">
                  <label>Title</label>
                  <input className="input" value={tile.title} onChange={(event) => updateTile('banners', index, 'title', event.target.value)} />
                </div>
                <div className="field">
                  <label>Link</label>
                  <input className="input" value={tile.to} onChange={(event) => updateTile('banners', index, 'to', event.target.value)} />
                </div>
                <div className="field span-2">
                  <label>Text</label>
                  <input className="input" value={tile.text} onChange={(event) => updateTile('banners', index, 'text', event.target.value)} />
                </div>
                <div className="field">
                  <label>Image</label>
                  {tile.image ? <img src={resolveAssetUrl(tile.image)} alt="" style={{ width: 120, marginBottom: 8 }} /> : null}
                  <input type="file" accept="image/*" onChange={(event) => uploadTo(`banners:${index}`, event.target.files)} />
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeTile('banners', index)}>
                  Remove
                </Button>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={() => addTile('banners')}>
              Add banner
            </Button>
          </div>
        </section>

        <section className="card">
          <div className="card-body form-section">
            <h2>Newsletter</h2>
            <div className="form-grid">
              <div className="field span-2">
                <label htmlFor="newsHeading">Heading</label>
                <input id="newsHeading" className="input" value={values.newsletter.heading} onChange={(event) => updateNested('newsletter', 'heading', event.target.value)} />
              </div>
              <div className="field span-2">
                <label htmlFor="newsBody">Text</label>
                <textarea id="newsBody" className="textarea" value={values.newsletter.body} onChange={(event) => updateNested('newsletter', 'body', event.target.value)} />
              </div>
            </div>
          </div>
        </section>

        <div className="form-actions">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save storefront content'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default Settings;
