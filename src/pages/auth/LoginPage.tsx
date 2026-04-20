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
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const emailIsInvalid = emailTouched && emailValid === false;
  const emailIsValid   = emailTouched && emailValid === true;

  return (
    <>
      <style>{`
        .login-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          min-height: 60vh;
        }

        .login-card {
          width: 100%;
          max-width: 460px;
          background: #161616;
          border: 1px solid #2a2a2a;
          border-radius: 20px;
          padding: 40px;
          animation: cardIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .login-title {
          font-size: 2rem;
          font-weight: 800;
          color: #f0f0f0;
          letter-spacing: -0.04em;
          margin-bottom: 28px;
          line-height: 1.1;
        }

        .login-field {
          margin-bottom: 12px;
        }

        .login-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .login-input-icon {
          position: absolute;
          left: 16px;
          color: #555;
          pointer-events: none;
          display: flex;
          align-items: center;
        }

        .login-input {
          width: 100%;
          height: 52px;
          padding: 0 16px 0 48px;
          font-size: 15px;
          font-family: inherit;
          color: #c0c0c0;
          background: #1e1e1e;
          border: 1.5px solid #2a2a2a;
          border-radius: 14px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-sizing: border-box;
        }

        .login-input::placeholder { color: #555; }
        .login-input:hover:not(:disabled) { border-color: #3a3a3a; }

        .login-input:focus {
          border-color: var(--primary, #ff6b00);
          box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.12);
        }

        .login-input:disabled { opacity: 0.5; cursor: not-allowed; }

        .login-input.email-invalid {
          border-color: #df1b41 !important;
          box-shadow: 0 0 0 3px rgba(223, 27, 65, 0.1) !important;
        }

        .login-input.email-valid {
          border-color: #1a9e5f !important;
          box-shadow: 0 0 0 3px rgba(26, 158, 95, 0.1) !important;
        }

        .login-field-status {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          animation: iconPop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes iconPop {
          from { opacity: 0; transform: translateY(-50%) scale(0.4); }
          to   { opacity: 1; transform: translateY(-50%) scale(1); }
        }

        .login-field-msg {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 6px;
          margin-left: 4px;
          font-size: 12px;
          font-weight: 500;
          animation: msgSlide 0.18s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes msgSlide {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .login-field-msg.invalid { color: #df1b41; }
        .login-field-msg.valid   { color: #1a9e5f; }

        .login-error {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: rgba(223, 27, 65, 0.08);
          border: 1.5px solid rgba(223, 27, 65, 0.25);
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 16px;
          font-size: 13px;
          color: #df1b41;
          animation: shake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97);
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-4px); }
          40%       { transform: translateX(4px); }
          60%       { transform: translateX(-3px); }
          80%       { transform: translateX(3px); }
        }

        .login-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 24px auto 0;
          padding: 0 36px;
          height: 50px;
          background: var(--primary, #ff6b00);
          color: white;
          border: none;
          border-radius: 999px;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          letter-spacing: -0.02em;
          cursor: pointer;
          transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
        }

        .login-submit:hover:not(:disabled) {
          background: #e85d00;
          box-shadow: 0 4px 16px rgba(255, 107, 0, 0.35);
          transform: translateY(-1px);
        }

        .login-submit:active:not(:disabled) { transform: translateY(0); box-shadow: none; }

        .login-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .login-footer {
          text-align: center;
          margin-top: 24px;
          font-size: 13.5px;
          color: #555;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .login-footer a {
          color: var(--primary, #ff6b00);
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.15s;
        }

        .login-footer a:hover { opacity: 0.75; }

        .login-footer-dot { color: #333; }

        .login-forgot {
          display: block;
          text-align: right;
          font-size: 12.5px;
          color: #555;
          text-decoration: none;
          margin-top: 6px;
          transition: color 0.15s;
        }

        .login-forgot:hover { color: var(--primary, #ff6b00); }
      `}</style>

      <div className="login-page">
        <div className="login-card">
          <h1 className="login-title">Welcome back</h1>

          <form onSubmit={handleSubmit} noValidate>

            <input type="text" style={{ display: 'none' }} tabIndex={-1}
              onChange={e => setForm({ ...form, website: e.target.value })} />

            <div className="login-field">
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </span>
                <input
                  id="email"
                  className={`login-input${emailIsInvalid ? ' email-invalid' : ''}${emailIsValid ? ' email-valid' : ''}`}
                  type="email"
                  placeholder="Email or username"
                  value={form.email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  required
                  disabled={isSubmitting}
                  autoComplete="email"
                />
                {emailIsInvalid && (
                  <span className="login-field-status">
                    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="9" stroke="#df1b41" strokeWidth="1.5"/>
                      <path d="M7 7l6 6M13 7l-6 6" stroke="#df1b41" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </span>
                )}
                {emailIsValid && (
                  <span className="login-field-status">
                    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="9" stroke="#1a9e5f" strokeWidth="1.5"/>
                      <path d="M6 10l3 3 5-5" stroke="#1a9e5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </div>
              {emailIsInvalid && (
                <p className="login-field-msg invalid">Please enter a valid email address</p>
              )}
            </div>

            <div className="login-field">
              <div className="login-input-wrap">
                <span className="login-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="7.5" cy="15.5" r="5.5"/><path d="M10.85 9.65 19 1.5l3 3-1.5 1.5-1.5-1-1.5 1.5-1-1L16 7l-1.15 1.15"/>
                  </svg>
                </span>
                <input
                  id="password"
                  className="login-input"
                  type="password"
                  placeholder="Password"
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
              </div>
              <Link to="/forgot-password" className="login-forgot">Forgot password?</Link>
            </div>

            <button className="login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><span className="spinner" />{t('loading')}</>
              ) : (
                <>Sign in <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
              )}
            </button>
          </form>

          <div className="login-footer">
            <Link to="/register">Create an account</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
