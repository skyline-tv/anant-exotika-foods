import { useState } from 'react';
import Button from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '../../utils/constants';

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function Settings() {
  const toast = useToast();
  const [values, setValues] = useState(loadSettings);

  const updateField = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(values));
    toast.success('Settings saved locally. Backend store settings are not connected yet.');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p>Store preferences for the admin workspace. These are UI-only until a settings API is available.</p>
        </div>
      </div>

      <form className="page" onSubmit={handleSubmit}>
        <section className="card">
          <div className="card-body form-section">
            <h2>Store Information</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="storeName">Store Name</label>
                <input
                  id="storeName"
                  className="input"
                  value={values.storeName}
                  onChange={(event) => updateField('storeName', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="storeEmail">Store Email</label>
                <input
                  id="storeEmail"
                  type="email"
                  className="input"
                  value={values.storeEmail}
                  onChange={(event) => updateField('storeEmail', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  className="input"
                  value={values.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                />
              </div>
              <div className="field span-2">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  className="textarea"
                  value={values.address}
                  onChange={(event) => updateField('address', event.target.value)}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-body form-section">
            <h2>Order Settings</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="orderPrefix">Order Prefix</label>
                <input
                  id="orderPrefix"
                  className="input"
                  value={values.orderPrefix}
                  onChange={(event) => updateField('orderPrefix', event.target.value)}
                />
                <span className="hint">Example: AE</span>
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-body form-section">
            <h2>Currency</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="currency">Currency</label>
                <select
                  id="currency"
                  className="select"
                  value={values.currency}
                  onChange={(event) => updateField('currency', event.target.value)}
                >
                  <option value="INR">INR ₹</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-body form-section">
            <h2>General Settings</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="storeStatus">Store status</label>
                <select
                  id="storeStatus"
                  className="select"
                  value={values.storeStatus}
                  onChange={(event) => updateField('storeStatus', event.target.value)}
                >
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={values.maintenanceMode}
                  onChange={(event) => updateField('maintenanceMode', event.target.checked)}
                />
                Maintenance mode placeholder
              </label>
            </div>
            <p className="hint">
              These controls are stored on this device only and do not change live store behaviour.
            </p>
          </div>
        </section>

        <div className="form-actions">
          <Button type="submit">Save Settings</Button>
        </div>
      </form>
    </div>
  );
}

export default Settings;
