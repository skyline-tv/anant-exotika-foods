import { REMEMBER_STORAGE_KEY, TOKEN_STORAGE_KEY } from './constants';

export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token, remember = true) {
  clearToken();

  if (remember) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(REMEMBER_STORAGE_KEY, '1');
    return;
  }

  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.removeItem(REMEMBER_STORAGE_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function wasRemembered() {
  return localStorage.getItem(REMEMBER_STORAGE_KEY) === '1';
}
