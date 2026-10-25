import React, { useState, useEffect } from 'react';
import { Check, CircleAlert, Rocket, X } from 'lucide-react';
import api from '../../../lib/api';
import { useTranslation } from 'react-i18next';
import '../../../styles/studio.css';

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

    const checks = readiness ? [
        { ready: readiness.nameReady, title: 'Plugin Name & Identity', ok: pluginName, missing: 'Plugin name is missing or empty', tab: 'listing', fix: 'Fix in Listing' },
        { ready: readiness.categoryReady, title: 'Category', ok: 'Valid category selected', missing: 'No category selected', tab: 'listing', fix: 'Fix in Listing' },
        { ready: readiness.descriptionReady, title: 'Store Description', ok: 'Description provided in at least 1 language', missing: 'Missing store description', tab: 'listing', fix: 'Fix in Listing' },
        { ready: readiness.previewReady, title: 'Store Icon / Avatar', ok: 'Icon uploaded', missing: 'Store icon image is required', tab: 'listing', fix: 'Upload Icon' },
        { ready: readiness.binaryReady, title: 'WebAssembly Binary (.wasm)', ok: `Valid binary uploaded (${readiness.binaryVersion ? `v${readiness.binaryVersion}` : 'Ready'})`, missing: 'No .wasm binary uploaded yet', tab: 'update', fix: 'Upload Binary' },
        { ready: readiness.pricingReady, title: 'Pricing & Payouts', ok: 'Valid pricing configuration', missing: 'Paid plugin requires price > 0 and connected payout account', tab: 'pricing', fix: 'Configure Price' },
        { ready: readiness.securityReady, title: 'Account Security', ok: '2FA or Passkey verified', missing: '2FA or Passkey required in user settings' },
    ] : [];

    return (
        <div className="overlay" onClick={onClose}>
            <div className="sheet st-sheet" role="dialog" aria-modal="true" aria-labelledby="st-ready-title" onClick={e => e.stopPropagation()}>
                <div className="sheet-head">
                    <div className="stack st-ready-head">
                        <span className="sticker sticker-sm">Publish</span>
                        <h3 className="h1" id="st-ready-title">{t('developer.dashboard.publish_checklist_title', 'Publish to Marketplace')}</h3>
                        <p className="small">{t('developer.dashboard.publish_checklist_desc', 'Review requirements before releasing your plugin to the Pumpkin Market.')}</p>
                    </div>
                    <button className="button button-ghost button-icon" onClick={onClose} aria-label="Close"><X /></button>
                </div>

                <div className="sheet-body">
                    {error && (
                        <div className="notice notice-danger">
                            <span className="sticker sticker-sm sticker-danger">Error</span>
                            <p className="notice-text">{error}</p>
                        </div>
                    )}

                    {successMsg && (
                        <div className="notice notice-success">
                            <span className="sticker sticker-sm sticker-success">Live</span>
                            <p className="notice-text"><strong>{successMsg}</strong></p>
                        </div>
                    )}

                    {loading ? (
                        <div className="row small"><span className="loading" />Checking store requirements…</div>
                    ) : readiness ? (
                        <>
                            {readiness.canPublish ? (
                                <div className="notice notice-success">
                                    <span className="sticker sticker-sm sticker-success">Ready</span>
                                    <p className="notice-text">
                                        <strong>{t('developer.dashboard.publish_ready_banner', 'All requirements are met! Your plugin is ready to go live.')}</strong>{' '}
                                        Your store page, assets, and WebAssembly binary are all validated.
                                    </p>
                                </div>
                            ) : (
                                <div className="notice notice-warning">
                                    <span className="sticker sticker-sm sticker-warning">Missing</span>
                                    <p className="notice-text">
                                        <strong>{t('developer.dashboard.publish_missing_banner', 'Please complete the missing requirements before publishing.')}</strong>{' '}
                                        {readiness.missingRequirements.length} item(s) need attention before release.
                                    </p>
                                </div>
                            )}

                            <ul className="st-ready-list">
                                {checks.map(c => (
                                    <li key={c.title}>
                                        <span className={`mark-box ${c.ready ? 'mark-box-success' : 'mark-box-danger'}`}>{c.ready ? <Check /> : <X />}</span>
                                        <span className="st-ready-info">
                                            <strong>{c.title}</strong>
                                            <span className="small">{c.ready ? c.ok : c.missing}</span>
                                        </span>
                                        {!c.ready && c.tab && (
                                            <button className="button button-sm button-flat" onClick={() => { onNavigateTab(c.tab); onClose(); }}>
                                                <CircleAlert />{c.fix}
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : null}
                </div>

                <div className="sheet-foot">
                    <button className="button button-ghost" onClick={onClose}>Close</button>
                    <button
                        className="button button-primary"
                        disabled={!readiness?.canPublish || publishing || Boolean(successMsg)}
                        aria-busy={publishing}
                        onClick={handlePublish}
                    >
                        <Rocket />
                        {publishing ? 'Publishing…' : t('developer.dashboard.btn_confirm_publish', 'Confirm & Release to Store')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PublishReadinessModal;
