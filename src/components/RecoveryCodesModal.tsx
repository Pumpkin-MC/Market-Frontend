import React, { useState } from 'react';
import { ShieldAlert, Download, Copy, Check, Printer, AlertTriangle } from 'lucide-react';

interface RecoveryCodesModalProps {
    isOpen: boolean;
    codes: string[];
    onClose: () => void;
}

export const RecoveryCodesModal: React.FC<RecoveryCodesModalProps> = ({
    isOpen,
    codes,
    onClose,
}) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen || codes.length === 0) return null;

    const handleCopyAll = () => {
        const text = `PUMPKIN MARKET - EMERGENCY RECOVERY CODES\nGenerated on: ${new Date().toLocaleString()}\n\nEach code can be used once if you lose access to your Passkey or 2FA Authenticator:\n\n` +
            codes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
            `\n\nKeep these codes in a secure location (e.g., password manager).`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleDownload = () => {
        const text = `PUMPKIN MARKET - EMERGENCY RECOVERY CODES\nGenerated on: ${new Date().toISOString()}\n\nEach code can be used once if you lose access to your Passkey or 2FA Authenticator:\n\n` +
            codes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
            `\n\nStore these codes safely. Never share them with anyone.`;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pumpkin-market-recovery-codes-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="settings-modal-overlay" style={{ zIndex: 9999 }}>
            <div className="settings-modal-card" style={{ maxWidth: 520, backgroundColor: 'var(--mp-surface, #14171c)', borderRadius: 16, border: '1px solid var(--mp-border, rgba(255,255,255,0.12))', padding: '2rem', color: 'var(--mp-text, #f8fafc)' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: '#ef4444',
                    }}>
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem', fontWeight: 700, color: 'var(--mp-text, #f8fafc)' }}>
                            Save Your Recovery Codes
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--mp-muted, #94a3b8)', lineHeight: 1.4 }}>
                            If you ever lose access to your authenticator app or security keys, you can use these 10 one-time codes to regain access to your account.
                        </p>
                    </div>
                </div>

                {/* Warning Alert */}
                <div style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 8,
                    fontSize: '0.82rem',
                    color: '#fca5a5',
                    marginBottom: '1.25rem',
                    lineHeight: 1.4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span><strong>Important:</strong> We do not store these codes in plaintext and cannot recover them for you. Save them in a password manager now.</span>
                </div>

                {/* Codes Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.5rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    padding: '1rem',
                    borderRadius: 10,
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    marginBottom: '1.25rem',
                }}>
                    {codes.map((code, idx) => (
                        <div
                            key={idx}
                            style={{
                                fontFamily: 'var(--font-mono, monospace)',
                                fontSize: '0.92rem',
                                color: '#4ade80',
                                padding: '0.4rem 0.6rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: 6,
                                textAlign: 'center',
                                letterSpacing: '0.05em',
                            }}
                        >
                            {code}
                        </div>
                    ))}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={handleCopyAll}
                        style={{
                            flex: 1,
                            minWidth: 120,
                            padding: '0.6rem 0.8rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: 8,
                            color: copied ? '#4ade80' : '#fff',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            cursor: 'pointer',
                        }}
                    >
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                        {copied ? 'Copied!' : 'Copy All'}
                    </button>
                    <button
                        type="button"
                        onClick={handleDownload}
                        style={{
                            flex: 1,
                            minWidth: 120,
                            padding: '0.6rem 0.8rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            cursor: 'pointer',
                        }}
                    >
                        <Download size={15} /> Download (.txt)
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        style={{
                            padding: '0.6rem 0.8rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: 8,
                            color: '#fff',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.4rem',
                            cursor: 'pointer',
                        }}
                        title="Print Codes"
                    >
                        <Printer size={15} />
                    </button>
                </div>

                {/* Confirmation Button */}
                <button
                    type="button"
                    className="mp-btn mp-btn-primary"
                    onClick={onClose}
                    style={{
                        width: '100%',
                        padding: '0.8rem',
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    I have safely stored my recovery codes →
                </button>
            </div>
        </div>
    );
};
