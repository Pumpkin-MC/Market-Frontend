import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import api from '../../api';
import { useAuth } from '../../App';

interface PasswordRequirement {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'At least 8 characters',          test: pw => pw.length >= 8 },
  { label: 'At least one uppercase letter',  test: pw => /[A-Z]/.test(pw) },
  { label: 'At least one lowercase letter',  test: pw => /[a-z]/.test(pw) },
  { label: 'At least one number',            test: pw => /[0-9]/.test(pw) },
  { label: 'At least one special character', test: pw => /[^A-Za-z0-9]/.test(pw) },
];

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '#2a2a2a' };
  const passed = PASSWORD_REQUIREMENTS.filter(r => r.test(pw)).length;
  if (passed <= 1) return { score: 1, label: 'Very weak',  color: '#df1b41' };
  if (passed === 2) return { score: 2, label: 'Weak',      color: '#f5a623' };
  if (passed === 3) return { score: 3, label: 'Fair',      color: '#f0c040' };
  if (passed === 4) return { score: 4, label: 'Strong',    color: '#1a9e5f' };
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
  const { login } = useAuth();

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
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Registration failed. Please try again.'
      );
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
        @keyframes cardIn   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shake    { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-4px)} 40%{transform:translateX(4px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes iconPop     { from{opacity:0;transform:translateY(-50%) scale(0.4)} to{opacity:1;transform:translateY(-50%) scale(1)} }
        @keyframes strengthIn  { from{opacity:0;transform:translateY(-8px);max-height:0} to{opacity:1;transform:translateY(0);max-height:200px} }

        .reg-page {
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; padding:40px 20px; min-height:60vh;
        }

        .reg-card {
          width:100%; max-width:460px;
          background:#161616; border:1px solid #2a2a2a; border-radius:20px;
          padding:40px; animation:cardIn 0.35s cubic-bezier(0.22,1,0.36,1) both;
        }

        .reg-title {
          font-size:2rem; font-weight:800; color:#f0f0f0;
          letter-spacing:-0.04em; margin-bottom:28px; line-height:1.1;
        }

        .reg-field { margin-bottom:12px; }

        .reg-input-wrap { position:relative; display:flex; align-items:center; }

        .reg-input-icon {
          position:absolute; left:16px; color:#555;
          pointer-events:none; display:flex; align-items:center;
        }

        .reg-input {
          width:100%; height:52px; padding:0 44px 0 48px;
          font-size:15px; font-family:inherit; color:#c0c0c0;
          background:#1e1e1e; border:1.5px solid #2a2a2a; border-radius:14px;
          outline:none; transition:border-color 0.15s ease, box-shadow 0.15s ease;
          box-sizing:border-box;
        }
        .reg-input.no-right-pad { padding-right:16px; }
        .reg-input::placeholder { color:#555; }
        .reg-input:hover:not(:disabled) { border-color:#3a3a3a; }
        .reg-input:focus { border-color:var(--primary,#ff6b00); box-shadow:0 0 0 3px rgba(255,107,0,.12); }
        .reg-input:disabled { opacity:.5; cursor:not-allowed; }
        .reg-input.email-invalid { border-color:#df1b41 !important; box-shadow:0 0 0 3px rgba(223,27,65,.1) !important; }
        .reg-input.email-valid   { border-color:#1a9e5f !important; box-shadow:0 0 0 3px rgba(26,158,95,.1) !important; }

        .reg-status-icon {
          position:absolute; right:14px; top:50%; transform:translateY(-50%);
          pointer-events:none; animation:iconPop 0.2s cubic-bezier(0.34,1.56,0.64,1) both;
        }

        .reg-pw-toggle {
          position:absolute; right:14px; top:50%; transform:translateY(-50%);
          background:none; border:none; cursor:pointer; padding:2px; color:#555;
          display:flex; align-items:center; transition:color 0.15s;
        }
        .reg-pw-toggle:hover { color:#888; }

        .reg-field-msg { margin-top:6px; margin-left:4px; font-size:12px; font-weight:500; }
        .reg-field-msg.invalid { color:#df1b41; }
        .reg-field-msg.valid   { color:#1a9e5f; }

        .reg-error {
          display:flex; align-items:flex-start; gap:10px;
          background:rgba(223,27,65,.08); border:1.5px solid rgba(223,27,65,.25);
          border-radius:10px; padding:12px 14px; margin-bottom:16px;
          font-size:13px; color:#df1b41;
          animation:shake 0.3s cubic-bezier(0.36,0.07,0.19,0.97);
        }

        .reg-strength { margin-top:10px; overflow:hidden; animation:strengthIn 0.25s cubic-bezier(0.22,1,0.36,1) both; }
        .reg-strength-bars { display:flex; gap:4px; margin-bottom:6px; }
        .reg-strength-bar { flex:1; height:4px; border-radius:99px; background:#2a2a2a; overflow:hidden; position:relative; }
        .reg-strength-fill { position:absolute; inset:0; border-radius:99px; transition:background-color 0.3s, width 0.4s cubic-bezier(0.22,1,0.36,1); }
        .reg-strength-meta { display:flex; justify-content:space-between; font-size:12px; color:#555; margin-bottom:8px; }
        .reg-strength-label { font-weight:600; transition:color 0.2s; }

        .reg-req-list { list-style:none; display:flex; flex-direction:column; gap:4px; }
        .reg-req { display:flex; align-items:center; gap:6px; font-size:12.5px; color:#555; transition:color 0.2s; }
        .reg-req.met { color:#1a9e5f; }
        .reg-req.bad { color:#df1b41; }
        .reg-req-dot {
          width:14px; height:14px; flex-shrink:0; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          border:1.5px solid #3a3a3a; transition:background 0.2s, border-color 0.2s;
        }
        .reg-req.met .reg-req-dot { background:#1a9e5f; border-color:#1a9e5f; }
        .reg-req.bad .reg-req-dot { border-color:#df1b41; }

        .reg-captcha { display:flex; justify-content:center; margin:16px 0; }

        .reg-submit {
          display:flex; align-items:center; justify-content:center; gap:8px;
          margin:8px auto 0; padding:0 36px; height:50px;
          background:var(--primary,#ff6b00); color:white; border:none;
          border-radius:999px; font-size:15px; font-weight:700; font-family:inherit;
          letter-spacing:-0.02em; cursor:pointer;
          transition:background 0.15s, box-shadow 0.15s, transform 0.1s;
        }
        .reg-submit:hover:not(:disabled) { background:#e85d00; box-shadow:0 4px 16px rgba(255,107,0,.35); transform:translateY(-1px); }
        .reg-submit:active:not(:disabled) { transform:translateY(0); box-shadow:none; }
        .reg-submit:disabled { opacity:.5; cursor:not-allowed; transform:none; }

        .spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,.35); border-top-color:white; border-radius:50%; animation:spin 0.7s linear infinite; }

        .reg-terms { text-align:center; font-size:12px; color:#444; margin-top:20px; line-height:1.6; }
        .reg-terms a { color:#555; text-decoration:underline; text-underline-offset:2px; }

        .reg-footer { text-align:center; margin-top:20px; font-size:13.5px; color:#555; }
        .reg-footer a { color:var(--primary,#ff6b00); text-decoration:none; font-weight:500; transition:opacity 0.15s; }
        .reg-footer a:hover { opacity:.75; }
      `}</style>

      <div className="reg-page">
        <div className="reg-card">
          <h1 className="reg-title">Create account</h1>

          <form onSubmit={handleSubmit} noValidate>

            <input type="text" style={{ display: 'none' }} tabIndex={-1}
              onChange={e => setForm({ ...form, website: e.target.value })} />

            <div className="reg-field">
              <div className="reg-input-wrap">
                <span className="reg-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </span>
                <input
                  id="username" className="reg-input no-right-pad" type="text" placeholder="Username"
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  required disabled={isSubmitting} autoComplete="username"
                  autoCapitalize="none" spellCheck={false}
                />
              </div>
            </div>

            <div className="reg-field">
              <div className="reg-input-wrap">
                <span className="reg-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </span>
                <input
                  id="email"
                  className={`reg-input${emailIsInvalid ? ' email-invalid' : ''}${emailIsValid ? ' email-valid' : ''}`}
                  type="email" placeholder="Email address" value={form.email}
                  onChange={handleEmailChange} onBlur={handleEmailBlur}
                  required disabled={isSubmitting} autoComplete="email"
                />
                {emailIsInvalid && (
                  <span className="reg-status-icon">
                    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="9" stroke="#df1b41" strokeWidth="1.5"/>
                      <path d="M7 7l6 6M13 7l-6 6" stroke="#df1b41" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </span>
                )}
                {emailIsValid && (
                  <span className="reg-status-icon">
                    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="9" stroke="#1a9e5f" strokeWidth="1.5"/>
                      <path d="M6 10l3 3 5-5" stroke="#1a9e5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </div>
              {emailIsInvalid && <p className="reg-field-msg invalid">Please enter a valid email address</p>}
              {emailIsValid  && <p className="reg-field-msg valid">Looks good!</p>}
            </div>

            <div className="reg-field">
              <div className="reg-input-wrap">
                <span className="reg-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="7.5" cy="15.5" r="5.5"/><path d="M10.85 9.65 19 1.5l3 3-1.5 1.5-1.5-1-1.5 1.5-1-1L16 7l-1.15 1.15"/>
                  </svg>
                </span>
                <input
                  id="password" className="reg-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={form.password} onChange={handlePasswordChange}
                  required disabled={isSubmitting} autoComplete="new-password"
                />
                <button type="button" className="reg-pw-toggle" onClick={() => setShowPassword(s => !s)} tabIndex={-1}>
                  {showPassword ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>

              {showStrengthMeter && (
                <div className="reg-strength">
                  <div className="reg-strength-bars">
                    {[1,2,3,4,5].map(i => (
                      <div className="reg-strength-bar" key={i}>
                        <div className="reg-strength-fill" style={{
                          width: strength.score >= i ? '100%' : '0%',
                          backgroundColor: strength.score >= i ? strength.color : 'transparent',
                        }} />
                      </div>
                    ))}
                  </div>
                  <div className="reg-strength-meta">
                    <span className="reg-strength-label" style={{ color: strength.color }}>{strength.label}</span>
                    <span>{PASSWORD_REQUIREMENTS.filter(r => r.test(form.password)).length}/{PASSWORD_REQUIREMENTS.length} requirements met</span>
                  </div>
                  <ul className="reg-req-list">
                    {PASSWORD_REQUIREMENTS.map((req, idx) => {
                      const met = req.test(form.password);
                      return (
                        <li key={idx} className={`reg-req${met ? ' met' : passwordTouched ? ' bad' : ''}`}>
                          <span className="reg-req-dot">
                            {met && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </span>
                          {req.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <div className="reg-captcha">
              <Turnstile siteKey="0x4AAAAAAClcSibyhKfR0H6o"
                onSuccess={(token) => setCaptchaToken(token)} theme="dark" />
            </div>

            <button className="reg-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? <><span className="spinner" />Creating account…</>
                : <>Create account <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
              }
            </button>
          </form>

          <p className="reg-terms">
            By creating an account you agree to our{' '}
            <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
          </p>

          <div className="reg-footer">
            <Link to="/login">Already have an account? Sign in</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;
