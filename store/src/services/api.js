import axios from 'axios';
import { AUTH_UNAUTHORIZED_EVENT } from '../utils/constants';
import { clearToken, getToken } from '../utils/storage';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthRequest = url.includes('/auth/login') || url.includes('/auth/register');

    if (status === 401 && !isAuthRequest) {
      clearToken();
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }

    return Promise.reject(error);
  }
);

export default api;
