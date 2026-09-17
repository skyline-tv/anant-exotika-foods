import { useEffect, useMemo, useState } from 'react';
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { useToast } from '../../context/ToastContext';
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '../../services/categoryService';
import { uploadImages } from '../../services/uploadService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { slugify } from '../../utils/slugify';
import { resolveAssetUrl } from '../../utils/assetUrl';

const EMPTY = {
  name: '',
  slug: '',
  description: '',
  image: '',
  parentCategory: '',
  isActive: true,
  displayOrder: 0,
};

function Categories() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setCategories(await getCategories(true));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const parentOptions = useMemo(
    () => categories.filter((category) => category._id !== editing?._id),
    [categories, editing]
  );

  const openCreate = () => {
    setEditing(null);
    setValues(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (category) => {
    setEditing(category);
    setValues({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      image: category.image || '',
      parentCategory: category.parentCategory?._id || category.parentCategory || '',
      isActive: category.isActive !== false,
      displayOrder: category.displayOrder || 0,
    });
    setModalOpen(true);
  };

  const handleUpload = async (event) => {
    const files = event.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const [image] = await uploadImages(files);
      setValues((current) => ({ ...current, image: image.url }));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to upload image.'));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!values.name.trim()) {
      toast.warning('Category name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        slug: values.slug.trim() || undefined,
        description: values.description.trim(),
        image: values.image,
        parentCategory: values.parentCategory || null,
        isActive: values.isActive,
        displayOrder: Number(values.displayOrder) || 0,
      };

      if (editing) {
        await updateCategory(editing._id, payload);
        toast.success('Category updated.');
      } else {
        await createCategory(payload);
        toast.success('Category created.');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to save category.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteCategory(pendingDelete._id);
      toast.success('Category deleted.');
      setPendingDelete(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to delete category.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Categories</h1>
          <p>Organise the store catalogue.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Add Category
        </Button>
      </div>

      <section className="card">
        {loading ? (
          <Loader label="Loading categories..." />
        ) : error ? (
          <div className="error-state">
            <h3>Unable to load categories</h3>
            <p>{error}</p>
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title="No Categories"
            message="Create your first category to start adding products."
            actionLabel="Add Category"
            onAction={openCreate}
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Parent</th>
                  <th>Status</th>
                  <th>Display Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category._id}>
                    <td>
                      {category.image ? (
                        <img className="thumb" src={resolveAssetUrl(category.image)} alt={category.name} />
                      ) : (
                        <div className="thumb thumb-placeholder">AE</div>
                      )}
                    </td>
                    <td>{category.name}</td>
                    <td>{category.slug}</td>
                    <td>{category.parentCategory?.name || '—'}</td>
                    <td>
                      <StatusBadge status={category.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td>{category.displayOrder}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--icon"
                          onClick={() => openEdit(category)}
                          aria-label={`Edit ${category.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--icon"
                          onClick={() => setPendingDelete(category)}
                          aria-label={`Delete ${category.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        title={editing ? 'Edit Category' : 'Add Category'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save Category
            </Button>
          </>
        }
      >
        <form className="form-section" onSubmit={handleSave}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="categoryName">Name</label>
              <input
                id="categoryName"
                className="input"
                value={values.name}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    name: event.target.value,
                    slug: editing ? current.slug : slugify(event.target.value),
                  }))
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="categorySlug">Slug</label>
              <input
                id="categorySlug"
                className="input"
                value={values.slug}
                onChange={(event) =>
                  setValues((current) => ({ ...current, slug: slugify(event.target.value) }))
                }
              />
            </div>
            <div className="field span-2">
              <label htmlFor="categoryDescription">Description</label>
              <textarea
                id="categoryDescription"
                className="textarea"
                value={values.description}
                onChange={(event) =>
                  setValues((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="parentCategory">Parent Category</label>
              <select
                id="parentCategory"
                className="select"
                value={values.parentCategory}
                onChange={(event) =>
                  setValues((current) => ({ ...current, parentCategory: event.target.value }))
                }
              >
                <option value="">None</option>
                {parentOptions.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="displayOrder">Display Order</label>
              <input
                id="displayOrder"
                type="number"
                className="input"
                value={values.displayOrder}
                onChange={(event) =>
                  setValues((current) => ({ ...current, displayOrder: event.target.value }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="categoryImage">Image</label>
              <input id="categoryImage" type="file" accept="image/*" onChange={handleUpload} />
              {uploading ? <span className="hint">Uploading…</span> : null}
              {values.image ? (
                <img className="thumb-lg" src={resolveAssetUrl(values.image)} alt="" style={{ marginTop: 8 }} />
              ) : null}
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={values.isActive}
                onChange={(event) =>
                  setValues((current) => ({ ...current, isActive: event.target.checked }))
                }
              />
              Active
            </label>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete category"
        message={`Delete “${pendingDelete?.name}”? Categories with products or sub-categories cannot be removed.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

export default Categories;
