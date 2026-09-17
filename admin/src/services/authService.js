import api from './api';

export async function login(credentials) {
  const { data } = await api.post('/admin/auth/login', credentials);
  return data.data;
}

export async function getProfile() {
  const { data } = await api.get('/admin/auth/me');
  return data.data.admin;
}

export async function logout() {
  const { data } = await api.post('/admin/auth/logout');
  return data;
}
