import api from './api';

export async function getCategories(includeInactive = true) {
  const params = includeInactive ? { active: 'false' } : undefined;
  const { data } = await api.get('/categories', { params });
  return data.data.categories || [];
}

export async function createCategory(payload) {
  const { data } = await api.post('/categories', payload);
  return data.data.category;
}

export async function updateCategory(id, payload) {
  const { data } = await api.put(`/categories/${id}`, payload);
  return data.data.category;
}

export async function deleteCategory(id) {
  const { data } = await api.delete(`/categories/${id}`);
  return data;
}
