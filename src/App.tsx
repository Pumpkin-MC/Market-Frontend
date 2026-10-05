import React, { createContext, useContext, useState, useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Store, Search, X, ExternalLink } from 'lucide-react';
import { CookieBanner } from './components/CookieBanner';
import { openCookiePreferencesModal } from './utils/consent';
import { NavSearch } from './components/NavSearch';
import './App.css';

// --- Lazy Loaded Pages ---
const Home = React.lazy(() => import('./pages/Home'));
const PluginDetail = React.lazy(() => import('./pages/PluginDetail'));
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = React.lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/auth/ResetPasswordPage'));
const VerifyEmailPage = React.lazy(() => import('./pages/auth/VerifyEmailPage'));
const ConfirmEmailChangePage = React.lazy(() => import('./pages/auth/ConfirmEmailChangePage'));
const CheckEmailPage = React.lazy(() => import('./pages/auth/CheckEmailPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const AuthorProfilePage = React.lazy(() => import('./pages/AuthorProfilePage'));
const SearchResultsPage = React.lazy(() => import('./pages/SearchResultsPage'));
const DashboardAudience = React.lazy(() => import('./pages/dashboard/DashboardAudience'));
const DashboardPlugins = React.lazy(() => import('./pages/dashboard/DashboardPlugins'));
const ManagePlugin = React.lazy(() => import('./pages/dashboard/plugin/ManagePlugin'));
const TermsOfServicePage = React.lazy(() => import('./pages/legal/TermsOfServicePage'));
const PrivacyPolicyPage = React.lazy(() => import('./pages/legal/PrivacyPolicyPage'));
const GuidelinesPage = React.lazy(() => import('./pages/legal/GuidelinesPage'));
const DeveloperTermsPage = React.lazy(() => import('./pages/legal/DeveloperTermsPage'));
const LegalNoticePage = React.lazy(() => import('./pages/legal/LegalNoticePage'));
const AdminPanel = React.lazy(() => import('./pages/admin/AdminPanel'));


const PageLoader = () => (
  <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6, fontSize: '0.9rem' }}>
    Loading...
  </div>
);

import api from './api';

// --- Scroll To Top Helper ---
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

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

  const { i18n } = useTranslation();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await api.get('/user/me');
        if (res.data?.token) {
          const payload = decodeToken(res.data.token);
          if (payload && payload.exp * 1000 > Date.now()) {
            setUser(payload);
            if (payload.preferred_language && i18n.language !== payload.preferred_language) {
              i18n.changeLanguage(payload.preferred_language);
            }
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

// --- Protected Route ---
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" />;
  }
  return children;
};

// --- Staff Route (Admin & Moderator) ---
const StaffRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return <Navigate to="/" />;
  }
  return children;
};

// --- Main App & Layout ---
const App = () => (
  <Router>
    <AuthProvider>
      <ScrollToTop />
      <CookieBanner />
      <Routes>
        {/* All marketplace routes share MainLayout (original navbar + footer) */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="plugin/:id" element={<PluginDetail />} />
          <Route path="plugin/:id-:slug" element={<PluginDetail />} />
          <Route path="profile/:username" element={<AuthorProfilePage />} />
          <Route path="search" element={<SearchResultsPage />} />
          <Route path="terms" element={<TermsOfServicePage />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />
          <Route path="guidelines" element={<GuidelinesPage />} />
          <Route path="developer-terms" element={<DeveloperTermsPage />} />
          <Route path="legal/developer-terms" element={<DeveloperTermsPage />} />
          <Route path="legal-notice" element={<LegalNoticePage />} />
          <Route path="impressum" element={<LegalNoticePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="verify-email" element={<VerifyEmailPage />} />
          <Route path="confirm-email" element={<ConfirmEmailChangePage />} />
          <Route path="check-email" element={<CheckEmailPage />} />
          <Route path="staff" element={<StaffRoute><AdminPanel /></StaffRoute>} />
          <Route path="settings" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        </Route>


        {/* Developer Studio layout (Developer Studio navbar replaces original navbar when in dev menu) */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard/plugins" replace />} />
          <Route path="audience" element={<DashboardAudience />} />
          <Route path="plugins" element={<DashboardPlugins />} />
          <Route path="add-plugin" element={<Navigate to="/dashboard/plugins?create=true" replace />} />
          <Route path="manage-plugin/:id" element={<ManagePlugin />} />
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
      <main>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </>
  );
};

import './pages/dashboard/Dashboard.css';

const DeveloperStudioNavbar = ({ user }: any) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="navbar">
      <div className="logo" style={{ display: 'flex', alignItems: 'center' }}>
        <Link to="/dashboard/plugins" onClick={() => setIsMenuOpen(false)}>
          <img src="/icon.png" alt="Market Logo" style={{ height: '50px', marginRight: '0px', verticalAlign: 'middle' }} />
          <span>STUDIO</span>
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
          {user?.is_developer && (
            <>
              <NavLink to="/dashboard/plugins" onClick={() => setIsMenuOpen(false)}>Plugins</NavLink>
              <NavLink to="/dashboard/audience" onClick={() => setIsMenuOpen(false)}>Audience</NavLink>
              <NavLink to="/dashboard/plugins?create=true" onClick={() => setIsMenuOpen(false)}>Publish</NavLink>
            </>
          )}
          {user && (user.role === 'admin' || user.role === 'moderator') && (
            <NavLink to="/staff" onClick={() => setIsMenuOpen(false)}>Staff</NavLink>
          )}
        </div>


        <div className="nav-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link
            to="/"
            onClick={() => setIsMenuOpen(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: 'var(--text-muted, #94a3b8)',
              fontSize: '0.85rem',
              fontWeight: 500,
              textDecoration: 'none',
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.03)',
              transition: 'all 0.2s ease',
            }}
          >
            <Store size={15} />
            <span>Store</span>
          </Link>
          {user && (
            <NavLink to="/settings" className="nav-user-link" onClick={() => setIsMenuOpen(false)}>{user.username}</NavLink>
          )}
        </div>
      </div>
    </nav>
  );
};

