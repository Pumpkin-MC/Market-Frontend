import React, { useState } from 'react';
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
    title = 'Secure Your Account',
    description = 'Protect your account with modern security. Choose between biometric passkeys or standard 2FA authenticator apps.',
    onComplete,
    onSkip,
    canSkip = false,
    isRequired = false,
    compact = false,
}) => {
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
            setTotpError(err.response?.data?.error || 'Failed to initialize 2FA setup.');
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
            setTotpError('Please enter a valid 6-digit authentication code.');
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
            setTotpError(err.response?.data?.error || 'Invalid 2FA code. Please try again.');
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
                setPasskeyError('Registration was canceled or timed out.');
            } else {
                setPasskeyError(
                    err.response?.data?.error ||
                    err.message ||
                    'Failed to register passkey. Ensure your device supports biometrics/WebAuthn.'
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
                    <h2 className={compact ? 'h3' : 'h2'}>{title}</h2>
                    <p className="small">{description}</p>
                </div>
                {isRequired && (
                    <span className="sticker sticker-danger sticker-sm">
                        {compact ? 'Required' : 'Required for Plugin Publishing & Developer Verification'}
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
                                <span className="h3">Passkey & Biometrics</span>
                                <span className="tag tag-solid tag-success">Recommended</span>
                            </span>
                            <span className="small">
                                Fastest & most secure. Touch ID, Face ID, Windows Hello, or Security Key.
                            </span>
                        </div>
                        {expandedBox === 'passkey' ? <ChevronUp /> : <ChevronDown />}
                    </button>

                    {expandedBox === 'passkey' && (
                        <div className="ac-option-body">
                            <p className="small">
                                <strong className="pumpkin">How it works:</strong> Passkeys replace passwords and SMS codes with cryptographic keys stored securely in your device's keychain. They are 100% phishing-proof.
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
                                    <span>Passkey created successfully!</span>
                                </p>
                            ) : (
                                <>
                                    <label className="field">
                                        <span className="field-label">Device / Passkey Name (Optional)</span>
                                        <span className="control">
                                            <input
                                                type="text"
                                                className="input"
                                                value={passkeyName}
                                                onChange={(e) => setPasskeyName(e.target.value)}
                                                placeholder="e.g. MacBook Pro Touch ID, Windows PC, or YubiKey"
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
                                        {passkeyLoading ? 'Setting up Passkey...' : <><Fingerprint /> Create & Register Passkey</>}
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
                            <span className="h3">Authenticator App (TOTP 2FA)</span>
                            <span className="small">
                                Use Google Authenticator, Microsoft Authenticator, Authy, or 1Password.
                            </span>
                        </div>
                        {expandedBox === 'totp' ? <ChevronUp /> : <ChevronDown />}
                    </button>

                    {expandedBox === 'totp' && (
                        <div className="ac-option-body">
                            {totpLoading ? (
                                <p className="status">
                                    <span className="loading" />
                                    <span className="muted">Generating 2FA Secret & QR Code...</span>
                                </p>
                            ) : totpSuccess ? (
                                <p className="status">
                                    <span className="mark-box mark-box-success"><Check /></span>
                                    <span>Two-Factor Authentication enabled successfully!</span>
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
                                            <p className="ac-step">1. Scan QR Code with Authenticator App</p>
                                            <p className="small">Or manually copy the setup key below:</p>
                                            {totpSecret && (
                                                <div className="ac-secret">
                                                    <code>{totpSecret}</code>
                                                    <button
                                                        type="button"
                                                        className="ac-icon-btn"
                                                        onClick={handleCopySecret}
                                                        title="Copy Secret"
                                                        aria-label="Copy Secret"
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
                                            <span className="field-label">2. Enter the 6-Digit Code from the App</span>
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
                                                'Verifying Code...'
                                            ) : totpError ? (
                                                <>
                                                    <AlertCircle /> Try Again
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheck /> Verify & Enable 2FA
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
                                Skip for now →
                            </button>
                            {hasSecureAuth && (
                                <button type="button" className="button button-primary" onClick={onComplete}>
                                    Continue →
                                </button>
                            )}
                        </>
                    ) : (
                        <button type="button" className="button button-primary button-block" onClick={onComplete}>
                            Continue to Upload →
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
