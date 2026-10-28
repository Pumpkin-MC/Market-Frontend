import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { normalizeLocale, sameBaseLanguage } from '../lib/locale';

const AuthContext = createContext<any>(null);
export const useAuth = () => useContext(AuthContext);

// The API stores only base language codes (e.g. "zh"), so a logged-in user's
// preferred_language cannot distinguish regional Chinese variants (zh_hk / zh_tw).
// If the current language already matches the same language family, keep the
// user's more specific selection instead of resetting to the base variant.
const applyPreferredLanguage = (preferred: string | undefined, current: string, i18n: any) => {
  if (!preferred) return;
  const target = normalizeLocale(preferred);
  if (!target) return;
  if (current === target) return;
  // Preserve regional variant when the server only has the base code.
  if (sameBaseLanguage(target, current)) return;
  i18n.changeLanguage(target);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Helper to decode JWT payload safely
  const decodeToken = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Failed to decode token', e);
      return null;
    }
  };

  const { i18n } = useTranslation();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await api.get('/user/me');
        if (res.data?.token) {
          const payload = decodeToken(res.data.token);
          if (payload && payload.exp * 1000 > Date.now()) {
            setUser(payload);
            applyPreferredLanguage(payload.preferred_language, i18n.language, i18n);
          }
        }
      } catch (e) {
        setUser(null);
      } finally {
        // Clean up legacy localStorage token if present
        localStorage.removeItem('token');
        setLoading(false);
      }
    };
    initAuth();
  }, [i18n]);

  const login = (token: string) => {
    // Decode token for client-side state without persisting in localStorage
    const payload = decodeToken(token);
    setUser(payload);
    applyPreferredLanguage(payload?.preferred_language, i18n.language, i18n);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Failed to logout cleanly on server', e);
    } finally {
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/user/me');
      if (res.data?.token) {
        login(res.data.token);
      }
    } catch (e) {
      console.error('Failed to refresh user', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" />;
  }
  return children;
};

export const StaffRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return <Navigate to="/" />;
  }
  return children;
};
