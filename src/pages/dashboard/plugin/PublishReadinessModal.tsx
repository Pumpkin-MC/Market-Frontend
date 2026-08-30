import React, { useState, useEffect } from 'react';
import {
    CheckCircle2, XCircle, AlertTriangle, Rocket, X, RefreshCw
} from 'lucide-react';
import api from '../../../api';
import { useTranslation } from 'react-i18next';
import './PublishReadinessModal.css';

export interface PublishReadiness {
    nameReady: boolean;
    categoryReady: boolean;
    descriptionReady: boolean;
    previewReady: boolean;
    screenshotsReady: boolean;
    screenshotsCount: number;
    binaryReady: boolean;
    binaryVersion: string | null;
    pricingReady: boolean;
    securityReady: boolean;
    canPublish: boolean;
    missingRequirements: string[];
}

interface Props {
    isOpen: boolean;
    pluginId: number;
    pluginName: string;
    isPublished?: boolean;
    onClose: () => void;
    onPublished: () => void;
    onNavigateTab: (tabKey: string) => void;
}

export const PublishReadinessModal: React.FC<Props> = ({
    isOpen,
    pluginId,
    pluginName,
    onClose,
    onPublished,
    onNavigateTab,
}) => {
    const { t } = useTranslation();
    const [readiness, setReadiness] = useState<PublishReadiness | null>(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchReadiness();
        }
    }, [isOpen, pluginId]);

    const fetchReadiness = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get<PublishReadiness>(`/plugins/${pluginId}/readiness`);
            setReadiness(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to check publish readiness');
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        setPublishing(true);
        setError(null);
        try {
            await api.post(`/plugins/${pluginId}/publish`);
            setSuccessMsg('Plugin published successfully and is now live!');
            onPublished();
            setTimeout(() => {
                onClose();
            }, 1800);
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.message || 'Failed to publish plugin');
        } finally {
            setPublishing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="prm-overlay" onClick={onClose}>
            <div className="prm-container" onClick={e => e.stopPropagation()}>
                <button className="prm-close-btn" onClick={onClose} aria-label="Close">
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="prm-header">
                    <div className="prm-header-icon">
                        <Rocket size={22} color="#f97316" />
                    </div>
                    <div>
                        <h3 className="prm-title">{t('developer.dashboard.publish_checklist_title', 'Publish to Marketplace')}</h3>
                        <p className="prm-subtitle">
                            {t('developer.dashboard.publish_checklist_desc', 'Review requirements before releasing your plugin to the Pumpkin Market.')}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="prm-alert prm-alert-error">
                        <AlertTriangle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {successMsg && (
                    <div className="prm-alert prm-alert-success">
                        <CheckCircle2 size={16} />
                        <span>{successMsg}</span>
                    </div>
                )}

                {loading ? (
                    <div className="prm-loading">
                        <RefreshCw size={24} className="prm-spin" />
                        <span>Checking store requirements…</span>
                    </div>
                ) : readiness ? (
                    <div className="prm-body">
                        {/* Overall status banner */}
                        {readiness.canPublish ? (
                            <div className="prm-status-banner prm-status-banner-ready">
                                <CheckCircle2 size={20} color="#10b981" />
                                <div>
                                    <h4>{t('developer.dashboard.publish_ready_banner', 'All requirements are met! Your plugin is ready to go live.')}</h4>
                                    <p>Your store page, assets, and WebAssembly binary are all validated.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="prm-status-banner prm-status-banner-missing">
                                <AlertTriangle size={20} color="#f59e0b" />
                                <div>
                                    <h4>{t('developer.dashboard.publish_missing_banner', 'Please complete the missing requirements before publishing.')}</h4>
                                    <p>{readiness.missingRequirements.length} item(s) need attention before release.</p>
                                </div>
                            </div>
                        )}

                        {/* Checklist items */}
                        <div className="prm-checklist">
                            {/* 1. Name */}
                            <div className={`prm-check-row ${readiness.nameReady ? 'ready' : 'missing'}`}>
                                <div className="prm-check-status">
                                    {readiness.nameReady ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
                                </div>
                                <div className="prm-check-info">
                                    <div className="prm-check-title">Plugin Name & Identity</div>
                                    <div className="prm-check-desc">{readiness.nameReady ? pluginName : 'Plugin name is missing or empty'}</div>
                                </div>
                                {!readiness.nameReady && (
                                    <button className="prm-fix-btn" onClick={() => { onNavigateTab('listing'); onClose(); }}>
                                        Fix in Listing
                                    </button>
                                )}
                            </div>

                            {/* 2. Category */}
                            <div className={`prm-check-row ${readiness.categoryReady ? 'ready' : 'missing'}`}>
                                <div className="prm-check-status">
                                    {readiness.categoryReady ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
                                </div>
                                <div className="prm-check-info">
                                    <div className="prm-check-title">Category</div>
                                    <div className="prm-check-desc">{readiness.categoryReady ? 'Valid category selected' : 'No category selected'}</div>
                                </div>
                                {!readiness.categoryReady && (
                                    <button className="prm-fix-btn" onClick={() => { onNavigateTab('listing'); onClose(); }}>
                                        Fix in Listing
                                    </button>
                                )}
                            </div>

                            {/* 3. Description */}
                            <div className={`prm-check-row ${readiness.descriptionReady ? 'ready' : 'missing'}`}>
                                <div className="prm-check-status">
                                    {readiness.descriptionReady ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
                                </div>
                                <div className="prm-check-info">
                                    <div className="prm-check-title">Store Description</div>
                                    <div className="prm-check-desc">{readiness.descriptionReady ? 'Description provided in at least 1 language' : 'Missing store description'}</div>
                                </div>
                                {!readiness.descriptionReady && (
                                    <button className="prm-fix-btn" onClick={() => { onNavigateTab('listing'); onClose(); }}>
                                        Fix in Listing
                                    </button>
                                )}
                            </div>

                            {/* 4. Preview Icon */}
                            <div className={`prm-check-row ${readiness.previewReady ? 'ready' : 'missing'}`}>
                                <div className="prm-check-status">
                                    {readiness.previewReady ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
                                </div>
                                <div className="prm-check-info">
                                    <div className="prm-check-title">Store Icon / Avatar</div>
                                    <div className="prm-check-desc">{readiness.previewReady ? 'Icon uploaded' : 'Store icon image is required'}</div>
                                </div>
                                {!readiness.previewReady && (
                                    <button className="prm-fix-btn" onClick={() => { onNavigateTab('listing'); onClose(); }}>
                                        Upload Icon
                                    </button>
                                )}
                            </div>

                            {/* 5. Screenshots */}
                            <div className={`prm-check-row ${readiness.screenshotsReady ? 'ready' : 'missing'}`}>
                                <div className="prm-check-status">
                                    {readiness.screenshotsReady ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
                                </div>
                                <div className="prm-check-info">
                                    <div className="prm-check-title">Screenshots</div>
                                    <div className="prm-check-desc">{readiness.screenshotsReady ? `${readiness.screenshotsCount} screenshot(s) uploaded` : 'At least 1 screenshot is required'}</div>
                                </div>
                                {!readiness.screenshotsReady && (
                                    <button className="prm-fix-btn" onClick={() => { onNavigateTab('listing'); onClose(); }}>
                                        Add Screenshots
                                    </button>
                                )}
                            </div>

                            {/* 6. Binary */}
                            <div className={`prm-check-row ${readiness.binaryReady ? 'ready' : 'missing'}`}>
                                <div className="prm-check-status">
                                    {readiness.binaryReady ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
                                </div>
                                <div className="prm-check-info">
                                    <div className="prm-check-title">WebAssembly Binary (.wasm)</div>
                                    <div className="prm-check-desc">{readiness.binaryReady ? `Valid binary uploaded (${readiness.binaryVersion ? `v${readiness.binaryVersion}` : 'Ready'})` : 'No .wasm binary uploaded yet'}</div>
                                </div>
                                {!readiness.binaryReady && (
                                    <button className="prm-fix-btn" onClick={() => { onNavigateTab('update'); onClose(); }}>
                                        Upload Binary
                                    </button>
                                )}
                            </div>

                            {/* 7. Pricing */}
                            <div className={`prm-check-row ${readiness.pricingReady ? 'ready' : 'missing'}`}>
                                <div className="prm-check-status">
                                    {readiness.pricingReady ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
                                </div>
                                <div className="prm-check-info">
                                    <div className="prm-check-title">Pricing & Payouts</div>
                                    <div className="prm-check-desc">{readiness.pricingReady ? 'Valid pricing configuration' : 'Paid plugin requires price > 0 and connected Stripe account'}</div>
                                </div>
                                {!readiness.pricingReady && (
                                    <button className="prm-fix-btn" onClick={() => { onNavigateTab('pricing'); onClose(); }}>
                                        Configure Price
                                    </button>
                                )}
                            </div>

                            {/* 8. Security */}
                            <div className={`prm-check-row ${readiness.securityReady ? 'ready' : 'missing'}`}>
                                <div className="prm-check-status">
                                    {readiness.securityReady ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="#ef4444" />}
                                </div>
                                <div className="prm-check-info">
                                    <div className="prm-check-title">Account Security</div>
                                    <div className="prm-check-desc">{readiness.securityReady ? '2FA or Passkey verified' : '2FA or Passkey required in user settings'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Footer Actions */}
                <div className="prm-footer">
                    <button className="prm-btn prm-btn-secondary" onClick={onClose}>
                        Close
                    </button>
                    <button
                        className="prm-btn prm-btn-primary"
                        disabled={!readiness?.canPublish || publishing || Boolean(successMsg)}
                        onClick={handlePublish}
                    >
                        <Rocket size={16} />
                        {publishing ? 'Publishing…' : t('developer.dashboard.btn_confirm_publish', 'Confirm & Release to Store')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PublishReadinessModal;
