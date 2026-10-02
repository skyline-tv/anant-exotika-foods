import api from './api';

export async function submitLead(payload) {
  const { data } = await api.post('/leads', payload);
  return data.data;
}
