import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

const SESSION_CACHE_KEY = 'pmk_cached_user';

const loadCachedUser = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.exp === 'number' && parsed.exp * 1000 > Date.now()) {
      return parsed;
    }
    sessionStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    // Ignore storage errors
  }
  return null;
};

const saveCachedUser = (payload: any) => {
  try {
    if (payload) {
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(payload));
    } else {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
};

const AuthContext = createContext<any>(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(() => loadCachedUser());
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

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

  const initAuth = useCallback(async () => {
    setLoading(true);
    setAuthError(false);
    try {
      const res = await api.get('/user/me');
      if (res.data?.token) {
        const payload = decodeToken(res.data.token);
        if (payload && payload.exp * 1000 > Date.now()) {
          setUser(payload);
          saveCachedUser(payload);
          if (payload.preferred_language && i18n.language !== payload.preferred_language) {
            i18n.changeLanguage(payload.preferred_language);
          }
        } else {
          setUser(null);
          saveCachedUser(null);
        }
      }
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        setUser(null);
        saveCachedUser(null);
      } else {
        // Transient 5xx (e.g. 502 Bad Gateway) or network error:
        // Keep cached user if available, and flag authError so protected/staff routes don't redirect away.
        const cached = loadCachedUser();
        if (cached) {
          setUser(cached);
        } else {
          setAuthError(true);
        }
      }
    } finally {
      // Clean up legacy localStorage token if present
      localStorage.removeItem('token');
      setLoading(false);
    }
  }, [i18n]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = (token: string) => {
    // Decode token for client-side state without persisting raw token in localStorage
    const payload = decodeToken(token);
    setUser(payload);
    saveCachedUser(payload);
    setAuthError(false);
    if (payload?.preferred_language && i18n.language !== payload.preferred_language) {
      i18n.changeLanguage(payload.preferred_language);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Failed to logout cleanly on server', e);
    } finally {
      localStorage.removeItem('token');
      saveCachedUser(null);
      setAuthError(false);
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
    <AuthContext.Provider value={{ user, login, logout, loading, authError, refreshUser, retryAuth: initAuth }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

const AuthConnectionError = ({ onRetry }: { onRetry: () => void }) => (
  <div className="page sect">
    <div className="blank">
      <p className="h2">Unable to reach the server</p>
      <p className="small">A temporary gateway error occurred while verifying your session.</p>
      <div className="row" style={{ justifyContent: 'center', marginTop: '1rem' }}>
        <button type="button" className="button button-primary" onClick={onRetry}>
          Retry Connection
        </button>
      </div>
    </div>
  </div>
);

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, authError, retryAuth } = useAuth();
  if (!user && authError) {
    return <AuthConnectionError onRetry={retryAuth} />;
  }
  if (!user) {
    return <Navigate to="/login" />;
  }
  return children;
};

export const StaffRoute = ({ children }: { children: ReactNode }) => {
  const { user, authError, retryAuth } = useAuth();
  if (!user && authError) {
    return <AuthConnectionError onRetry={retryAuth} />;
  }
  if (!user || (user.role !== 'admin' && user.role !== 'moderator' && user.role !== 'reviewer')) {
    return <Navigate to="/" />;
  }
  return children;
};
