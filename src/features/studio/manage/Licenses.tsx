import { Trans, useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, ShieldAlert, ShieldCheck, Copy, Check, UserCheck } from 'lucide-react';
import api from '../../../lib/api';
import { translateApiMessage } from '../../../lib/apiMessages';
import type { PluginData } from './ManagePluginPage';

interface PluginLicense {
    id: number;
    plugin_id: number;
    user_id: number;
    username: string;
    email: string | null;
    license_key: string;
    revoked: boolean;
    created_at: string;
}

type Props = { plugin: PluginData };

const Licenses = ({ plugin }: Props) => {
    const { t } = useTranslation();
    const [licenses, setLicenses] = useState<PluginLicense[]>([]);
    const [loading, setLoading] = useState(true);

    const [userIdentifier, setUserIdentifier] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    useEffect(() => {
        fetchLicenses();
    }, [plugin.id]);

    const fetchLicenses = async () => {
        try {
            const res = await api.get(`/plugins/${plugin.id}/licenses`);
            setLicenses(res.data);
        } catch (err) {
            console.error('Failed to fetch licenses', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGrantLicense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userIdentifier.trim()) return;
        setSubmitting(true);

        try {
            const res = await api.post(`/plugins/${plugin.id}/licenses`, {
                user_identifier: userIdentifier.trim()
            });
            setLicenses(prev => [res.data, ...prev.filter(l => l.id !== res.data.id)]);
            setUserIdentifier('');
        } catch (err: any) {
            alert(translateApiMessage(t, err.response?.data, t('developer.licenses.grant_failed')));
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleRevoke = async (licenseId: number, currentRevoked: boolean) => {
        if (!window.confirm(currentRevoked ? t('developer.licenses.confirm_unrevoke') : t('developer.licenses.confirm_revoke'))) return;

        try {
            await api.put(`/plugins/${plugin.id}/licenses/${licenseId}/revoke`, {
                revoked: !currentRevoked
            });
            setLicenses(prev =>
                prev.map(l => l.id === licenseId ? { ...l, revoked: !currentRevoked } : l)
            );
        } catch (err) {
            alert(currentRevoked ? t('developer.licenses.unrevoke_failed') : t('developer.licenses.revoke_failed'));
        }
    };

    const handleDelete = async (licenseId: number) => {
        if (!window.confirm(t('developer.licenses.delete_confirm'))) return;

        try {
            await api.delete(`/plugins/${plugin.id}/licenses/${licenseId}`);
            setLicenses(prev => prev.filter(l => l.id !== licenseId));
        } catch (err) {
            alert(t('developer.licenses.delete_failed'));
        }
    };

    const handleCopyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    return (
        <div className="st-tab">
            <header className="st-tab-head">
                <h2 className="h1">{t('developer.licenses.title')}</h2>
                <p className="small">{t('developer.licenses.subtitle')}</p>
            </header>

            <form className="panel" onSubmit={handleGrantLicense}>
                <div className="panel-head">
                    <Plus size={16} className="pumpkin" />
                    <h3 className="h3">{t('developer.licenses.grant_manual_license')}</h3>
                </div>
                <div className="panel-body stack">
                    <p className="small">{t('developer.licenses.grant_desc')}</p>
                    <div className="st-inline-form">
                        <label className="field">
                            <span className="field-label">{t('developer.licenses.recipient_label')}</span>
                            <span className="control">
                                <input
                                    id="licenseUserIdentifier"
                                    name="userIdentifier"
                                    type="text"
                                    className="input"
                                    placeholder={t('developer.licenses.recipient_placeholder')}
                                    value={userIdentifier}
                                    onChange={e => setUserIdentifier(e.target.value)}
                                    autoComplete="off"
                                    spellCheck={false}
                                    required
                                />
                            </span>
                        </label>
                        <button
                            type="submit"
                            className="button button-primary"
                            disabled={submitting}
                            aria-busy={submitting}
                        >
                            <Key />
                            {submitting ? t('developer.licenses.granting') : t('developer.licenses.issue_license_key')}
                        </button>
                    </div>
                </div>
            </form>

            <section className="stack">
                <h3 className="h2"><Trans t={t} i18nKey="developer.licenses.issued_licenses" components={{ count: <span className="mark num">{licenses.length}</span> }} /></h3>

                {loading ? (
                    <span className="row small"><span className="loading" />{t('developer.licenses.loading')}</span>
                ) : licenses.length === 0 ? (
                    <div className="blank">
                        <Key size={32} className="pumpkin" />
                        <p className="h3">{t('developer.licenses.empty_title')}</p>
                        <p className="small">{t('developer.licenses.empty_desc')}</p>
                    </div>
                ) : (
                    <div className="scroll-x">
                        <table className="ledger st-ledger">
                            <thead>
                                <tr>
                                    <th>{t('developer.licenses.user')}</th>
                                    <th>{t('plugin.license_key')}</th>
                                    <th>{t('developer.licenses.issued_date')}</th>
                                    <th>{t('developer.licenses.status')}</th>
                                    <th className="end">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {licenses.map(lic => (
                                    <tr key={lic.id} className={lic.revoked ? 'st-dim' : undefined}>
                                        <td>
                                            <span className="row st-tight">
                                                <UserCheck size={14} className="pumpkin" />
                                                <strong>{lic.username}</strong>
                                            </span>
                                            {lic.email && <span className="ledger-sub">{lic.email}</span>}
                                        </td>
                                        <td>
                                            <span className="row st-tight">
                                                <span className="mono">{lic.license_key}</span>
                                                <button
                                                    type="button"
                                                    className="button button-ghost button-sm button-icon"
                                                    onClick={() => handleCopyKey(lic.license_key)}
                                                    title={t('developer.licenses.copy_license_key')}
                                                    aria-label={t('developer.licenses.copy_license_key')}
                                                >
                                                    {copiedKey === lic.license_key ? <Check className="st-pos" /> : <Copy />}
                                                </button>
                                            </span>
                                        </td>
                                        <td className="muted">
                                            {new Date(lic.created_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            {lic.revoked ? (
                                                <span className="tag tag-danger"><ShieldAlert />{t('developer.licenses.revoked')}</span>
                                            ) : (
                                                <span className="tag tag-success"><ShieldCheck />{t('developer.licenses.active')}</span>
                                            )}
                                        </td>
                                        <td className="end">
                                            <span className="row st-row-end">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleRevoke(lic.id, lic.revoked)}
                                                    className={`button button-sm ${lic.revoked ? 'button-primary' : 'button-danger'}`}
                                                >
                                                    {lic.revoked ? t('developer.licenses.unrevoke') : t('common.revoke')}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="button button-ghost button-sm button-icon"
                                                    onClick={() => handleDelete(lic.id)}
                                                    title={t('developer.licenses.delete_license')}
                                                    aria-label={t('developer.licenses.delete_license')}
                                                >
                                                    <Trash2 />
                                                </button>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

export default Licenses;
