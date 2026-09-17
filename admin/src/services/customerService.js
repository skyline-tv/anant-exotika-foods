import api from './api';

export async function getCustomers(params = {}) {
  const { data } = await api.get('/admin/customers', { params });
  return data.data;
}

export async function getCustomerById(id) {
  const { data } = await api.get(`/admin/customers/${id}`);
  return data.data.customer;
}
