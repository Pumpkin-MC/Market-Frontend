import { Trans, useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Trash2, AlertTriangle, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import api from '../../../lib/api';
import { translateApiMessage } from '../../../lib/apiMessages';
import { useAuth } from '../../../app/auth';
import type { PluginData } from './ManagePluginPage';
import { useNavigate } from 'react-router-dom';

type Props = { plugin: PluginData };

const DangerZone = ({ plugin }: Props) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const handleDelete = async () => {
        if (deleteConfirm !== plugin.name) return;
        if (!twoFactorCode.trim()) {
            setDeleteError(t('developer.danger_zone.code_required'));
            return;
        }
        setDeleting(true);
        setDeleteError(null);
        try {
            await api.delete(`/plugins/${plugin.id}`, {
                data: { code: twoFactorCode.trim() }
            });
            navigate('/dashboard/plugins');
        } catch (err: any) {
            const msg = translateApiMessage(t, err.response?.data?.error || err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null), t('developer.danger_zone.delete_failed'));
            setDeleteError(msg);
            setDeleting(false);
        }
    };

    return (
        <div className="st-tab">
            <header className="st-tab-head">
                <h2 className="h1">{t('developer.dashboard.danger_zone')}</h2>
                <p className="small">{t('developer.danger_zone.subtitle')}</p>
            </header>

            <section className="panel st-danger">
                <div className="panel-head">
                    <Trash2 size={16} className="st-neg" />
                    <h3 className="h3 st-neg">{t('developer.danger_zone.delete_plugin')}</h3>
                </div>
                <div className="panel-body stack">
                    <div className="notice notice-danger">
                        <span className="mark-box mark-box-danger"><AlertTriangle /></span>
                        <p className="notice-text">
                            <Trans t={t} i18nKey="developer.danger_zone.delete_warning" components={{ strong: <strong /> }} />
                        </p>
                    </div>

                    {user && !user.totp_enabled ? (
                        <div className="notice notice-warning">
                            <span className="mark-box mark-box-warning"><ShieldAlert /></span>
                            <p className="notice-text">
                                <Trans t={t} i18nKey="developer.danger_zone.security_required" components={{ strong: <strong /> }} />
                            </p>
                            <button
                                type="button"
                                className="button button-sm"
                                onClick={() => navigate('/settings?tab=security')}
                            >
                                <ShieldCheck />{' '}{t('developer.dashboard.enable_2fa')}</button>
                        </div>
                    ) : (
                        <>
                            <label className="field">
                                <span className="field-label"><Trans t={t} i18nKey="developer.danger_zone.confirm_name" components={{ plugin: <em className="mono">{plugin.name}</em> }} /></span>
                                <span className="control">
                                    <input
                                        id="deleteConfirmInput"
                                        name="deleteConfirm"
                                        className="input mono"
                                        type="text"
                                        value={deleteConfirm}
                                        onChange={e => setDeleteConfirm(e.target.value)}
                                        placeholder={plugin.name}
                                        autoComplete="off"
                                        spellCheck={false}
                                    />
                                </span>
                            </label>

                            <label className="field">
                                <span className="field-label">{t('developer.danger_zone.code_label')}</span>
                                <span className="control st-narrow">
                                    <Lock size={15} className="muted" />
                                    <input
                                        id="twoFactorCodeInput"
                                        name="twoFactorCode"
                                        className="input mono st-otp"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={twoFactorCode}
                                        onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="123456"
                                        autoComplete="one-time-code"
                                        spellCheck={false}
                                    />
                                </span>
                            </label>

                            {deleteError && (
                                <span className="field-error"><AlertTriangle size={14} />{deleteError}</span>
                            )}
                        </>
                    )}
                </div>
                {!(user && !user.totp_enabled) && (
                    <div className="panel-foot">
                        <button
                            className="button button-danger"
                            onClick={handleDelete}
                            disabled={deleteConfirm !== plugin.name || twoFactorCode.trim().length !== 6 || deleting}
                            aria-busy={deleting}
                        >
                            <Trash2 />
                            {deleting ? t('common.deleting') : t('developer.danger_zone.delete_confirm')}
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
};

export default DangerZone;
