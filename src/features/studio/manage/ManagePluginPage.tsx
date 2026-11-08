import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../../../lib/api';
import { useAuth } from '../../../app/auth';
import { useTranslation } from 'react-i18next';
import {
    LayoutGrid, Tag, Upload, DollarSign, Trash2,
    BarChart3, Key, Star, ArrowRightLeft,
    Rocket, Eye, PowerOff, Check
} from 'lucide-react';

import StoreListing from './StoreListing';
import PublishUpdate from './PublishUpdate';
import Pricing from './Pricing';
import Coupons from './Coupons';
import Licenses from './Licenses';
import Reviews from './Reviews';
import TransferOwnership from './TransferOwnership';
import DangerZone from './DangerZone';
import Analytics from './Analytics';
import PublishReadinessModal from './PublishReadinessModal';
import { RejectionReasonsList } from '../../../components/GuidelineRejectionPicker';
import { getPluginUrl } from '../../../lib/url';
import '../../../styles/studio.css';

import type { Plugin, PluginCommand } from '../../../types/plugin';

export type PluginCommandItem = PluginCommand;
export type PluginData = Plugin;

const NAV_ITEMS = [
    { key: 'listing',   labelKey: 'studio.manage.nav_listing',   icon: LayoutGrid       },
    { key: 'update',    labelKey: 'studio.manage.nav_update',    icon: Upload           },
    { key: 'analytics', labelKey: 'studio.manage.nav_analytics', icon: BarChart3        },
    { key: 'reviews',   labelKey: 'studio.manage.nav_reviews',   icon: Star             },
    { key: 'pricing',   labelKey: 'studio.manage.nav_pricing',   icon: DollarSign       },
    { key: 'licenses',  labelKey: 'studio.manage.nav_licenses',  icon: Key              },
    { key: 'coupons',   labelKey: 'studio.manage.nav_coupons',   icon: Tag              },
    { key: 'transfer',  labelKey: 'studio.manage.nav_transfer',  icon: ArrowRightLeft   },
    { key: 'danger',    labelKey: 'studio.manage.nav_danger',    icon: Trash2           },
] as const;

