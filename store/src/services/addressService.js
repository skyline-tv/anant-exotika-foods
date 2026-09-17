import api from './api';

export async function getAddresses() {
  const { data } = await api.get('/addresses');
  return data.data.addresses || [];
}

export async function createAddress(payload) {
  const { data } = await api.post('/addresses', payload);
  return data.data.address;
}

export async function updateAddress(id, payload) {
  const { data } = await api.put(`/addresses/${id}`, payload);
  return data.data.address;
}

export async function deleteAddress(id) {
  const { data } = await api.delete(`/addresses/${id}`);
  return data;
}

export async function setDefaultAddress(id) {
  const { data } = await api.put(`/addresses/${id}/default`);
  return data.data.address;
}
