import { useState } from 'react';
import { Trash2, AlertTriangle, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import api from '../../../lib/api';
import { useAuth } from '../../../app/auth';
import type { PluginData } from './ManagePluginPage';
import { useNavigate } from 'react-router-dom';

type Props = { plugin: PluginData };

const DangerZone = ({ plugin }: Props) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const handleDelete = async () => {
        if (deleteConfirm !== plugin.name) return;
        if (!twoFactorCode.trim()) {
            setDeleteError('Please enter your 6-digit 2FA code.');
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
            const msg = err.response?.data?.error || err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null) || 'Failed to delete plugin.';
            setDeleteError(msg);
            setDeleting(false);
        }
    };

    return (
        <div className="st-tab">
            <header className="st-tab-head">
                <h2 className="h1">Danger Zone</h2>
                <p className="small">Irreversible actions live here. Proceed carefully.</p>
            </header>

            <section className="panel st-danger">
                <div className="panel-head">
                    <Trash2 size={16} className="st-neg" />
                    <h3 className="h3 st-neg">Delete Plugin</h3>
                </div>
                <div className="panel-body stack">
                    <div className="notice notice-danger">
                        <span className="mark-box mark-box-danger"><AlertTriangle /></span>
                        <p className="notice-text">
                            <strong>This is permanent and cannot be undone.</strong> All user installs,
                            purchase records, screenshots, and binaries will be erased. Active subscribers
                            will be refunded automatically.
                        </p>
                    </div>

                    {user && !user.totp_enabled ? (
                        <div className="notice notice-warning">
                            <span className="mark-box mark-box-warning"><ShieldAlert /></span>
                            <p className="notice-text">
                                <strong>Two-Factor Authentication (2FA) Required.</strong>{' '}
                                To protect against accidental or unauthorized deletion of published plugins, you must enable 2FA on your account before deleting.
                            </p>
                            <button
                                type="button"
                                className="button button-sm"
                                onClick={() => navigate('/settings?tab=security')}
                            >
                                <ShieldCheck /> Enable 2FA →
                            </button>
                        </div>
                    ) : (
                        <>
                            <label className="field">
                                <span className="field-label">1. Type the plugin name <em className="mono">{plugin.name}</em> to confirm:</span>
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
                                <span className="field-label">2. Enter your 6-digit Two-Factor Authentication (2FA) code:</span>
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
                            {deleting ? 'Deleting…' : 'Delete Forever with 2FA'}
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
};

export default DangerZone;
