import api from './api';

export async function getWishlist() {
  const { data } = await api.get('/wishlist');
  return data.data.wishlist;
}

export async function addToWishlist(productId) {
  const { data } = await api.post(`/wishlist/${productId}`);
  return data.data.wishlist;
}

export async function removeFromWishlist(productId) {
  const { data } = await api.delete(`/wishlist/${productId}`);
  return data.data.wishlist;
}
