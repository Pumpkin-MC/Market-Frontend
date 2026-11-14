import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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
            alert(err.response?.data || t('studio.coupons.create_failed'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (couponId: number) => {
        if (!window.confirm(t('studio.coupons.confirm_delete'))) return;

        try {
            await api.delete(`/plugins/${plugin.id}/coupons/${couponId}`);
            setCoupons(prev => prev.filter(c => c.id !== couponId));
        } catch (err) {
            alert(t('studio.coupons.delete_failed'));
        }
    };

    return (
        <div className="st-tab">
            <header className="st-tab-head">
                <h2 className="h1">{t('studio.coupons.title')}</h2>
                <p className="small">{t('studio.coupons.subtitle')}</p>
            </header>

            <form className="panel" onSubmit={handleCreate}>
                <div className="panel-head">
                    <Plus size={16} className="pumpkin" />
                    <h3 className="h3">{t('studio.coupons.create_title')}</h3>
                </div>
                <div className="panel-body">
                    <div className="fields st-cols-2">
                        <label className="field st-span">
                            <span className="field-label">{t('studio.coupons.promo_code')}</span>
                            <span className="control">
                                <input
                                    id="couponCode"
                                    name="code"
                                    className="input mono st-upper"
                                    type="text"
                                    value={code}
                                    onChange={e => setCode(e.target.value.toUpperCase())}
                                    placeholder={t('studio.coupons.promo_placeholder')}
                                    autoComplete="off"
                                    autoCapitalize="characters"
                                    spellCheck={false}
                                    required
                                />
                            </span>
                        </label>
                        <label className="field">
                            <span className="field-label">{t('studio.coupons.discount_pct')}</span>
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
                            <span className="field-label">{t('studio.coupons.max_uses')} <em>{t('studio.listing.optional')}</em></span>
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
                                    placeholder={t('studio.coupons.unlimited')}
                                />
                            </span>
                        </label>
                        <label className="field st-span">
                            <span className="field-label">{t('studio.coupons.expiration_date')} <em>{t('studio.listing.optional')}</em></span>
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
                        <Plus /> {submitting ? t('studio.coupons.creating') : t('studio.coupons.create_btn')}
                    </button>
                </div>
            </form>

            <section className="stack">
                <h3 className="h2">{t('studio.coupons.active_title')}</h3>
                {loading ? (
                    <span className="row small"><span className="loading" />{t('studio.coupons.loading')}</span>
                ) : coupons.length === 0 ? (
                    <div className="blank">
                        <Tag size={28} className="pumpkin" />
                        <p className="small">{t('studio.coupons.empty')}</p>
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
                                                ? <span className="sticker sticker-sm">{t('studio.coupons.pct_off', { percent: c.discount_percent })}</span>
                                                : <span className="tag tag-danger">{t('studio.coupons.inactive')}</span>}
                                        </span>
                                        <span className="row small">
                                            <span className="row st-tight">
                                                <Users size={12} />{' '}
                                                {c.max_redemptions !== null
                                                    ? t('studio.coupons.uses_count', { used: c.used_redemptions, max: c.max_redemptions })
                                                    : t('studio.coupons.uses_unlimited', { used: c.used_redemptions })}
                                            </span>
                                            {c.expires_at && (
                                                <span className={`row st-tight${isExpired ? ' st-neg' : ''}`}>
                                                    <Clock size={12} /> {t('studio.coupons.expires_on', { date: new Date(c.expires_at).toLocaleDateString() })}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <button
                                        className="button button-danger button-sm button-icon"
                                        onClick={() => handleDelete(c.id)}
                                        title={t('studio.coupons.confirm_delete')}
                                        aria-label={t('studio.coupons.confirm_delete')}
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
