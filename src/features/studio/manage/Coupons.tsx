import { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Users, Clock } from 'lucide-react';
import api from '../../../lib/api';
import type { PluginData } from './ManagePluginPage';

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
        <div className="st-tab">
            <header className="st-tab-head">
                <h2 className="h1">Coupons &amp; Promo Codes</h2>
                <p className="small">Create discount codes that customers can enter on the plugin store listing page.</p>
            </header>

            <form className="panel" onSubmit={handleCreate}>
                <div className="panel-head">
                    <Plus size={16} className="pumpkin" />
                    <h3 className="h3">Create Coupon</h3>
                </div>
                <div className="panel-body">
                    <div className="fields st-cols-2">
                        <label className="field st-span">
                            <span className="field-label">Promo Code</span>
                            <span className="control">
                                <input
                                    id="couponCode"
                                    name="code"
                                    className="input mono st-upper"
                                    type="text"
                                    value={code}
                                    onChange={e => setCode(e.target.value.toUpperCase())}
                                    placeholder="E.g., SAVE50"
                                    autoComplete="off"
                                    autoCapitalize="characters"
                                    spellCheck={false}
                                    required
                                />
                            </span>
                        </label>
                        <label className="field">
                            <span className="field-label">Discount %</span>
                            <span className="control">
                                <input
                                    id="couponDiscount"
                                    name="discountPercent"
                                    className="input num"
                                    type="number"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    min={1}
                                    max={99}
                                    value={discountPercent}
                                    onChange={e => setDiscountPercent(Math.min(99, Math.max(1, parseInt(e.target.value, 10) || 0)))}
                                    required
                                />
                                <span className="affix">%</span>
                            </span>
                        </label>
                        <label className="field">
                            <span className="field-label">Max Uses <em>(Optional)</em></span>
                            <span className="control">
                                <input
                                    id="couponMaxUses"
                                    name="maxRedemptions"
                                    className="input num"
                                    type="number"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    min={1}
                                    value={maxRedemptions}
                                    onChange={e => setMaxRedemptions(e.target.value)}
                                    placeholder="Unlimited"
                                />
                            </span>
                        </label>
                        <label className="field st-span">
                            <span className="field-label">Expiration Date <em>(Optional)</em></span>
                            <span className="control">
                                <input
                                    id="couponExpiresAt"
                                    name="expiresAt"
                                    className="input"
                                    type="datetime-local"
                                    autoComplete="off"
                                    value={expiresAt}
                                    onChange={e => setExpiresAt(e.target.value)}
                                />
                            </span>
                        </label>
                    </div>
                </div>
                <div className="panel-foot">
                    <button type="submit" className="button button-primary" disabled={submitting || !code.trim()} aria-busy={submitting}>
                        <Plus /> {submitting ? 'Creating…' : 'Create Promo Code'}
                    </button>
                </div>
            </form>

            <section className="stack">
                <h3 className="h2">Active Promo Codes</h3>
                {loading ? (
                    <span className="row small"><span className="loading" />Loading coupons…</span>
                ) : coupons.length === 0 ? (
                    <div className="blank">
                        <Tag size={28} className="pumpkin" />
                        <p className="small">No active coupon codes for this plugin.</p>
                    </div>
                ) : (
                    <div className="st-list">
                        {coupons.map(c => {
                            const isExpired = c.expires_at ? new Date() > new Date(c.expires_at) : false;
                            const isMaxed = c.max_redemptions !== null && c.used_redemptions >= c.max_redemptions;
                            const isValid = !isExpired && !isMaxed && c.active;

                            return (
                                <div key={c.id} className={`st-list-row${isValid ? '' : ' st-dim'}`}>
                                    <div className="stack st-tight">
                                        <span className="row st-tight">
                                            <span className="mono st-code">{c.code}</span>
                                            {isValid
                                                ? <span className="sticker sticker-sm">{c.discount_percent}% OFF</span>
                                                : <span className="tag tag-danger">INACTIVE</span>}
                                        </span>
                                        <span className="row small">
                                            <span className="row st-tight"><Users size={12} /> {c.used_redemptions} {c.max_redemptions !== null ? `/ ${c.max_redemptions} uses` : 'uses'}</span>
                                            {c.expires_at && (
                                                <span className={`row st-tight${isExpired ? ' st-neg' : ''}`}>
                                                    <Clock size={12} /> Exp: {new Date(c.expires_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <button
                                        className="button button-danger button-sm button-icon"
                                        onClick={() => handleDelete(c.id)}
                                        title="Delete Coupon"
                                        aria-label="Delete Coupon"
                                    >
                                        <Trash2 />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
};

export default Coupons;
