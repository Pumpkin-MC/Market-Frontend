import React, { useState } from 'react';
import { useAuth } from '../App';
import api from '../api';
import { startRegistration } from '@simplewebauthn/browser';
import { QRCodeSVG } from 'qrcode.react';
import { RecoveryCodesModal } from './RecoveryCodesModal';
import {
    Fingerprint,
    Smartphone,
    ShieldCheck,
    ChevronDown,
    ChevronUp,
    Copy,
    Check,
    AlertCircle,
    Loader2,
    Sparkles,
    Shield
} from 'lucide-react';

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

    // Recovery Codes Modal State
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);

    // Passkey State
    const [passkeyName, setPasskeyName] = useState('');
    const [passkeyLoading, setPasskeyLoading] = useState(false);
    const [passkeyError, setPasskeyError] = useState<string | null>(null);
    const [passkeySuccess, setPasskeySuccess] = useState(false);

    // TOTP State
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
                name: passkeyName.trim() || 'My Passkey',
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
        <div style={compact ? {
            width: '100%',
            padding: '0.85rem',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 12,
            border: '1px solid var(--mp-border, rgba(255,255,255,0.08))',
            boxSizing: 'border-box',
        } : {
            maxWidth: 680,
            width: '100%',
            margin: '0 auto',
            padding: '2rem 1.5rem',
            background: 'var(--mp-surface, #14171c)',
            borderRadius: 20,
            border: '1px solid var(--mp-border, rgba(255,255,255,0.08))',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)',
            boxSizing: 'border-box',
        }}>
            {/* Header */}
            {compact ? (
                <div style={{ marginBottom: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: 'rgba(249, 115, 22, 0.15)',
                            color: 'var(--mp-accent, #f97316)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <Shield size={16} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--mp-text, #f8fafc)' }}>
                                {title}
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--mp-muted, #94a3b8)', lineHeight: 1.3 }}>
                                {description}
                            </p>
                        </div>
                    </div>
                    {isRequired && (
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.15rem 0.5rem',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: 9999,
                            color: '#f87171',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                        }}>
                            <AlertCircle size={12} /> Required
                        </span>
                    )}
                </div>
            ) : (
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.05))',
                        border: '1px solid rgba(249, 115, 22, 0.3)',
                        color: 'var(--mp-accent, #f97316)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem',
                    }}>
                        <Shield size={28} />
                    </div>
                    <h2 style={{
                        fontSize: '1.6rem',
                        fontWeight: 700,
                        margin: '0 0 0.5rem 0',
                        color: 'var(--mp-text, #f8fafc)',
                        letterSpacing: '-0.02em',
                    }}>
                        {title}
                    </h2>
                    <p style={{
                        color: 'var(--mp-muted, #94a3b8)',
                        fontSize: '0.95rem',
                        lineHeight: 1.5,
                        maxWidth: 540,
                        margin: '0 auto',
                    }}>
                        {description}
                    </p>

                    {isRequired && (
                        <div style={{
                            marginTop: '1rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.4rem 0.85rem',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            borderRadius: 9999,
                            color: '#f87171',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                        }}>
                            <AlertCircle size={14} /> Required for Plugin Publishing & Developer Verification
                        </div>
                    )}
                </div>
            )}

            {/* Boxes Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '0.65rem' : '1rem' }}>
                {/* ── Box 1: Passkey / Biometrics (Recommended) ── */}
                <div style={{
                    border: expandedBox === 'passkey' ? '1px solid var(--mp-accent, #f97316)' : '1px solid var(--mp-border, rgba(255,255,255,0.08))',
                    borderRadius: compact ? 10 : 14,
                    background: expandedBox === 'passkey' ? 'rgba(249, 115, 22, 0.03)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                }}>
                    <button
                        type="button"
                        onClick={() => toggleBox('passkey')}
                        style={{
                            width: '100%',
                            padding: compact ? '0.75rem 0.9rem' : '1.25rem 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '0.75rem' : '1rem' }}>
                            <div style={{
                                width: compact ? 36 : 44,
                                height: compact ? 36 : 44,
                                borderRadius: compact ? 8 : 12,
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.05))',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                color: '#4ade80',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <Fingerprint size={compact ? 20 : 24} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                                    <span style={{ fontWeight: 700, fontSize: compact ? '0.92rem' : '1.05rem', color: 'var(--mp-text, #f8fafc)' }}>
                                        Passkey & Biometrics
                                    </span>
                                    <span style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        padding: '0.1rem 0.45rem',
                                        borderRadius: 999,
                                        background: 'rgba(34, 197, 94, 0.15)',
                                        color: '#4ade80',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.2rem',
                                    }}>
                                        <Sparkles size={10} /> Recommended
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: compact ? '0.75rem' : '0.85rem', color: 'var(--mp-muted, #94a3b8)' }}>
                                    Fastest & most secure. Touch ID, Face ID, Windows Hello, or Security Key.
                                </p>
                            </div>
                        </div>
                        <div style={{ color: 'var(--mp-muted, #94a3b8)', marginLeft: '0.5rem' }}>
                            {expandedBox === 'passkey' ? <ChevronUp size={compact ? 18 : 20} /> : <ChevronDown size={compact ? 18 : 20} />}
                        </div>
                    </button>

                    {/* Passkey Expanded Content */}
                    {expandedBox === 'passkey' && (
                        <div style={{
                            padding: compact ? '0 0.9rem 0.9rem 0.9rem' : '0 1.5rem 1.5rem 1.5rem',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            paddingTop: compact ? '0.85rem' : '1.25rem',
                        }}>
                            <div style={{
                                padding: compact ? '0.65rem 0.8rem' : '0.9rem 1rem',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: 8,
                                marginBottom: '1rem',
                                fontSize: compact ? '0.78rem' : '0.85rem',
                                color: 'var(--mp-muted, #94a3b8)',
                                lineHeight: 1.45,
                            }}>
                                <strong>How it works:</strong> Passkeys replace passwords and SMS codes with cryptographic keys stored securely in your device's keychain. They are 100% phishing-proof.
                            </div>

                            {passkeyError && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.65rem 0.85rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                    borderRadius: 8,
                                    color: '#f87171',
                                    fontSize: '0.82rem',
                                    marginBottom: '0.85rem',
                                }}>
                                    <AlertCircle size={15} />
                                    <span>{passkeyError}</span>
                                </div>
                            )}

                            {passkeySuccess ? (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1rem',
                                    background: 'rgba(34, 197, 94, 0.12)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    borderRadius: 8,
                                    color: '#4ade80',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                }}>
                                    <Check size={16} />
                                    <span>Passkey created successfully!</span>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--mp-text, #f8fafc)', marginBottom: '0.35rem' }}>
                                            Device / Passkey Name (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={passkeyName}
                                            onChange={(e) => setPasskeyName(e.target.value)}
                                            placeholder="e.g. MacBook Pro Touch ID, Windows PC, or YubiKey"
                                            style={{
                                                width: '100%',
                                                padding: compact ? '0.6rem 0.85rem' : '0.75rem 1rem',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid var(--mp-border, rgba(255,255,255,0.12))',
                                                borderRadius: 8,
                                                color: '#fff',
                                                fontSize: compact ? '0.85rem' : '0.9rem',
                                                boxSizing: 'border-box',
                                                outline: 'none',
                                            }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="mp-btn mp-btn-primary"
                                        disabled={passkeyLoading}
                                        onClick={handleRegisterPasskey}
                                        style={{
                                            padding: compact ? '0.65rem' : '0.85rem',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            fontSize: compact ? '0.85rem' : '0.9rem',
                                            cursor: passkeyLoading ? 'not-allowed' : 'pointer',
                                            borderRadius: 8,
                                        }}
                                    >
                                        {passkeyLoading ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" /> Setting up Passkey...
                                            </>
                                        ) : (
                                            <>
                                                <Fingerprint size={16} /> Create & Register Passkey
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Box 2: Authenticator App (TOTP 2FA) ── */}
                <div style={{
                    border: expandedBox === 'totp' ? '1px solid var(--mp-accent, #f97316)' : '1px solid var(--mp-border, rgba(255,255,255,0.08))',
                    borderRadius: compact ? 10 : 14,
                    background: expandedBox === 'totp' ? 'rgba(249, 115, 22, 0.03)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                }}>
                    <button
                        type="button"
                        onClick={() => toggleBox('totp')}
                        style={{
                            width: '100%',
                            padding: compact ? '0.75rem 0.9rem' : '1.25rem 1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '0.75rem' : '1rem' }}>
                            <div style={{
                                width: compact ? 36 : 44,
                                height: compact ? 36 : 44,
                                borderRadius: compact ? 8 : 12,
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05))',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                color: '#60a5fa',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <Smartphone size={compact ? 20 : 24} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                                    <span style={{ fontWeight: 700, fontSize: compact ? '0.92rem' : '1.05rem', color: 'var(--mp-text, #f8fafc)' }}>
                                        Authenticator App (TOTP 2FA)
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: compact ? '0.75rem' : '0.85rem', color: 'var(--mp-muted, #94a3b8)' }}>
                                    Use Google Authenticator, Microsoft Authenticator, Authy, or 1Password.
                                </p>
                            </div>
                        </div>
                        <div style={{ color: 'var(--mp-muted, #94a3b8)', marginLeft: '0.5rem' }}>
                            {expandedBox === 'totp' ? <ChevronUp size={compact ? 18 : 20} /> : <ChevronDown size={compact ? 18 : 20} />}
                        </div>
                    </button>

                    {/* TOTP Expanded Content */}
                    {expandedBox === 'totp' && (
                        <div style={{
                            padding: compact ? '0 0.9rem 0.9rem 0.9rem' : '0 1.5rem 1.5rem 1.5rem',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            paddingTop: compact ? '0.85rem' : '1.25rem',
                        }}>
                            {totpLoading ? (
                                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--mp-muted, #94a3b8)' }}>
                                    <Loader2 size={22} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Generating 2FA Secret & QR Code...</p>
                                </div>
                            ) : totpSuccess ? (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1rem',
                                    background: 'rgba(34, 197, 94, 0.12)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    borderRadius: 8,
                                    color: '#4ade80',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                }}>
                                    <Check size={16} />
                                    <span>Two-Factor Authentication enabled successfully!</span>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: compact ? '1rem' : '1.5rem', alignItems: 'center', marginBottom: '1rem' }}>
                                        {totpUri && (
                                            <div style={{
                                                padding: '0.5rem',
                                                background: '#fff',
                                                borderRadius: 10,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                <QRCodeSVG value={totpUri} size={compact ? 115 : 135} />
                                            </div>
                                        )}
                                        <div style={{ flex: 1, minWidth: compact ? 180 : 200 }}>
                                            <p style={{ margin: '0 0 0.35rem 0', fontSize: compact ? '0.8rem' : '0.85rem', color: 'var(--mp-text, #f8fafc)', fontWeight: 600 }}>
                                                1. Scan QR Code with Authenticator App
                                            </p>
                                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: 'var(--mp-muted, #94a3b8)', lineHeight: 1.35 }}>
                                                Or manually copy the setup key below:
                                            </p>
                                            {totpSecret && (
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    padding: '0.35rem 0.6rem',
                                                    borderRadius: 6,
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                }}>
                                                    <code style={{ fontSize: compact ? '0.75rem' : '0.82rem', color: '#f97316', flex: 1, letterSpacing: '0.05em', wordBreak: 'break-all' }}>
                                                        {totpSecret}
                                                    </code>
                                                    <button
                                                        type="button"
                                                        onClick={handleCopySecret}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: copiedSecret ? '#4ade80' : 'var(--mp-muted, #94a3b8)',
                                                            cursor: 'pointer',
                                                            padding: '0.2rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            flexShrink: 0,
                                                        }}
                                                        title="Copy Secret"
                                                    >
                                                        {copiedSecret ? <Check size={14} /> : <Copy size={14} />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {totpError && (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.6rem 0.8rem',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            border: '1px solid rgba(239, 68, 68, 0.25)',
                                            borderRadius: 8,
                                            color: '#f87171',
                                            fontSize: '0.82rem',
                                            marginBottom: '0.75rem',
                                        }}>
                                            <AlertCircle size={15} />
                                            <span>{totpError}</span>
                                        </div>
                                    )}

                                    <form onSubmit={handleVerifyTotp} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--mp-text, #f8fafc)', marginBottom: '0.35rem' }}>
                                                2. Enter the 6-Digit Code from the App
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={6}
                                                value={totpCode}
                                                onChange={(e) => {
                                                    setTotpError(null);
                                                    setTotpCode(e.target.value.replace(/\D/g, ''));
                                                }}
                                                placeholder="000 000"
                                                style={{
                                                    width: '100%',
                                                    padding: compact ? '0.6rem 0.85rem' : '0.75rem 1rem',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: totpError ? '1px solid #ef4444' : '1px solid var(--mp-border, rgba(255,255,255,0.12))',
                                                    boxShadow: totpError ? '0 0 0 3px rgba(239, 68, 68, 0.2)' : undefined,
                                                    borderRadius: 8,
                                                    color: '#fff',
                                                    fontSize: compact ? '1rem' : '1.1rem',
                                                    letterSpacing: '0.2em',
                                                    textAlign: 'center',
                                                    boxSizing: 'border-box',
                                                    outline: 'none',
                                                }}
                                                autoComplete="one-time-code"
                                                inputMode="numeric"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="mp-btn mp-btn-primary"
                                            disabled={totpVerifying || (totpCode.trim().length !== 6 && !totpError)}
                                            style={{
                                                padding: compact ? '0.65rem' : '0.85rem',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                fontSize: compact ? '0.85rem' : '0.9rem',
                                                cursor: totpVerifying ? 'not-allowed' : 'pointer',
                                                borderRadius: 8,
                                                backgroundColor: totpError ? '#ef4444' : undefined,
                                                borderColor: totpError ? '#ef4444' : undefined,
                                                color: '#fff',
                                                opacity: (totpCode.trim().length !== 6 && !totpError) ? 0.6 : 1,
                                            }}
                                        >
                                            {totpVerifying ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" /> Verifying Code...
                                                </>
                                            ) : totpError ? (
                                                <>
                                                    <AlertCircle size={16} /> Try Again
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldCheck size={16} /> Verify & Enable 2FA
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer / Skip Actions */}
            {!compact && (
                <div style={{
                    marginTop: '1.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: canSkip ? 'space-between' : 'center',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                }}>
                    {canSkip ? (
                        <>
                            <button
                                type="button"
                                onClick={onSkip}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--mp-muted, #94a3b8)',
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: 6,
                                    transition: 'color 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--mp-muted, #94a3b8)')}
                            >
                                Skip for now →
                            </button>
                            {hasSecureAuth && (
                                <button
                                    type="button"
                                    className="mp-btn mp-btn-primary"
                                    onClick={onComplete}
                                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem', fontWeight: 600 }}
                                >
                                    Continue →
                                </button>
                            )}
                        </>
                    ) : (
                        hasSecureAuth && (
                            <button
                                type="button"
                                className="mp-btn mp-btn-primary"
                                onClick={onComplete}
                                style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 600 }}
                            >
                                Continue to Upload →
                            </button>
                        )
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

