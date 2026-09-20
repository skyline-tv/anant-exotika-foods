import api from './api';

export async function getOrders(params = {}) {
  const { data } = await api.get('/admin/orders', { params });
  return data.data;
}

export async function getOrderById(id, { refreshTracking = false } = {}) {
  const { data } = await api.get(`/admin/orders/${id}`, {
    params: refreshTracking ? { refreshTracking: true } : undefined,
  });
  return data.data.order;
}

export async function updateOrderStatus(id, payload) {
  const { data } = await api.put(`/admin/orders/${id}/status`, payload);
  return data.data.order;
}

export async function retryShipment(id) {
  const { data } = await api.post(`/admin/orders/${id}/shipment/retry`);
  return data.data.order;
}

export async function syncShipment(id) {
  const { data } = await api.post(`/admin/orders/${id}/shipment/sync`);
  return data.data.order;
}

export async function refundOrder(id, payload = {}) {
  const { data } = await api.post(`/admin/orders/${id}/refund`, payload);
  return data.data.order;
}
