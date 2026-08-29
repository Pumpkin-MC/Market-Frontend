import React, { useState } from 'react';
import { Key, Eye, EyeOff, X, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import api from '../api';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [logoutOtherDevices, setLogoutOtherDevices] = useState(true);

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleResetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setLogoutOtherDevices(true);
    setError('');
    setSuccess(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/user/settings', {
        currentPassword,
        newPassword,
        logoutOtherDevices,
      });

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to change password. Please verify your current password.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          backgroundColor: 'var(--mp-surface, #14171c)',
          borderRadius: 16,
          border: '1px solid var(--mp-border, rgba(255, 255, 255, 0.12))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)',
          padding: '2rem',
          color: 'var(--mp-text, #f8fafc)',
          position: 'relative',
        }}
      >
        {/* Close Icon */}
        <button
          type="button"
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--mp-muted, #94a3b8)',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: 'rgba(249, 115, 22, 0.12)',
              color: 'var(--mp-accent, #f97316)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Key size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Change Password</h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--mp-muted, #94a3b8)', margin: '0.2rem 0 0 0' }}>
              Choose a strong, unique password to secure your account.
            </p>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 8,
              fontSize: '0.85rem',
              color: '#fca5a5',
              marginBottom: '1.25rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Banner */}
        {success && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              borderRadius: 8,
              fontSize: '0.85rem',
              color: '#86efac',
              marginBottom: '1.25rem',
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>Password successfully updated! Closing...</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Current Password */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="modalCurrentPassword"
              style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--mp-muted, #94a3b8)', marginBottom: '0.4rem' }}
            >
              Current Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="modalCurrentPassword"
                type={showCurrentPw ? 'text' : 'password'}
                className="settings-input"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ width: '100%', paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                className="settings-pw-eye"
                onClick={() => setShowCurrentPw((s) => !s)}
                tabIndex={-1}
                aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
              >
                {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="modalNewPassword"
              style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--mp-muted, #94a3b8)', marginBottom: '0.4rem' }}
            >
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="modalNewPassword"
                type={showNewPw ? 'text' : 'password'}
                className="settings-input"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
                style={{ width: '100%', paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                className="settings-pw-eye"
                onClick={() => setShowNewPw((s) => !s)}
                tabIndex={-1}
                aria-label={showNewPw ? 'Hide password' : 'Show password'}
              >
                {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="modalConfirmPassword"
              style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--mp-muted, #94a3b8)', marginBottom: '0.4rem' }}
            >
              Confirm New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="modalConfirmPassword"
                type={showConfirmPw ? 'text' : 'password'}
                className="settings-input"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                style={{ width: '100%', paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                className="settings-pw-eye"
                onClick={() => setShowConfirmPw((s) => !s)}
                tabIndex={-1}
                aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
              >
                {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="settings-inline-error" style={{ marginTop: '0.35rem' }}>
                <AlertCircle size={13} /> Passwords do not match
              </p>
            )}
          </div>

          {/* Log Out Other Devices Checkbox (Checked by default) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              padding: '0.85rem 1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 10,
              border: '1px solid var(--mp-border, rgba(255, 255, 255, 0.08))',
              marginBottom: '1.5rem',
              cursor: 'pointer',
            }}
            onClick={() => setLogoutOtherDevices((v) => !v)}
          >
            <input
              type="checkbox"
              id="modalLogoutOtherDevices"
              checked={logoutOtherDevices}
              onChange={(e) => setLogoutOtherDevices(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 17,
                height: 17,
                marginTop: '0.15rem',
                accentColor: 'var(--mp-accent, #f97316)',
                cursor: 'pointer',
              }}
            />
            <label
              htmlFor="modalLogoutOtherDevices"
              style={{ cursor: 'pointer', userSelect: 'none', margin: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600, fontSize: '0.88rem', color: '#fff' }}>
                <ShieldCheck size={14} style={{ color: 'var(--mp-accent, #f97316)' }} />
                Log out other devices
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--mp-muted, #94a3b8)', marginTop: '0.15rem', lineHeight: 1.35 }}>
                Sign out of all other browsers, phones, and devices. You will remain logged in on this device.
              </div>
            </label>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="settings-btn settings-btn-danger-outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="settings-btn settings-btn-primary"
              disabled={isSubmitting || success}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', minWidth: 140, justifyContent: 'center' }}
            >
              {isSubmitting ? (
                <span>Updating...</span>
              ) : (
                <>
                  <Key size={15} /> Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
