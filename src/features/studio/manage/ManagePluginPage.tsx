import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../../../lib/api';
import { translateApiMessage } from '../../../lib/apiMessages';
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
import { getPluginUrl } from '../../../lib/url';
import '../../../styles/studio.css';

import type { Plugin, PluginCommand } from '../../../types/plugin';

export type PluginCommandItem = PluginCommand;
export type PluginData = Plugin;



const ManagePluginPage = () => {
    const { t } = useTranslation();
    const NAV_ITEMS = [
        { key: 'listing',   label: t('developer.dashboard.store_listing'),    icon: LayoutGrid       },
        { key: 'update',    label: t('developer.dashboard.publish_update'),   icon: Upload           },
        { key: 'analytics', label: t('developer.dashboard.analytics'),        icon: BarChart3        },
        { key: 'reviews',   label: t('developer.dashboard.reviews'),          icon: Star             },
        { key: 'pricing',   label: t('developer.dashboard.pricing'),          icon: DollarSign       },
        { key: 'licenses',  label: t('developer.dashboard.licenses'),         icon: Key              },
        { key: 'coupons',   label: t('developer.dashboard.coupons'),          icon: Tag              },
        { key: 'transfer',  label: t('developer.dashboard.transfer'),         icon: ArrowRightLeft   },
        { key: 'danger',    label: t('developer.dashboard.danger_zone'),      icon: Trash2           },
    ];
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
            if (!user || (data.dev_id !== user.id && user.role !== 'admin')) {
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
            t('developer.dashboard.confirm_unpublish', { plugin: plugin.name })
        );
        if (!confirm) return;

        setUnpublishing(true);
        try {
            await api.post(`/plugins/${plugin.id}/unpublish`);
            await fetchPlugin();
        } catch (err: any) {
            alert(translateApiMessage(t, err.response?.data?.error, t('developer.dashboard.unpublish_failed')));
        } finally {
            setUnpublishing(false);
        }
    };

    if (loading) {
        return (
            <div className="page-loader">
                <span className="row"><span className="loading" />{t('developer.dashboard.loading_plugin')}</span>
            </div>
        );
    }

    if (!plugin) return null;

    const isLive = plugin.status === 'published';
    const statusLabel = isLive ? t('developer.dashboard.status_published', 'Published') : t('developer.dashboard.status_draft', 'Offline (Draft)');

    return (
        <div className="page page-wide st-page">
            <header className="st-head">
                <div className="st-mp-id">
                    <span className="avatar st-mp-avatar">
                        {plugin.preview_path ? <img src={plugin.preview_path} alt="" /> : plugin.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="st-head-text">
                        <span className="label mono st-case">{t('developer.dashboard.plugin_id', { id })}{plugin.version && ` · v${plugin.version}`}</span>
                        <h1 className="display-2 st-mp-name">{plugin.name}</h1>
                        <span className="status">
                            {isLive ? <span className="mark-box mark-box-success"><Check /></span> : <span className="dot" />}
                            {statusLabel}
                        </span>
                    </div>
                </div>
            </header>

            <div className={`notice ${isLive ? 'notice-success' : 'notice-plain'}`}>
                <span className={`sticker ${isLive ? 'sticker-success' : 'sticker-fg'}`}>{statusLabel}</span>
                <p className="notice-text">
                    {isLive
                        ? t('developer.dashboard.published_desc')
                        : t('developer.dashboard.draft_desc')}
                </p>
                <div className="row">
                    {!isLive ? (
                        <>
                            <button
                                className="button button-sm"
                                onClick={() => setIsPublishModalOpen(true)}
                                title={t('developer.dashboard.readiness_hint')}
                            >{t('developer.dashboard.check_readiness')}</button>
                            <button
                                className="button button-primary button-sm"
                                onClick={() => setIsPublishModalOpen(true)}
                            >
                                <Rocket />
                                {t('developer.dashboard.btn_publish_store', 'Publish to Store')}
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
                                <Eye />{t('developer.dashboard.view_on_store')}</Link>
                            <button
                                className="button button-danger button-sm"
                                disabled={unpublishing}
                                aria-busy={unpublishing}
                                onClick={handleUnpublish}
                            >
                                <PowerOff />
                                {unpublishing ? t('developer.dashboard.unpublishing') : t('developer.dashboard.btn_unpublish_store', 'Take Offline')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="tabs st-mp-tabs" role="tablist">
                {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
                    <button key={key} role="tab" aria-selected={activeTab === key} onClick={() => setActiveTab(key)}>
                        <Icon size={16} />
                        {label}
                    </button>
                ))}
            </div>

            <div className="st-mp">
                <nav className="sidenav st-mp-nav" aria-label={plugin.name}>
                    <span className="sidenav-group label">{plugin.name}</span>
                    {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            className={key === 'danger' ? 'st-mp-danger' : undefined}
                            aria-current={activeTab === key ? 'page' : undefined}
                            onClick={() => setActiveTab(key)}
                        >
                            <Icon />
                            {label}
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
