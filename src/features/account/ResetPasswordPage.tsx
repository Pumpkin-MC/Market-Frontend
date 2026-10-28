import { Trans, useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import '../../styles/account.css';

const ResetPasswordPage = () => {
    const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError(t('auth.reset.invalid_link_error'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.reset.password_length_error'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.reset.password_mismatch'));
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      alert(t('auth.reset.success'));
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="ac-auth">
        <div className="panel panel-fg ac-card">
          <div className="ac-card-head">
            <span className="ac-badge ac-badge-danger"><AlertCircle /></span>
            <h1 className="h1"><Trans t={t} i18nKey="auth.reset.invalid_link_title" components={{ highlight: <span className="mark ac-mark-danger" /> }} /></h1>
            <p className="small">{t('auth.reset.invalid_link_description')}</p>
          </div>
          <Link to="/forgot-password" className="button button-primary button-block">{t('auth.reset.request_link')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ac-auth">
      <div className="panel panel-fg ac-card">
        <div className="ac-card-head">
          <h1 className="h1"><Trans t={t} i18nKey="auth.reset.title" components={{ highlight: <span className="mark" /> }} /></h1>
          <p className="small">{t('auth.reset.subtitle')}</p>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          {error && (
            <div className="notice notice-danger ac-alert" role="alert">
              <span className="mark-box mark-box-danger"><AlertCircle /></span>
              <p className="notice-text">{error}</p>
            </div>
          )}

          <label className="field" htmlFor="password">
            <span className="field-label">{t('profile.security.new_password')}</span>
            <span className="control">
              <input
                id="password"
                name="password"
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
              />
            </span>
          </label>

          <label className="field" htmlFor="confirmPassword">
            <span className="field-label">{t('profile.security.confirm_password')}</span>
            <span className="control">
              <input
                id="confirmPassword"
                name="confirmPassword"
                className="input"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
              />
            </span>
          </label>

          <button className="button button-primary button-lg button-block" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? t('common.updating') : t('auth.reset.submit')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
