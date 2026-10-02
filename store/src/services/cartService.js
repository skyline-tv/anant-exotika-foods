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

export async function updateCartItem(productId, quantity, selectionKey = '') {
  const { data } = await api.put(`/cart/${productId}`, { quantity, selectionKey });
  return data.data.cart;
}

export async function removeCartItem(productId, selectionKey = '') {
  const { data } = await api.delete(`/cart/${productId}`, { params: { selectionKey } });
  return data.data.cart;
}

export async function clearCart() {
  const { data } = await api.delete('/cart');
  return data.data.cart;
}
