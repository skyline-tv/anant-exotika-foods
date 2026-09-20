import api from './api';

export async function getShippingConfig() {
  const { data } = await api.get('/shipping/config');
  return data.data;
}

export async function checkPincode(pincode) {
  const { data } = await api.get('/shipping/pincode', { params: { pincode } });
  return data.data;
}

export async function quoteShipping(payload) {
  const { data } = await api.post('/shipping/quote', payload);
  return data.data;
}
