import api from './api';

export async function getCoupons() {
  const { data } = await api.get('/admin/coupons');
  return data.data.coupons || [];
}

export async function createCoupon(payload) {
  const { data } = await api.post('/admin/coupons', payload);
  return data.data.coupon;
}

export async function updateCoupon(id, payload) {
  const { data } = await api.put(`/admin/coupons/${id}`, payload);
  return data.data.coupon;
}

export async function deleteCoupon(id) {
  const { data } = await api.delete(`/admin/coupons/${id}`);
  return data;
}
