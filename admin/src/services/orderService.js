import api from './api';

export async function getOrders(params = {}) {
  const { data } = await api.get('/admin/orders', { params });
  return data.data;
}

export async function getOrderById(id) {
  const { data } = await api.get(`/admin/orders/${id}`);
  return data.data.order;
}

export async function updateOrderStatus(id, payload) {
  const { data } = await api.put(`/admin/orders/${id}/status`, payload);
  return data.data.order;
}
