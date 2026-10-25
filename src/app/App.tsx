import { lazy } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { CookieBanner } from '../components/CookieBanner';
import { AuthProvider, ProtectedRoute, StaffRoute } from './auth';
import { MainLayout, ScrollToTop, StudioLayout } from './shell';

const HomePage = lazy(() => import('../features/store/HomePage'));
const PluginPage = lazy(() => import('../features/plugin/PluginPage'));
const LoginPage = lazy(() => import('../features/account/LoginPage'));
const RegisterPage = lazy(() => import('../features/account/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../features/account/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../features/account/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('../features/account/VerifyEmailPage'));
const ConfirmEmailChangePage = lazy(() => import('../features/account/ConfirmEmailChangePage'));
const CheckEmailPage = lazy(() => import('../features/account/CheckEmailPage'));
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

const App = () => (
  <Router>
    <AuthProvider>
      <ScrollToTop />
      <CookieBanner />
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="plugin/:id" element={<PluginPage />} />
          <Route path="plugin/:id-:slug" element={<PluginPage />} />
          <Route path="profile/:username" element={<AuthorPage />} />
          <Route path="search" element={<SearchPage />} />
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
          <Route path="staff" element={<StaffRoute><StaffPage /></StaffRoute>} />
          <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        </Route>

        <Route path="/dashboard" element={<ProtectedRoute><StudioLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard/plugins" replace />} />
          <Route path="audience" element={<AudiencePage />} />
          <Route path="plugins" element={<PluginsPage />} />
          <Route path="add-plugin" element={<Navigate to="/dashboard/plugins?create=true" replace />} />
          <Route path="manage-plugin/:id" element={<ManagePluginPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  </Router>
);

export default App;
