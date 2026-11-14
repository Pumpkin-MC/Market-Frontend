import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { Turnstile } from '@marsidev/react-turnstile';
import { AlertCircle, Check } from 'lucide-react';
import api from '../../lib/api';
import '../../styles/account.css';

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<any>(null);

  const validateEmail = (email: string) =>
    Boolean(String(email).toLowerCase().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/));

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (emailTouched) {
      setEmailValid(val === '' ? null : validateEmail(val));
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailValid(email === '' ? null : validateEmail(email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setEmailTouched(true);
    const isEmailValid = validateEmail(email);
    setEmailValid(isEmailValid);

    if (!isEmailValid) {
      setError(t('auth.errors.invalid_email'));
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');

    let currentToken = captchaToken;
    if (!currentToken && turnstileRef.current) {
      try {
        currentToken = await turnstileRef.current.getResponsePromise(2000);
      } catch (err) {
        try {
          turnstileRef.current.reset();
          currentToken = await turnstileRef.current.getResponsePromise(4000);
        } catch (resetErr) {
          console.error('Turnstile verification failed:', resetErr);
        }
      }
    }

    if (!currentToken) {
      setError(t('auth.errors.security_check'));
      setIsSubmitting(false);
      return;
    }

    try {
      await api.post('/auth/forgot-password', { email, captchaToken: currentToken });
      setMessage(t('auth.forgot.sent'));
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.errors.generic'));
      if (turnstileRef.current) {
        try {
          turnstileRef.current.reset();
          setCaptchaToken(null);
        } catch (_) {}
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const emailIsInvalid = emailTouched && emailValid === false;
  const emailIsValid   = emailTouched && emailValid === true;

  return (
    <div className="ac-auth">
      <div className="panel panel-fg ac-card">
        <div className="ac-card-head">
          <h1 className="h1"><Trans t={t} i18nKey="auth.forgot.title" components={{ highlight: <span className="mark" /> }} /></h1>
          <p className="small">{t('auth.forgot.subtitle')}</p>
        </div>

        <form className="stack" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="notice notice-danger ac-alert" role="alert">
              <span className="mark-box mark-box-danger"><AlertCircle /></span>
              <p className="notice-text">{error}</p>
            </div>
          )}
          {message && (
            <div className="notice notice-success ac-alert" role="status">
              <span className="mark-box mark-box-success"><Check /></span>
              <p className="notice-text">{message}</p>
            </div>
          )}

          <label className="field" htmlFor="email">
            <span className="field-label">{t('auth.email')}</span>
            <span className={`control${emailIsValid ? ' ac-valid' : ''}`}>
              <input
                id="email"
                name="email"
                className="input"
                type="email"
                placeholder={t('auth.email_placeholder')}
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                autoComplete="email"
                required
                disabled={isSubmitting}
                aria-invalid={emailIsInvalid || undefined}
              />
              {emailIsValid && <Check className="ac-ok" />}
            </span>
            {emailIsInvalid && (
              <span className="field-error"><AlertCircle size={14} />{t('auth.invalid_email_hint')}</span>
            )}
          </label>

          <div className="ac-turnstile">
            <Turnstile
              ref={turnstileRef}
              siteKey="0x4AAAAAAClcSibyhKfR0H6o"
              onSuccess={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
              onError={() => setCaptchaToken(null)}
              options={{ theme: 'dark', appearance: 'interaction-only' } as any}
            />
          </div>

          <button className="button button-primary button-lg button-block" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? t('auth.forgot.sending') : t('auth.forgot.submit')}
          </button>
        </form>

        <p className="ac-card-foot small">
          <Trans t={t} i18nKey="auth.forgot.sign_in" components={{ login: <Link to="/login" className="link link-pumpkin" /> }} />
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
