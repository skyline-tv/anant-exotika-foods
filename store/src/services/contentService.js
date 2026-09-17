import api from './api';

export async function getStoreContent() {
  const { data } = await api.get('/content');
  return data.data.content;
}