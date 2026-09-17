import api from './api';

export async function getStoreContent() {
  const { data } = await api.get('/admin/content');
  return data.data.content;
}

export async function updateStoreContent(payload) {
  const { data } = await api.put('/admin/content', payload);
  return data.data.content;
}