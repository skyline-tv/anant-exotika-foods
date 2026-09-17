import { CUSTOMER_TOKEN_KEY, GUEST_CART_KEY } from './constants';

export function getToken() {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}

export function setToken(token) {
  if (!token) {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    return;
  }
  localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
}

export function getGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setGuestCart(items) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items || []));
}

export function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}
