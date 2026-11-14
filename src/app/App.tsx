import { lazy, useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CookieBanner } from '../components/CookieBanner';
import {
  IS_ACCOUNTS_SURFACE,
  getAccountsUrl,
  getSsoAuthorizeUrl,
  useCrossSubdomainSso,
} from '../lib/domains';
import { AuthProvider, ProtectedRoute, StaffRoute, useAuth } from './auth';
import { AccountsLayout, MainLayout, PageLoader, ScrollToTop, StudioLayout } from './shell';

const HomePage = lazy(() => import('../features/store/HomePage'));
const PluginPage = lazy(() => import('../features/plugin/PluginPage'));
const LoginPage = lazy(() => import('../features/account/LoginPage'));
const RegisterPage = lazy(() => import('../features/account/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../features/account/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../features/account/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('../features/account/VerifyEmailPage'));
const ConfirmEmailChangePage = lazy(() => import('../features/account/ConfirmEmailChangePage'));
const CheckEmailPage = lazy(() => import('../features/account/CheckEmailPage'));
const SsoCallbackPage = lazy(() => import('../features/account/SsoCallbackPage'));
const SettingsPage = lazy(() => import('../features/account/SettingsPage'));
const AuthorPage = lazy(() => import('../features/store/AuthorPage'));
const SearchPage = lazy(() => import('../features/store/SearchPage'));
const AudiencePage = lazy(() => import('../features/studio/AudiencePage'));
const PluginsPage = lazy(() => import('../features/studio/PluginsPage'));
const ManagePluginPage = lazy(() => import('../features/studio/manage/ManagePluginPage'));
const TermsOfServicePage = lazy(() => import('../features/legal/TermsOfServicePage'));
const PrivacyPolicyPage = lazy(() => import('../features/legal/PrivacyPolicyPage'));
const GuidelinesPage = lazy(() => import('../features/legal/GuidelinesPage'));
const DeveloperTermsPage = lazy(() => import('../features/legal/DeveloperTermsPage'));
const LegalNoticePage = lazy(() => import('../features/legal/LegalNoticePage'));
const StaffPage = lazy(() => import('../features/staff/StaffPage'));

const AccountsRootIndex = () => {
  const { user } = useAuth();
  return <Navigate to={user ? '/settings' : '/login'} replace />;
};

const ExternalAccountsRedirect = ({ mode }: { mode: 'login' | 'register' | 'settings' }) => {
  const location = useLocation();
  const { user } = useAuth();
  const ssoEnabled = useCrossSubdomainSso();

  useEffect(() => {
    if (!ssoEnabled) return;

    if (mode === 'settings') {
      window.location.replace(getAccountsUrl(`/settings${location.search}`));
      return;
    }

    if (user && mode === 'login') {
      return;
    }

    const fromState = (location.state as { from?: string } | null)?.from;
    if (mode === 'login') {
      window.location.replace(getSsoAuthorizeUrl(fromState || '/'));
    } else {
      const origin = window.location.origin;
      const returnUrl = fromState && fromState.startsWith('/') ? `${origin}${fromState}` : `${origin}/`;
      window.location.replace(
        getAccountsUrl(`/register?redirect_to=${encodeURIComponent(returnUrl)}`)
      );
    }
  }, [location.search, location.state, mode, ssoEnabled, user]);

  if (!ssoEnabled) {
    if (mode === 'login') return <LoginPage />;
    if (mode === 'register') return <RegisterPage />;
    return (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    );
  }

  if (user && mode === 'login') {
    return <Navigate to="/dashboard" replace />;
  }

  return <PageLoader />;
};

const AccountsRoutes = () => (
  <Routes>
    <Route element={<AccountsLayout />}>
      <Route path="/" element={<AccountsRootIndex />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
      <Route path="verify-email" element={<VerifyEmailPage />} />
      <Route path="confirm-email" element={<ConfirmEmailChangePage />} />
      <Route path="check-email" element={<CheckEmailPage />} />
      <Route
        path="settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="terms" element={<TermsOfServicePage />} />
      <Route path="privacy" element={<PrivacyPolicyPage />} />
      <Route path="guidelines" element={<GuidelinesPage />} />
      <Route path="developer-terms" element={<DeveloperTermsPage />} />
      <Route path="legal/developer-terms" element={<DeveloperTermsPage />} />
      <Route path="legal-notice" element={<LegalNoticePage />} />
      <Route path="impressum" element={<LegalNoticePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
);

const MarketRoutes = () => (
  <Routes>
    <Route element={<MainLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="plugin/:id" element={<PluginPage />} />
      <Route path="plugin/:id-:slug" element={<PluginPage />} />
      <Route path="plugins/:id" element={<PluginPage />} />
      <Route path="plugins/:id-:slug" element={<PluginPage />} />
      <Route path="profile/:username" element={<AuthorPage />} />
      <Route path="search" element={<SearchPage />} />
      <Route path="terms" element={<TermsOfServicePage />} />
      <Route path="privacy" element={<PrivacyPolicyPage />} />
      <Route path="guidelines" element={<GuidelinesPage />} />
      <Route path="developer-terms" element={<DeveloperTermsPage />} />
      <Route path="legal/developer-terms" element={<DeveloperTermsPage />} />
      <Route path="legal-notice" element={<LegalNoticePage />} />
      <Route path="impressum" element={<LegalNoticePage />} />
      <Route path="auth/callback" element={<SsoCallbackPage />} />
      <Route path="login" element={<ExternalAccountsRedirect mode="login" />} />
      <Route path="register" element={<ExternalAccountsRedirect mode="register" />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
      <Route path="verify-email" element={<VerifyEmailPage />} />
      <Route path="confirm-email" element={<ConfirmEmailChangePage />} />
      <Route path="check-email" element={<CheckEmailPage />} />
      <Route
        path="staff"
        element={
          <StaffRoute>
            <StaffPage />
          </StaffRoute>
        }
      />
      <Route path="settings" element={<ExternalAccountsRedirect mode="settings" />} />
    </Route>

    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <StudioLayout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to="/dashboard/plugins" replace />} />
      <Route path="audience" element={<AudiencePage />} />
      <Route path="plugins" element={<PluginsPage />} />
      <Route path="add-plugin" element={<Navigate to="/dashboard/plugins?create=true" replace />} />
      <Route path="manage-plugin/:id" element={<ManagePluginPage />} />
    </Route>
  </Routes>
);

const App = () => (
  <Router>
    <AuthProvider>
      <ScrollToTop />
      <CookieBanner />
      {IS_ACCOUNTS_SURFACE ? <AccountsRoutes /> : <MarketRoutes />}
    </AuthProvider>
  </Router>
);

export default App;
