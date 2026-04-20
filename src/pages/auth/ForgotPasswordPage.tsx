import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api';

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);

  const validateEmail = (email: string) =>
    Boolean(String(email).toLowerCase().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/));

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (emailTouched) setEmailValid(val === '' ? null : validateEmail(val));
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
    if (!isEmailValid) return;

    setIsSubmitting(true);
    setError('');
    setMessage('');
    try {
      await api.post('/auth/forgot-password', { email });
      setMessage('If an account exists with that email, a reset link has been sent.');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const emailIsInvalid = emailTouched && emailValid === false;
  const emailIsValid   = emailTouched && emailValid === true;

  return (
    <>
      <style>{`
        .forgot-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          min-height: 60vh;
        }

        .forgot-card {
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

        .forgot-title {
          font-size: 2rem;
          font-weight: 800;
          color: #f0f0f0;
          letter-spacing: -0.04em;
          margin-bottom: 8px;
          line-height: 1.1;
        }

        .forgot-subtitle {
          font-size: 14px;
          color: #666;
          margin-bottom: 28px;
          line-height: 1.5;
        }

        .forgot-field { margin-bottom: 12px; }

        .forgot-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .forgot-input-icon {
          position: absolute;
          left: 16px;
          color: #555;
          pointer-events: none;
          display: flex;
          align-items: center;
        }

        .forgot-input {
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

        .forgot-input::placeholder { color: #555; }
        .forgot-input:hover:not(:disabled) { border-color: #3a3a3a; }
        .forgot-input:focus {
          border-color: var(--primary, #ff6b00);
          box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.12);
        }
        .forgot-input:disabled { opacity: 0.5; cursor: not-allowed; }

        .forgot-input.email-invalid {
          border-color: #df1b41 !important;
          box-shadow: 0 0 0 3px rgba(223, 27, 65, 0.1) !important;
        }

        .forgot-input.email-valid {
          border-color: #1a9e5f !important;
          box-shadow: 0 0 0 3px rgba(26, 158, 95, 0.1) !important;
        }

        .forgot-status-icon {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
        }

        .forgot-field-msg {
          margin-top: 6px;
          margin-left: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        .forgot-field-msg.invalid { color: #df1b41; }

        .forgot-error {
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
        }

        .forgot-success {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: rgba(26, 158, 95, 0.08);
          border: 1.5px solid rgba(26, 158, 95, 0.25);
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 16px;
          font-size: 13px;
          color: #1a9e5f;
        }

        .forgot-submit {
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

        .forgot-submit:hover:not(:disabled) {
          background: #e85d00;
          box-shadow: 0 4px 16px rgba(255, 107, 0, 0.35);
          transform: translateY(-1px);
        }

        .forgot-submit:active:not(:disabled) { transform: translateY(0); box-shadow: none; }
        .forgot-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .forgot-footer {
          text-align: center;
          margin-top: 24px;
          font-size: 13.5px;
          color: #555;
        }

        .forgot-footer a {
          color: var(--primary, #ff6b00);
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.15s;
        }

        .forgot-footer a:hover { opacity: 0.75; }
      `}</style>

      <div className="forgot-page">
        <div className="forgot-card">
          <h1 className="forgot-title">Forgot password?</h1>
          <p className="forgot-subtitle">Enter your email and we'll send you a reset link.</p>

          <form onSubmit={handleSubmit} noValidate>
            {message && (
              <div className="forgot-success">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 6.237-4.5 4.5a.75.75 0 01-1.06 0l-2-2a.75.75 0 111.06-1.06l1.47 1.47 3.97-3.97a.75.75 0 111.06 1.06z"/>
                </svg>
                {message}
              </div>
            )}

            <div className="forgot-field">
              <div className="forgot-input-wrap">
                <span className="forgot-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </span>
                <input
                  id="email"
                  className={`forgot-input${emailIsInvalid ? ' email-invalid' : ''}${emailIsValid ? ' email-valid' : ''}`}
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  required
                  disabled={isSubmitting}
                  autoComplete="email"
                />
                {emailIsInvalid && (
                  <span className="forgot-status-icon">
                    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="9" stroke="#df1b41" strokeWidth="1.5"/>
                      <path d="M7 7l6 6M13 7l-6 6" stroke="#df1b41" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </span>
                )}
                {emailIsValid && (
                  <span className="forgot-status-icon">
                    <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="9" stroke="#1a9e5f" strokeWidth="1.5"/>
                      <path d="M6 10l3 3 5-5" stroke="#1a9e5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </div>
              {emailIsInvalid && (
                <p className="forgot-field-msg invalid">Please enter a valid email address</p>
              )}
            </div>

            <button className="forgot-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? <><span className="spinner" />Sending...</>
                : <>Send reset link <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
              }
            </button>
          </form>

          <div className="forgot-footer">
            <Link to="/login">Back to sign in</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPasswordPage;
