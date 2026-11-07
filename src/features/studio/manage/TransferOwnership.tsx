import { Trans, useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
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
            setError(t('developer.transfer.recipient_required'));
            return;
        }

        if (cleanCode.length !== 6) {
            setError(t('developer.transfer.invalid_code'));
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
            setSuccess(t('developer.transfer.request_sent', { recipient: res.data.recipient_name }));
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null) || t('developer.transfer.request_failed');
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelTransfer = async () => {
        if (!window.confirm(t('developer.transfer.cancel_confirm'))) return;
        setCancelling(true);
        setError(null);
        setSuccess(null);
        try {
            await api.delete(`/plugins/${plugin.id}/transfer`);
            setPendingTransfer(null);
            setSuccess(t('developer.transfer.cancel_success'));
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null) || t('developer.transfer.cancel_failed');
            setError(msg);
        } finally {
            setCancelling(false);
        }
    };

    return (
        <div className="st-tab">
            <header className="st-tab-head">
                <h2 className="h1">{t('developer.transfer.title')}</h2>
                <p className="small">{t('developer.transfer.subtitle')}</p>
            </header>

            {error && (
                <span className="field-error"><AlertTriangle size={14} />{error}</span>
            )}

            {success && (
                <span className="status st-pos"><span className="mark-box mark-box-success"><CheckCircle /></span>{success}</span>
            )}

            {loading ? (
                <span className="row small"><span className="loading" />{t('developer.transfer.loading')}</span>
            ) : pendingTransfer ? (
                <section className="panel panel-pumpkin">
                    <div className="panel-head">
                        <Clock size={16} className="pumpkin" />
                        <h3 className="h3">{t('developer.transfer.pending_title')}</h3>
                    </div>
                    <div className="panel-body st-tr-pending">
                        <span className="avatar"><ArrowRightLeft size={18} /></span>
                        <div className="stack st-tight">
                            <span className="row st-tight">
                                <strong><Trans t={t} i18nKey="developer.transfer.pending_recipient" components={{ recipient: <span className="pumpkin">@{pendingTransfer.recipient_name}</span> }} /></strong>
                                <span className="tag tag-pumpkin">{pendingTransfer.status}</span>
                            </span>
                            <p className="small">
                                <Trans t={t} i18nKey="developer.transfer.pending_description" components={{ plugin: <strong>{plugin.name}</strong> }} />
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
                            {cancelling ? t('common.cancelling') : t('developer.transfer.cancel_request')}
                        </button>
                    </div>
                </section>
            ) : user && !user.totp_enabled ? (
                <div className="notice notice-warning">
                    <span className="mark-box mark-box-warning"><ShieldAlert /></span>
                    <p className="notice-text">
                        <Trans t={t} i18nKey="developer.transfer.security_required" components={{ strong: <strong /> }} />
                    </p>
                    <button
                        type="button"
                        className="button button-sm"
                        onClick={() => navigate('/settings?tab=security')}
                    >
                        <ShieldCheck />{' '}{t('developer.dashboard.enable_2fa')}</button>
                </div>
            ) : (
                <form className="panel" onSubmit={handleInitiateTransfer}>
                    <div className="panel-head">
                        <ArrowRightLeft size={16} className="pumpkin" />
                        <h3 className="h3">{t('developer.transfer.initiate_title')}</h3>
                    </div>
                    <div className="panel-body stack">
                        <div className="st-callout">
                            <span className="row st-tight label label-fg"><UserCheck size={15} className="pumpkin" />{' '}{t('developer.transfer.effects_title')}</span>
                            <ul className="st-bullets small">
                                <li>{t('developer.transfer.assets_transferred')}</li>
                                <li>{t('developer.transfer.payouts_transferred')}</li>
                                <li><Trans t={t} i18nKey="developer.transfer.acceptance_required" components={{ strong: <strong /> }} /></li>
                            </ul>
                        </div>

                        <label className="field">
                            <span className="field-label">{t('developer.transfer.recipient_label')}</span>
                            <span className="control">
                                <input
                                    id="transferRecipientInput"
                                    name="transferRecipient"
                                    type="text"
                                    className="input"
                                    placeholder={t('developer.transfer.recipient_placeholder')}
                                    value={recipient}
                                    onChange={e => setRecipient(e.target.value)}
                                    autoComplete="off"
                                    required
                                />
                            </span>
                        </label>

                        <label className="field">
                            <span className="field-label">{t('developer.transfer.code_label')}</span>
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
                            {submitting ? t('developer.transfer.sending_request') : t('developer.transfer.submit')}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default TransferOwnership;
