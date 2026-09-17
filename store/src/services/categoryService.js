import api from './api';

export async function getCategories() {
  const { data } = await api.get('/categories');
  return data.data.categories || [];
}

export async function getCategoryBySlug(slug) {
  const { data } = await api.get(`/categories/${slug}`);
  return data.data.category;
}
