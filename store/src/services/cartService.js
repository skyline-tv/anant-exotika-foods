import api from './api';

export async function getCart() {
  const { data } = await api.get('/cart');
  return data.data.cart;
}

export async function addToCart(payload) {
  const { data } = await api.post('/cart', payload);
  return data.data.cart;
}

export async function mergeCart(items) {
  const { data } = await api.post('/cart/merge', { items });
  return data.data.cart;
}

export async function updateCartItem(productId, quantity) {
  const { data } = await api.put(`/cart/${productId}`, { quantity });
  return data.data.cart;
}

export async function removeCartItem(productId) {
  const { data } = await api.delete(`/cart/${productId}`);
  return data.data.cart;
}

export async function clearCart() {
  const { data } = await api.delete('/cart');
  return data.data.cart;
}
