import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { useAuth } from '../../App';

const LoginPage = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '', website: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validateEmail = (email: string) =>
    Boolean(String(email).toLowerCase().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/));

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm({ ...form, email: val });
    if (emailTouched) {
      setEmailValid(val === '' ? null : validateEmail(val));
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    setEmailValid(form.email === '' ? null : validateEmail(form.email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.website) return;

    setEmailTouched(true);
    const isEmailValid = validateEmail(form.email);
    setEmailValid(isEmailValid);

    if (!isEmailValid) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const res = await api.post('/auth/login', {
        email: form.email,
        password: form.password,
      });
      login(res.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const emailIsInvalid = emailTouched && emailValid === false;
  const emailIsValid   = emailTouched && emailValid === true;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .login-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow:
            0 0 0 1px rgba(60, 66, 87, 0.08),
            0 2px 4px rgba(60, 66, 87, 0.04),
            0 8px 24px rgba(60, 66, 87, 0.08);
          padding: 40px;
          animation: cardIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .card-header { margin-bottom: 28px; }

        .card-title {
          font-size: 22px;
          font-weight: 600;
          color: #0a2540;
          letter-spacing: -0.4px;
          line-height: 1.3;
        }

        .card-subtitle {
          margin-top: 6px;
          font-size: 14px;
          color: #697386;
          line-height: 1.5;
        }

        .form-field { margin-bottom: 18px; }

        .field-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #3c4257;
          margin-bottom: 6px;
          letter-spacing: 0.01em;
        }

        .field-input-wrapper { position: relative; }

        .login-input {
          width: 100%;
          height: 44px;
          padding: 0 40px 0 14px;
          font-size: 15px;
          font-family: inherit;
          color: #0a2540;
          background: #ffffff;
          border: 1.5px solid #e0e5ec;
          border-radius: 7px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          -webkit-appearance: none;
        }

        .login-input::placeholder { color: #a3acb9; font-size: 14px; }
        .login-input:hover:not(:disabled) { border-color: #c1c9d5; }

        .login-input:focus {
          border-color: #ff6b00;
          box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.16);
        }

        .login-input:disabled {
          background: #f7fafc;
          color: #a3acb9;
          cursor: not-allowed;
        }

        .login-input.email-invalid {
          border-color: #df1b41 !important;
          box-shadow: 0 0 0 3px rgba(223, 27, 65, 0.12) !important;
        }

        .login-input.email-valid {
          border-color: #1a9e5f !important;
          box-shadow: 0 0 0 3px rgba(26, 158, 95, 0.12) !important;
        }

        /* no-icon variant (password field) */
        .login-input.no-icon { padding-right: 14px; }

        .field-status-icon {
          position: absolute;
          right: 13px;
          top: 50%;
          transform: translateY(-50%);
          width: 17px;
          height: 17px;
          pointer-events: none;
          animation: iconPop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes iconPop {
          from { opacity: 0; transform: translateY(-50%) scale(0.4); }
          to   { opacity: 1; transform: translateY(-50%) scale(1); }
        }

        .field-message {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 5px;
          font-size: 12.5px;
          font-weight: 500;
          animation: msgSlide 0.18s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes msgSlide {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .field-message.invalid { color: #df1b41; }
        .field-message.valid   { color: #1a9e5f; }

        .error-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: #fff8f8;
          border: 1.5px solid #fecdd3;
          border-radius: 7px;
          padding: 12px 14px;
          margin-bottom: 20px;
          animation: shake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97);
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-4px); }
          40%       { transform: translateX(4px); }
          60%       { transform: translateX(-3px); }
          80%       { transform: translateX(3px); }
        }

        .error-icon { flex-shrink: 0; width: 16px; height: 16px; margin-top: 1px; color: #df1b41; }
        .error-text { font-size: 13px; color: #df1b41; line-height: 1.5; }

        .submit-btn {
          width: 100%;
          height: 46px;
          background: #ff6b00;
          color: white;
          border: none;
          border-radius: 7px;
          font-size: 15px;
          font-weight: 500;
          font-family: inherit;
          letter-spacing: -0.1px;
          cursor: pointer;
          transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 8px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #e85d00;
          box-shadow: 0 4px 12px rgba(255, 107, 0, 0.35);
          transform: translateY(-1px);
        }

        .submit-btn:active:not(:disabled) { transform: translateY(0); box-shadow: none; }

        .submit-btn:disabled {
          background: #ffb380;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .divider { height: 1px; background: #e8ecf1; margin: 24px 0; }

        .card-footer { text-align: center; font-size: 13.5px; color: #697386; }

        .card-footer a {
          color: #ff6b00;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.15s;
        }

        .card-footer a:hover { color: #e85d00; text-decoration: underline; }
      `}</style>

      <div className="login-page">
        <div className="login-card">
          <div className="card-header">
            <h1 className="card-title">Welcome back</h1>
            <p className="card-subtitle">Sign in to your PumpkinMC account.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="error-banner">
                <svg className="error-icon" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm.75 4.75a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5zm-.75 6a1 1 0 110 2 1 1 0 010-2z"/>
                </svg>
                <span className="error-text">{error}</span>
              </div>
            )}

            {/* Honeypot */}
            <input type="text" style={{ display: 'none' }} tabIndex={-1}
              onChange={e => setForm({ ...form, website: e.target.value })} />

            <div className="form-field">
              <label className="field-label" htmlFor="email">{t('auth.email')}</label>
              <div className="field-input-wrapper">
                <input
                  id="email"
                  className={`login-input${emailIsInvalid ? ' email-invalid' : ''}${emailIsValid ? ' email-valid' : ''}`}
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  required
                  disabled={isSubmitting}
                  autoComplete="email"
                />
                {emailIsInvalid && (
                  <svg key="x" className="field-status-icon" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="#df1b41" strokeWidth="1.5"/>
                    <path d="M7 7l6 6M13 7l-6 6" stroke="#df1b41" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
                {emailIsValid && (
                  <svg key="check" className="field-status-icon" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="#1a9e5f" strokeWidth="1.5"/>
                    <path d="M6 10l3 3 5-5" stroke="#1a9e5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              {emailIsInvalid && (
                <p className="field-message invalid">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6 0a6 6 0 100 12A6 6 0 006 0zm.5 3.5a.5.5 0 00-1 0v3a.5.5 0 001 0v-3zm-.5 5a.75.75 0 110 1.5.75.75 0 010-1.5z"/>
                  </svg>
                  Please enter a valid email address
                </p>
              )}
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="password">{t('auth.password')}</label>
              <div className="field-input-wrapper">
                <input
                  id="password"
                  className="login-input no-icon"
                  type="password"
                  placeholder="••••••••"
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button className="submit-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><span className="spinner" />{t('loading')}</>
              ) : (
                t('auth.sign_in')
              )}
            </button>
          </form>

          <div className="divider" />

          <div className="card-footer">
            Don't have an account? <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;