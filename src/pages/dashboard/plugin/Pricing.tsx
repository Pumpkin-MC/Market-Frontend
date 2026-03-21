import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, ExternalLink, Save, Zap, Lock, Percent, Tag, AlertTriangle } from 'lucide-react';
import api from '../../../api';
import type { PluginData } from './ManagePlugin';
import { useAuth } from '../../../App';

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
        desc: 'One-time purchase via Stripe. Requires a connected Stripe account.',
    },
];

const Pricing = ({ plugin, onSaved }: Props) => {
    const navigate = useNavigate();
    const { user }  = useAuth();
    const [saving, setSaving] = useState(false);

    const [licenseType, setLicenseType]   = useState<LicenseType>(plugin.type === 'paid' ? 'paid' : 'free');
    const [price, setPrice]               = useState((plugin.price_cents ?? 0) / 100 || 4.99);
    const [isSaleActive, setIsSaleActive] = useState(plugin.sale_active ?? false);
    const [discountPercent, setDiscountPercent] = useState(plugin.sale_discount_percent || 20);
    const [priceTooLow, setPriceTooLow]   = useState(false);

    const stripeConnected = user.stripe_ready;

    // Derived — all math in integer cents to avoid float errors
    const priceCents        = Math.round(price * 100);
    const salePriceCents    = Math.round(priceCents * (1 - discountPercent / 100));
    const salePriceDisplay  = (salePriceCents / 100).toFixed(2);
    const savingsDisplay    = ((priceCents - salePriceCents) / 100).toFixed(2);

    // Stripe fee: 1.5% + €0.25, platform: 30%
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
        const fd = new FormData();
        fd.append('type', licenseType);
        fd.append('price', (licenseType === 'paid' ? priceCents : 0).toString());

        if (licenseType === 'paid') {
            fd.append('sale_active',           isSaleActive.toString());
            fd.append('sale_discount_percent', discountPercent.toString());
        }

        try {
            await api.put(`/plugins/${plugin.id}`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onSaved();
        } catch {
            alert('Failed to save pricing.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className="mp-tab-header">
                <h2>Pricing</h2>
                <p>Manage your plugin's price and run manual sales.</p>
            </div>

            <form onSubmit={handleSave}>
                {/* ── Model selector ── */}
                <div className="mp-card">
                    <div className="mp-card-title">
                        <DollarSign size={14} />Pricing Model
                    </div>
                    <div className="mp-pricing-options">
                        {PRICING_OPTIONS.map(opt => {
                            const isLocked = opt.key === 'paid' && !stripeConnected;
                            return (
                                <div key={opt.key} style={{ position: 'relative' }}>
                                    <button
                                        type="button"
                                        className={`mp-pricing-card ${licenseType === opt.key ? 'selected' : ''}`}
                                        onClick={() => !isLocked && setLicenseType(opt.key)}
                                        style={{ width: '100%', height: '100%', opacity: isLocked ? 0.6 : 1, cursor: isLocked ? 'default' : 'pointer' }}
                                    >
                                        <div style={{ color: licenseType === opt.key ? 'var(--mp-accent)' : 'var(--mp-text-2)', marginBottom: '0.5rem' }}>
                                            {opt.icon}
                                        </div>
                                        <div className="mp-pricing-card-name">{opt.label}</div>
                                        <div className="mp-pricing-card-desc">{opt.desc}</div>
                                    </button>

                                    {isLocked && (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,15,18,0.1)', backdropFilter: 'blur(1px)', borderRadius: 'var(--mp-radius)' }}>
                                            <button
                                                type="button"
                                                className="mp-btn mp-btn-primary"
                                                style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
                                                onClick={() => navigate('/settings?tab=payouts')}
                                            >
                                                <ExternalLink size={12} /> Unlock
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {licenseType === 'paid' && !stripeConnected && (
                    <div className="mp-banner warn">
                        <Lock size={16} style={{ flexShrink: 0 }} />
                        <span>Connect your Stripe account before configuring paid pricing.</span>
                    </div>
                )}

                {licenseType === 'paid' && stripeConnected && (
                    <>
                        {/* ── Base Price ── */}
                        <div className="mp-card">
                            <div className="mp-card-title"><DollarSign size={14} />Base Price</div>

                            {priceTooLow && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem', padding: '0.45rem 0.65rem', background: 'rgba(255,77,79,0.1)', border: '1px solid rgba(255,77,79,0.35)', borderRadius: 6, fontSize: '0.75rem', color: 'var(--mp-error, #ff4d4f)' }}>
                                    <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                                    Minimum price is €0.99.
                                </div>
                            )}

                            <div className="mp-form-group" style={{ marginBottom: 0 }}>
                                <label className="mp-label">Price (EUR)</label>
                                <div style={{ position: 'relative', maxWidth: 180 }}>
                                    <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: priceTooLow ? 'var(--mp-error, #ff4d4f)' : 'var(--mp-text-3)', fontSize: '0.85rem' }}>€</span>
                                    <input
                                        className="mp-input"
                                        type="number"
                                        step="0.01"
                                        min="0.99"
                                        value={price}
                                        onChange={e => handlePriceChange(e.target.value)}
                                        style={{ paddingLeft: '1.6rem', borderColor: priceTooLow ? 'var(--mp-error, #ff4d4f)' : undefined }}
                                    />
                                </div>
                            </div>

                            {/* Earnings breakdown */}
                            <div style={{ marginTop: '0.85rem', padding: '0.75rem', background: 'var(--mp-bg-2)', borderRadius: 8, border: '1px solid var(--mp-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                                    <span style={{ color: 'var(--mp-text-3)' }}>Platform fee (30%)</span>
                                    <span style={{ color: 'var(--mp-red)' }}>-€{fmt(Math.round(priceCents * 0.30))}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--mp-border)' }}>
                                    <span style={{ color: 'var(--mp-text-3)' }}>Stripe fee (1.5% + €0.25)</span>
                                    <span style={{ color: 'var(--mp-red)' }}>-€{fmt(Math.ceil(priceCents * 0.015 + 25))}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600 }}>
                                    <span style={{ color: 'var(--mp-text-1)' }}>Your earnings</span>
                                    <span style={{ color: baseEarnings > 0 ? 'var(--mp-green)' : 'var(--mp-error)' }}>+€{fmt(baseEarnings)}</span>
                                </div>
                            </div>
                        </div>

                        {/* ── Sale ── */}
                        <div className="mp-card">
                            <div className="mp-card-title"><Tag size={14} />Sale</div>

                            {/* Discount % — always visible when paid */}
                            <div className="mp-form-group">
                                <label className="mp-label">Discount</label>
                                <div style={{ position: 'relative', maxWidth: 180 }}>
                                    <input
                                        className="mp-input"
                                        type="number"
                                        min="1"
                                        max="99"
                                        value={discountPercent}
                                        onChange={e => setDiscountPercent(Math.min(99, Math.max(1, parseInt(e.target.value) || 0)))}
                                        style={{ paddingRight: '2.2rem' }}
                                    />
                                    <span style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--mp-text-3)', fontSize: '0.85rem' }}>%</span>
                                </div>
                            </div>

                            {/* Sale price preview — always shown */}
                            <div style={{
                                padding: '0.85rem 1rem',
                                background: isSaleActive ? 'rgba(255,107,107,0.06)' : 'rgba(79,126,255,0.06)',
                                border: `1px solid ${isSaleActive ? 'rgba(255,107,107,0.25)' : 'rgba(79,126,255,0.2)'}`,
                                borderRadius: 8,
                                marginBottom: '1rem',
                                transition: 'background 0.2s, border-color 0.2s',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--mp-text-3)', textDecoration: 'line-through', fontFamily: 'var(--font-mono)' }}>€{price.toFixed(2)}</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: isSaleActive ? '#ff6b6b' : 'var(--mp-accent)', fontFamily: 'var(--font-mono)' }}>€{salePriceDisplay}</span>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, background: isSaleActive ? 'rgba(255,107,107,0.15)' : 'rgba(79,126,255,0.15)', color: isSaleActive ? '#ff6b6b' : 'var(--mp-accent)', border: `1px solid ${isSaleActive ? 'rgba(255,107,107,0.3)' : 'rgba(79,126,255,0.3)'}`, borderRadius: 4, padding: '1px 6px' }}>
                                            -{discountPercent}%
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--mp-text-3)' }}>Save €{savingsDisplay}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', paddingTop: '0.5rem', borderTop: '1px solid var(--mp-border)' }}>
                                    <span style={{ color: 'var(--mp-text-3)' }}>Your earnings at sale price</span>
                                    <span style={{ color: saleEarnings > 0 ? 'var(--mp-green)' : 'var(--mp-error)', fontWeight: 600 }}>+€{fmt(saleEarnings)}</span>
                                </div>
                            </div>

                            {/* Activate / End toggle */}
                            {!isSaleActive ? (
                                <button
                                    type="button"
                                    className="mp-btn mp-btn-outline"
                                    onClick={() => setIsSaleActive(true)}
                                    style={{ borderStyle: 'dashed', width: '100%', justifyContent: 'center', padding: '1rem', gap: '0.5rem' }}
                                >
                                    <Percent size={15} />
                                    Start Sale at -{discountPercent}%
                                </button>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', fontWeight: 700, color: '#ff6b6b' }}>
                                        🔥 Sale is live — {discountPercent}% off
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsSaleActive(false)}
                                        className="mp-btn mp-btn-outline"
                                        style={{ fontSize: '0.72rem', color: 'var(--mp-error, #ff4d4f)', borderColor: 'rgba(255,77,79,0.3)', padding: '0.3rem 0.75rem' }}
                                    >
                                        End Sale
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                    <button
                        type="submit"
                        className="mp-btn mp-btn-primary"
                        disabled={saving || (licenseType === 'paid' && !stripeConnected) || priceTooLow}
                    >
                        <Save size={15} />
                        {saving ? 'Saving…' : 'Save Pricing'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Pricing;