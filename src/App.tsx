import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, useNavigate, Outlet, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Home from './pages/Home';
import PluginDetail from './pages/PluginDetail';
import LoginPage from './pages/auth/LoginPage'; 
import RegisterPage from './pages/auth/RegisterPage'; 
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import ConfirmEmailChangePage from './pages/auth/ConfirmEmailChangePage';
import CheckEmailPage from './pages/auth/CheckEmailPage';
import ProfilePage from './pages/ProfilePage';
import AuthorProfilePage from './pages/AuthorProfilePage';
import SearchResultsPage from './pages/SearchResultsPage';
import DashboardOverview from './pages/dashboard/DashboardOverview';
import DashboardAudience from './pages/dashboard/DashboardAudience';
import DashboardPlugins from './pages/dashboard/DashboardPlugins';
import ManagePlugin from './pages/dashboard/plugin/ManagePlugin';
import AddPlugin from './pages/dashboard/plugin/AddPlugin';
import TermsOfServicePage from './pages/legal/TermsOfServicePage';
import PrivacyPolicyPage from './pages/legal/PrivacyPolicyPage';
import AdminPanel from './pages/admin/AdminPanel';
import './App.css';

import api from './api';

// --- Auth Context ---
const AuthContext = createContext<any>(null);
export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const payload = decodeToken(token);
      if (payload && payload.exp * 1000 > Date.now()) {
        setUser(payload);
      } else {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = (token: string) => {
    localStorage.setItem('token', token);
    const payload = decodeToken(token);
    setUser(payload);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/user/me');
      if (res.data.token) {
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

// --- Protected Route ---
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" />;
  }
  return children;
};

// --- Admin Route ---
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" />;
  }
  return children;
};

// --- Main App & Layout ---
const App = () => (
  <Router>
    <AuthProvider>
      <Routes>
        {/* All routes share MainLayout (navbar + footer) */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="plugin/:id" element={<PluginDetail />} />
          <Route path="profile/:username" element={<AuthorProfilePage />} />
          <Route path="search" element={<SearchResultsPage />} />
          <Route path="terms" element={<TermsOfServicePage />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="verify-email" element={<VerifyEmailPage />} />
          <Route path="confirm-email" element={<ConfirmEmailChangePage />} />
          <Route path="check-email" element={<CheckEmailPage />} />
          <Route path="dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardOverview />} />
            <Route path="audience" element={<DashboardAudience />} />
            <Route path="plugins" element={<DashboardPlugins />} />
            <Route path="add-plugin" element={<AddPlugin />} />
            <Route path="manage-plugin/:id" element={<ManagePlugin />} />
          </Route>
          <Route path="admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="settings" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </AuthProvider>
  </Router>
);

const MainLayout = () => {
  const { user } = useAuth();
  return (
    <>
      <Navbar user={user} />
      <main><Outlet /></main>
      <Footer />
    </>
  );
};

import './pages/dashboard/Dashboard.css';

const DashboardLayout = () => {
  const { t } = useTranslation();
  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <NavLink to="/dashboard" end>{t('dashboard')}</NavLink>
        {/* <NavLink to="/dashboard/audience">Audience</NavLink> */}
        <NavLink to="/dashboard/plugins">My Plugins</NavLink>
      </nav>
      <div className="dashboard-content">
        <Outlet />
      </div>
    </div>
  );
};

// --- Components ---
const Navbar = ({ user }: any) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsMenuOpen(false);
    }
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="navbar">
      <div className="logo" style={{ display: 'flex', alignItems: 'center' }}>
        <Link to="/" onClick={() => setIsMenuOpen(false)}>
          <img src="/icon.png" alt="Market Logo" style={{ height: '50px', marginRight: '0px', verticalAlign: 'middle' }} />
          <span>MARKET</span>
        </Link>
      </div>

      <button className="mobile-menu-toggle" onClick={toggleMenu} aria-label="Toggle menu">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {isMenuOpen ? (
            <path d="M18 6L6 18M6 6l12 12" />
          ) : (
            <path d="M3 12h18M3 6h18M3 18h18" />
          )}
        </svg>
      </button>

      <div className={`nav-content ${isMenuOpen ? 'open' : ''}`}>
        <div className="nav-links">
          <NavLink to="/" onClick={() => setIsMenuOpen(false)}>{t('home')}</NavLink>
          {user && <NavLink to="/dashboard" onClick={() => setIsMenuOpen(false)}>{t('dashboard')}</NavLink>}
          {user && user.role === 'admin' && <NavLink to="/admin" onClick={() => setIsMenuOpen(false)}>Admin</NavLink>}
        </div>

        {!user && (
          <div className="nav-search">
            <input
              type="text"
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
        )}

        <div className="nav-actions">
          {user ? (
            <>
              <div className="nav-search-right">
                <input
                  type="text"
                  placeholder={t('search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                />
              </div>
              <NavLink to="/settings" className="nav-user-link" onClick={() => setIsMenuOpen(false)}>{user.username}</NavLink>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary" onClick={() => setIsMenuOpen(false)}>{t('login')}</Link>
              <Link to="/register" className="btn" onClick={() => setIsMenuOpen(false)}>{t('register')}</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const Footer = () => (
  <footer style={{ padding: '16px 24px' }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      flexWrap: 'wrap',
    }}>
      {/* Logo inline */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', opacity: 0.6 }}>
        <img src="/icon.png" alt="Market Logo" style={{ height: '20px', verticalAlign: 'middle' }} />
      </Link>

      <span style={{ opacity: 0.2, fontSize: '11px' }}>·</span>

      <p style={{ fontSize: '12px', opacity: 0.4, margin: 0 }}>
        © 2026 PumpkinMC
      </p>

      <span style={{ opacity: 0.2, fontSize: '11px' }}>·</span>

      <Link
        to="/terms"
        style={{ fontSize: '12px', color: 'inherit', opacity: 0.4, textDecoration: 'none' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
      >
        Terms
      </Link>

      <Link
        to="/privacy"
        style={{ fontSize: '12px', color: 'inherit', opacity: 0.4, textDecoration: 'none' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
      >
        Privacy
      </Link>
    </div>
  </footer>
);

export default App;