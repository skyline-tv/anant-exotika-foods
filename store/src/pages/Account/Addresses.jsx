import { useEffect, useState } from 'react';
import AccountNav from '../../components/account/AccountNav';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import PageHeader from '../../components/common/PageHeader';
import { useToast } from '../../context/ToastContext';
import {
  createAddress,
  deleteAddress,
  getAddresses,
  setDefaultAddress,
  updateAddress,
} from '../../services/addressService';
import { ADDRESS_TYPES } from '../../utils/constants';
import { validateAddressForm } from '../../utils/addressValidation';
import { getErrorMessage } from '../../utils/getErrorMessage';

const EMPTY_FORM = {
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  landmark: '',
  addressType: 'home',
  isDefault: false,
};

const FIELD_LABELS = {
  fullName: 'Full name',
  phone: 'Mobile number',
  addressLine1: 'Address line 1',
  addressLine2: 'Address line 2',
  city: 'City',
  state: 'State',
  postalCode: 'Pincode',
  landmark: 'Landmark',
};

const Addresses = () => {
  const toast = useToast();
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setAddresses(await getAddresses());
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load addresses.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validated = validateAddressForm(form);
    if (!validated.valid) {
      toast.error(validated.message);
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await updateAddress(editingId, validated.value);
        toast.success('Address updated.');
      } else {
        await createAddress(validated.value);
        toast.success('Address saved.');
      }
      setForm(EMPTY_FORM);
      setEditingId('');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to save address.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (address) => {
    setEditingId(address._id);
    setForm({
      fullName: address.fullName || '',
      phone: address.phone || '',
      addressLine1: address.addressLine1 || '',
      addressLine2: address.addressLine2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postalCode || '',
      country: address.country || 'India',
      landmark: address.landmark || '',
      addressType: address.addressType || 'home',
      isDefault: Boolean(address.isDefault),
    });
  };

  const handleDelete = async (id) => {
    try {
      await deleteAddress(id);
      toast.success('Address deleted.');
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to delete address.'));
    }
  };

  const handleDefault = async (id) => {
    try {
      await setDefaultAddress(id);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to update default address.'));
    }
  };

  return (
    <section className="page-shell">
      <div className="container">
        <PageHeader eyebrow="Account" title="Addresses" subtitle="Keep delivery details ready for a frictionless checkout." />
        <div className="account-layout">
          <AccountNav />
          <div>
        {loading ? (
          <Loader label="Loading addresses" />
        ) : error ? (
          <EmptyState title="Unable to load addresses" message={error} />
        ) : (
          <div className="account-grid">
            <div>
              {addresses.length === 0 ? (
                <EmptyState title="No addresses yet" message="Add a delivery address for a seamless checkout." />
              ) : (
                addresses.map((address) => (
                  <article key={address._id} className="address-card">
                    <h2>
                      {address.fullName} {address.isDefault ? '(Default)' : ''}
                    </h2>
                    <p>
                      {address.addressLine1}
                      {address.addressLine2 ? `, ${address.addressLine2}` : ''}
                    </p>
                    <p>
                      {address.city}, {address.state} {address.postalCode}
                    </p>
                    <p>{address.phone}</p>
                    <div className="product-actions">
                      <Button variant="secondary" size="sm" onClick={() => handleEdit(address)}>
                        Edit
                      </Button>
                      {!address.isDefault ? (
                        <Button variant="ghost" size="sm" onClick={() => handleDefault(address._id)}>
                          Set default
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(address._id)}>
                        Delete
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <form className="account-card form-grid" onSubmit={handleSubmit}>
              <h2>{editingId ? 'Edit address' : 'Add address'}</h2>
              {['fullName', 'phone', 'addressLine1', 'addressLine2', 'landmark', 'city', 'state', 'postalCode'].map((field) => (
                <div className="field" key={field}>
                  <label htmlFor={field}>{FIELD_LABELS[field]}</label>
                  <input
                    id={field}
                    value={form[field]}
                    onChange={(event) => updateField(field, event.target.value)}
                    required={field !== 'addressLine2' && field !== 'landmark'}
                  />
                </div>
              ))}
              <div className="field">
                <label htmlFor="addressType">Type</label>
                <select
                  id="addressType"
                  value={form.addressType}
                  onChange={(event) => updateField('addressType', event.target.value)}
                >
                  {ADDRESS_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(event) => updateField('isDefault', event.target.checked)}
                />
                Default address
              </label>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update address' : 'Save address'}
              </Button>
            </form>
          </div>
        )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Addresses;
