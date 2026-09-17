import api from './api';

export async function getProducts(params = {}) {
  const { data } = await api.get('/products', { params });
  return data.data;
}

export async function searchProducts(params = {}) {
  const { data } = await api.get('/products/search', { params });
  return data.data;
}

export async function getProductBySlug(slug) {
  const { data } = await api.get(`/products/${slug}`);
  return data.data.product;
}
