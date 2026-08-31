import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Turnstile } from '@marsidev/react-turnstile';
import { startAuthentication, browserSupportsWebAuthnAutofill } from '@simplewebauthn/browser';
import { Fingerprint, AlertCircle } from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../App';

const LoginPage = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '', website: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<any>(null);
  
  // 2FA login state
  const [requires2fa, setRequires2fa] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth();

  // WebAuthn Autofill (Conditional UI / Mediation)
  useEffect(() => {
    let active = true;

    const initAutofill = async () => {
      try {
        const supported = await browserSupportsWebAuthnAutofill();
        if (!supported || !active) return;

        const startRes = await api.post('/auth/passkey/login/start', {});
        if (!active) return;

        const rawOptions =
          startRes.data?.options?.publicKey ||
          startRes.data?.options ||
          startRes.data?.publicKey ||
          startRes.data;
        const options = { ...rawOptions };
        if (Array.isArray(options.allowCredentials) && options.allowCredentials.length === 0) {
          delete options.allowCredentials;
        }

        const credential = await startAuthentication({
          optionsJSON: options,
          useBrowserAutofill: true,
        });

        if (!active) return;

        setIsSubmitting(true);
        const finishRes = await api.post('/auth/passkey/login/finish', {
          challengeId: startRes.data.challengeId,
          credential,
        });

        if (finishRes.data.token) {
          login(finishRes.data.token);
          navigate('/dashboard');
        }
      } catch (err: any) {
        // Ignore user cancellation, timeout, or dismissal during conditional UI autofill
        if (
          err.name !== 'AbortError' &&
          err.name !== 'NotAllowedError' &&
          err.name !== 'InvalidStateError'
        ) {
          console.debug('WebAuthn conditional autofill not completed:', err);
        }
      } finally {
        if (active) {
          setIsSubmitting(false);
        }
      }
    };

    initAutofill();

    return () => {
      active = false;
    };
  }, [login, navigate]);

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

    if (requires2fa) {
      setIsSubmitting(true);
      setError('');
      setCodeError('');
      try {
        if (useRecoveryCode) {
          const res = await api.post('/auth/login/recovery-code', {
            tempToken,
            code: recoveryCode.trim(),
          });
          login(res.data.token);
          navigate('/dashboard');
        } else {
          const res = await api.post('/auth/login/2fa', {
            temp_token: tempToken,
            code: totpCode,
          });
          login(res.data.token);
          navigate('/dashboard');
        }
      } catch (err: any) {
        setCodeError(err.response?.data?.error || (useRecoveryCode ? 'Invalid recovery code' : 'Invalid 2FA code'));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setEmailTouched(true);
    const isEmailValid = validateEmail(form.email);
    setEmailValid(isEmailValid);

    if (!isEmailValid) {
      setError('Please enter a valid email address.');
      return;
    }

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
      setError('Please complete the security check.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await api.post('/auth/login', {
        email: form.email,
        password: form.password,
        captchaToken: currentToken,
      });

      if (res.data.requires_2fa) {
        setRequires2fa(true);
        setTempToken(res.data.temp_token);
      } else {
        login(res.data.token);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const startRes = await api.post('/auth/passkey/login/start', {
        email: form.email.trim() || undefined,
      });

      const rawOptions = startRes.data?.options?.publicKey || startRes.data?.options || startRes.data?.publicKey || startRes.data;
      const options = { ...rawOptions };
      if (Array.isArray(options.allowCredentials) && options.allowCredentials.length === 0) {
        delete options.allowCredentials;
      }

      const credential = await startAuthentication({
        optionsJSON: options,
      });

      const finishRes = await api.post('/auth/passkey/login/finish', {
        challengeId: startRes.data.challengeId,
        credential,
      });

      if (finishRes.data.token) {
        login(finishRes.data.token);
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        setError(err.response?.data?.error || err.message || 'Passkey authentication failed.');
      }
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
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          background: var(--surface, #141414);
          border: 1px solid var(--border, #2A2A2A);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
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
          font-weight: 700;
          color: var(--text, #EAEAEA);
          letter-spacing: -0.4px;
          line-height: 1.3;
        }

        .card-subtitle {
          margin-top: 6px;
          font-size: 14px;
          color: var(--text-muted, #888888);
          line-height: 1.5;
        }

        .form-field { margin-bottom: 18px; }

        .field-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--text, #EAEAEA);
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
          color: var(--text, #EAEAEA);
          background: rgba(255, 255, 255, 0.05);
          border: 1.5px solid var(--border, #2A2A2A);
          border-radius: 7px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          -webkit-appearance: none;
        }

        .login-input::placeholder { color: var(--text-muted, #888888); font-size: 14px; }
        .login-input:hover:not(:disabled) { border-color: rgba(255, 255, 255, 0.25); }

        .login-input:focus {
          border-color: var(--primary, #FF7518);
          background: rgba(0, 0, 0, 0.4);
          box-shadow: 0 0 0 3px rgba(255, 117, 24, 0.2);
        }

        .login-input:disabled {
          background: rgba(255, 255, 255, 0.02);
          color: var(--text-muted, #666666);
          cursor: not-allowed;
        }

        .login-input.email-invalid {
          border-color: #ef4444 !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2) !important;
        }

        .login-input.email-valid {
          border-color: #22c55e !important;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2) !important;
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

        .field-message.invalid { color: #ef4444; }
        .field-message.valid   { color: #22c55e; }

        .error-banner {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: rgba(239, 68, 68, 0.12);
          border: 1.5px solid rgba(239, 68, 68, 0.35);
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

        .error-icon { flex-shrink: 0; width: 16px; height: 16px; margin-top: 1px; color: #ef4444; }
        .error-text { font-size: 13px; color: #ef4444; line-height: 1.5; }

        .submit-btn {
          width: 100%;
          height: 46px;
          background: var(--primary, #FF7518);
          color: white;
          border: none;
          border-radius: 7px;
          font-size: 15px;
          font-weight: 600;
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
          box-shadow: 0 4px 14px rgba(255, 117, 24, 0.35);
          transform: translateY(-1px);
        }

        .submit-btn:active:not(:disabled) { transform: translateY(0); box-shadow: none; }

        .submit-btn:disabled {
          background: rgba(255, 117, 24, 0.5);
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

        .divider { height: 1px; background: var(--border, #2A2A2A); margin: 24px 0; }

        .card-footer { text-align: center; font-size: 13.5px; color: var(--text-muted, #888888); }

        .card-footer a {
          color: var(--primary, #FF7518);
          text-decoration: none;
          font-weight: 600;
          transition: color 0.15s;
        }

        .card-footer a:hover { color: #ff944d; text-decoration: underline; }
      `}</style>

      <div className="login-page">
        <div className="login-card">
          <div className="card-header">
            <h1 className="card-title">Welcome back</h1>
            <p className="card-subtitle">Sign in to your PumpkinMC account.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {!requires2fa && error && (
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

            {requires2fa ? (
              <div className="form-field">
                {!useRecoveryCode ? (
                  <>
                    <label className="field-label" htmlFor="totpCode">Authentication Code</label>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted, #888)', marginBottom: '12px' }}>
                      Enter the 6-digit code from your authenticator app.
                    </p>
                    <div className="field-input-wrapper">
                      <input
                        id="totpCode"
                        name="totpCode"
                        className="login-input no-icon"
                        type="text"
                        placeholder="000000"
                        maxLength={8}
                        value={totpCode}
                        onChange={e => {
                          setCodeError('');
                          setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                        }}
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                        disabled={isSubmitting}
                        autoFocus
                        style={{
                          letterSpacing: '0.2em',
                          textAlign: 'center',
                          fontSize: '1.2rem',
                          fontFamily: 'var(--font-mono, monospace)',
                          borderColor: codeError ? '#ef4444' : undefined,
                          boxShadow: codeError ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : undefined,
                        }}
                      />
                    </div>
                    <div style={{ marginTop: '14px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => { setUseRecoveryCode(true); setCodeError(''); setError(''); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary, #FF7518)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          textDecoration: 'none',
                          fontWeight: 500,
                        }}
                      >
                        Lost access to your phone? Use a recovery code →
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="field-label" htmlFor="recoveryCode">Emergency Recovery Code</label>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted, #888)', marginBottom: '12px' }}>
                      Enter one of your 12-character backup recovery codes.
                    </p>
                    <div className="field-input-wrapper">
                      <input
                        id="recoveryCode"
                        name="recoveryCode"
                        className="login-input no-icon"
                        type="text"
                        placeholder="xxxx-xxxx-xxxx"
                        value={recoveryCode}
                        onChange={e => {
                          setCodeError('');
                          setRecoveryCode(e.target.value);
                        }}
                        autoComplete="off"
                        required
                        disabled={isSubmitting}
                        autoFocus
                        style={{
                          letterSpacing: '0.08em',
                          textAlign: 'center',
                          fontSize: '1.05rem',
                          fontFamily: 'var(--font-mono, monospace)',
                          borderColor: codeError ? '#ef4444' : undefined,
                          boxShadow: codeError ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : undefined,
                        }}
                      />
                    </div>
                    <div style={{ marginTop: '14px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => { setUseRecoveryCode(false); setCodeError(''); setError(''); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted, #888)',
                          fontSize: '13px',
                          cursor: 'pointer',
                          textDecoration: 'none',
                          fontWeight: 500,
                        }}
                      >
                        ← Back to authenticator app code
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    marginBottom: '1.25rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border, #2A2A2A)',
                    borderRadius: '7px',
                    color: 'var(--text, #EAEAEA)',
                    fontWeight: 600,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                >
                  <Fingerprint size={18} color="#4ade80" /> Sign in with a Passkey
                </button>

                <div style={{ display: 'flex', alignItems: 'center', margin: '0 0 1.25rem 0', gap: '0.75rem' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border, #2A2A2A)' }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #888)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or email & password</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border, #2A2A2A)' }} />
                </div>

                <div className="form-field">
                  <label className="field-label" htmlFor="email">{t('auth.email')}</label>
                  <div className="field-input-wrapper">
                    <input
                      id="email"
                      name="email"
                      className={`login-input${emailIsInvalid ? ' email-invalid' : ''}${emailIsValid ? ' email-valid' : ''}`}
                      type="email"
                      placeholder="you@company.com"
                      value={form.email}
                      onChange={handleEmailChange}
                      onBlur={handleEmailBlur}
                      required
                      disabled={isSubmitting}
                      autoComplete="username webauthn"
                    />
                    {emailIsInvalid && (
                      <svg key="x" className="field-status-icon" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="9" stroke="#ef4444" strokeWidth="1.5"/>
                        <path d="M7 7l6 6M13 7l-6 6" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                    {emailIsValid && (
                      <svg key="check" className="field-status-icon" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="9" stroke="#22c55e" strokeWidth="1.5"/>
                        <path d="M6 10l3 3 5-5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="field-label" htmlFor="password" style={{ marginBottom: 0 }}>{t('auth.password')}</label>
                    <Link to="/forgot-password" style={{ fontSize: '13px', color: 'var(--primary, #FF7518)', textDecoration: 'none', fontWeight: 500 }}>
                      Forgot password?
                    </Link>
                  </div>
                  <div className="field-input-wrapper">
                    <input
                      id="password"
                      name="password"
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
              </>
            )}

            {!requires2fa && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', marginTop: '4px' }}>
                <Turnstile
                  ref={turnstileRef}
                  siteKey="0x4AAAAAAClcSibyhKfR0H6o"
                  onSuccess={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => setCaptchaToken(null)}
                  options={{ theme: 'dark', appearance: 'interaction-only' } as any}
                />
              </div>
            )}

            <button
              className="submit-btn"
              type="submit"
              disabled={isSubmitting}
              style={
                codeError
                  ? {
                      backgroundColor: '#ef4444',
                      borderColor: '#ef4444',
                      color: '#fff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.45rem',
                      fontWeight: 600,
                    }
                  : undefined
              }
            >
              {isSubmitting ? (
                <><span className="spinner" />{t('common.loading')}</>
              ) : codeError ? (
                <>
                  <AlertCircle size={18} />
                  <span>{codeError} — Try Again</span>
                </>
              ) : requires2fa ? (
                useRecoveryCode ? 'Verify Recovery Code' : 'Verify & Sign In'
              ) : (
                t('auth.sign_in')
              )}
            </button>
          </form>

          <div className="divider" />

          <div className="card-footer">
            {t('auth.no_account')} <Link to="/register">{t('auth.create_account')}</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;