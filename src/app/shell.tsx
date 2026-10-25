import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, Store, X } from 'lucide-react';
import { Select } from '../components/Select';
import { openCookiePreferencesModal } from '../lib/consent';
import api from '../lib/api';
import { NavSearch } from '../features/store/NavSearch';
import { useAuth } from './auth';

export const PageLoader = () => (
  <div className="page-loader" role="status">
    <span className="loading" />
  </div>
);

export const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

export const MainLayout = () => {
  const { user } = useAuth();
  return (
    <>
      <Masthead user={user} />
      <main className="shell-main">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </>
  );
};

const isStaff = (user: any) => user && (user.role === 'admin' || user.role === 'moderator');

const UserChip = ({ user, onNavigate }: { user: any; onNavigate: () => void }) => (
  <NavLink to="/settings" className="user-chip" onClick={onNavigate}>
    <span className="avatar">{(user.username || '?').charAt(0).toUpperCase()}</span>
    <span className="user-chip-name">{user.username}</span>
  </NavLink>
);

const MenuToggle = ({ open, onToggle }: { open: boolean; onToggle: () => void }) => (
  <button type="button" className="button button-icon button-sm menu-toggle" onClick={onToggle} aria-label="Toggle menu" aria-expanded={open}>
    {open ? <X /> : <Menu />}
  </button>
);

const useMenu = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  return { open, toggle: () => setOpen(o => !o), close: () => setOpen(false) };
};

const Masthead = ({ user }: any) => {
  const { t } = useTranslation();
  const menu = useMenu();
  const links = (
    <>
      <NavLink to="/search" onClick={menu.close}>{t('nav.browse')}</NavLink>
      {user && (user.plugin_count > 0 || isStaff(user)) && <NavLink to="/dashboard" onClick={menu.close}>{t('nav.dashboard')}</NavLink>}
      {user && <NavLink to={user.is_developer ? '/dashboard/plugins?create=true' : '/dashboard/plugins'} onClick={menu.close}>Publish</NavLink>}
      {isStaff(user) && <NavLink to="/staff" onClick={menu.close}>Staff</NavLink>}
    </>
  );
  const actions = user ? (
    <UserChip user={user} onNavigate={menu.close} />
  ) : (
    <>
      <Link to="/login" className="button button-sm" onClick={menu.close}>{t('nav.login')}</Link>
      <Link to="/register" className="button button-primary button-sm" onClick={menu.close}>{t('nav.register')}</Link>
    </>
  );

  return (
    <header className="masthead">
      <div className="page">
        <div className="masthead-bar">
          <Link to="/" className="brand" onClick={menu.close}>
            <img src="/icon.png" alt="Pumpkin" />
            <span className="brand-name"><span>Market</span></span>
          </Link>
          <nav className="navlinks" aria-label="Main">{links}</nav>
          <div className="masthead-search">
            <NavSearch onNavigate={menu.close} />
          </div>
          <div className="masthead-actions">{actions}</div>
          <MenuToggle open={menu.open} onToggle={menu.toggle} />
        </div>
      </div>
      {menu.open && (
        <nav className="mobile-menu" aria-label="Menu">
          <div className="page">
            {links}
            <div className="mobile-menu-actions">{actions}</div>
          </div>
        </nav>
      )}
    </header>
  );
};

const StudioMasthead = ({ user }: any) => {
  const menu = useMenu();
  const links = (
    <>
      {user?.is_developer && (
        <>
          <NavLink to="/dashboard/plugins" end onClick={menu.close}>Plugins</NavLink>
          <NavLink to="/dashboard/audience" onClick={menu.close}>Audience</NavLink>
        </>
      )}
      {isStaff(user) && <NavLink to="/staff" onClick={menu.close}>Staff</NavLink>}
    </>
  );
  const actions = (
    <>
      <Link to="/" className="button button-sm" onClick={menu.close}><Store />Store</Link>
      {user && <UserChip user={user} onNavigate={menu.close} />}
    </>
  );

  return (
    <header className="masthead">
      <div className="page page-wide">
        <div className="masthead-bar">
          <Link to="/dashboard/plugins" className="brand" onClick={menu.close}>
            <img src="/icon.png" alt="Pumpkin" />
            <span className="brand-name"><span>Studio</span></span>
          </Link>
          <nav className="navlinks" aria-label="Studio">{links}</nav>
          <div className="masthead-actions">{actions}</div>
          <MenuToggle open={menu.open} onToggle={menu.toggle} />
        </div>
      </div>
      {menu.open && (
        <nav className="mobile-menu" aria-label="Menu">
          <div className="page">
            {links}
            <div className="mobile-menu-actions">{actions}</div>
          </div>
        </nav>
      )}
    </header>
  );
};

export const StudioLayout = () => {
  const { user } = useAuth();
  return (
    <>
      <StudioMasthead user={user} />
      <main className="shell-main studio-main">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
    </>
  );
};

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'it', label: 'Italiano' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'pt', label: 'Português' },
  { value: 'pl', label: 'Polski' },
  { value: 'ru', label: 'Русский' },
  { value: 'tr', label: 'Türkçe' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'zh', label: '中文' },
];

const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const { user, login } = useAuth();

  const handleLanguageChange = async (newLang: string) => {
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
    <Select
      options={LANGUAGES}
      value={currentLang}
      onChange={handleLanguageChange}
      aria-label="Language selection"
      className="language-select"
    />
  );
};

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="colophon">
      <div className="page">
        <div className="colophon-grid">
          <div>
            <Link to="/" className="brand">
              <img src="/icon.png" alt="" />
              <span className="brand-name">Pumpkin <span>Market</span></span>
            </Link>
          </div>
          <div className="colophon-col">
            <span className="label">Market</span>
            <ul>
              <li><Link to="/search">{t('nav.browse')}</Link></li>
              <li><Link to="/dashboard/plugins">Publish</Link></li>
              <li><a href="https://pumpkinmc.org">Pumpkin</a></li>
            </ul>
          </div>
          <div className="colophon-col">
            <span className="label">Legal</span>
            <ul>
              <li><Link to="/terms">Terms</Link></li>
              <li><Link to="/privacy">Privacy</Link></li>
              <li><Link to="/legal-notice">Legal Notice</Link></li>
            </ul>
          </div>
          <div className="colophon-col">
            <span className="label">Developers</span>
            <ul>
              <li><Link to="/guidelines">Guidelines</Link></li>
              <li><Link to="/developer-terms">Developer Terms</Link></li>
              <li><button type="button" onClick={openCookiePreferencesModal}>Cookie Preferences</button></li>
            </ul>
          </div>
        </div>
        <div className="colophon-base">
          <span>© 2026 PumpkinMC</span>
          <span>Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.</span>
          <span className="spacer" />
          <LanguageSelector />
        </div>
      </div>
    </footer>
  );
};
