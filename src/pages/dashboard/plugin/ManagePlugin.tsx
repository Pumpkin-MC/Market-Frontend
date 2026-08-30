import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../../api';
import { useAuth } from '../../../App';
import { useTranslation } from 'react-i18next';
import {
    LayoutGrid, Tag, Upload, DollarSign, Trash2,
    Circle, BarChart3, Key, Star, ArrowRightLeft,
    Rocket, Eye, PowerOff
} from 'lucide-react';

import StoreListing from './StoreListing';
import PublishUpdate from './PublishUpdate';
import Pricing from './Pricing';
import Coupons from './Coupons';
import Licenses from './Licenses';
import PluginReviewsTab from './PluginReviewsTab';
import TransferOwnership from './TransferOwnership';
import DangerZone from './DangerZone';
import PluginAnalyticsTab from './PluginAnalyticsTab';
import PublishReadinessModal from './PublishReadinessModal';
import { getPluginUrl } from '../../../utils/url';
import './ManagePlugin.css';

export type PluginData = {
    id: number;
    name: string;
    translated_descriptions: string;
    category: string;
    source_link: string;
    keywords: string;
    price_cents: number;
    type: 'free' | 'paid' | 'adwall';
    screenshots: { id: number; path: string }[];
    preview_path?: string;
    version?: string;
    status?: 'published' | 'draft' | 'review';
    sale_active?: boolean;
    sale_discount_percent?: number;
    is_early_access?: boolean;
    is_preorder?: boolean;
    preorder_release_date?: string;
    youtube_video_url?: string;
    dev_id?: number;
};

const NAV_ITEMS = [
    { key: 'listing',   label: 'Store Listing',    icon: LayoutGrid       },
    { key: 'update',    label: 'Publish Update',   icon: Upload           },
    { key: 'analytics', label: 'Analytics',        icon: BarChart3        },
    { key: 'reviews',   label: 'Reviews',          icon: Star             },
    { key: 'pricing',   label: 'Pricing',          icon: DollarSign       },
    { key: 'licenses',  label: 'Licenses',         icon: Key              },
    { key: 'coupons',   label: 'Coupons',          icon: Tag              },
    { key: 'transfer',  label: 'Transfer',         icon: ArrowRightLeft   },
    { key: 'danger',    label: 'Danger Zone',      icon: Trash2           },
];

const ManagePlugin = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('listing');
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
            `Take "${plugin.name}" offline?\n\nThis will remove the plugin from marketplace search and category browsing until you publish it again.`
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
            <div className="mp-loading">
                <div className="mp-loading-spinner" />
                <span>Loading plugin…</span>
            </div>
        );
    }

    if (!plugin) return null;

    const isLive = plugin.status === 'published';

    return (
        <div className="mp-root">
            {/* ── Sidebar ───────────────────────────────────────────── */}
            <aside className="mp-sidebar">
                <div className="mp-plugin-identity">
                    <div className="mp-plugin-avatar" style={plugin.preview_path ? { backgroundImage: `url(${plugin.preview_path})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : {}}>
                        {!plugin.preview_path && plugin.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <p className="mp-plugin-name">{plugin.name}</p>
                        <div className="mp-plugin-status">
                            <Circle size={7} fill={isLive ? 'var(--mp-success)' : 'var(--mp-muted)'} color={isLive ? 'var(--mp-success)' : 'var(--mp-muted)'} />
                            <span style={{ color: isLive ? 'var(--mp-success)' : 'var(--mp-muted)' }}>
                                {isLive ? t('developer.dashboard.status_published', 'Published') : t('developer.dashboard.status_draft', 'Offline (Draft)')}
                            </span>
                        </div>
                    </div>
                </div>

                <nav className="mp-nav">
                    {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            className={`mp-nav-item ${activeTab === key ? 'active' : ''} ${key === 'danger' ? 'danger' : ''}`}
                            onClick={() => setActiveTab(key)}
                        >
                            <Icon size={16} />
                            {label}
                        </button>
                    ))}
                </nav>

                <div className="mp-sidebar-meta">
                    <span className="mp-meta-row"><Tag size={12} /> ID: {id}</span>
                    {plugin.version && (
                        <span className="mp-meta-row">
                            <Upload size={12} /> v{plugin.version}
                        </span>
                    )}
                </div>
            </aside>

            {/* ── Main Content ──────────────────────────────────────── */}
            <main className="mp-main">
                {/* Top Google/Apple/Steam style publishing & status bar */}
                <div className="mp-top-bar">
                    <div className="mp-top-bar-left">
                        <div className={`mp-status-pill ${isLive ? 'published' : 'draft'}`}>
                            <span className="mp-status-dot-pulse" />
                            <span>{isLive ? t('developer.dashboard.status_published', 'Published') : t('developer.dashboard.status_draft', 'Offline (Draft)')}</span>
                        </div>
                        <span className="mp-top-bar-desc">
                            {isLive
                                ? 'This plugin is public. You can publish updates or manage store details.'
                                : 'Draft changes are private. Complete your store listing & binary build, then publish.'}
                        </span>
                    </div>

                    <div className="mp-top-bar-actions">
                        {!isLive ? (
                            <>
                                <button
                                    className="mp-action-btn mp-action-btn-secondary"
                                    onClick={() => setIsPublishModalOpen(true)}
                                    title="Check what requirements remain before publishing"
                                >
                                    Check Readiness
                                </button>
                                <button
                                    className="mp-action-btn mp-action-btn-primary"
                                    onClick={() => setIsPublishModalOpen(true)}
                                >
                                    <Rocket size={15} />
                                    {t('developer.dashboard.btn_publish_store', 'Publish to Store')}
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to={getPluginUrl(plugin)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mp-action-btn mp-action-btn-secondary"
                                >
                                    <Eye size={15} />
                                    View on Store
                                </Link>
                                <button
                                    className="mp-action-btn mp-action-btn-danger"
                                    disabled={unpublishing}
                                    onClick={handleUnpublish}
                                >
                                    <PowerOff size={15} />
                                    {unpublishing ? 'Unpublishing…' : t('developer.dashboard.btn_unpublish_store', 'Take Offline')}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {activeTab === 'listing' && (
                    <StoreListing plugin={plugin} onSaved={refreshPlugin} />
                )}
                {activeTab === 'update' && (
                    <PublishUpdate plugin={plugin} onSaved={refreshPlugin} />
                )}
                {activeTab === 'analytics' && (
                    <PluginAnalyticsTab pluginId={plugin.id} pluginName={plugin.name} />
                )}
                {activeTab === 'reviews' && (
                    <PluginReviewsTab plugin={plugin} />
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
            </main>

            {/* Readiness & Publish Modal */}
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

export default ManagePlugin;
