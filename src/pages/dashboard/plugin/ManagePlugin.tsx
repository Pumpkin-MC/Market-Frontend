import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../api';
import {
    LayoutGrid, Tag, Upload, DollarSign, Trash2,
    Circle, BarChart3, Key, Star
} from 'lucide-react';

import StoreListing from './StoreListing';
import PublishUpdate from './PublishUpdate';
import Pricing from './Pricing';
import Coupons from './Coupons';
import Licenses from './Licenses';
import PluginReviewsTab from './PluginReviewsTab';
import DangerZone from './DangerZone';
import PluginAnalyticsTab from './PluginAnalyticsTab';
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
    youtube_video_url?: string;
};

const NAV_ITEMS = [
    { key: 'listing',   label: 'Store Listing',    icon: LayoutGrid  },
    { key: 'update',    label: 'Publish Update',   icon: Upload      },
    { key: 'analytics', label: 'Analytics',        icon: BarChart3   },
    { key: 'reviews',   label: 'Reviews',          icon: Star        },
    { key: 'pricing',   label: 'Pricing',          icon: DollarSign  },
    { key: 'licenses',  label: 'Licenses',         icon: Key         },
    { key: 'coupons',   label: 'Coupons',          icon: Tag         },
    { key: 'danger',    label: 'Danger Zone',      icon: Trash2      },
];

const ManagePlugin = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('listing');
    const [loading, setLoading] = useState(true);
    const [plugin, setPlugin] = useState<PluginData | null>(null);

    useEffect(() => {
        fetchPlugin();
    }, [id]);

    const fetchPlugin = async () => {
        try {
            const res = await api.get(`/plugins/${id}`);
            setPlugin(res.data);
        } catch {
            navigate('/dashboard/plugins');
        } finally {
            setLoading(false);
        }
    };

    const refreshPlugin = () => fetchPlugin();

    if (loading) {
        return (
            <div className="mp-loading">
                <div className="mp-loading-spinner" />
                <span>Loading plugin…</span>
            </div>
        );
    }

    if (!plugin) return null;

    const statusColor = {
        published: 'var(--mp-success)',
        draft:     'var(--mp-muted)',
        review:    'var(--mp-warn)',
    }[plugin.status ?? 'published'];

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
                            <Circle size={7} fill={statusColor} color={statusColor} />
                            <span style={{ color: statusColor }}>
                                {plugin.status ?? 'published'}
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
                {activeTab === 'danger' && (
                    <DangerZone plugin={plugin} />
                )}
            </main>
        </div>
    );
};

export default ManagePlugin;
