import React, { useState } from 'react';
import { Key, Eye, EyeOff, X, AlertCircle, Check } from 'lucide-react';
import '../../styles/account.css';
import api from '../../lib/api';

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

  const passwordField = (
    id: string,
    label: string,
    value: string,
    setValue: (v: string) => void,
    show: boolean,
    setShow: React.Dispatch<React.SetStateAction<boolean>>,
    placeholder: string,
    autoComplete: string,
    invalid = false,
  ) => (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <span className="control">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className="input"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete={autoComplete}
          required
          aria-invalid={invalid || undefined}
        />
        <button
          type="button"
          className="ac-eye"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff /> : <Eye />}
        </button>
      </span>
    </div>
  );

  const mismatch = Boolean(newPassword && confirmPassword && newPassword !== confirmPassword);

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="sheet ac-sheet" role="dialog" aria-modal="true" aria-labelledby="changePasswordTitle">
        <div className="sheet-head">
          <span className="ac-icon ac-icon-pumpkin"><Key /></span>
          <div>
            <h2 className="h2" id="changePasswordTitle">Change Password</h2>
            <p className="small">Choose a strong, unique password to secure your account.</p>
          </div>
          <button
            type="button"
            className="button button-ghost button-icon button-sm"
            onClick={handleClose}
            aria-label="Close"
          >
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="sheet-body">
            {error && (
              <div className="notice notice-danger ac-alert" role="alert">
                <span className="mark-box mark-box-danger"><AlertCircle /></span>
                <p className="notice-text">{error}</p>
              </div>
            )}

            {success && (
              <div className="notice notice-success ac-alert" role="status">
                <span className="mark-box mark-box-success"><Check /></span>
                <p className="notice-text">Password successfully updated! Closing...</p>
              </div>
            )}

            {passwordField('modalCurrentPassword', 'Current Password', currentPassword, setCurrentPassword, showCurrentPw, setShowCurrentPw, 'Enter current password', 'current-password')}
            {passwordField('modalNewPassword', 'New Password', newPassword, setNewPassword, showNewPw, setShowNewPw, 'At least 8 characters', 'new-password')}
            <div className="stack ac-tight">
              {passwordField('modalConfirmPassword', 'Confirm New Password', confirmPassword, setConfirmPassword, showConfirmPw, setShowConfirmPw, 'Repeat new password', 'new-password', mismatch)}
              {mismatch && (
                <span className="field-error"><AlertCircle size={14} /> Passwords do not match</span>
              )}
            </div>

            <label className="choice ac-choice-box" htmlFor="modalLogoutOtherDevices">
              <input
                type="checkbox"
                className="check"
                id="modalLogoutOtherDevices"
                checked={logoutOtherDevices}
                onChange={(e) => setLogoutOtherDevices(e.target.checked)}
              />
              <span>
                Log out other devices
                <span className="small">
                  Sign out of all other browsers, phones, and devices. You will remain logged in on this device.
                </span>
              </span>
            </label>
          </div>

          <div className="sheet-foot">
            <button
              type="button"
              className="button button-ghost"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={isSubmitting || success}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <span>Updating...</span>
              ) : (
                <>
                  <Key /> Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
