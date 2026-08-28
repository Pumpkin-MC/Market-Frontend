import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      alert('Password has been successfully reset. You can now log in with your new password.');
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="card-header">
            <h1 className="card-title">Invalid Link</h1>
            <p className="card-subtitle">This password reset link is invalid or has expired.</p>
          </div>
          <div className="card-footer">
            <Link to="/forgot-password">Request a new link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
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

        .auth-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          font-size: 15px;
          font-family: inherit;
          color: var(--text, #EAEAEA);
          background: rgba(255, 255, 255, 0.05);
          border: 1.5px solid var(--border, #2A2A2A);
          border-radius: 7px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }

        .auth-input::placeholder { color: var(--text-muted, #888888); }
        .auth-input:hover:not(:disabled) { border-color: rgba(255, 255, 255, 0.25); }

        .auth-input:focus {
          border-color: var(--primary, #FF7518);
          background: rgba(0, 0, 0, 0.4);
          box-shadow: 0 0 0 3px rgba(255, 117, 24, 0.2);
        }

        .auth-input:disabled {
          background: rgba(255, 255, 255, 0.02);
          color: var(--text-muted, #666666);
          cursor: not-allowed;
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.12);
          border: 1.5px solid rgba(239, 68, 68, 0.35);
          border-radius: 7px;
          padding: 12px 14px;
          margin-bottom: 20px;
          color: #ef4444;
          font-size: 13px;
        }

        .submit-btn {
          width: 100%;
          height: 46px;
          background: var(--primary, #FF7518);
          color: white;
          border: none;
          border-radius: 7px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease, box-shadow 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .submit-btn:hover:not(:disabled) {
          background: #e85d00;
          box-shadow: 0 4px 14px rgba(255, 117, 24, 0.35);
        }

        .submit-btn:disabled {
          background: rgba(255, 117, 24, 0.5);
          cursor: not-allowed;
        }

        .spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="auth-page">
        <div className="auth-card">
          <div className="card-header">
            <h1 className="card-title">Set new password</h1>
            <p className="card-subtitle">Choose a new, strong password for your account.</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className="error-banner">{error}</div>}

            <div className="form-field">
              <label className="field-label" htmlFor="password">New Password</label>
              <input
                id="password"
                name="password"
                className="auth-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                className="auth-input"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
              />
            </div>

            <button className="submit-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><span className="spinner" />Updating...</> : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default ResetPasswordPage;