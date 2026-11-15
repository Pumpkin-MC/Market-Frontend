import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Menu, Plus, Server, Store, X } from 'lucide-react';
import { Select } from '../components/Select';
import SEO from '../components/SEO';
import { openCookiePreferencesModal } from '../lib/consent';
import api from '../lib/api';
import { getAccountsUrl, getMarketUrl, getServersUrl, useCrossSubdomainSso } from '../lib/domains';
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

const isStaff = (user: any) => user && (user.role === 'admin' || user.role === 'moderator' || user.role === 'reviewer');

const UserChip = ({ user, onNavigate }: { user: any; onNavigate: () => void }) => {
  const content = (
    <>
      <span className="avatar">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.username || ''} />
        ) : (
          (user.username || '?').charAt(0).toUpperCase()
        )}
      </span>
      <span className="user-chip-name">{user.username}</span>
    </>
  );

  if (useCrossSubdomainSso()) {
    return (
      <a href={getAccountsUrl('/settings')} className="user-chip" onClick={onNavigate}>
        {content}
      </a>
    );
  }

  return (
    <NavLink to="/settings" className="user-chip" onClick={onNavigate}>
      {content}
    </NavLink>
  );
};

const MenuToggle = ({ open, onToggle }: { open: boolean; onToggle: () => void }) => {
  const { t } = useTranslation();
  return (
    <button type="button" className="button button-icon button-sm menu-toggle" onClick={onToggle} aria-label={t('nav.toggle_menu')} aria-expanded={open}>
      {open ? <X /> : <Menu />}
    </button>
  );
};

const useMenu = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  return { open, toggle: () => setOpen(o => !o), close: () => setOpen(false) };
};

