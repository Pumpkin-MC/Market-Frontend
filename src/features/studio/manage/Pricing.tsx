import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, ExternalLink, Save, Zap, Lock, Percent, Tag, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';
import api from '../../../lib/api';
import type { PluginData } from './ManagePluginPage';
import { useAuth } from '../../../app/auth';

type LicenseType = 'free' | 'paid';
type Props = { plugin: PluginData; onSaved: () => void };

const PRICING_OPTIONS: { key: LicenseType; label: string; icon: React.ReactNode; desc: string }[] = [
    {
        key: 'free',
        label: 'Free',
        icon: <Zap size={18} />,
        desc: 'Anyone can install with no payment required. Maximises reach.',
    },
    {
        key: 'paid',
        label: 'Paid',
        icon: <Lock size={18} />,
        desc: 'One-time purchase. Requires a connected payout account.',
    },
];

const Pricing = ({ plugin, onSaved }: Props) => {
    const navigate = useNavigate();
    const { user }  = useAuth();
    const [saving, setSaving] = useState(false);
    const [pricingSuccess, setPricingSuccess] = useState(false);
    const [pricingError, setPricingError] = useState<string | null>(null);

    const [licenseType, setLicenseType]   = useState<LicenseType>(plugin.type === 'paid' ? 'paid' : 'free');
    const [price, setPrice]               = useState((plugin.price_cents ?? 0) / 100 || 4.99);
    const [isSaleActive, setIsSaleActive] = useState(plugin.sale_active ?? false);
    const [discountPercent, setDiscountPercent] = useState(plugin.sale_discount_percent || 20);
    const [isPreorder, setIsPreorder]     = useState(plugin.is_preorder ?? false);
    const [preorderReleaseDate, setPreorderReleaseDate] = useState(
        plugin.preorder_release_date ? plugin.preorder_release_date.split('T')[0] : ''
    );
    const [priceTooLow, setPriceTooLow]   = useState(false);

    const stripeConnected = user.stripe_ready;

    const priceCents        = Math.round(price * 100);
    const salePriceCents    = Math.round(priceCents * (1 - discountPercent / 100));
    const salePriceDisplay  = (salePriceCents / 100).toFixed(2);
    const savingsDisplay    = ((priceCents - salePriceCents) / 100).toFixed(2);

    const calcEarnings = (cents: number) => {
        const stripeCents   = Math.ceil(cents * 0.015 + 25);
        const platformCents = Math.round(cents * 0.30);
        return Math.max(0, cents - stripeCents - platformCents);
    };
    const baseEarnings = calcEarnings(priceCents);
    const saleEarnings = calcEarnings(salePriceCents);
    const fmt = (c: number) => (c / 100).toFixed(2);

    const handlePriceChange = (val: string) => {
        const n = parseFloat(val) || 0;
        setPrice(n);
        setPriceTooLow(n < 0.99);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (licenseType === 'paid' && !stripeConnected) return;
        if (licenseType === 'paid' && price < 0.99) { setPriceTooLow(true); return; }

        setSaving(true);
        const metadata = {
            type: licenseType,
            price: licenseType === 'paid' ? priceCents : 0,
            saleActive: licenseType === 'paid' ? isSaleActive : false,
            saleDiscountPercent: licenseType === 'paid' ? discountPercent : 0,
            isPreorder: licenseType === 'paid' ? isPreorder : false,
            preorderReleaseDate: licenseType === 'paid' && isPreorder && preorderReleaseDate ? new Date(preorderReleaseDate).toISOString() : undefined,
        };

        const fd = new FormData();
        fd.append('metadata', JSON.stringify(metadata));

        try {
            setPricingError(null);
            setPricingSuccess(false);
            await api.put(`/plugins/${plugin.id}`, fd);
            setPricingSuccess(true);
            onSaved();
            setTimeout(() => setPricingSuccess(false), 3000);
        } catch (err: any) {
            const msg = err.response?.data?.error || err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null) || 'Failed to save pricing.';
            setPricingError(msg);
        } finally {
            setSaving(false);
        }
    };

    const twoFaError = pricingError ? (pricingError.toLowerCase().includes('2fa') || pricingError.toLowerCase().includes('two-factor')) : false;

    return (
        <div className="st-tab">
            <header className="st-tab-head">
                <h2 className="h1">Pricing</h2>
                <p className="small">Manage your plugin's price and run manual sales.</p>
            </header>

            <form className="stack st-pr" onSubmit={handleSave}>
                <section className="panel">
                    <div className="panel-head">
                        <DollarSign size={16} className="pumpkin" />
                        <h3 className="h3">Pricing Model</h3>
                    </div>
                    <div className="panel-body stack">
                        <div className="st-pick">
                            {PRICING_OPTIONS.map(opt => {
                                const isLocked = opt.key === 'paid' && !stripeConnected;
                                return (
                                    <div key={opt.key} className="st-pr-option">
                                        <button
                                            type="button"
                                            className="st-option"
                                            aria-pressed={licenseType === opt.key}
                                            aria-disabled={isLocked || undefined}
                                            onClick={() => !isLocked && setLicenseType(opt.key)}
                                        >
                                            {opt.icon}
                                            <strong>{opt.label}</strong>
                                            <span className="small">{opt.desc}</span>
                                        </button>
                                        {isLocked && (
                                            <button
                                                type="button"
                                                className="button button-primary button-sm st-pr-unlock"
                                                onClick={() => navigate('/settings?tab=developer')}
                                            >
                                                <ExternalLink /> Unlock
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {licenseType === 'paid' && !stripeConnected && (
                            <p className="status small">
                                <span className="mark-box mark-box-warning"><Lock /></span>
                                Connect your payout account before configuring paid pricing.
                            </p>
                        )}
                    </div>
                </section>

                {licenseType === 'paid' && stripeConnected && (
                    <>
                        <section className="panel">
                            <div className="panel-head">
                                <DollarSign size={16} className="pumpkin" />
                                <h3 className="h3">Base Price</h3>
                            </div>
                            <div className="panel-body st-grid-2">
                                <label className="field">
                                    <span className="field-label">Price (EUR)</span>
                                    <span className="control st-narrow">
                                        <span className="affix">€</span>
                                        <input
                                            id="pluginPriceInput"
                                            name="price"
                                            className="input num"
                                            type="number"
                                            step="0.01"
                                            min="0.99"
                                            inputMode="decimal"
                                            autoComplete="off"
                                            value={price}
                                            aria-invalid={priceTooLow || undefined}
                                            onChange={e => handlePriceChange(e.target.value)}
                                        />
                                    </span>
                                    {priceTooLow && (
                                        <span className="field-error"><AlertTriangle size={14} />Minimum price is €0.99.</span>
                                    )}
                                </label>

                                <dl className="specs">
                                    <dt>Platform fee (30%)</dt>
                                    <dd className="st-neg">-€{fmt(Math.round(priceCents * 0.30))}</dd>
                                    <dt>Payment processing fee (1.5% + €0.25)</dt>
                                    <dd className="st-neg">-€{fmt(Math.ceil(priceCents * 0.015 + 25))}</dd>
                                    <dt className="label-fg">Your earnings</dt>
                                    <dd className={`st-pr-total ${baseEarnings > 0 ? 'st-pos' : 'st-neg'}`}>+€{fmt(baseEarnings)}</dd>
                                </dl>
                            </div>
                        </section>

                        <section className={`panel${isSaleActive ? ' panel-pumpkin' : ''}`}>
                            <div className="panel-head">
                                <Tag size={16} className="pumpkin" />
                                <h3 className="h3">Sale</h3>
                                <span className="spacer" />
                                {isSaleActive && <span className="sticker sticker-sm">Sale is live — {discountPercent}% off</span>}
                            </div>
                            <div className="panel-body st-grid-2">
                                <label className="field">
                                    <span className="field-label">Discount</span>
                                    <span className="control st-narrow">
                                        <input
                                            id="pluginDiscountPercent"
                                            name="discountPercent"
                                            className="input num"
                                            type="number"
                                            min="1"
                                            max="99"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            value={discountPercent}
                                            onChange={e => setDiscountPercent(Math.min(99, Math.max(1, parseInt(e.target.value) || 0)))}
                                        />
                                        <span className="affix">%</span>
                                    </span>
                                </label>

                                <div className="stack st-tight">
                                    <span className="row st-tight">
                                        <span className="cost cost-sale cost-lg"><s>€{price.toFixed(2)}</s>€{salePriceDisplay}</span>
                                        <span className="sticker sticker-sm">-{discountPercent}%</span>
                                    </span>
                                    <span className="small">Save €{savingsDisplay}</span>
                                    <dl className="specs">
                                        <dt>Your earnings at sale price</dt>
                                        <dd className={saleEarnings > 0 ? 'st-pos' : 'st-neg'}>+€{fmt(saleEarnings)}</dd>
                                    </dl>
                                </div>
                            </div>
                            <div className="panel-foot">
                                {!isSaleActive ? (
                                    <button
                                        type="button"
                                        className="button button-primary"
                                        onClick={() => setIsSaleActive(true)}
                                    >
                                        <Percent />
                                        Start Sale at -{discountPercent}%
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsSaleActive(false)}
                                        className="button button-danger"
                                    >
                                        End Sale
                                    </button>
                                )}
                            </div>
                        </section>

                        <section className="panel">
                            <div className="panel-head">
                                <Tag size={16} className="pumpkin" />
                                <h3 className="h3">Pre-Order Mode</h3>
                            </div>
                            <div className="panel-body stack">
                                <label className="st-switch">
                                    <span>
                                        Accept Pre-Orders
                                        <span className="small">
                                            Mark this plugin as available for pre-order. When you publish the first release or disable pre-order, all pre-order buyers will be emailed automatically.
                                        </span>
                                    </span>
                                    <input
                                        id="pricingIsPreorder"
                                        name="isPreorder"
                                        type="checkbox"
                                        role="switch"
                                        className="toggle"
                                        checked={isPreorder}
                                        onChange={e => setIsPreorder(e.target.checked)}
                                    />
                                </label>

                                {isPreorder && (
                                    <label className="field">
                                        <span className="field-label">Expected Release Date <em>(Optional)</em></span>
                                        <span className="control st-narrow">
                                            <input
                                                id="pricingPreorderReleaseDate"
                                                name="preorderReleaseDate"
                                                type="date"
                                                className="input"
                                                autoComplete="off"
                                                value={preorderReleaseDate}
                                                onChange={e => setPreorderReleaseDate(e.target.value)}
                                            />
                                        </span>
                                        <span className="field-hint">Displayed on the store page so buyers know when to expect the release.</span>
                                    </label>
                                )}
                            </div>
                        </section>
                    </>
                )}

                {pricingError && (
                    <div className="notice notice-danger">
                        <span className="mark-box mark-box-danger"><Lock /></span>
                        <p className="notice-text">
                            <strong>{twoFaError ? 'Two-Factor Authentication Required' : 'Pricing Error'}</strong>
                            <span className="ledger-sub">{pricingError}</span>
                        </p>
                        {(twoFaError || !user?.totp_enabled) && (
                            <button
                                type="button"
                                className="button button-sm"
                                onClick={() => navigate('/settings?tab=security')}
                            >
                                <ShieldCheck /> Enable 2FA →
                            </button>
                        )}
                    </div>
                )}

                {pricingSuccess && (
                    <div className="notice notice-success">
                        <span className="mark-box mark-box-success"><CheckCircle /></span>
                        <p className="notice-text"><strong>Pricing settings saved successfully!</strong></p>
                    </div>
                )}

                <div className="row">
                    <span className="spacer" />
                    <button
                        type="submit"
                        className="button button-primary"
                        disabled={saving || (licenseType === 'paid' && !stripeConnected) || priceTooLow}
                        aria-busy={saving}
                    >
                        <Save />
                        {saving ? 'Saving…' : 'Save Pricing'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Pricing;