import { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Users, Clock } from 'lucide-react';
import api from '../../../api';
import type { PluginData } from './ManagePlugin';

interface Coupon {
    id: number;
    plugin_id: number;
    code: string;
    discount_percent: number;
    max_redemptions: number | null;
    used_redemptions: number;
    created_at: string;
    expires_at: string | null;
    active: boolean;
}

type Props = { plugin: PluginData };

const Coupons = ({ plugin }: Props) => {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [code, setCode] = useState('');
    const [discountPercent, setDiscountPercent] = useState<number>(20);
    const [maxRedemptions, setMaxRedemptions] = useState<string>('');
    const [expiresAt, setExpiresAt] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchCoupons();
    }, [plugin.id]);

    const fetchCoupons = async () => {
        try {
            const res = await api.get(`/plugins/${plugin.id}/coupons`);
            setCoupons(res.data);
        } catch (err) {
            console.error('Failed to fetch coupons', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;
        setSubmitting(true);

        const payload = {
            code: code.trim().toUpperCase(),
            discount_percent: discountPercent,
            max_redemptions: maxRedemptions ? parseInt(maxRedemptions, 10) : null,
            expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        };

        try {
            const res = await api.post(`/plugins/${plugin.id}/coupons`, payload);
            setCoupons(prev => [res.data, ...prev]);
            // Reset form
            setCode('');
            setDiscountPercent(20);
            setMaxRedemptions('');
            setExpiresAt('');
        } catch (err: any) {
            alert(err.response?.data || 'Failed to create coupon.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (couponId: number) => {
        if (!window.confirm('Are you sure you want to delete this coupon?')) return;

        try {
            await api.delete(`/plugins/${plugin.id}/coupons/${couponId}`);
            setCoupons(prev => prev.filter(c => c.id !== couponId));
        } catch (err) {
            alert('Failed to delete coupon.');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="mp-section-header">
                <h2 className="mp-title">Coupons &amp; Promo Codes</h2>
                <p>Create discount codes that customers can enter on the plugin store listing page.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
                {/* Create Coupon Card */}
                <div className="mp-card">
                    <div className="mp-card-title">
                        <Plus size={14} /> Create Coupon
                    </div>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="mp-form-group">
                            <label className="mp-label">Promo Code</label>
                            <input
                                className="mp-input"
                                type="text"
                                value={code}
                                onChange={e => setCode(e.target.value.toUpperCase())}
                                placeholder="E.g., SAVE50"
                                required
                                style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}
                            />
                        </div>

                        <div className="mp-form-row">
                            <div className="mp-form-group">
                                <label className="mp-label">Discount %</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        className="mp-input"
                                        type="number"
                                        min={1}
                                        max={99}
                                        value={discountPercent}
                                        onChange={e => setDiscountPercent(Math.min(99, Math.max(1, parseInt(e.target.value, 10) || 0)))}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mp-form-group">
                                <label className="mp-label">Max Uses (Optional)</label>
                                <input
                                    className="mp-input"
                                    type="number"
                                    min={1}
                                    value={maxRedemptions}
                                    onChange={e => setMaxRedemptions(e.target.value)}
                                    placeholder="Unlimited"
                                />
                            </div>
                        </div>

                        <div className="mp-form-group">
                            <label className="mp-label">Expiration Date (Optional)</label>
                            <input
                                className="mp-input"
                                type="datetime-local"
                                value={expiresAt}
                                onChange={e => setExpiresAt(e.target.value)}
                            />
                        </div>

                        <button type="submit" className="mp-btn mp-btn-primary" disabled={submitting || !code.trim()} style={{ marginTop: '0.5rem' }}>
                            <Plus size={14} /> {submitting ? 'Creating…' : 'Create Promo Code'}
                        </button>
                    </form>
                </div>

                {/* Active Coupons List */}
                <div className="mp-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="mp-card-title">
                        <Tag size={14} /> Active Promo Codes
                    </div>
                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--mp-text-3)' }}>Loading coupons…</div>
                    ) : coupons.length === 0 ? (
                        <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--mp-text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <Tag size={28} style={{ opacity: 0.3 }} />
                            <span>No active coupon codes for this plugin.</span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
                            {coupons.map(c => {
                                const isExpired = c.expires_at ? new Date() > new Date(c.expires_at) : false;
                                const isMaxed = c.max_redemptions !== null && c.used_redemptions >= c.max_redemptions;
                                const isValid = !isExpired && !isMaxed && c.active;

                                return (
                                    <div
                                        key={c.id}
                                        style={{
                                            padding: '1rem',
                                            borderRadius: '8px',
                                            backgroundColor: 'rgba(255,255,255,0.02)',
                                            border: '1px solid var(--border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '1rem',
                                            opacity: isValid ? 1 : 0.6
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)', fontSize: '1.05rem' }}>
                                                    {c.code}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '0.72rem',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontWeight: 700,
                                                        backgroundColor: isValid ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                                                        color: isValid ? '#4ade80' : '#ef4444'
                                                    }}
                                                >
                                                    {isValid ? `${c.discount_percent}% OFF` : 'INACTIVE'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.78rem', color: 'var(--mp-text-3)', marginTop: '0.25rem' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Users size={12} /> {c.used_redemptions} {c.max_redemptions !== null ? `/ ${c.max_redemptions} uses` : 'uses'}
                                                </span>
                                                {c.expires_at && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isExpired ? '#ef4444' : undefined }}>
                                                        <Clock size={12} /> Exp: {new Date(c.expires_at).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            className="mp-btn mp-btn-danger mp-btn-outline"
                                            onClick={() => handleDelete(c.id)}
                                            style={{ padding: '6px', borderRadius: '6px' }}
                                            title="Delete Coupon"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Coupons;
