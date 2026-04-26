import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import api from '../../api';

interface PasswordRequirement {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'At least 8 characters',           test: pw => pw.length >= 8 },
  { label: 'At least one uppercase letter',   test: pw => /[A-Z]/.test(pw) },
  { label: 'At least one lowercase letter',   test: pw => /[a-z]/.test(pw) },
  { label: 'At least one number',             test: pw => /[0-9]/.test(pw) },
  { label: 'At least one special character',  test: pw => /[^A-Za-z0-9]/.test(pw) },
];

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '#e0e5ec' };
  const passed = PASSWORD_REQUIREMENTS.filter(r => r.test(pw)).length;
  if (passed <= 1) return { score: 1, label: 'Very weak',  color: '#df1b41' };
  if (passed === 2) return { score: 2, label: 'Weak',       color: '#f5a623' };
  if (passed === 3) return { score: 3, label: 'Fair',       color: '#f0c040' };
  if (passed === 4) return { score: 4, label: 'Strong',     color: '#1a9e5f' };
  return              { score: 5, label: 'Very strong', color: '#0d7a47' };
}

const RegisterPage = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', website: '' });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
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

  const strength = getStrength(form.password);
  const allRequirementsMet = PASSWORD_REQUIREMENTS.every(r => r.test(form.password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.website) return;

    setEmailTouched(true);
    const isEmailValid = validateEmail(form.email);
    setEmailValid(isEmailValid);
    setPasswordTouched(true);

    if (!isEmailValid) { setError('Please enter a valid email address.'); return; }
    if (!allRequirementsMet) { setError('Please meet all password requirements.'); return; }
    if (!captchaToken) { setError('Please complete the security check.'); return; }

    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/auth/register', { ...form, captchaToken });
      navigate('/check-email', { state: { email: form.email } });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const emailIsInvalid = emailTouched && emailValid === false;
  const emailIsValid   = emailTouched && emailValid === true;
  const showStrengthMeter = passwordTouched && form.password.length > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }

        .register-page {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 40px 20px; position: relative;
        }
        .register-page::before {
          content: ''; position: fixed; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, #ff6b00, #ff8c00, #ffb347);
        }

        @keyframes fadeDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes cardIn   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shake    { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-4px)} 40%{transform:translateX(4px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes iconPop  { from{opacity:0;transform:translateY(-50%) scale(0.4)} to{opacity:1;transform:translateY(-50%) scale(1)} }
        @keyframes msgSlide { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes reqIn    { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes barFill  { from{width:0} }

        .register-logo { margin-bottom: 32px; display:flex; align-items:center; gap:10px; animation: fadeDown 0.4s cubic-bezier(0.22,1,0.36,1) both; }
        .register-logo-mark { width:36px; height:36px; background:#ff6b00; border-radius:8px; display:flex; align-items:center; justify-content:center; }
        .register-logo-mark svg { width:20px; height:20px; fill:white; }
        .register-logo-text { font-size:20px; font-weight:600; color:#0a2540; letter-spacing:-0.3px; }

        .register-card {
          width:100%; max-width:440px; background:#ffffff; border-radius:12px;
          box-shadow: 0 0 0 1px rgba(60,66,87,.08), 0 2px 4px rgba(60,66,87,.04), 0 8px 24px rgba(60,66,87,.08);
          padding:40px; animation: cardIn 0.35s cubic-bezier(0.22,1,0.36,1) both;
        }

        .card-header { margin-bottom:28px; }
        .card-title { font-size:22px; font-weight:600; color:#0a2540; letter-spacing:-0.4px; line-height:1.3; }
        .card-subtitle { margin-top:6px; font-size:14px; color:#697386; line-height:1.5; }

        .form-field { margin-bottom:18px; }
        .field-label { display:block; font-size:13px; font-weight:500; color:#3c4257; margin-bottom:6px; letter-spacing:0.01em; }
        .field-input-wrapper { position:relative; }

        .field-input {
          width:100%; height:44px; padding:0 40px 0 14px; font-size:15px; font-family:inherit;
          color:#0a2540; background:#ffffff; border:1.5px solid #e0e5ec; border-radius:7px;
          outline:none; transition:border-color 0.15s ease, box-shadow 0.15s ease; -webkit-appearance:none;
        }
        .field-input::placeholder { color:#a3acb9; font-size:14px; }
        .field-input:hover:not(:disabled) { border-color:#c1c9d5; }
        .field-input:focus { border-color:#ff6b00; box-shadow:0 0 0 3px rgba(255,107,0,.16); }
        .field-input:disabled { background:#f7fafc; color:#a3acb9; cursor:not-allowed; }
        .field-input.email-invalid { border-color:#df1b41 !important; box-shadow:0 0 0 3px rgba(223,27,65,.12) !important; }
        .field-input.email-valid   { border-color:#1a9e5f !important; box-shadow:0 0 0 3px rgba(26,158,95,.12) !important; }

        /* password has extra right padding for the toggle button */
        .field-input.password-input { padding-right: 44px; }

        .field-status-icon {
          position:absolute; right:13px; top:50%; transform:translateY(-50%);
          width:17px; height:17px; pointer-events:none;
          animation: iconPop 0.2s cubic-bezier(0.34,1.56,0.64,1) both;
        }

        /* toggle show/hide password */
        .password-toggle {
          position:absolute; right:12px; top:50%; transform:translateY(-50%);
          background:none; border:none; cursor:pointer; padding:2px; color:#a3acb9;
          display:flex; align-items:center; justify-content:center;
          transition:color 0.15s;
        }
        .password-toggle:hover { color:#697386; }

        .field-message {
          display:flex; align-items:center; gap:5px; margin-top:5px;
          font-size:12.5px; font-weight:500;
          animation: msgSlide 0.18s cubic-bezier(0.22,1,0.36,1) both;
        }
        .field-message.invalid { color:#df1b41; }
        .field-message.valid   { color:#1a9e5f; }

        /* ── Strength meter ── */
        .strength-meter { margin-top:10px; animation: reqIn 0.2s cubic-bezier(0.22,1,0.36,1) both; }

        .strength-bars {
          display:flex; gap:4px; margin-bottom:6px;
        }
        .strength-bar {
          flex:1; height:4px; border-radius:99px; background:#e0e5ec;
          overflow:hidden; position:relative;
        }
        .strength-bar-fill {
          position:absolute; inset:0; border-radius:99px;
          transition: background-color 0.3s ease, width 0.4s cubic-bezier(0.22,1,0.36,1);
        }

        .strength-label-row {
          display:flex; justify-content:space-between; align-items:center;
          font-size:12px; color:#697386; margin-bottom:8px;
        }
        .strength-label-text { font-weight:500; transition:color 0.2s; }

        /* ── Requirements checklist ── */
        .requirements-list { list-style:none; display:flex; flex-direction:column; gap:4px; }
        .req-item {
          display:flex; align-items:center; gap:6px;
          font-size:12.5px; color:#697386;
          transition: color 0.2s ease;
        }
        .req-item.met { color:#1a9e5f; }
        .req-item.unmet-touched { color:#df1b41; }

        .req-icon {
          width:14px; height:14px; flex-shrink:0;
          border-radius:50%; display:flex; align-items:center; justify-content:center;
          transition: background 0.2s, border-color 0.2s;
          border:1.5px solid #c1c9d5;
        }
        .req-item.met .req-icon { background:#1a9e5f; border-color:#1a9e5f; }
        .req-item.unmet-touched .req-icon { border-color:#df1b41; }

        /* Error banner */
        .error-banner {
          display:flex; align-items:flex-start; gap:10px;
          background:#fff8f8; border:1.5px solid #fecdd3; border-radius:7px;
          padding:12px 14px; margin-bottom:20px;
          animation: shake 0.3s cubic-bezier(0.36,0.07,0.19,0.97);
        }
        .error-icon { flex-shrink:0; width:16px; height:16px; margin-top:1px; color:#df1b41; }
        .error-text { font-size:13px; color:#df1b41; line-height:1.5; }

        .captcha-container { display:flex; justify-content:center; margin-bottom:20px; margin-top:4px; }

        .submit-btn {
          width:100%; height:46px; background:#ff6b00; color:white; border:none;
          border-radius:7px; font-size:15px; font-weight:500; font-family:inherit;
          letter-spacing:-0.1px; cursor:pointer;
          transition:background 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
          display:flex; align-items:center; justify-content:center; gap:8px;
          position:relative; overflow:hidden;
        }
        .submit-btn:hover:not(:disabled) { background:#e85d00; box-shadow:0 4px 12px rgba(255,107,0,.35); transform:translateY(-1px); }
        .submit-btn:active:not(:disabled) { transform:translateY(0); box-shadow:none; }
        .submit-btn:disabled { background:#ffb380; cursor:not-allowed; transform:none; box-shadow:none; }

        .spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,.35); border-top-color:white; border-radius:50%; animation:spin 0.7s linear infinite; }

        .divider { height:1px; background:#e8ecf1; margin:24px 0; }
        .card-footer { text-align:center; font-size:13.5px; color:#697386; }
        .card-footer a { color:#ff6b00; text-decoration:none; font-weight:500; transition:color 0.15s; }
        .card-footer a:hover { color:#e85d00; text-decoration:underline; }

        .terms-note { text-align:center; font-size:12px; color:#a3acb9; margin-top:16px; line-height:1.6; }
        .terms-note a { color:#697386; text-decoration:underline; text-underline-offset:2px; }
      `}</style>

      <div className="register-page">
        <div className="register-card">
          <div className="card-header">
            <h1 className="card-title">Create your account</h1>
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

            {/* Username */}
            <div className="form-field">
              <label className="field-label" htmlFor="username">Username</label>
              <div className="field-input-wrapper">
                <input
                  id="username" className="field-input" type="text" placeholder="johndoe"
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  required disabled={isSubmitting} autoComplete="username"
                  autoCapitalize="none" spellCheck={false}
                />
              </div>
            </div>

            {/* Email */}
            <div className="form-field">
              <label className="field-label" htmlFor="email">Email address</label>
              <div className="field-input-wrapper">
                <input
                  id="email"
                  className={`field-input${emailIsInvalid ? ' email-invalid' : ''}${emailIsValid ? ' email-valid' : ''}`}
                  type="email" placeholder="you@company.com"
                  value={form.email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  required disabled={isSubmitting} autoComplete="email"
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
              {emailIsValid && (
                <p className="field-message valid">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5.25" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M3.5 6l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Looks good!
                </p>
              )}
            </div>

            {/* Password */}
            <div className="form-field">
              <label className="field-label" htmlFor="password">Password</label>
              <div className="field-input-wrapper">
                <input
                  id="password"
                  className="field-input password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={handlePasswordChange}
                  required disabled={isSubmitting} autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(s => !s)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    /* eye-off icon */
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    /* eye icon */
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>

              {/* Strength meter — shown as soon as the user starts typing */}
              {showStrengthMeter && (
                <div className="strength-meter">
                  {/* 5 segment bars */}
                  <div className="strength-bars">
                    {[1,2,3,4,5].map(i => (
                      <div className="strength-bar" key={i}>
                        <div
                          className="strength-bar-fill"
                          style={{
                            width: strength.score >= i ? '100%' : '0%',
                            backgroundColor: strength.score >= i ? strength.color : 'transparent',
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="strength-label-row">
                    <span className="strength-label-text" style={{ color: strength.color }}>
                      {strength.label}
                    </span>
                    <span>{PASSWORD_REQUIREMENTS.filter(r => r.test(form.password)).length}/{PASSWORD_REQUIREMENTS.length} requirements met</span>
                  </div>

                  {/* Per-requirement checklist */}
                  <ul className="requirements-list">
                    {PASSWORD_REQUIREMENTS.map((req, idx) => {
                      const met = req.test(form.password);
                      const cls = met
                        ? 'req-item met'
                        : passwordTouched
                          ? 'req-item unmet-touched'
                          : 'req-item';
                      return (
                        <li key={idx} className={cls}>
                          <span className="req-icon">
                            {met && (
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                <path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </span>
                          {req.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <div className="captcha-container">
              <Turnstile siteKey="0x4AAAAAAClcSibyhKfR0H6o"
                onSuccess={(token) => setCaptchaToken(token)} options={{ theme: 'light' } as any} />
            </div>

            <button className="submit-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><span className="spinner" />Creating account…</>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="terms-note">
            By creating an account, you agree to our{' '}
            <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
          </p>

          <div className="divider" />

          <div className="card-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;