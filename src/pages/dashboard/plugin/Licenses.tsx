import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, ShieldAlert, ShieldCheck, Copy, Check, UserCheck } from 'lucide-react';
import api from '../../../api';
import type { PluginData } from './ManagePlugin';

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

    // Form state
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="mp-section-header">
                <h2 className="mp-title">License Key Management</h2>
                <p>View, grant, revoke, and manage license keys for your paid plugin buyers and testers.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                {/* Grant License Card */}
                <div className="mp-card" style={{ height: 'fit-content' }}>
                    <div className="mp-card-title">
                        <Plus size={14} /> Grant Manual License
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--mp-muted)', marginBottom: '1rem' }}>
                        Issue a valid license key to a user by entering their username, email address, or account ID.
                    </p>
                    <form onSubmit={handleGrantLicense} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="mp-form-group">
                            <label className="mp-label">User (Username, Email, or User ID)</label>
                            <input
                                type="text"
                                className="mp-input"
                                placeholder="e.g. alex or alex@example.com"
                                value={userIdentifier}
                                onChange={e => setUserIdentifier(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="mp-btn mp-btn-primary"
                            disabled={submitting}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                            <Key size={14} />
                            {submitting ? 'Granting...' : 'Issue License Key'}
                        </button>
                    </form>
                </div>

                {/* Licenses Table / List */}
                <div className="mp-card" style={{ gridColumn: 'span 2' }}>
                    <div className="mp-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Key size={14} /> Active &amp; Issued Licenses ({licenses.length})
                        </span>
                    </div>

                    {loading ? (
                        <p style={{ color: 'var(--mp-muted)', fontSize: '0.9rem', padding: '1rem 0' }}>Loading licenses…</p>
                    ) : licenses.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--mp-muted)' }}>
                            <Key size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                            <p>No license keys issued yet for this plugin.</p>
                            <p style={{ fontSize: '0.85rem' }}>Licenses will automatically appear here when customers purchase your plugin.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--mp-border)', textAlign: 'left', color: 'var(--mp-muted)' }}>
                                        <th style={{ padding: '0.75rem' }}>User</th>
                                        <th style={{ padding: '0.75rem' }}>License Key</th>
                                        <th style={{ padding: '0.75rem' }}>Issued Date</th>
                                        <th style={{ padding: '0.75rem' }}>Status</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {licenses.map(lic => (
                                        <tr key={lic.id} style={{ borderBottom: '1px solid var(--mp-border)', opacity: lic.revoked ? 0.65 : 1 }}>
                                            <td style={{ padding: '0.75rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                                                    <UserCheck size={14} color="var(--mp-accent)" />
                                                    {lic.username}
                                                </div>
                                                {lic.email && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--mp-muted)' }}>{lic.email}</div>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'monospace' }}>
                                                    <span>{lic.license_key}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyKey(lic.license_key)}
                                                        title="Copy license key"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mp-muted)' }}
                                                    >
                                                        {copiedKey === lic.license_key ? <Check size={13} color="var(--mp-success)" /> : <Copy size={13} />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.75rem', color: 'var(--mp-muted)', fontSize: '0.8rem' }}>
                                                {new Date(lic.created_at).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>
                                                {lic.revoked ? (
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem',
                                                        background: 'rgba(239, 68, 68, 0.15)', color: '#f87171'
                                                    }}>
                                                        <ShieldAlert size={12} /> Revoked
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem',
                                                        background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80'
                                                    }}>
                                                        <ShieldCheck size={12} /> Active
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleRevoke(lic.id, lic.revoked)}
                                                        className="mp-btn"
                                                        style={{
                                                            padding: '0.3rem 0.6rem',
                                                            fontSize: '0.75rem',
                                                            background: lic.revoked ? 'var(--mp-accent)' : 'rgba(239, 68, 68, 0.2)',
                                                            color: lic.revoked ? '#fff' : '#f87171',
                                                            border: 'none', borderRadius: '4px', cursor: 'pointer'
                                                        }}
                                                    >
                                                        {lic.revoked ? 'Unrevoke' : 'Revoke'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(lic.id)}
                                                        title="Delete License"
                                                        style={{
                                                            background: 'none', border: 'none', cursor: 'pointer',
                                                            color: 'var(--mp-muted)', padding: '0.3rem'
                                                        }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Licenses;
