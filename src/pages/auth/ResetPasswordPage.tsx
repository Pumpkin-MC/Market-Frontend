import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api';

const style = `
  .reset-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    min-height: 60vh;
  }

  .reset-card {
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

  .reset-title {
    font-size: 2rem;
    font-weight: 800;
    color: #f0f0f0;
    letter-spacing: -0.04em;
    margin-bottom: 8px;
    line-height: 1.1;
  }

  .reset-subtitle {
    font-size: 14px;
    color: #666;
    margin-bottom: 28px;
    line-height: 1.5;
  }

  .reset-field { margin-bottom: 12px; }

  .reset-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .reset-input-icon {
    position: absolute;
    left: 16px;
    color: #555;
    pointer-events: none;
    display: flex;
    align-items: center;
  }

  .reset-input {
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

  .reset-input::placeholder { color: #555; }
  .reset-input:hover:not(:disabled) { border-color: #3a3a3a; }

  .reset-input:focus {
    border-color: var(--primary, #ff6b00);
    box-shadow: 0 0 0 3px rgba(255, 107, 0, 0.12);
  }

  .reset-input:disabled { opacity: 0.5; cursor: not-allowed; }

  .reset-error {
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

  .reset-submit {
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

  .reset-submit:hover:not(:disabled) {
    background: #e85d00;
    box-shadow: 0 4px 16px rgba(255, 107, 0, 0.35);
    transform: translateY(-1px);
  }

  .reset-submit:active:not(:disabled) { transform: translateY(0); box-shadow: none; }

  .reset-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .reset-footer {
    text-align: center;
    margin-top: 24px;
    font-size: 13.5px;
    color: #555;
  }

  .reset-footer a {
    color: var(--primary, #ff6b00);
    text-decoration: none;
    font-weight: 500;
    transition: opacity 0.15s;
  }

  .reset-footer a:hover { opacity: 0.75; }
`;

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
      navigate('/login');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <>
        <style>{style}</style>
        <div className="reset-page">
          <div className="reset-card">
            <h1 className="reset-title">Invalid link</h1>
            <p className="reset-subtitle">This password reset link is invalid or has expired.</p>
            <div className="reset-footer">
              <Link to="/forgot-password">Request a new link</Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{style}</style>
      <div className="reset-page">
        <div className="reset-card">
          <h1 className="reset-title">New password</h1>
          <p className="reset-subtitle">Choose a strong password for your account.</p>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="reset-error">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm.75 4.75a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5zm-.75 6a1 1 0 110 2 1 1 0 010-2z"/>
                </svg>
                {error}
              </div>
            )}

            <div className="reset-field">
              <div className="reset-input-wrap">
                <span className="reset-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="7.5" cy="15.5" r="5.5"/><path d="M10.85 9.65 19 1.5l3 3-1.5 1.5-1.5-1-1.5 1.5-1-1L16 7l-1.15 1.15"/>
                  </svg>
                </span>
                <input
                  className="reset-input"
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="reset-field">
              <div className="reset-input-wrap">
                <span className="reset-input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="7.5" cy="15.5" r="5.5"/><path d="M10.85 9.65 19 1.5l3 3-1.5 1.5-1.5-1-1.5 1.5-1-1L16 7l-1.15 1.15"/>
                  </svg>
                </span>
                <input
                  className="reset-input"
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <button className="reset-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? <><span className="spinner" />Updating...</>
                : <>Update password <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
              }
            </button>
          </form>

          <div className="reset-footer">
            <Link to="/login">Back to sign in</Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPasswordPage;
