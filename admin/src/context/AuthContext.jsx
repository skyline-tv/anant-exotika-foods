import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AUTH_UNAUTHORIZED_EVENT } from '../services/api';
import * as authService from '../services/authService';
import { clearToken, getToken, setToken, wasRemembered } from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return;
    }

    try {
      const profile = await authService.getProfile();
      setAdmin(profile);
    } catch {
      clearToken();
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const onUnauthorized = () => {
      setAdmin(null);
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async ({ email, password, remember }) => {
    const { admin: nextAdmin, token } = await authService.login({ email, password });
    setToken(token, remember);
    setAdmin(nextAdmin);
    return nextAdmin;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Token discard on the client is the source of truth.
    } finally {
      clearToken();
      setAdmin(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      admin,
      loading,
      isAuthenticated: Boolean(admin),
      remembered: wasRemembered(),
      login,
      logout,
    }),
    [admin, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
