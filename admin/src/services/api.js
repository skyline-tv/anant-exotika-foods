import axios from 'axios';
import { clearToken, getToken } from '../utils/storage';

const AUTH_UNAUTHORIZED_EVENT = 'admin:unauthorized';

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

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isLoginRequest = url.includes('/admin/auth/login');

    if (status === 401 && !isLoginRequest) {
      clearToken();
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }

    return Promise.reject(error);
  }
);

export { AUTH_UNAUTHORIZED_EVENT };
export default api;
