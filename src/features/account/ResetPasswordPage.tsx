import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import '../../styles/account.css';

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
      <div className="ac-auth">
        <div className="panel panel-fg ac-card">
          <div className="ac-card-head">
            <span className="ac-badge ac-badge-danger"><AlertCircle /></span>
            <h1 className="h1">Invalid <span className="mark ac-mark-danger">Link</span></h1>
            <p className="small">This password reset link is invalid or has expired.</p>
          </div>
          <Link to="/forgot-password" className="button button-primary button-block">Request a new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ac-auth">
      <div className="panel panel-fg ac-card">
        <div className="ac-card-head">
          <h1 className="h1">Set new <span className="mark">password</span></h1>
          <p className="small">Choose a new, strong password for your account.</p>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          {error && (
            <div className="notice notice-danger ac-alert" role="alert">
              <span className="mark-box mark-box-danger"><AlertCircle /></span>
              <p className="notice-text">{error}</p>
            </div>
          )}

          <label className="field" htmlFor="password">
            <span className="field-label">New Password</span>
            <span className="control">
              <input
                id="password"
                name="password"
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
              />
            </span>
          </label>

          <label className="field" htmlFor="confirmPassword">
            <span className="field-label">Confirm New Password</span>
            <span className="control">
              <input
                id="confirmPassword"
                name="confirmPassword"
                className="input"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
              />
            </span>
          </label>

          <button className="button button-primary button-lg button-block" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
