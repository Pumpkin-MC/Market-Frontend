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
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');
    try {
      await api.post('/auth/forgot-password', { email });
      setMessage('If an account exists with that email, a reset link has been sent.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
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

        .auth-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .auth-card {
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

        .auth-input {
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

        .auth-input:focus {
          border-color: #ff6b00;
          box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.16);
        }

        .auth-input.email-invalid {
          border-color: #df1b41 !important;
          box-shadow: 0 0 0 3px rgba(223, 27, 65, 0.12) !important;
        }

        .auth-input.email-valid {
          border-color: #1a9e5f !important;
          box-shadow: 0 0 0 3px rgba(26, 158, 95, 0.12) !important;
        }

        .field-status-icon {
          position: absolute;
          right: 13px;
          top: 50%;
          transform: translateY(-50%);
          width: 17px;
          height: 17px;
          pointer-events: none;
        }

        .field-message {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 5px;
          font-size: 12.5px;
          font-weight: 500;
        }

        .field-message.invalid { color: #df1b41; }

        .error-banner {
          background: #fff8f8;
          border: 1.5px solid #fecdd3;
          border-radius: 7px;
          padding: 12px 14px;
          margin-bottom: 20px;
          color: #df1b41;
          font-size: 13px;
        }

        .success-banner {
          background: #f0fff4;
          border: 1.5px solid #c6f6d5;
          border-radius: 7px;
          padding: 12px 14px;
          margin-bottom: 20px;
          color: #2f855a;
          font-size: 13px;
        }

        .submit-btn {
          width: 100%;
          height: 46px;
          background: #ff6b00;
          color: white;
          border: none;
          border-radius: 7px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .submit-btn:hover:not(:disabled) { background: #e85d00; }
        .submit-btn:disabled { background: #ffb380; cursor: not-allowed; }

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
        }
      `}</style>

      <div className="auth-page">
        <div className="auth-card">
          <div className="card-header">
            <h1 className="card-title">Reset your password</h1>
            <p className="card-subtitle">Enter your email and we'll send you a link to reset your password.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {error && <div className="error-banner">{error}</div>}
            {message && <div className="success-banner">{message}</div>}

            <div className="form-field">
              <label className="field-label" htmlFor="email">{t('auth.email')}</label>
              <div className="field-input-wrapper">
                <input
                  id="email"
                  className={`auth-input${emailIsInvalid ? ' email-invalid' : ''}${emailIsValid ? ' email-valid' : ''}`}
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  required
                  disabled={isSubmitting}
                />
                {emailIsInvalid && (
                  <svg className="field-status-icon" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="#df1b41" strokeWidth="1.5"/>
                    <path d="M7 7l6 6M13 7l-6 6" stroke="#df1b41" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
                {emailIsValid && (
                  <svg className="field-status-icon" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="#1a9e5f" strokeWidth="1.5"/>
                    <path d="M6 10l3 3 5-5" stroke="#1a9e5f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              {emailIsInvalid && (
                <p className="field-message invalid">Please enter a valid email address</p>
              )}
            </div>

            <button className="submit-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><span className="spinner" />Sending...</> : 'Send reset link'}
            </button>
          </form>

          <div className="divider" />

          <div className="card-footer">
            Remembered your password? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPasswordPage;