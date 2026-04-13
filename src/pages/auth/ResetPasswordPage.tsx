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

        .auth-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          font-size: 15px;
          font-family: inherit;
          color: #0a2540;
          background: #ffffff;
          border: 1.5px solid #e0e5ec;
          border-radius: 7px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .auth-input:focus {
          border-color: #ff6b00;
          box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.16);
        }

        .error-banner {
          background: #fff8f8;
          border: 1.5px solid #fecdd3;
          border-radius: 7px;
          padding: 12px 14px;
          margin-bottom: 20px;
          color: #df1b41;
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
                className="auth-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-field">
              <label className="field-label" htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                className="auth-input"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
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