const ManagePluginPage = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(() => {
        const tab = searchParams.get('tab');
        return NAV_ITEMS.some(item => item.key === tab) ? tab! : 'listing';
    });
    const [loading, setLoading] = useState(true);
    const [plugin, setPlugin] = useState<PluginData | null>(null);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [unpublishing, setUnpublishing] = useState(false);

    useEffect(() => {
        if (user) {
            fetchPlugin();
        }
    }, [id, user]);

    const fetchPlugin = async () => {
        try {
            const res = await api.get(`/plugins/${id}`);
            const data = res.data;
            if (!user || data.dev_id !== user.id) {
                navigate('/dashboard/plugins', { replace: true });
                return;
            }
            setPlugin(data);
        } catch {
            navigate('/dashboard/plugins', { replace: true });
        } finally {
            setLoading(false);
        }
    };

    const refreshPlugin = () => fetchPlugin();

    const handleUnpublish = async () => {
        if (!plugin) return;
        const confirm = window.confirm(
            t('studio.manage.confirm_unpublish', { name: plugin.name })
        );
        if (!confirm) return;

        setUnpublishing(true);
        try {
            await api.post(`/plugins/${plugin.id}/unpublish`);
            await fetchPlugin();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to unpublish plugin.');
        } finally {
            setUnpublishing(false);
        }
    };

    if (loading) {
        return (
            <div className="page-loader">
                <span className="row"><span className="loading" />{t('studio.manage.loading')}</span>
            </div>
        );
    }

    if (!plugin) return null;

    const isLive = plugin.status === 'published';
    const isUnderReview = plugin.status === 'under_review';
    const isRejected = plugin.status === 'rejected';
    const statusLabel = isLive
        ? t('developer.dashboard.status_published', 'Published')
        : isUnderReview
        ? t('developer.dashboard.status_under_review', 'Pending Review')
        : isRejected
        ? t('guidelines.changes_requested', 'Changes Requested')
        : t('developer.dashboard.status_draft', 'Offline (Draft)');

    return (
        <div className="page page-wide st-page">
            <header className="st-head">
                <div className="st-mp-id">
                    <span className="avatar st-mp-avatar">
                        {plugin.preview_path ? <img src={plugin.preview_path} alt="" /> : plugin.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="st-head-text">
                        <span className="label mono st-case">
                            ID: {id}
                            {plugin.version && ` · v${plugin.version}`}
                            {plugin.api_version && ` · API v${plugin.api_version}`}
                        </span>
                        <h1 className="display-2 st-mp-name">{plugin.name}</h1>
                        <span className="status">
                            {isLive ? <span className="mark-box mark-box-success"><Check /></span> : <span className="dot" />}
                            {statusLabel}
                        </span>
                    </div>
                </div>
            </header>

            <div className={`notice ${isLive ? 'notice-success' : isRejected ? 'notice-danger gl-notice-rejected' : isUnderReview ? 'notice-warning' : 'notice-plain'}`}>
                <span className={`sticker ${isLive ? 'sticker-success' : isRejected ? 'sticker-danger' : isUnderReview ? 'sticker-warning' : 'sticker-fg'}`}>{statusLabel}</span>
                {isRejected ? (
                    <div className="notice-text gl-notice-body">
                        <p>
                            <strong>
                                {t(
                                    'guidelines.changes_requested_intro',
                                    'Your submission requires changes before it can be published:'
                                )}
                            </strong>
                        </p>
                        <RejectionReasonsList rejectionReason={plugin.rejection_reason} />
                    </div>
                ) : (
                    <p className="notice-text">
                        {isLive
                            ? t('studio.manage.notice_live')
                            : isUnderReview
                            ? t('studio.manage.notice_under_review')
                            : t('studio.manage.notice_draft')}
                    </p>
                )}
                <div className="row">
                    {!isLive && (
                        <Link
                            to={getPluginUrl(plugin)}
                            target="_blank"
                            rel="noreferrer"
                            className="button button-ghost button-sm"
                        >
                            <Eye />
                            {t('studio.manage.preview_draft')}
                        </Link>
                    )}
                    {isUnderReview ? (
                        <button
                            className="button button-sm"
                            disabled={unpublishing}
                            aria-busy={unpublishing}
                            onClick={handleUnpublish}
                        >
                            <PowerOff />
                            {unpublishing ? t('studio.manage.cancelling') : t('studio.manage.cancel_review')}
                        </button>
                    ) : !isLive ? (
                        <>
                            <button
                                className="button button-sm"
                                onClick={() => setIsPublishModalOpen(true)}
                            >
                                {t('studio.manage.check_readiness')}
                            </button>
                            <button
                                className="button button-primary button-sm"
                                onClick={() => setIsPublishModalOpen(true)}
                            >
                                <Rocket />
                                {isRejected
                                    ? t('studio.manage.resubmit_review')
                                    : t('developer.dashboard.btn_publish_store', t('studio.manage.submit_review'))}
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to={getPluginUrl(plugin)}
                                target="_blank"
                                rel="noreferrer"
                                className="button button-sm"
                            >
                                <Eye />
                                {t('studio.manage.view_on_store')}
                            </Link>
                            <button
                                className="button button-danger button-sm"
                                disabled={unpublishing}
                                aria-busy={unpublishing}
                                onClick={handleUnpublish}
                            >
                                <PowerOff />
                                {unpublishing ? t('studio.manage.unpublishing') : t('developer.dashboard.btn_unpublish_store', 'Take Offline')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="tabs st-mp-tabs" role="tablist">
                {NAV_ITEMS.map(({ key, labelKey, icon: Icon }) => (
                    <button key={key} role="tab" aria-selected={activeTab === key} onClick={() => setActiveTab(key)}>
                        <Icon size={16} />
                        {t(labelKey)}
                    </button>
                ))}
            </div>

            <div className="st-mp">
                <nav className="sidenav st-mp-nav" aria-label={plugin.name}>
                    <span className="sidenav-group label">{plugin.name}</span>
                    {NAV_ITEMS.map(({ key, labelKey, icon: Icon }) => (
                        <button
                            key={key}
                            className={key === 'danger' ? 'st-mp-danger' : undefined}
                            aria-current={activeTab === key ? 'page' : undefined}
                            onClick={() => setActiveTab(key)}
                        >
                            <Icon />
                            {t(labelKey)}
                        </button>
                    ))}
                </nav>

                <div className="st-mp-main">
                    {activeTab === 'listing' && (
                        <StoreListing plugin={plugin} onSaved={refreshPlugin} />
                    )}
                    {activeTab === 'update' && (
                        <PublishUpdate plugin={plugin} onSaved={refreshPlugin} />
                    )}
                    {activeTab === 'analytics' && (
                        <Analytics pluginId={plugin.id} pluginName={plugin.name} />
                    )}
                    {activeTab === 'reviews' && (
                        <Reviews plugin={plugin} />
                    )}
                    {activeTab === 'pricing' && (
                        <Pricing plugin={plugin} onSaved={refreshPlugin} />
                    )}
                    {activeTab === 'licenses' && (
                        <Licenses plugin={plugin} />
                    )}
                    {activeTab === 'coupons' && (
                        <Coupons plugin={plugin} />
                    )}
                    {activeTab === 'transfer' && (
                        <TransferOwnership plugin={plugin} />
                    )}
                    {activeTab === 'danger' && (
                        <DangerZone plugin={plugin} />
                    )}
                </div>
            </div>

            <PublishReadinessModal
                isOpen={isPublishModalOpen}
                pluginId={plugin.id}
                pluginName={plugin.name}
                isPublished={isLive}
                onClose={() => setIsPublishModalOpen(false)}
                onPublished={refreshPlugin}
                onNavigateTab={(tabKey) => setActiveTab(tabKey)}
            />
        </div>
    );
};

export default ManagePluginPage;
