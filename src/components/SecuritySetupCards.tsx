import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../app/auth';
import api from '../lib/api';
import { startRegistration } from '@simplewebauthn/browser';
import { QRCodeSVG } from 'qrcode.react';
import { RecoveryCodesModal } from '../features/account/RecoveryCodesModal';
import { getDevicePasskeyName } from '../lib/deviceInfo';
import {
    Fingerprint,
    Smartphone,
    ShieldCheck,
    ChevronDown,
    ChevronUp,
    Copy,
    Check,
    AlertCircle,
    Shield
} from 'lucide-react';
import '../styles/account.css';

interface SecuritySetupCardsProps {
    title?: string;
    description?: string;
    onComplete?: () => void;
    onSkip?: () => void;
    canSkip?: boolean;
    isRequired?: boolean;
    compact?: boolean;
}

export const SecuritySetupCards: React.FC<SecuritySetupCardsProps> = ({
    title,
    description,
    onComplete,
    onSkip,
    canSkip = false,
    isRequired = false,
    compact = false,
}) => {
    const { t } = useTranslation();
    const { login, user, refreshUser } = useAuth();

    const [expandedBox, setExpandedBox] = useState<'passkey' | 'totp' | null>(null);

    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);

    const [passkeyName, setPasskeyName] = useState(() => getDevicePasskeyName());
    const [passkeyLoading, setPasskeyLoading] = useState(false);
    const [passkeyError, setPasskeyError] = useState<string | null>(null);
    const [passkeySuccess, setPasskeySuccess] = useState(false);

    const [totpLoading, setTotpLoading] = useState(false);
    const [totpUri, setTotpUri] = useState<string | null>(null);
    const [totpSecret, setTotpSecret] = useState<string | null>(null);
    const [totpCode, setTotpCode] = useState('');
    const [totpVerifying, setTotpVerifying] = useState(false);
    const [totpError, setTotpError] = useState<string | null>(null);
    const [totpSuccess, setTotpSuccess] = useState(false);
    const [copiedSecret, setCopiedSecret] = useState(false);

    const toggleBox = (box: 'passkey' | 'totp') => {
        if (expandedBox === box) {
            setExpandedBox(null);
        } else {
            setExpandedBox(box);
            if (box === 'totp' && !totpUri && !totpSuccess) {
                loadTotpSetup();
            }
        }
    };

    const loadTotpSetup = async () => {
        try {
            setTotpLoading(true);
            setTotpError(null);
            const res = await api.post('/user/2fa/setup');
            setTotpUri(res.data.uri);
            setTotpSecret(res.data.secret);
        } catch (err: any) {
            setTotpError(err.response?.data?.error || t('profile.setup.totp_setup_failed'));
        } finally {
            setTotpLoading(false);
        }
    };

    const handleCopySecret = () => {
        if (!totpSecret) return;
        navigator.clipboard.writeText(totpSecret);
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2500);
    };

    const handleVerifyTotp = async (e: React.FormEvent) => {
        e.preventDefault();
        const clean = totpCode.trim();
        if (clean.length !== 6) {
            setTotpError(t('profile.setup.code_invalid_length'));
            return;
        }

        try {
            setTotpVerifying(true);
            setTotpError(null);
            const res = await api.post('/user/2fa/verify', { code: clean });
            if (res.data.token) {
                login(res.data.token);
            } else if (refreshUser) {
                await refreshUser();
            }
            setTotpSuccess(true);
            if (res.data.recoveryCodes && res.data.recoveryCodes.length > 0) {
                setRecoveryCodes(res.data.recoveryCodes);
                setShowRecoveryModal(true);
            } else {
                setTimeout(() => {
                    onComplete?.();
                }, 1200);
            }
        } catch (err: any) {
            setTotpError(err.response?.data?.error || t('profile.setup.code_invalid'));
        } finally {
            setTotpVerifying(false);
        }
    };

    const handleRegisterPasskey = async () => {
        try {
            setPasskeyLoading(true);
            setPasskeyError(null);

            const startRes = await api.post('/user/passkey/register/start');
            const options = startRes.data?.publicKey || startRes.data;

            const credential = await startRegistration({ optionsJSON: options });

            const finishRes = await api.post('/user/passkey/register/finish', {
                name: passkeyName.trim() || getDevicePasskeyName(),
                credential,
            });

            if (finishRes.data.token) {
                login(finishRes.data.token);
            } else if (refreshUser) {
                await refreshUser();
            }

            setPasskeySuccess(true);
            if (finishRes.data.recoveryCodes && finishRes.data.recoveryCodes.length > 0) {
                setRecoveryCodes(finishRes.data.recoveryCodes);
                setShowRecoveryModal(true);
            } else {
                setTimeout(() => {
                    onComplete?.();
                }, 1200);
            }
        } catch (err: any) {
            console.error('Passkey registration error:', err);
            if (err.name === 'NotAllowedError') {
                setPasskeyError(t('profile.setup.passkey_canceled'));
            } else {
                setPasskeyError(
                    err.response?.data?.error ||
                    err.message ||
                    t('profile.setup.passkey_failed')
                );
            }
        } finally {
            setPasskeyLoading(false);
        }
    };

    const hasSecureAuth = Boolean(user?.totp_enabled || (user?.passkey_count && user.passkey_count > 0) || user?.has_passkey);

    return (
        <div className={`ac-setup panel ${compact ? 'ac-setup-compact' : 'panel-fg ac-setup-full'}`}>
            <div className="ac-setup-head">
                <span className={compact ? 'ac-icon ac-icon-pumpkin' : 'ac-badge'}><Shield /></span>
                <div className="stack ac-tight">
                    <h2 className={compact ? 'h3' : 'h2'}>{title ?? t('profile.setup.title')}</h2>
                    <p className="small">{description ?? t('profile.setup.description')}</p>
                </div>
                {isRequired && (
                    <span className="sticker sticker-danger sticker-sm">
                        {compact ? t('profile.setup.required') : t('profile.setup.required_publishing')}
                    </span>
                )}
            </div>

            <div className="ac-options">
                <div className="ac-option" data-open={expandedBox === 'passkey' || undefined}>
                    <button
                        type="button"
                        className="ac-option-head"
                        onClick={() => toggleBox('passkey')}
                        aria-expanded={expandedBox === 'passkey'}
                    >
                        <span className="ac-icon ac-icon-success"><Fingerprint /></span>
                        <div>
                            <span className="row ac-tight">
                                <span className="h3">{t('profile.setup.passkey_title')}</span>
                                <span className="tag tag-solid tag-success">{t('profile.setup.recommended')}</span>
                            </span>
                            <span className="small">
                                {t('profile.setup.passkey_description')}
                            </span>
                        </div>
                        {expandedBox === 'passkey' ? <ChevronUp /> : <ChevronDown />}
                    </button>

                    {expandedBox === 'passkey' && (
                        <div className="ac-option-body">
                            <p className="small">
                                <Trans t={t} i18nKey="profile.setup.passkey_explanation" components={{ strong: <strong className="pumpkin" /> }} />
                            </p>

                            {passkeyError && (
                                <div className="notice notice-danger ac-alert" role="alert">
                                    <span className="mark-box mark-box-danger"><AlertCircle /></span>
                                    <p className="notice-text">{passkeyError}</p>
                                </div>
                            )}

                            {passkeySuccess ? (
                                <p className="status">
                                    <span className="mark-box mark-box-success"><Check /></span>
                                    <span>{t('profile.setup.passkey_created')}</span>
                                </p>
                            ) : (
                                <>
                                    <label className="field">
                                        <span className="field-label">{t('profile.setup.passkey_name')}</span>
                                        <span className="control">
                                            <input
                                                type="text"
                                                className="input"
                                                value={passkeyName}
                                                onChange={(e) => setPasskeyName(e.target.value)}
                                                placeholder={t('profile.setup.passkey_placeholder')}
                                            />
                                        </span>
                                    </label>
                                    <button
                                        type="button"
                                        className="button button-primary button-block"
                                        disabled={passkeyLoading}
                                        aria-busy={passkeyLoading}
                                        onClick={handleRegisterPasskey}
                                    >
                                        {passkeyLoading ? t('profile.setup.passkey_creating') : <><Fingerprint /> {t('profile.setup.passkey_create')}</>}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="ac-option" data-open={expandedBox === 'totp' || undefined}>
                    <button
                        type="button"
                        className="ac-option-head"
                        onClick={() => toggleBox('totp')}
                        aria-expanded={expandedBox === 'totp'}
                    >
                        <span className="ac-icon"><Smartphone /></span>
                        <div>
                            <span className="h3">{t('profile.setup.totp_title')}</span>
                            <span className="small">
                                {t('profile.setup.totp_description')}
                            </span>
                        </div>
                        {expandedBox === 'totp' ? <ChevronUp /> : <ChevronDown />}
                    </button>

                    {expandedBox === 'totp' && (
                        <div className="ac-option-body">
                            {totpLoading ? (
                                <p className="status">
                                    <span className="loading" />
                                    <span className="muted">{t('profile.setup.totp_generating')}</span>
                                </p>
                            ) : totpSuccess ? (
                                <p className="status">
                                    <span className="mark-box mark-box-success"><Check /></span>
                                    <span>{t('profile.setup.totp_enabled')}</span>
                                </p>
                            ) : (
                                <>
                                    <div className="ac-totp">
                                        {totpUri && (
                                            <div className="ac-qr">
                                                <QRCodeSVG value={totpUri} size={compact ? 115 : 135} />
                                            </div>
                                        )}
                                        <div>
                                            <p className="ac-step">{t('profile.setup.totp_scan')}</p>
                                            <p className="small">{t('profile.setup.totp_manual')}</p>
                                            {totpSecret && (
                                                <div className="ac-secret">
                                                    <code>{totpSecret}</code>
                                                    <button
                                                        type="button"
                                                        className="ac-icon-btn"
                                                        onClick={handleCopySecret}
                                                        title={t('profile.setup.copy_secret')}
                                                        aria-label={t('profile.setup.copy_secret')}
                                                    >
                                                        {copiedSecret ? <Check /> : <Copy />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {totpError && (
                                        <div className="notice notice-danger ac-alert" role="alert">
                                            <span className="mark-box mark-box-danger"><AlertCircle /></span>
                                            <p className="notice-text">{totpError}</p>
                                        </div>
                                    )}

                                    <form className="stack" onSubmit={handleVerifyTotp}>
                                        <label className="field">
                                            <span className="field-label">{t('profile.setup.totp_code')}</span>
                                            <span className="control">
                                                <input
                                                    type="text"
                                                    className="input ac-code"
                                                    maxLength={6}
                                                    value={totpCode}
                                                    onChange={(e) => {
                                                        setTotpError(null);
                                                        setTotpCode(e.target.value.replace(/\D/g, ''));
                                                    }}
                                                    placeholder="000 000"
                                                    autoComplete="one-time-code"
                                                    inputMode="numeric"
                                                    aria-invalid={totpError ? true : undefined}
                                                />
                                            </span>
                                        </label>
                                        <button
                                            type="submit"
                                            className={`button button-block ${totpError ? 'button-danger' : 'button-primary'}`}
                                            disabled={totpVerifying || (totpCode.trim().length !== 6 && !totpError)}
                                            aria-busy={totpVerifying}
                                        >
                                            {totpVerifying ? (
                                                t('profile.setup.totp_verifying')
                                            ) : totpError ? (
                                                <>
                                                    <AlertCircle /> {t('profile.setup.try_again')}
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheck /> {t('profile.setup.totp_enable')}
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {!compact && (canSkip || hasSecureAuth) && (
                <div className="ac-setup-foot" data-solo={!canSkip || undefined}>
                    {canSkip ? (
                        <>
                            <button type="button" className="button button-ghost" onClick={onSkip}>
                                {t('profile.setup.skip')}
                            </button>
                            {hasSecureAuth && (
                                <button type="button" className="button button-primary" onClick={onComplete}>
                                    {t('profile.setup.continue')}
                                </button>
                            )}
                        </>
                    ) : (
                        <button type="button" className="button button-primary button-block" onClick={onComplete}>
                            {t('profile.setup.continue_upload')}
                        </button>
                    )}
                </div>
            )}

            <RecoveryCodesModal
                isOpen={showRecoveryModal}
                codes={recoveryCodes}
                onClose={() => {
                    setShowRecoveryModal(false);
                    onComplete?.();
                }}
            />
        </div>
    );
};
