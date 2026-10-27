import React, { useState, useEffect } from 'react';
import { Check, CircleAlert, Rocket, X } from 'lucide-react';
import api from '../../../lib/api';
import { translateApiMessage } from '../../../lib/apiMessages';
import { useTranslation } from 'react-i18next';
import '../../../styles/studio.css';
import { useDialog } from '../../../hooks/useDialog';

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
    const dialog = useDialog<HTMLDivElement>(isOpen, onClose);

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
            setError(translateApiMessage(t, err.response?.data?.error, t('developer.dashboard.readiness.check_failed')));
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        setPublishing(true);
        setError(null);
        try {
            await api.post(`/plugins/${pluginId}/publish`);
            setSuccessMsg(t('developer.dashboard.readiness.publish_success'));
            onPublished();
            setTimeout(() => {
                onClose();
            }, 1800);
        } catch (err: any) {
            setError(translateApiMessage(t, err.response?.data?.error || err.response?.data?.message, t('developer.dashboard.readiness.publish_failed')));
        } finally {
            setPublishing(false);
        }
    };

    if (!isOpen) return null;

    const checks = readiness ? [
        { ready: readiness.nameReady, title: t('developer.dashboard.readiness.name_title'), ok: pluginName, missing: t('developer.dashboard.readiness.name_missing'), tab: 'listing', fix: t('developer.dashboard.readiness.fix_in_listing') },
        { ready: readiness.categoryReady, title: t('plugin.category'), ok: t('developer.dashboard.readiness.category_ready'), missing: t('developer.dashboard.readiness.category_missing'), tab: 'listing', fix: t('developer.dashboard.readiness.fix_in_listing') },
        { ready: readiness.descriptionReady, title: t('developer.dashboard.readiness.store_description'), ok: t('developer.dashboard.readiness.description_ready'), missing: t('developer.dashboard.readiness.description_missing'), tab: 'listing', fix: t('developer.dashboard.readiness.fix_in_listing') },
        { ready: readiness.previewReady, title: t('developer.dashboard.readiness.icon_title'), ok: t('developer.dashboard.readiness.icon_uploaded'), missing: t('developer.dashboard.readiness.icon_missing'), tab: 'listing', fix: t('developer.dashboard.readiness.upload_icon') },
        { ready: readiness.binaryReady, title: t('developer.dashboard.readiness.binary_title'), ok: t('developer.dashboard.readiness.binary_ready', { version: readiness.binaryVersion ? `v${readiness.binaryVersion}` : t('developer.dashboard.readiness.ready') }), missing: t('developer.dashboard.readiness.binary_missing'), tab: 'update', fix: t('developer.dashboard.readiness.upload_binary') },
        { ready: readiness.pricingReady, title: t('developer.dashboard.readiness.pricing_payouts'), ok: t('developer.dashboard.readiness.pricing_ready'), missing: t('developer.dashboard.readiness.pricing_missing'), tab: 'pricing', fix: t('developer.dashboard.readiness.configure_price') },
        { ready: readiness.securityReady, title: t('profile.security.title'), ok: t('developer.dashboard.readiness.security_ready'), missing: t('developer.dashboard.readiness.security_missing') },
    ] : [];

    return (
        <div className="overlay" onClick={onClose}>
            <div ref={dialog} tabIndex={-1} className="sheet st-sheet" role="dialog" aria-modal="true" aria-labelledby="st-ready-title" onClick={e => e.stopPropagation()}>
                <div className="sheet-head">
                    <div className="stack st-ready-head">
                        <span className="sticker sticker-sm">{t('nav.publish')}</span>
                        <h3 className="h1" id="st-ready-title">{t('developer.dashboard.publish_checklist_title', 'Publish to Marketplace')}</h3>
                        <p className="small">{t('developer.dashboard.publish_checklist_desc', 'Review requirements before releasing your plugin to the Pumpkin Market.')}</p>
                    </div>
                    <button className="button button-ghost button-icon" onClick={onClose} aria-label={t('common.close')}><X /></button>
                </div>

                <div className="sheet-body">
                    {error && (
                        <div className="notice notice-danger">
                            <span className="sticker sticker-sm sticker-danger">{t('developer.dashboard.readiness.error')}</span>
                            <p className="notice-text">{error}</p>
                        </div>
                    )}

                    {successMsg && (
                        <div className="notice notice-success">
                            <span className="sticker sticker-sm sticker-success">{t('developer.dashboard.readiness.live')}</span>
                            <p className="notice-text"><strong>{successMsg}</strong></p>
                        </div>
                    )}

                    {loading ? (
                        <div className="row small"><span className="loading" />{t('developer.dashboard.readiness.checking')}</div>
                    ) : readiness ? (
                        <>
                            {readiness.canPublish ? (
                                <div className="notice notice-success">
                                    <span className="sticker sticker-sm sticker-success">{t('developer.dashboard.readiness.ready')}</span>
                                    <p className="notice-text">
                                        <strong>{t('developer.dashboard.publish_ready_banner', 'All requirements are met! Your plugin is ready to go live.')}</strong>{' '}{t('developer.dashboard.readiness.ready_description')}</p>
                                </div>
                            ) : (
                                <div className="notice notice-warning">
                                    <span className="sticker sticker-sm sticker-warning">{t('developer.dashboard.readiness.missing')}</span>
                                    <p className="notice-text">
                                        <strong>{t('developer.dashboard.publish_missing_banner', 'Please complete the missing requirements before publishing.')}</strong>{' '}
                                        {t('developer.dashboard.readiness.missing_count', { count: readiness.missingRequirements.length })}
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
                    <button className="button button-ghost" onClick={onClose}>{t('common.close')}</button>
                    <button
                        className="button button-primary"
                        disabled={!readiness?.canPublish || publishing || Boolean(successMsg)}
                        aria-busy={publishing}
                        onClick={handlePublish}
                    >
                        <Rocket />
                        {publishing ? t('developer.dashboard.publishing') : t('developer.dashboard.btn_confirm_publish', 'Confirm & Release to Store')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PublishReadinessModal;
