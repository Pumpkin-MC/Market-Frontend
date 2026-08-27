import { useState } from 'react';
import { Trash2, AlertTriangle, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import api from '../../../api';
import { useAuth } from '../../../App';
import type { PluginData } from './ManagePlugin';
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
        <div>
            <div className="mp-tab-header">
                <h2>Danger Zone</h2>
                <p>Irreversible actions live here. Proceed carefully.</p>
            </div>

            {/* ── Delete ── */}
            <div className="mp-card" style={{borderColor:'rgba(242,65,90,0.3)'}}>
                <div className="mp-card-title">
                    <Trash2 size={14} style={{color:'var(--mp-error)'}} />
                    <span style={{color:'var(--mp-error)'}}>Delete Plugin</span>
                </div>

                <div className="mp-banner danger">
                    <AlertTriangle size={16} style={{flexShrink:0, marginTop:1}} />
                    <div>
                        <strong>This is permanent and cannot be undone.</strong> All user installs,
                        purchase records, screenshots, and binaries will be erased. Active subscribers
                        will be refunded automatically.
                    </div>
                </div>

                {user && !user.totp_enabled ? (
                    <div className="mp-banner warn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.25rem', marginTop: '1.25rem', background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                            <ShieldAlert size={24} color="#f97316" style={{ flexShrink: 0 }} />
                            <div>
                                <strong style={{ color: '#f97316', display: 'block', fontSize: '0.95rem' }}>Two-Factor Authentication (2FA) Required</strong>
                                <span style={{ fontSize: '0.85rem', color: 'var(--mp-text-2)' }}>
                                    To protect against accidental or unauthorized deletion of published plugins, you must enable 2FA on your account before deleting.
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
                    <>
                        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label className="mp-label" htmlFor="deleteConfirmInput">
                                    1. Type the plugin name <strong style={{color:'var(--mp-text)', fontFamily:'var(--font-mono)'}}>{plugin.name}</strong> to confirm:
                                </label>
                                <input
                                    id="deleteConfirmInput"
                                    name="deleteConfirm"
                                    className="mp-input"
                                    type="text"
                                    value={deleteConfirm}
                                    onChange={e => setDeleteConfirm(e.target.value)}
                                    placeholder={plugin.name}
                                    autoComplete="off"
                                    spellCheck={false}
                                    style={{fontFamily:'var(--font-mono)', marginTop: '0.35rem'}}
                                />
                            </div>

                            <div>
                                <label className="mp-label" htmlFor="twoFactorCodeInput">
                                    2. Enter your 6-digit Two-Factor Authentication (2FA) code:
                                </label>
                                <div style={{ position: 'relative', marginTop: '0.35rem' }}>
                                    <input
                                        id="twoFactorCodeInput"
                                        name="twoFactorCode"
                                        className="mp-input"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={twoFactorCode}
                                        onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="123456"
                                        autoComplete="one-time-code"
                                        spellCheck={false}
                                        style={{fontFamily:'var(--font-mono)', letterSpacing: '0.25em', paddingLeft: '2.25rem', maxWidth: '240px'}}
                                    />
                                    <Lock size={15} color="var(--mp-text-3)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                                </div>
                            </div>
                        </div>

                        {deleteError && (
                            <div className="mp-banner error" style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertTriangle size={16} color="var(--mp-error)" style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: '0.85rem', color: 'var(--mp-error)' }}>{deleteError}</span>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button
                                className="mp-btn mp-btn-danger"
                                onClick={handleDelete}
                                disabled={deleteConfirm !== plugin.name || twoFactorCode.trim().length !== 6 || deleting}
                                style={{flexShrink:0}}
                            >
                                <Trash2 size={15} />
                                {deleting ? 'Deleting…' : 'Delete Forever with 2FA'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DangerZone;
