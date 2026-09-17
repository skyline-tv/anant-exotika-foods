import api from './api';

export async function validateCoupon(code) {
  const { data } = await api.post('/coupons/validate', { code });
  return data.data;
}
