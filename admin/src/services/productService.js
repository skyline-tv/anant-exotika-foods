import api from './api';

export async function getProducts(params = {}) {
  const { data } = await api.get('/products', { params });
  return data.data;
}

export async function getProductBySlug(slug) {
  const { data } = await api.get(`/products/${slug}`);
  return data.data.product;
}

export async function getProductById(id) {
  const { data } = await api.get(`/products/id/${id}`);
  return data.data.product;
}

export async function createProduct(payload) {
  const { data } = await api.post('/products', payload);
  return data.data.product;
}

export async function updateProduct(id, payload) {
  const { data } = await api.put(`/products/${id}`, payload);
  return data.data.product;
}

export async function deleteProduct(id) {
  const { data } = await api.delete(`/products/${id}`);
  return data;
}

export async function updateProductStock(id, stock) {
  return updateProduct(id, { stock: Number(stock) });
}
