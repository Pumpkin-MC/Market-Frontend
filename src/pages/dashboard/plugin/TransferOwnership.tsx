import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, AlertTriangle, CheckCircle, Lock, ShieldAlert, ShieldCheck, Clock, XCircle, UserCheck } from 'lucide-react';
import api from '../../../api';
import { useAuth } from '../../../App';
import type { PluginData } from './ManagePlugin';

type Props = { plugin: PluginData };

type PendingTransfer = {
    id: number;
    plugin_id: number;
    recipient_id: number;
    recipient_name: string;
    status: string;
    created_at?: string;
};

const TransferOwnership = ({ plugin }: Props) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [pendingTransfer, setPendingTransfer] = useState<PendingTransfer | null>(null);
    const [loading, setLoading] = useState(true);
    const [recipient, setRecipient] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        fetchTransferStatus();
    }, [plugin.id]);

    const fetchTransferStatus = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/plugins/${plugin.id}/transfer`);
            setPendingTransfer(res.data);
        } catch {
            setPendingTransfer(null);
        } finally {
            setLoading(false);
        }
    };

    const handleInitiateTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanRecipient = recipient.trim();
        const cleanCode = twoFactorCode.trim();

        if (!cleanRecipient) {
            setError('Please specify the recipient username or email.');
            return;
        }

        if (cleanCode.length !== 6) {
            setError('Please enter a valid 6-digit 2FA authenticator code.');
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await api.post(`/plugins/${plugin.id}/transfer`, {
                recipient: cleanRecipient,
                code: cleanCode,
            });
            setPendingTransfer(res.data);
            setRecipient('');
            setTwoFactorCode('');
            setSuccess(`Transfer request sent to @${res.data.recipient_name}. The recipient must accept it in their dashboard.`);
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null) || 'Failed to initiate transfer request.';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelTransfer = async () => {
        if (!window.confirm('Cancel this pending transfer request?')) return;
        setCancelling(true);
        setError(null);
        setSuccess(null);
        try {
            await api.delete(`/plugins/${plugin.id}/transfer`);
            setPendingTransfer(null);
            setSuccess('Transfer request cancelled successfully.');
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null) || 'Failed to cancel transfer request.';
            setError(msg);
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div>
            <div className="mp-tab-header">
                <h2>Transfer Ownership</h2>
                <p>Transfer this plugin to another developer on Pumpkin Market. The recipient must review and accept the request before ownership is transferred.</p>
            </div>

            {/* Current Status Card */}
            {loading ? (
                <div className="mp-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--mp-text-3)' }}>
                    Loading transfer status…
                </div>
            ) : pendingTransfer ? (
                <div className="mp-card" style={{ borderColor: 'rgba(249, 115, 22, 0.3)', background: 'rgba(249, 115, 22, 0.04)' }}>
                    <div className="mp-card-title" style={{ color: '#f97316' }}>
                        <Clock size={16} /> Pending Ownership Transfer
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', padding: '1.25rem', background: 'var(--mp-surface-2)', borderRadius: '10px', border: '1px solid var(--mp-border)' }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: '50%', background: 'rgba(249, 115, 22, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', flexShrink: 0
                        }}>
                            <ArrowRightLeft size={20} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--mp-text)' }}>
                                    Pending transfer to <span style={{ color: 'var(--mp-accent)' }}>@{pendingTransfer.recipient_name}</span>
                                </span>
                                <span className="dev-plugins-badge" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)', textTransform: 'capitalize' }}>
                                    {pendingTransfer.status}
                                </span>
                            </div>
                            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: 'var(--mp-text-2)', lineHeight: 1.5 }}>
                                The recipient has been invited to take over <strong>{plugin.name}</strong>. Ownership and management permissions remain with you until they accept.
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                        <button
                            type="button"
                            className="mp-btn mp-btn-danger"
                            onClick={handleCancelTransfer}
                            disabled={cancelling}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            <XCircle size={15} />
                            {cancelling ? 'Cancelling…' : 'Cancel Transfer Request'}
                        </button>
                    </div>
                </div>
            ) : (
                /* Form Card to Initiate Transfer */
                <div className="mp-card">
                    <div className="mp-card-title">
                        <ArrowRightLeft size={16} /> Initiate Plugin Transfer
                    </div>

                    {user && !user.totp_enabled ? (
                        <div className="mp-banner warn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.25rem', marginTop: '1rem', background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                <ShieldAlert size={24} color="#f97316" style={{ flexShrink: 0 }} />
                                <div>
                                    <strong style={{ color: '#f97316', display: 'block', fontSize: '0.95rem' }}>Two-Factor Authentication (2FA) Required</strong>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--mp-text-2)' }}>
                                        To protect against account takeovers, you must enable 2FA in your account settings before transferring plugins.
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="mp-btn mp-btn-primary"
                                style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                onClick={() => navigate('/settings?tab=security')}
                            >
                                <ShieldCheck size={16} /> Enable 2FA →
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleInitiateTransfer} style={{ marginTop: '1rem' }}>
                            {/* Transfer Guidelines */}
                            <div style={{ padding: '1rem', background: 'var(--mp-surface-2)', borderRadius: '8px', border: '1px solid var(--mp-border)', marginBottom: '1.5rem' }}>
                                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--mp-text)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <UserCheck size={15} color="var(--mp-accent)" /> What happens during a transfer:
                                </div>
                                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.82rem', color: 'var(--mp-text-2)', lineHeight: 1.6 }}>
                                    <li>All existing releases, store listings, reviews, and active customer licenses are transferred.</li>
                                    <li>Future sales and subscription revenues will route to the recipient's payout account.</li>
                                    <li><strong>The recipient must explicitly accept the request</strong> in their dashboard before ownership changes.</li>
                                </ul>
                            </div>

                            <div className="mp-form-group">
                                <label className="mp-label" htmlFor="transferRecipientInput">
                                    Recipient Username or Email
                                </label>
                                <input
                                    id="transferRecipientInput"
                                    name="transferRecipient"
                                    type="text"
                                    className="mp-input"
                                    placeholder="e.g. notch or dev@example.com"
                                    value={recipient}
                                    onChange={e => setRecipient(e.target.value)}
                                    autoComplete="off"
                                    required
                                />
                            </div>

                            <div className="mp-form-group">
                                <label className="mp-label" htmlFor="transfer2faCodeInput">
                                    Enter your 6-digit Two-Factor Authentication (2FA) Code
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        id="transfer2faCodeInput"
                                        name="transfer2faCode"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        className="mp-input"
                                        placeholder="123456"
                                        value={twoFactorCode}
                                        onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                                        autoComplete="one-time-code"
                                        style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.2em', paddingLeft: '2.25rem', maxWidth: '240px' }}
                                        required
                                    />
                                    <Lock size={15} color="var(--mp-text-3)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                                </div>
                            </div>

                            {error && (
                                <div className="mp-banner error" style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AlertTriangle size={16} color="var(--mp-error)" style={{ flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.85rem', color: 'var(--mp-error)' }}>{error}</span>
                                </div>
                            )}

                            {success && (
                                <div className="mp-banner success" style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CheckCircle size={16} color="#10b981" style={{ flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.85rem', color: '#10b981' }}>{success}</span>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                <button
                                    type="submit"
                                    className="mp-btn mp-btn-primary"
                                    disabled={submitting || !recipient.trim() || twoFactorCode.trim().length !== 6}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <ArrowRightLeft size={15} />
                                    {submitting ? 'Sending Request…' : 'Send Transfer Request'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
};

export default TransferOwnership;
