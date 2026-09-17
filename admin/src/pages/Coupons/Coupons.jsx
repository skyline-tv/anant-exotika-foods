import { useEffect, useMemo, useState } from 'react';
import { Gift, Pencil, Plus, TicketPercent, Trash2 } from 'lucide-react';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import StatusBadge from '../../components/common/StatusBadge';
import { useToast } from '../../context/ToastContext';
import {
  createCoupon,
  deleteCoupon,
  getCoupons,
  updateCoupon,
} from '../../services/couponService';
import { DISCOUNT_TYPES } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, toDateInputValue } from '../../utils/formatDate';
import { getErrorMessage } from '../../utils/getErrorMessage';

const KIND_PROMO = 'promo';
const KIND_GIFT = 'gift_voucher';

const EMPTY_PROMO = {
  kind: KIND_PROMO,
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  minimumOrderAmount: '',
  maximumDiscount: '',
  startDate: '',
  endDate: '',
  usageLimit: '',
  perUserLimit: '1',
  isActive: true,
};

const GIFT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateGiftVoucherCode() {
  let suffix = '';
  for (let i = 0; i < 8; i += 1) {
    suffix += GIFT_CODE_ALPHABET[Math.floor(Math.random() * GIFT_CODE_ALPHABET.length)];
  }
  return `GV-${suffix}`;
}

