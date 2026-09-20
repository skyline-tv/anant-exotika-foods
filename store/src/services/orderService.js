import api from './api';

export async function createOrder(payload) {
  const { data } = await api.post('/orders', payload);
  return data.data;
}

export async function getMyOrders(params = {}) {
  const { data } = await api.get('/orders/my-orders', { params });
  return data.data;
}

export async function getOrderById(id, { refreshTracking = false } = {}) {
  const { data } = await api.get(`/orders/${id}`, {
    params: refreshTracking ? { refreshTracking: true } : undefined,
  });
  return data.data.order;
}