const Masthead = ({ user }: any) => {
  const { t } = useTranslation();
  const menu = useMenu();
  const sso = useCrossSubdomainSso();
  const links = (
    <>
      <NavLink to="/search" onClick={menu.close}>{t('nav.browse')}</NavLink>
      {sso ? (
        <a href={getServersUrl('/')} onClick={menu.close}>{t('nav.servers')}</a>
      ) : (
        <NavLink to="/servers" onClick={menu.close}>{t('nav.servers')}</NavLink>
      )}
      {user && (user.plugin_count > 0 || user.is_developer) && <NavLink to="/dashboard" onClick={menu.close}>{t('nav.dashboard')}</NavLink>}
      {user && <NavLink to={user.is_developer ? '/dashboard/plugins?create=true' : '/dashboard/plugins'} onClick={menu.close}>{t('nav.publish', 'Publish')}</NavLink>}
      {isStaff(user) && <NavLink to="/staff" onClick={menu.close}>{t('nav.staff', 'Staff')}</NavLink>}
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
          <nav className="navlinks" aria-label={t('nav.main_navigation')}>{links}</nav>
          <div className="masthead-search">
            <NavSearch onNavigate={menu.close} />
          </div>
          <div className="masthead-actions">{actions}</div>
          <MenuToggle open={menu.open} onToggle={menu.toggle} />
        </div>
      </div>
      {menu.open && (
        <nav className="mobile-menu" aria-label={t('nav.menu')}>
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
  const { t } = useTranslation();
  const menu = useMenu();
  const links = (
    <>
      {user?.is_developer && (
        <>
          <NavLink to="/dashboard/plugins" end onClick={menu.close}>{t('nav.plugins', 'Plugins')}</NavLink>
          <NavLink to="/dashboard/audience" onClick={menu.close}>{t('nav.audience', 'Audience')}</NavLink>
        </>
      )}
      {isStaff(user) && <NavLink to="/staff" onClick={menu.close}>{t('nav.staff', 'Staff')}</NavLink>}
    </>
  );
  const actions = (
    <>
      <Link to="/" className="button button-sm" onClick={menu.close}><Store />{t('nav.store', 'Store')}</Link>
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
          <nav className="navlinks" aria-label={t('nav.studio')}>{links}</nav>
          <div className="masthead-actions">{actions}</div>
          <MenuToggle open={menu.open} onToggle={menu.toggle} />
        </div>
      </div>
      {menu.open && (
        <nav className="mobile-menu" aria-label={t('nav.menu')}>
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

const AccountsMasthead = ({ user }: any) => {
  const { t } = useTranslation();
  const menu = useMenu();
  const links = (
    <>
      {user && (
        <>
          <NavLink to="/settings" end onClick={menu.close}>{t('nav.profile')}</NavLink>
          <a href={getServersUrl('/')} onClick={menu.close}>{t('nav.servers')}</a>
          <a href={getMarketUrl('/search')} onClick={menu.close}>{t('nav.market', 'Market')}</a>
          {(user.plugin_count > 0 || user.is_developer) && (
            <a href={getMarketUrl('/dashboard')} onClick={menu.close}>
              <LayoutDashboard size={15} /> {t('nav.dashboard', 'Studio')}
            </a>
          )}
        </>
      )}
      {!user && (
        <>
          <a href={getServersUrl('/')} onClick={menu.close}>{t('nav.servers')}</a>
          <a href={getMarketUrl('/')} onClick={menu.close}>{t('nav.market', 'Market')}</a>
        </>
      )}
    </>
  );
  const actions = user ? (
    <>
      <a href={getMarketUrl('/')} className="button button-sm" onClick={menu.close}>
        <Store />
        {t('nav.market', 'Market')}
      </a>
      <UserChip user={user} onNavigate={menu.close} />
    </>
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
          <Link to={user ? '/settings' : '/login'} className="brand" onClick={menu.close}>
            <img src="/icon.png" alt="Pumpkin" />
            <span className="brand-name"><span>Account</span></span>
          </Link>
          <nav className="navlinks" aria-label={t('nav.account')}>{links}</nav>
          <span className="spacer" />
          <div className="masthead-actions">{actions}</div>
          <MenuToggle open={menu.open} onToggle={menu.toggle} />
        </div>
      </div>
      {menu.open && (
        <nav className="mobile-menu" aria-label={t('nav.menu')}>
          <div className="page">
            {links}
            <div className="mobile-menu-actions">{actions}</div>
          </div>
        </nav>
      )}
    </header>
  );
};

const AccountsFooter = () => {
  const { t } = useTranslation();
  return (
    <footer className="colophon">
      <div className="page">
        <div className="colophon-grid">
          <div>
            <Link to="/" className="brand">
              <img src="/icon.png" alt="" />
              <span className="brand-name">Pumpkin <span>Account</span></span>
            </Link>
          </div>
          <div className="colophon-col">
            <span className="label">{t('nav.footer.ecosystem')}</span>
            <ul>
              <li><a href="https://pumpkinmc.org">PumpkinMC</a></li>
              <li><a href={getServersUrl('/')}>{t('nav.footer.pumpkin_servers')}</a></li>
              <li><a href={getMarketUrl('/')}>{t('nav.footer.pumpkin_market')}</a></li>
            </ul>
          </div>
          <div className="colophon-col">
            <span className="label">{t('nav.legal', 'Legal')}</span>
            <ul>
              <li><Link to="/terms">{t('nav.terms', 'Terms')}</Link></li>
              <li><Link to="/privacy">{t('nav.privacy', 'Privacy')}</Link></li>
              <li><Link to="/legal-notice">{t('nav.legal_notice', 'Legal Notice')}</Link></li>
            </ul>
          </div>
          <div className="colophon-col">
            <span className="label">{t('nav.footer.preferences')}</span>
            <ul>
              <li><button type="button" onClick={openCookiePreferencesModal}>{t('nav.cookie_preferences', 'Cookie Preferences')}</button></li>
            </ul>
          </div>
        </div>
        <div className="colophon-base">
          <span>© 2026 PumpkinMC</span>
          <span>{t('nav.footer.minecraft_disclaimer')}</span>
          <span className="spacer" />
          <LanguageSelector />
        </div>
      </div>
    </footer>
  );
};

export const AccountsLayout = () => {
  const { user } = useAuth();
  return (
    <>
      <SEO />
      <AccountsMasthead user={user} />
      <main className="shell-main">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <AccountsFooter />
    </>
  );
};

const ServersMasthead = ({ user }: any) => {
  const { t } = useTranslation();
  const menu = useMenu();
  const sso = useCrossSubdomainSso();
  const listServerHref = sso ? getAccountsUrl('/settings?tab=servers') : '/settings?tab=servers';

  const links = (
    <>
      <NavLink to="/" end onClick={menu.close}>{t('nav.browse')}</NavLink>
      {sso ? (
        <a href={listServerHref} onClick={menu.close}>{t('nav.your_servers')}</a>
      ) : (
        <Link to={listServerHref} onClick={menu.close}>{t('nav.your_servers')}</Link>
      )}
      <a href={getMarketUrl('/')} onClick={menu.close}>{t('nav.market', 'Market')}</a>
    </>
  );

  const actions = (
    <>
      {sso ? (
        <a href={listServerHref} className="button button-sm" onClick={menu.close}>
          <Plus size={15} /> {t('nav.list_server')}
        </a>
      ) : (
        <Link to={listServerHref} className="button button-sm" onClick={menu.close}>
          <Plus size={15} /> {t('nav.list_server')}
        </Link>
      )}
      {user ? (
        <UserChip user={user} onNavigate={menu.close} />
      ) : (
        <>
          <Link to="/login" className="button button-sm" onClick={menu.close}>{t('nav.login')}</Link>
          <Link to="/register" className="button button-primary button-sm" onClick={menu.close}>{t('nav.register')}</Link>
        </>
      )}
    </>
  );

  return (
    <header className="masthead">
      <div className="page">
        <div className="masthead-bar">
          <Link to="/" className="brand" onClick={menu.close}>
            <img src="/icon.png" alt="Pumpkin" />
            <span className="brand-name"><span>Servers</span></span>
          </Link>
          <nav className="navlinks" aria-label={t('nav.servers_aria')}>{links}</nav>
          <span className="spacer" />
          <div className="masthead-actions">{actions}</div>
          <MenuToggle open={menu.open} onToggle={menu.toggle} />
        </div>
      </div>
      {menu.open && (
        <nav className="mobile-menu" aria-label={t('nav.menu')}>
          <div className="page">
            {links}
            <div className="mobile-menu-actions">{actions}</div>
          </div>
        </nav>
      )}
    </header>
  );
};

const ServersFooter = () => {
  const { t } = useTranslation();
  const sso = useCrossSubdomainSso();
  const listServerHref = sso ? getAccountsUrl('/settings?tab=servers') : '/settings?tab=servers';

  return (
    <footer className="colophon">
      <div className="page">
        <div className="colophon-grid">
          <div>
            <Link to="/" className="brand">
              <img src="/icon.png" alt="" />
              <span className="brand-name">Pumpkin <span>Servers</span></span>
            </Link>
          </div>
          <div className="colophon-col">
            <span className="label">{t('nav.footer.directory')}</span>
            <ul>
              <li><Link to="/"><Server size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />{t('nav.footer.browse_servers')}</Link></li>
              <li>
                {sso ? (
                  <a href={listServerHref}>{t('nav.footer.list_your_server')}</a>
                ) : (
                  <Link to={listServerHref}>{t('nav.footer.list_your_server')}</Link>
                )}
              </li>
              <li><a href={getMarketUrl('/')}>{t('nav.footer.pumpkin_market')}</a></li>
              <li><a href="https://pumpkinmc.org">PumpkinMC</a></li>
            </ul>
          </div>
          <div className="colophon-col">
            <span className="label">{t('nav.legal', 'Legal')}</span>
            <ul>
              <li><Link to="/terms">{t('nav.terms', 'Terms')}</Link></li>
              <li><Link to="/privacy">{t('nav.privacy', 'Privacy')}</Link></li>
              <li><Link to="/guidelines">{t('nav.guidelines', 'Guidelines')}</Link></li>
              <li><Link to="/legal-notice">{t('nav.legal_notice', 'Legal Notice')}</Link></li>
            </ul>
          </div>
          <div className="colophon-col">
            <span className="label">{t('nav.footer.preferences')}</span>
            <ul>
              <li><button type="button" onClick={openCookiePreferencesModal}>{t('nav.cookie_preferences', 'Cookie Preferences')}</button></li>
            </ul>
          </div>
        </div>
        <div className="colophon-base">
          <span>© 2026 PumpkinMC</span>
          <span>{t('nav.footer.minecraft_disclaimer')}</span>
          <span className="spacer" />
          <LanguageSelector />
        </div>
      </div>
    </footer>
  );
};

export const ServersLayout = () => {
  const { user } = useAuth();
  return (
    <>
      <ServersMasthead user={user} />
      <main className="shell-main">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <ServersFooter />
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
  const { t, i18n } = useTranslation();
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
      aria-label={t('nav.language_selection')}
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
            <span className="label">{t('nav.market', 'Market')}</span>
            <ul>
              <li><Link to="/search">{t('nav.browse')}</Link></li>
              <li><a href={getServersUrl('/')}>{t('nav.footer.pumpkin_servers')}</a></li>
              <li><Link to="/dashboard/plugins">{t('nav.publish', 'Publish')}</Link></li>
              <li><a href="https://pumpkinmc.org">Pumpkin</a></li>
            </ul>
          </div>
          <div className="colophon-col">
            <span className="label">{t('nav.legal', 'Legal')}</span>
            <ul>
              <li><Link to="/terms">{t('nav.terms', 'Terms')}</Link></li>
              <li><Link to="/privacy">{t('nav.privacy', 'Privacy')}</Link></li>
              <li><Link to="/legal-notice">{t('nav.legal_notice', 'Legal Notice')}</Link></li>
            </ul>
          </div>
          <div className="colophon-col">
            <span className="label">{t('nav.developers', 'Developers')}</span>
            <ul>
              <li><Link to="/guidelines">{t('nav.guidelines', 'Guidelines')}</Link></li>
              <li><Link to="/developer-terms">{t('nav.developer_terms', 'Developer Terms')}</Link></li>
              <li><button type="button" onClick={openCookiePreferencesModal}>{t('nav.cookie_preferences', 'Cookie Preferences')}</button></li>
            </ul>
          </div>
        </div>
        <div className="colophon-base">
          <span>© 2026 PumpkinMC</span>
          <span>{t('nav.footer.minecraft_disclaimer')}</span>
          <span className="spacer" />
          <LanguageSelector />
        </div>
      </div>
    </footer>
  );
};