function defaultGiftDates() {
  const start = new Date();
  const end = new Date();
  end.setFullYear(end.getFullYear() + 1);
  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

function emptyGift() {
  return {
    ...EMPTY_PROMO,
    kind: KIND_GIFT,
    code: generateGiftVoucherCode(),
    discountType: 'fixed',
    usageLimit: '1',
    perUserLimit: '1',
    maximumDiscount: '',
    ...defaultGiftDates(),
  };
}

function isGiftVoucher(item) {
  return item?.kind === KIND_GIFT;
}

function Coupons() {
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formKind, setFormKind] = useState(KIND_PROMO);
  const [values, setValues] = useState(EMPTY_PROMO);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isGiftForm = formKind === KIND_GIFT;
  const voucherUsed = Boolean(editing && isGiftVoucher(editing) && editing.usedCount > 0);

  const filtered = useMemo(() => {
    if (kindFilter === KIND_GIFT) return coupons.filter(isGiftVoucher);
    if (kindFilter === KIND_PROMO) return coupons.filter((item) => !isGiftVoucher(item));
    return coupons;
  }, [coupons, kindFilter]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setCoupons(await getCoupons());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreatePromo = () => {
    setEditing(null);
    setFormKind(KIND_PROMO);
    setValues({ ...EMPTY_PROMO });
    setModalOpen(true);
  };

  const openCreateGift = () => {
    setEditing(null);
    setFormKind(KIND_GIFT);
    setValues(emptyGift());
    setModalOpen(true);
  };

  const openEdit = (coupon) => {
    const gift = isGiftVoucher(coupon);
    setEditing(coupon);
    setFormKind(gift ? KIND_GIFT : KIND_PROMO);
    setValues({
      kind: gift ? KIND_GIFT : KIND_PROMO,
      code: coupon.code || '',
      description: coupon.description || '',
      discountType: gift ? 'fixed' : coupon.discountType || 'percentage',
      discountValue: coupon.discountValue ?? '',
      minimumOrderAmount: coupon.minimumOrderAmount ?? '',
      maximumDiscount: coupon.maximumDiscount ?? '',
      startDate: toDateInputValue(coupon.startDate),
      endDate: toDateInputValue(coupon.endDate),
      usageLimit: gift ? '1' : coupon.usageLimit ?? '',
      perUserLimit: gift ? '1' : coupon.perUserLimit ?? '1',
      isActive: coupon.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleSave = async (event) => {
    event?.preventDefault();
    if (values.discountValue === '' || !values.startDate || !values.endDate) {
      toast.warning(
        isGiftForm
          ? 'Amount, start date and end date are required.'
          : 'Code, discount value, start date and end date are required.'
      );
      return;
    }
    if (!isGiftForm && !values.code.trim()) {
      toast.warning('Code, discount value, start date and end date are required.');
      return;
    }

    setSaving(true);
    try {
      const payload = isGiftForm
        ? {
            kind: KIND_GIFT,
            code: values.code.trim().toUpperCase(),
            description: values.description.trim(),
            discountType: 'fixed',
            discountValue: Number(values.discountValue),
            minimumOrderAmount: Number(values.minimumOrderAmount) || 0,
            maximumDiscount: 0,
            startDate: values.startDate,
            endDate: values.endDate,
            usageLimit: 1,
            perUserLimit: 1,
            isActive: values.isActive,
          }
        : {
            kind: KIND_PROMO,
            code: values.code.trim().toUpperCase(),
            description: values.description.trim(),
            discountType: values.discountType,
            discountValue: Number(values.discountValue),
            minimumOrderAmount: Number(values.minimumOrderAmount) || 0,
            maximumDiscount: Number(values.maximumDiscount) || 0,
            startDate: values.startDate,
            endDate: values.endDate,
            usageLimit: Number(values.usageLimit) || 0,
            perUserLimit: Number(values.perUserLimit) || 1,
            isActive: values.isActive,
          };

      if (editing) {
        await updateCoupon(editing._id, payload);
        toast.success(isGiftForm ? 'Gift voucher updated.' : 'Coupon updated.');
      } else {
        await createCoupon(payload);
        toast.success(isGiftForm ? 'Gift voucher created.' : 'Coupon created.');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(
        getErrorMessage(err, isGiftForm ? 'Unable to save gift voucher.' : 'Unable to save coupon.')
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon) => {
    try {
      await updateCoupon(coupon._id, { isActive: !coupon.isActive });
      const noun = isGiftVoucher(coupon) ? 'Gift voucher' : 'Coupon';
      toast.success(coupon.isActive ? `${noun} deactivated.` : `${noun} activated.`);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteCoupon(pendingDelete._id);
      toast.success(isGiftVoucher(pendingDelete) ? 'Gift voucher deleted.' : 'Coupon deleted.');
      setPendingDelete(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to delete.'));
    } finally {
      setDeleting(false);
    }
  };

  const emptyTitle =
    kindFilter === KIND_GIFT ? 'No Gift Vouchers' : kindFilter === KIND_PROMO ? 'No Coupons' : 'No Coupons or Vouchers';
  const emptyMessage =
    kindFilter === KIND_GIFT
      ? 'Create a one-time gift voucher. Customers enter the code in the coupon field at checkout.'
      : 'Create a coupon or a one-time gift voucher for checkout.';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Coupons & Vouchers</h1>
          <p>Promotional coupons and one-time gift vouchers for the store checkout code field.</p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={openCreateGift}>
            <Gift size={16} />
            Add Gift Voucher
          </Button>
          <Button onClick={openCreatePromo}>
            <Plus size={16} />
            Add Coupon
          </Button>
        </div>
      </div>

      <section className="card">
        <div className="card-body toolbar">
          <div className="page-actions">
            <Button
              size="sm"
              variant={kindFilter === 'all' ? 'primary' : 'secondary'}
              onClick={() => setKindFilter('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={kindFilter === KIND_PROMO ? 'primary' : 'secondary'}
              onClick={() => setKindFilter(KIND_PROMO)}
            >
              Coupons
            </Button>
            <Button
              size="sm"
              variant={kindFilter === KIND_GIFT ? 'primary' : 'secondary'}
              onClick={() => setKindFilter(KIND_GIFT)}
            >
              Gift vouchers
            </Button>
          </div>
        </div>
        {loading ? (
          <Loader label="Loading coupons..." />
        ) : error ? (
          <div className="error-state">
            <h3>Unable to load coupons</h3>
            <p>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={kindFilter === KIND_GIFT ? Gift : TicketPercent}
            title={emptyTitle}
            message={emptyMessage}
            actionLabel={kindFilter === KIND_GIFT ? 'Add Gift Voucher' : 'Add Coupon'}
            onAction={kindFilter === KIND_GIFT ? openCreateGift : openCreatePromo}
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Kind</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Min Order</th>
                  <th>Usage</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((coupon) => {
                  const gift = isGiftVoucher(coupon);
                  const used = gift && (coupon.usedCount || 0) >= 1;
                  return (
                    <tr key={coupon._id}>
                      <td>
                        <strong>{coupon.code}</strong>
                      </td>
                      <td>
                        <StatusBadge status={gift ? KIND_GIFT : KIND_PROMO} />
                      </td>
                      <td className="cell-wrap">{coupon.description || '—'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{coupon.discountType}</td>
                      <td>
                        {coupon.discountType === 'percentage'
                          ? `${coupon.discountValue}%`
                          : formatCurrency(coupon.discountValue)}
                      </td>
                      <td>{formatCurrency(coupon.minimumOrderAmount)}</td>
                      <td>
                        {gift
                          ? used
                            ? 'Used'
                            : 'Available'
                          : `${coupon.usedCount || 0}${coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}`}
                      </td>
                      <td>
                        {formatDate(coupon.startDate)} – {formatDate(coupon.endDate)}
                      </td>
                      <td>
                        <StatusBadge
                          status={used ? 'redeemed' : coupon.isActive ? 'active' : 'inactive'}
                        />
                      </td>
                      <td>
                        <div className="row-actions">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => toggleActive(coupon)}
                            disabled={used}
                          >
                            {coupon.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--icon"
                            onClick={() => openEdit(coupon)}
                            aria-label={`Edit ${coupon.code}`}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn btn--ghost btn--icon"
                            onClick={() => setPendingDelete(coupon)}
                            aria-label={`Delete ${coupon.code}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        title={
          editing
            ? isGiftForm
              ? 'Edit Gift Voucher'
              : 'Edit Coupon'
            : isGiftForm
              ? 'Create Gift Voucher'
              : 'Create Coupon'
        }
        size="lg"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {isGiftForm ? 'Save Gift Voucher' : 'Save Coupon'}
            </Button>
          </>
        }
      >
        <form className="form-grid" onSubmit={handleSave}>
          <div className="field">
            <label htmlFor="code">{isGiftForm ? 'Voucher Code' : 'Coupon Code'}</label>
            <div className="input-with-action">
              <input
                id="code"
                className="input"
                value={values.code}
                onChange={(event) =>
                  setValues((current) => ({ ...current, code: event.target.value.toUpperCase() }))
                }
                required={!isGiftForm}
                disabled={voucherUsed}
              />
              {isGiftForm && !voucherUsed ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setValues((current) => ({ ...current, code: generateGiftVoucherCode() }))
                  }
                >
                  Generate
                </Button>
              ) : null}
            </div>
            {isGiftForm ? (
              <p className="hint">Customers enter this code in the coupon field at checkout. One-time use.</p>
            ) : null}
          </div>
          {isGiftForm ? (
            <div className="field">
              <label htmlFor="discountValue">Voucher Amount (₹)</label>
              <input
                id="discountValue"
                type="number"
                min="1"
                className="input"
                value={values.discountValue}
                onChange={(event) =>
                  setValues((current) => ({ ...current, discountValue: event.target.value }))
                }
                required
                disabled={voucherUsed}
              />
            </div>
          ) : (
            <div className="field">
              <label htmlFor="discountType">Discount Type</label>
              <select
                id="discountType"
                className="select"
                value={values.discountType}
                onChange={(event) =>
                  setValues((current) => ({ ...current, discountType: event.target.value }))
                }
              >
                {DISCOUNT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field span-2">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              className="textarea"
              value={values.description}
              onChange={(event) =>
                setValues((current) => ({ ...current, description: event.target.value }))
              }
            />
          </div>
          {isGiftForm ? null : (
            <>
              <div className="field">
                <label htmlFor="discountValue">Discount Value</label>
                <input
                  id="discountValue"
                  type="number"
                  min="0"
                  className="input"
                  value={values.discountValue}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, discountValue: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="maximumDiscount">Maximum Discount</label>
                <input
                  id="maximumDiscount"
                  type="number"
                  min="0"
                  className="input"
                  value={values.maximumDiscount}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, maximumDiscount: event.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="usageLimit">Usage Limit</label>
                <input
                  id="usageLimit"
                  type="number"
                  min="0"
                  className="input"
                  value={values.usageLimit}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, usageLimit: event.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="perUserLimit">Per User Limit</label>
                <input
                  id="perUserLimit"
                  type="number"
                  min="0"
                  className="input"
                  value={values.perUserLimit}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, perUserLimit: event.target.value }))
                  }
                />
              </div>
            </>
          )}
          <div className="field">
            <label htmlFor="minimumOrderAmount">Minimum Order Amount</label>
            <input
              id="minimumOrderAmount"
              type="number"
              min="0"
              className="input"
              value={values.minimumOrderAmount}
              onChange={(event) =>
                setValues((current) => ({ ...current, minimumOrderAmount: event.target.value }))
              }
            />
          </div>
          <div className="field">
            <label htmlFor="startDate">Start Date</label>
            <input
              id="startDate"
              type="date"
              className="input"
              value={values.startDate}
              onChange={(event) =>
                setValues((current) => ({ ...current, startDate: event.target.value }))
              }
              required
            />
          </div>
          <div className="field">
            <label htmlFor="endDate">End Date</label>
            <input
              id="endDate"
              type="date"
              className="input"
              value={values.endDate}
              onChange={(event) =>
                setValues((current) => ({ ...current, endDate: event.target.value }))
              }
              required
            />
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) =>
                setValues((current) => ({ ...current, isActive: event.target.checked }))
              }
              disabled={voucherUsed}
            />
            Active
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={isGiftVoucher(pendingDelete) ? 'Delete gift voucher' : 'Delete coupon'}
        message={`Delete ${isGiftVoucher(pendingDelete) ? 'gift voucher' : 'coupon'} ${pendingDelete?.code}?`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

export default Coupons;
