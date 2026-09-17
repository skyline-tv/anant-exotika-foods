import api from './api';

export async function getProductReviews(productId) {
  const { data } = await api.get(`/reviews/product/${productId}`);
  return data.data;
}