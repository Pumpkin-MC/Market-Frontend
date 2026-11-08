import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowRightLeft, AlertTriangle, CheckCircle, Lock, ShieldAlert, ShieldCheck, Clock, XCircle, UserCheck } from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../app/auth';
import type { PluginData } from './ManagePluginPage';

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
    const { t } = useTranslation();
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
        if (!window.confirm(t('studio.transfer.confirm_cancel'))) return;
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
        <div className="st-tab">
            <header className="st-tab-head">
                <h2 className="h1">{t('studio.transfer.title')}</h2>
                <p className="small">{t('studio.transfer.subtitle')}</p>
            </header>

            {error && (
                <span className="field-error"><AlertTriangle size={14} />{error}</span>
            )}

            {success && (
                <span className="status st-pos"><span className="mark-box mark-box-success"><CheckCircle /></span>{success}</span>
            )}

            {loading ? (
                <span className="row small"><span className="loading" />{t('studio.transfer.loading')}</span>
            ) : pendingTransfer ? (
                <section className="panel panel-pumpkin">
                    <div className="panel-head">
                        <Clock size={16} className="pumpkin" />
                        <h3 className="h3">{t('studio.transfer.pending_title')}</h3>
                    </div>
                    <div className="panel-body st-tr-pending">
                        <span className="avatar"><ArrowRightLeft size={18} /></span>
                        <div className="stack st-tight">
                            <span className="row st-tight">
                                <strong>{t('studio.transfer.pending_to', { name: pendingTransfer.recipient_name })}</strong>
                                <span className="tag tag-pumpkin">{pendingTransfer.status}</span>
                            </span>
                            <p className="small">
                                {t('studio.transfer.pending_desc', { name: plugin.name })}
                            </p>
                        </div>
                    </div>
                    <div className="panel-foot">
                        <button
                            type="button"
                            className="button button-danger"
                            onClick={handleCancelTransfer}
                            disabled={cancelling}
                            aria-busy={cancelling}
                        >
                            <XCircle />
                            {cancelling ? t('studio.transfer.cancelling') : t('studio.transfer.cancel_btn')}
                        </button>
                    </div>
                </section>
            ) : user && !user.totp_enabled ? (
                <div className="notice notice-warning">
                    <span className="mark-box mark-box-warning"><ShieldAlert /></span>
                    <p className="notice-text">
                        <strong>{t('studio.update.tfa_required_title')}</strong>{' '}
                        {t('studio.transfer.tfa_required_desc')}
                    </p>
                    <button
                        type="button"
                        className="button button-sm"
                        onClick={() => navigate('/settings?tab=security')}
                    >
                        <ShieldCheck /> {t('studio.listing.enable_tfa')}
                    </button>
                </div>
            ) : (
                <form className="panel" onSubmit={handleInitiateTransfer}>
                    <div className="panel-head">
                        <ArrowRightLeft size={16} className="pumpkin" />
                        <h3 className="h3">{t('studio.transfer.initiate_title')}</h3>
                    </div>
                    <div className="panel-body stack">
                        <div className="st-callout">
                            <span className="row st-tight label label-fg"><UserCheck size={15} className="pumpkin" /> {t('studio.transfer.what_happens')}</span>
                            <ul className="st-bullets small">
                                <li>{t('studio.transfer.bullet_1')}</li>
                                <li>{t('studio.transfer.bullet_2')}</li>
                                <li>{t('studio.transfer.bullet_3')}</li>
                            </ul>
                        </div>

                        <label className="field">
                            <span className="field-label">{t('studio.transfer.recipient_label')}</span>
                            <span className="control">
                                <input
                                    id="transferRecipientInput"
                                    name="transferRecipient"
                                    type="text"
                                    className="input"
                                    placeholder={t('studio.transfer.recipient_placeholder')}
                                    value={recipient}
                                    onChange={e => setRecipient(e.target.value)}
                                    autoComplete="off"
                                    required
                                />
                            </span>
                        </label>

                        <label className="field">
                            <span className="field-label">{t('studio.transfer.tfa_code_label')}</span>
                            <span className="control st-narrow">
                                <Lock size={15} className="muted" />
                                <input
                                    id="transfer2faCodeInput"
                                    name="transfer2faCode"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    className="input mono st-otp"
                                    placeholder="123456"
                                    value={twoFactorCode}
                                    onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                                    autoComplete="one-time-code"
                                    required
                                />
                            </span>
                        </label>

                    </div>
                    <div className="panel-foot">
                        <button
                            type="submit"
                            className="button button-primary"
                            disabled={submitting || !recipient.trim() || twoFactorCode.trim().length !== 6}
                            aria-busy={submitting}
                        >
                            <ArrowRightLeft />
                            {submitting ? t('studio.transfer.sending') : t('studio.transfer.send_btn')}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default TransferOwnership;
