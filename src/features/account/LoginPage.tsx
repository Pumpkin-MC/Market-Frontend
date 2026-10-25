import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Turnstile } from '@marsidev/react-turnstile';
import { startAuthentication, browserSupportsWebAuthnAutofill } from '@simplewebauthn/browser';
import { Fingerprint, AlertCircle, Check } from 'lucide-react';
import '../../styles/account.css';
import api from '../../lib/api';
import { useAuth } from '../../app/auth';

const LoginPage = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '', website: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<any>(null);

  const [requires2fa, setRequires2fa] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth();

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
    <div className="ac-auth">
      <div className="panel panel-fg ac-card">
        <div className="ac-card-head">
          <h1 className="h1">Welcome <span className="mark">back</span></h1>
          <p className="small">Sign in to your PumpkinMC account.</p>
        </div>

        <form className="stack" onSubmit={handleSubmit} noValidate>
          {!requires2fa && error && (
            <div className="notice notice-danger ac-alert" role="alert">
              <span className="mark-box mark-box-danger"><AlertCircle /></span>
              <p className="notice-text">{error}</p>
            </div>
          )}

          <input type="text" hidden tabIndex={-1}
            onChange={e => setForm({ ...form, website: e.target.value })} />

          {requires2fa ? (
            !useRecoveryCode ? (
              <>
                <label className="field" htmlFor="totpCode">
                  <span className="field-label">Authentication Code</span>
                  <span className="field-hint">Enter the 6-digit code from your authenticator app.</span>
                  <span className="control">
                    <input
                      id="totpCode"
                      name="totpCode"
                      className="input ac-code"
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
                      aria-invalid={codeError ? true : undefined}
                    />
                  </span>
                </label>
                <button
                  type="button"
                  className="ac-text-button"
                  onClick={() => { setUseRecoveryCode(true); setCodeError(''); setError(''); }}
                >
                  Lost access to your phone? Use a recovery code →
                </button>
              </>
            ) : (
              <>
                <label className="field" htmlFor="recoveryCode">
                  <span className="field-label">Emergency Recovery Code</span>
                  <span className="field-hint">Enter one of your 12-character backup recovery codes.</span>
                  <span className="control">
                    <input
                      id="recoveryCode"
                      name="recoveryCode"
                      className="input ac-code ac-code-sm"
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
                      aria-invalid={codeError ? true : undefined}
                    />
                  </span>
                </label>
                <button
                  type="button"
                  className="ac-text-button ac-text-button-muted"
                  onClick={() => { setUseRecoveryCode(false); setCodeError(''); setError(''); }}
                >
                  ← Back to authenticator app code
                </button>
              </>
            )
          ) : (
            <>
              <button
                type="button"
                className="button button-block"
                onClick={handlePasskeyLogin}
                disabled={isSubmitting}
              >
                <Fingerprint /> Sign in with a Passkey
              </button>

              <div className="ac-or label">or email & password</div>

              <div className="field">
                <label className="field-label" htmlFor="email">{t('auth.email')}</label>
                <span className={`control${emailIsValid ? ' ac-valid' : ''}`}>
                  <input
                    id="email"
                    name="email"
                    className="input"
                    type="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    required
                    disabled={isSubmitting}
                    autoComplete="username webauthn"
                    aria-invalid={emailIsInvalid || undefined}
                  />
                  {emailIsValid && <Check className="ac-ok" />}
                </span>
                {emailIsInvalid && (
                  <span className="field-error"><AlertCircle size={14} />Please enter a valid email address</span>
                )}
              </div>

              <div className="field">
                <div className="ac-label-row">
                  <label className="field-label" htmlFor="password">{t('auth.password')}</label>
                  <Link to="/forgot-password" className="link link-pumpkin">
                    Forgot password?
                  </Link>
                </div>
                <span className="control">
                  <input
                    id="password"
                    name="password"
                    className="input"
                    type="password"
                    placeholder="••••••••"
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />
                </span>
              </div>
            </>
          )}

          {!requires2fa && (
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
          )}

          <button
            className={`button button-lg button-block ${codeError ? 'button-danger' : 'button-primary'}`}
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              t('common.loading')
            ) : codeError ? (
              <>
                <AlertCircle />
                <span>{codeError} — Try Again</span>
              </>
            ) : requires2fa ? (
              useRecoveryCode ? 'Verify Recovery Code' : 'Verify & Sign In'
            ) : (
              t('auth.sign_in')
            )}
          </button>
        </form>

        <p className="ac-card-foot small">
          {t('auth.no_account')} <Link to="/register" className="link link-pumpkin">{t('auth.create_account')}</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
