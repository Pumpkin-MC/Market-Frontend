import type { TFunction } from 'i18next';
import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { Turnstile } from '@marsidev/react-turnstile';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import api from '../../lib/api';
import { getLanguageCode } from '../../lib/locale';
import '../../styles/account.css';

interface PasswordRequirement {
  label: `auth.password_requirements.${'length' | 'uppercase' | 'lowercase' | 'number' | 'special'}`;
  test: (pw: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'auth.password_requirements.length',           test: pw => pw.length >= 8 },
  { label: 'auth.password_requirements.uppercase',   test: pw => /[A-Z]/.test(pw) },
  { label: 'auth.password_requirements.lowercase',   test: pw => /[a-z]/.test(pw) },
  { label: 'auth.password_requirements.number',             test: pw => /[0-9]/.test(pw) },
  { label: 'auth.password_requirements.special',  test: pw => /[^A-Za-z0-9]/.test(pw) },
];

function getStrength(pw: string, t: TFunction): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: 'var(--line-2)' };
  const passed = PASSWORD_REQUIREMENTS.filter(r => r.test(pw)).length;
  if (passed <= 1) return { score: 1, label: t('auth.password_strength.very_weak'),  color: 'var(--danger)' };
  if (passed === 2) return { score: 2, label: t('auth.password_strength.weak'),       color: 'var(--pumpkin)' };
  if (passed === 3) return { score: 3, label: t('auth.password_strength.fair'),       color: 'var(--warning)' };
  if (passed === 4) return { score: 4, label: t('auth.password_strength.strong'),     color: 'var(--success)' };
  return              { score: 5, label: t('auth.password_strength.very_strong'), color: 'var(--success)' };
}

const RegisterPage = () => {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState({ username: '', email: '', password: '', website: '' });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<any>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const validateEmail = (email: string) =>
    Boolean(String(email).toLowerCase().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/));

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm({ ...form, email: val });
    if (emailTouched) setEmailValid(val === '' ? null : validateEmail(val));
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailValid(form.email === '' ? null : validateEmail(form.email));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, password: e.target.value });
    if (!passwordTouched && e.target.value.length > 0) setPasswordTouched(true);
  };

  const strength = getStrength(form.password, t);
  const allRequirementsMet = PASSWORD_REQUIREMENTS.every(r => r.test(form.password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.website) return;

    setEmailTouched(true);
    const isEmailValid = validateEmail(form.email);
    setEmailValid(isEmailValid);
    setPasswordTouched(true);

    if (!isEmailValid) { setError(t('auth.errors.invalid_email')); return; }
    if (!allRequirementsMet) { setError(t('auth.register.password_requirements_error')); return; }

    setIsSubmitting(true);
    setError('');

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
      const language = getLanguageCode(i18n.language);
      await api.post('/auth/register', { ...form, captchaToken: currentToken, language });
      navigate('/check-email', { state: { email: form.email } });
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.register.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const emailIsInvalid = emailTouched && emailValid === false;
  const emailIsValid   = emailTouched && emailValid === true;
  const showStrengthMeter = passwordTouched && form.password.length > 0;

  const title = t('auth.register_title');
  const cut = title.lastIndexOf(' ') + 1;
  const metCount = PASSWORD_REQUIREMENTS.filter(r => r.test(form.password)).length;

  return (
    <div className="ac-auth">
      <div className="panel panel-fg ac-card">
        <div className="ac-card-head">
          <h1 className="h1">{title.slice(0, cut)}<span className="mark">{title.slice(cut)}</span></h1>
        </div>

        <form className="stack" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="notice notice-danger ac-alert" role="alert">
              <span className="mark-box mark-box-danger"><AlertCircle /></span>
              <p className="notice-text">{error}</p>
            </div>
          )}

          <input type="text" hidden tabIndex={-1}
            onChange={e => setForm({ ...form, website: e.target.value })} />

          <label className="field" htmlFor="username">
            <span className="field-label">{t('auth.username')}</span>
            <span className="control">
              <input
                id="username" name="username" className="input" type="text" placeholder={t('auth.username_placeholder')}
                onChange={e => setForm({ ...form, username: e.target.value })}
                required disabled={isSubmitting} autoComplete="username"
                autoCapitalize="none" spellCheck={false}
              />
            </span>
          </label>

          <label className="field" htmlFor="email">
            <span className="field-label">{t('auth.email')}</span>
            <span className={`control${emailIsValid ? ' ac-valid' : ''}`}>
              <input
                id="email"
                name="email"
                className="input"
                type="email" placeholder={t('auth.email_placeholder')}
                value={form.email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                required disabled={isSubmitting} autoComplete="email"
                aria-invalid={emailIsInvalid || undefined}
              />
              {emailIsValid && <Check className="ac-ok" />}
            </span>
            {emailIsInvalid && (
              <span className="field-error"><AlertCircle size={14} />{t('auth.invalid_email_hint')}</span>
            )}
            {emailIsValid && (
              <span className="field-hint ac-hint-ok">{t('auth.register.email_valid')}</span>
            )}
          </label>

          <div className="field">
            <label className="field-label" htmlFor="password">{t('auth.password')}</label>
            <span className="control">
              <input
                id="password"
                name="password"
                className="input"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('auth.register.password_placeholder')}
                value={form.password}
                onChange={handlePasswordChange}
                required disabled={isSubmitting} autoComplete="new-password"
              />
              <button
                type="button"
                className="ac-eye"
                onClick={() => setShowPassword(p => !p)}
                aria-label={showPassword ? t('common.hide_password') : t('common.show_password')}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </span>

            {showStrengthMeter && (
              <div className="ac-strength" style={{ '--tone': strength.color } as React.CSSProperties}>
                <div className="ac-strength-bars">
                  {[1, 2, 3, 4, 5].map(i => (
                    <span key={i} data-on={strength.score >= i || undefined} />
                  ))}
                </div>

                <div className="row small">
                  <span className="ac-strength-label">{strength.label}</span>
                  <span className="spacer" />
                  <span>{t('auth.password_requirements.requirements_met', { met: metCount, total: PASSWORD_REQUIREMENTS.length })}</span>
                </div>

                <ul className="ac-reqs">
                  {PASSWORD_REQUIREMENTS.map((req, idx) => {
                    const met = req.test(form.password);
                    return (
                      <li key={idx} data-state={met ? 'met' : passwordTouched ? 'unmet' : undefined}>
                        <span className="mark-box mark-box-success">{met && <Check />}</span>
                        {t(req.label)}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

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
            {isSubmitting ? t('auth.register.creating') : t('auth.create_account')}
          </button>
        </form>

        <p className="small ac-center">
          <Trans t={t} i18nKey="auth.register.agreement" components={{ terms: <Link to="/terms" className="link" />, privacy: <Link to="/privacy" className="link" /> }} />
        </p>

        <p className="ac-card-foot small">
          {t('auth.have_account')} <Link to="/login" className="link link-pumpkin">{t('auth.sign_in')}</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
