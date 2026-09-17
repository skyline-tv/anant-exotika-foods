import api from './api';

export async function createOrder(payload) {
  const { data } = await api.post('/orders', payload);
  return data.data.order;
}

export async function getMyOrders(params = {}) {
  const { data } = await api.get('/orders/my-orders', { params });
  return data.data;
}

export async function getOrderById(id) {
  const { data } = await api.get(`/orders/${id}`);
  return data.data.order;
}
