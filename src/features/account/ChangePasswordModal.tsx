import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      setError(t('profile.password.current_required'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('profile.password.minimum_length'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('profile.password.mismatch_error'));
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
        t('profile.password.change_failed')
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
          aria-label={show ? t('common.hide_password') : t('common.show_password')}
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
            <h2 className="h2" id="changePasswordTitle">{t('profile.security.change_password')}</h2>
            <p className="small">{t('profile.password.description')}</p>
          </div>
          <button
            type="button"
            className="button button-ghost button-icon button-sm"
            onClick={handleClose}
            aria-label={t('common.close')}
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
                <p className="notice-text">{t('profile.password.success')}</p>
              </div>
            )}

            {passwordField('modalCurrentPassword', t('profile.security.current_password'), currentPassword, setCurrentPassword, showCurrentPw, setShowCurrentPw, t('profile.password.current_placeholder'), 'current-password')}
            {passwordField('modalNewPassword', t('profile.security.new_password'), newPassword, setNewPassword, showNewPw, setShowNewPw, t('auth.password_requirements.length'), 'new-password')}
            <div className="stack ac-tight">
              {passwordField('modalConfirmPassword', t('profile.security.confirm_password'), confirmPassword, setConfirmPassword, showConfirmPw, setShowConfirmPw, t('profile.password.confirm_placeholder'), 'new-password', mismatch)}
              {mismatch && (
                <span className="field-error"><AlertCircle size={14} /> {t('profile.password.mismatch')}</span>
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
                {t('profile.password.logout_devices')}
                <span className="small">
                  {t('profile.password.logout_description')}
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
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={isSubmitting || success}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <span>{t('common.updating')}</span>
              ) : (
                <>
                  <Key /> {t('profile.password.update')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
