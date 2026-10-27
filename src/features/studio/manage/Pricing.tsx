import { Trans, useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, ExternalLink, Save, Zap, Lock, Percent, Tag, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';
import api from '../../../lib/api';
import { translateApiMessage } from '../../../lib/apiMessages';
import type { PluginData } from './ManagePluginPage';
import { useAuth } from '../../../app/auth';

type LicenseType = 'free' | 'paid';
type Props = { plugin: PluginData; onSaved: () => void };



const Pricing = ({ plugin, onSaved }: Props) => {
    const { t } = useTranslation();
    const PRICING_OPTIONS: { key: LicenseType; label: string; icon: React.ReactNode; desc: string }[] = [
        {
            key: 'free',
            label: t('developer.upload.price_free'),
            icon: <Zap size={18} />,
            desc: t('developer.pricing.free_desc'),
        },
        {
            key: 'paid',
            label: t('developer.upload.price_paid'),
            icon: <Lock size={18} />,
            desc: t('developer.pricing.paid_desc'),
        },
    ];
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
            const msg = translateApiMessage(t, err.response?.data?.error || err.response?.data?.message || (typeof err.response?.data === 'string' ? err.response.data : null), t('developer.pricing.save_failed'));
            setPricingError(msg);
        } finally {
            setSaving(false);
        }
    };

    const twoFaError = pricingError ? (pricingError.toLowerCase().includes('2fa') || pricingError.toLowerCase().includes('two-factor')) : false;

    return (
        <div className="st-tab">
            <header className="st-tab-head">
                <h2 className="h1">{t('developer.dashboard.pricing')}</h2>
                <p className="small">{t('developer.pricing.subtitle')}</p>
            </header>

            <form className="stack st-pr" onSubmit={handleSave}>
                <section className="panel">
                    <div className="panel-head">
                        <DollarSign size={16} className="pumpkin" />
                        <h3 className="h3">{t('developer.pricing.model')}</h3>
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
                                                <ExternalLink />{' '}{t('developer.pricing.unlock')}</button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {licenseType === 'paid' && !stripeConnected && (
                            <p className="status small">
                                <span className="mark-box mark-box-warning"><Lock /></span>{t('developer.pricing.payout_required')}</p>
                        )}
                    </div>
                </section>

                {licenseType === 'paid' && stripeConnected && (
                    <>
                        <section className="panel">
                            <div className="panel-head">
                                <DollarSign size={16} className="pumpkin" />
                                <h3 className="h3">{t('developer.pricing.base_price')}</h3>
                            </div>
                            <div className="panel-body st-grid-2">
                                <label className="field">
                                    <span className="field-label">{t('developer.pricing.price_eur')}</span>
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
                                        <span className="field-error"><AlertTriangle size={14} />{t('developer.pricing.minimum_price')}</span>
                                    )}
                                </label>

                                <dl className="specs">
                                    <dt>{t('developer.pricing.platform_fee')}</dt>
                                    <dd className="st-neg">-€{fmt(Math.round(priceCents * 0.30))}</dd>
                                    <dt>{t('developer.pricing.processing_fee')}</dt>
                                    <dd className="st-neg">-€{fmt(Math.ceil(priceCents * 0.015 + 25))}</dd>
                                    <dt className="label-fg">{t('developer.pricing.your_earnings')}</dt>
                                    <dd className={`st-pr-total ${baseEarnings > 0 ? 'st-pos' : 'st-neg'}`}>+€{fmt(baseEarnings)}</dd>
                                </dl>
                            </div>
                        </section>

                        <section className={`panel${isSaleActive ? ' panel-pumpkin' : ''}`}>
                            <div className="panel-head">
                                <Tag size={16} className="pumpkin" />
                                <h3 className="h3">{t('developer.pricing.sale')}</h3>
                                <span className="spacer" />
                                {isSaleActive && <span className="sticker sticker-sm">{t('developer.pricing.sale_live', { discount: discountPercent })}</span>}
                            </div>
                            <div className="panel-body st-grid-2">
                                <label className="field">
                                    <span className="field-label">{t('developer.pricing.discount')}</span>
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
                                    <span className="small">{t('developer.pricing.savings', { savings: savingsDisplay })}</span>
                                    <dl className="specs">
                                        <dt>{t('developer.pricing.your_earnings_at_sale_price')}</dt>
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
                                        {t('developer.pricing.start_sale', { discount: discountPercent })}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsSaleActive(false)}
                                        className="button button-danger"
                                    >{t('developer.pricing.end_sale')}</button>
                                )}
                            </div>
                        </section>

                        <section className="panel">
                            <div className="panel-head">
                                <Tag size={16} className="pumpkin" />
                                <h3 className="h3">{t('developer.pricing.pre_order_mode')}</h3>
                            </div>
                            <div className="panel-body stack">
                                <label className="st-switch">
                                    <span>{t('developer.pricing.accept_pre_orders')}<span className="small">{t('developer.pricing.preorder_desc')}</span>
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
                                        <span className="field-label"><Trans t={t} i18nKey="developer.pricing.expected_release_date" components={{ optional: <em /> }} /></span>
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
                                        <span className="field-hint">{t('developer.pricing.release_date_hint')}</span>
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
                            <strong>{twoFaError ? t('developer.dashboard.security_required') : t('developer.pricing.error_title')}</strong>
                            <span className="ledger-sub">{pricingError}</span>
                        </p>
                        {(twoFaError || !user?.totp_enabled) && (
                            <button
                                type="button"
                                className="button button-sm"
                                onClick={() => navigate('/settings?tab=security')}
                            >
                                <ShieldCheck />{' '}{t('developer.dashboard.enable_2fa')}</button>
                        )}
                    </div>
                )}

                {pricingSuccess && (
                    <div className="notice notice-success">
                        <span className="mark-box mark-box-success"><CheckCircle /></span>
                        <p className="notice-text"><strong>{t('developer.pricing.save_success')}</strong></p>
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
                        {saving ? t('common.saving') : t('developer.pricing.save_pricing')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Pricing;