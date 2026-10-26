import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, ShieldAlert, ShieldCheck, Copy, Check, UserCheck } from 'lucide-react';
import api from '../../../lib/api';
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
            alert(err.response?.data || 'Failed to grant license to user.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleRevoke = async (licenseId: number, currentRevoked: boolean) => {
        const action = currentRevoked ? 'unrevoke' : 'revoke';
        if (!window.confirm(`Are you sure you want to ${action} this license key?`)) return;

        try {
            await api.put(`/plugins/${plugin.id}/licenses/${licenseId}/revoke`, {
                revoked: !currentRevoked
            });
            setLicenses(prev =>
                prev.map(l => l.id === licenseId ? { ...l, revoked: !currentRevoked } : l)
            );
        } catch (err) {
            alert(`Failed to ${action} license.`);
        }
    };

    const handleDelete = async (licenseId: number) => {
        if (!window.confirm('Are you sure you want to permanently delete this license key record?')) return;

        try {
            await api.delete(`/plugins/${plugin.id}/licenses/${licenseId}`);
            setLicenses(prev => prev.filter(l => l.id !== licenseId));
        } catch (err) {
            alert('Failed to delete license record.');
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
                <h2 className="h1">License Key Management</h2>
                <p className="small">View, grant, revoke, and manage license keys for your paid plugin buyers and testers.</p>
            </header>

            <form className="panel" onSubmit={handleGrantLicense}>
                <div className="panel-head">
                    <Plus size={16} className="pumpkin" />
                    <h3 className="h3">Grant Manual License</h3>
                </div>
                <div className="panel-body stack">
                    <p className="small">
                        Issue a valid license key to a user by entering their username, email address, or account ID.
                    </p>
                    <div className="st-inline-form">
                        <label className="field">
                            <span className="field-label">User (Username, Email, or User ID)</span>
                            <span className="control">
                                <input
                                    id="licenseUserIdentifier"
                                    name="userIdentifier"
                                    type="text"
                                    className="input"
                                    placeholder="e.g. alex or alex@example.com"
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
                            {submitting ? 'Granting...' : 'Issue License Key'}
                        </button>
                    </div>
                </div>
            </form>

            <section className="stack">
                <h3 className="h2">Active &amp; Issued Licenses <span className="mark num">{licenses.length}</span></h3>

                {loading ? (
                    <span className="row small"><span className="loading" />Loading licenses…</span>
                ) : licenses.length === 0 ? (
                    <div className="blank">
                        <Key size={32} className="pumpkin" />
                        <p className="h3">No license keys issued yet for this plugin.</p>
                        <p className="small">Licenses will automatically appear here when customers purchase your plugin.</p>
                    </div>
                ) : (
                    <div className="scroll-x">
                        <table className="ledger st-ledger">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>License Key</th>
                                    <th>Issued Date</th>
                                    <th>Status</th>
                                    <th className="end">Actions</th>
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
                                                    title="Copy license key"
                                                    aria-label="Copy license key"
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
                                                <span className="tag tag-danger"><ShieldAlert />Revoked</span>
                                            ) : (
                                                <span className="tag tag-success"><ShieldCheck />Active</span>
                                            )}
                                        </td>
                                        <td className="end">
                                            <span className="row st-row-end">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleRevoke(lic.id, lic.revoked)}
                                                    className={`button button-sm ${lic.revoked ? 'button-primary' : 'button-danger'}`}
                                                >
                                                    {lic.revoked ? 'Unrevoke' : 'Revoke'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="button button-ghost button-sm button-icon"
                                                    onClick={() => handleDelete(lic.id)}
                                                    title="Delete License"
                                                    aria-label="Delete License"
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