const DashboardLayout = () => {
  const { user } = useAuth();
  return (
    <div className="dashboard-container">
      <DeveloperStudioNavbar user={user} />
      <div className="dashboard-content">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
};

// --- Components ---
const Navbar = ({ user }: any) => {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
    if (!isMenuOpen) {
      setIsSearchOpen(false);
    }
  };

  const toggleSearch = () => {
    setIsSearchOpen((prev) => !prev);
    if (!isSearchOpen) {
      setIsMenuOpen(false);
    }
  };

  const handleNavigate = () => {
    setIsMenuOpen(false);
    setIsSearchOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="logo">
          <Link to="/" onClick={handleNavigate}>
            <img src="/icon.png" alt="Market Logo" className="logo-img" />
            <span>MARKET</span>
          </Link>
        </div>

        <div className="nav-search-center">
          <NavSearch onNavigate={handleNavigate} />
        </div>

        <div className="mobile-header-actions">
          <button
            type="button"
            className={`mobile-header-btn ${isSearchOpen ? 'active' : ''}`}
            onClick={toggleSearch}
            aria-label="Toggle search"
          >
            {isSearchOpen ? <X size={20} /> : <Search size={20} />}
          </button>

          <button
            type="button"
            className={`mobile-header-btn mobile-menu-toggle ${isMenuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={20} /> : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>

        <div className={`nav-content ${isMenuOpen ? 'open' : ''}`}>
          <div className="nav-links">
            {user && (user.plugin_count > 0 || user.role === 'admin' || user.role === 'moderator') && (
              <NavLink to="/dashboard" onClick={handleNavigate}>{t('nav.dashboard')}</NavLink>
            )}
            {user && (
              <NavLink to={user.is_developer ? "/dashboard/plugins?create=true" : "/dashboard/plugins"} onClick={handleNavigate}>
                Publish
              </NavLink>
            )}
            {user && (user.role === 'admin' || user.role === 'moderator') && (
              <NavLink to="/staff" onClick={handleNavigate}>Staff</NavLink>
            )}
          </div>

          <div className="nav-actions">
            {user ? (
              <NavLink to="/settings" className="nav-user-link" onClick={handleNavigate}>{user.username}</NavLink>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary" onClick={handleNavigate}>{t('nav.login')}</Link>
                <Link to="/register" className="btn" onClick={handleNavigate}>{t('nav.register')}</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="mobile-nav-backdrop" onClick={handleNavigate} />
      )}

      {isSearchOpen && (
        <div className="mobile-search-panel">
          <NavSearch autoFocus onNavigate={handleNavigate} />
        </div>
      )}
    </nav>
  );
};

const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const { user, login } = useAuth();

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    if (user) {
      try {
        const res = await api.post('/user/change-language', { newLanguage: newLang });
        if (res.data.token) {
          login(res.data.token);
        }
      } catch (err) {
        console.error('Failed to update language on server', err);
      }
    }
  };

  const currentLang = i18n.language ? i18n.language.split('-')[0] : 'en';

  return (
    <select
      aria-label="Language selection"
      value={currentLang}
      onChange={handleLanguageChange}
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        color: 'inherit',
        fontSize: '12px',
        padding: '2px 8px',
        borderRadius: '6px',
        opacity: 0.6,
        cursor: 'pointer',
        outline: 'none',
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
    >
      <option value="en" style={{ background: '#18181b', color: '#fff' }}>English</option>
      <option value="de" style={{ background: '#18181b', color: '#fff' }}>Deutsch</option>
      <option value="fr" style={{ background: '#18181b', color: '#fff' }}>Français</option>
      <option value="es" style={{ background: '#18181b', color: '#fff' }}>Español</option>
      <option value="it" style={{ background: '#18181b', color: '#fff' }}>Italiano</option>
      <option value="nl" style={{ background: '#18181b', color: '#fff' }}>Nederlands</option>
      <option value="pt" style={{ background: '#18181b', color: '#fff' }}>Português</option>
      <option value="pl" style={{ background: '#18181b', color: '#fff' }}>Polski</option>
      <option value="ru" style={{ background: '#18181b', color: '#fff' }}>Русский</option>
      <option value="tr" style={{ background: '#18181b', color: '#fff' }}>Türkçe</option>
      <option value="ja" style={{ background: '#18181b', color: '#fff' }}>日本語</option>
      <option value="ko" style={{ background: '#18181b', color: '#fff' }}>한국어</option>
      <option value="zh" style={{ background: '#18181b', color: '#fff' }}>中文</option>
    </select>
  );
};

const Footer = () => (
  <footer className="site-footer">
    <div className="footer-top">
      <div className="footer-brand-col">
        <Link to="/" className="footer-logo">
          <img src="/icon.png" alt="Market Logo" className="footer-logo-img" />
          <span className="footer-logo-text">PUMPKIN<span>MARKET</span></span>
        </Link>
        <p className="footer-tagline">
          The official marketplace for high-performance, WebAssembly-powered Minecraft plugins built for the PumpkinMC server architecture.
        </p>
        <div className="footer-status-badge">
          <span className="footer-status-indicator" />
          <span className="footer-status-text">All Systems Operational</span>
        </div>
      </div>

      <div className="footer-col">
        <h4 className="footer-heading">Marketplace</h4>
        <ul className="footer-links">
          <li><Link to="/">Explore Plugins</Link></li>
          <li><Link to="/#browse">Trending Feed</Link></li>
          <li><Link to="/dashboard">Developer Studio</Link></li>
          <li><Link to="/dashboard/plugins?create=true">Publish Plugin</Link></li>
        </ul>
      </div>

      <div className="footer-col">
        <h4 className="footer-heading">Ecosystem</h4>
        <ul className="footer-links">
          <li>
            <a href="https://pumpkinmc.org/" target="_blank" rel="noopener noreferrer">
              PumpkinMC Core
              <ExternalLink size={12} className="footer-ext-icon" />
            </a>
          </li>
          <li>
            <a href="https://github.com/Pumpkin-MC" target="_blank" rel="noopener noreferrer">
              GitHub Organization
              <ExternalLink size={12} className="footer-ext-icon" />
            </a>
          </li>
          <li>
            <a href="https://discord.gg/pumpkinmc" target="_blank" rel="noopener noreferrer">
              Discord Community
              <ExternalLink size={12} className="footer-ext-icon" />
            </a>
          </li>
          <li><Link to="/guidelines">Community Guidelines</Link></li>
        </ul>
      </div>

      <div className="footer-col">
        <h4 className="footer-heading">Legal &amp; Trust</h4>
        <ul className="footer-links">
          <li><Link to="/terms">Terms of Service</Link></li>
          <li><Link to="/privacy">Privacy Policy</Link></li>
          <li><Link to="/developer-terms">Developer Terms</Link></li>
          <li><Link to="/legal-notice">Legal Notice</Link></li>
          <li>
            <button
              type="button"
              className="footer-btn-link"
              onClick={openCookiePreferencesModal}
            >
              Cookie Preferences
            </button>
          </li>
        </ul>
      </div>
    </div>

    <div className="footer-bottom">
      <div className="footer-bottom-left">
        <p className="footer-copyright">
          &copy; {new Date().getFullYear()} PumpkinMC Project. Released under open-source licenses.
        </p>
        <p className="footer-disclaimer">
          Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.
        </p>
      </div>

      <div className="footer-bottom-right">
        <div className="footer-lang-wrap">
          <span className="footer-lang-label">Language:</span>
          <LanguageSelector />
        </div>
      </div>
    </div>
  </footer>
);

export default App;