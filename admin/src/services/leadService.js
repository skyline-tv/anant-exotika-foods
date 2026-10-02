import api from './api';

export async function getLeads(params = {}) {
  const { data } = await api.get('/admin/leads', { params });
  return data.data;
}
