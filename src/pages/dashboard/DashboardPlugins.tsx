import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnalytics } from './useAnalytics';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Settings, Plus, ExternalLink, Search, BarChart2, Package, CheckCircle, X, AlertTriangle } from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../App';
import DeveloperOnboardingModal from '../../components/DeveloperOnboardingModal';
import { getPluginUrl } from '../../utils/url';

const PLUGIN_CATEGORIES = ['Admin Tools', 'Economy', 'Fun', 'World Management', 'Utilities', 'Chat', 'Other'];

// --- Main Component ---
const DashboardPlugins = () => {
    const { t } = useTranslation();
    const { user, refreshUser } = useAuth();
    const { timeSeries } = useAnalytics();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [incomingTransfers, setIncomingTransfers] = useState<any[]>([]);
    const [transferLoadingId, setTransferLoadingId] = useState<number | null>(null);

    // Create Draft Plugin modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newPluginName, setNewPluginName] = useState('');
    const [newPluginCategory, setNewPluginCategory] = useState('Utilities');
    const [newPluginType, setNewPluginType] = useState<'free' | 'paid'>('free');
    const [creatingPlugin, setCreatingPlugin] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    useEffect(() => {
        if (searchParams.get('create') === 'true') {
            setIsCreateModalOpen(true);
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        fetchIncomingTransfers();
    }, []);

    const fetchIncomingTransfers = async () => {
        try {
            const res = await api.get('/user/transfers/incoming');
            setIncomingTransfers(Array.isArray(res.data) ? res.data : []);
        } catch {
            setIncomingTransfers([]);
        }
    };

    const handleAcceptTransfer = async (transferId: number) => {
        setTransferLoadingId(transferId);
        try {
            await api.post(`/user/transfers/${transferId}/accept`);
            await fetchIncomingTransfers();
            window.location.reload();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to accept transfer request.');
        } finally {
            setTransferLoadingId(null);
        }
    };

    const handleRejectTransfer = async (transferId: number) => {
        if (!window.confirm('Are you sure you want to decline this transfer request?')) return;
        setTransferLoadingId(transferId);
        try {
            await api.post(`/user/transfers/${transferId}/reject`);
            setIncomingTransfers(prev => prev.filter(t => t.id !== transferId));
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to decline transfer request.');
        } finally {
            setTransferLoadingId(null);
        }
    };

    const handleCreateDraft = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newPluginName.trim();
        if (!trimmed) return;
        setCreatingPlugin(true);
        setCreateError(null);
        try {
            const res = await api.post('/plugins/draft', {
                name: trimmed,
                category: newPluginCategory,
                type: newPluginType,
            });
            setIsCreateModalOpen(false);
            setNewPluginName('');
            navigate(`/dashboard/manage-plugin/${res.data.id}`);
        } catch (err: any) {
            setCreateError(err.response?.data?.error || err.response?.data?.message || 'Failed to create plugin draft.');
        } finally {
            setCreatingPlugin(false);
        }
    };

    // Grouping analytics data by plugin ID
    const plugins = useMemo(() => {
        return Object.values(timeSeries.reduce((acc, curr) => {
            const id = curr.plugin_id || curr.id; 
            if (!acc[id]) {
                acc[id] = { 
                    id: id, 
                    name: curr.name,
                    version: curr.version,
                    pluginType: curr.pluginType || curr.type,
                    category: curr.category,
                    previewPath: curr.previewPath || curr.preview_path,
                    priceCents: curr.priceCents || curr.price_cents || 0,
                    isEarlyAccess: curr.isEarlyAccess || curr.is_early_access || false,
                    status: curr.status || 'published',
                    downloads: 0, 
                    earnings: 0,
                    views: 0,
                    avgRating: curr.avgRating || 0,
                    created_at: curr.createdAt || curr.created_at,
                    updated_at: curr.updatedAt || curr.updated_at
                };
            }
            acc[id].downloads += (curr.downloads || 0);
            acc[id].earnings += (curr.earnings || 0);
            acc[id].views += (curr.views || 0);
            if (curr.avgRating > 0) acc[id].avgRating = curr.avgRating;
            return acc;
        }, {} as Record<string, any>));
    }, [timeSeries]);

    // Check if creator has any paid plugins or earnings
    const hasPaidPlugins = useMemo(() => {
        return plugins.some((p: any) => 
            (p.pluginType && p.pluginType.toLowerCase() === 'paid') ||
            (p.priceCents && p.priceCents > 0) ||
            (p.earnings && p.earnings > 0)
        );
    }, [plugins]);

    const filteredPlugins = useMemo(() => {
        return plugins.filter((p: any) => {
            const term = searchTerm.trim().toLowerCase();
            const matchesSearch = !term ||
                (p.name && p.name.toLowerCase().includes(term)) ||
                (p.category && p.category.toLowerCase().includes(term)) ||
                String(p.id).includes(term);

            const type = (p.pluginType || 'free').toLowerCase();
            const matchesType = filterType === 'all' ||
                (filterType === 'paid' && type === 'paid') ||
                (filterType === 'free' && type === 'free') ||
                (filterType === 'early_access' && p.isEarlyAccess);

            return matchesSearch && matchesType;
        });
    }, [plugins, searchTerm, filterType]);

    const formatDate = (dateStr: string) => {
        if (!dateStr || typeof dateStr !== 'string') return 'N/A';
        const normalized = dateStr.toLowerCase().trim();
        if (normalized === 'none' || normalized === 'null' || normalized === 'undefined') return 'N/A';
        
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    if (!user?.is_developer) {
        return (
            <div className="dev-plugins-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', padding: '2rem 1rem' }}>
                <DeveloperOnboardingModal
                    embedded={true}
                    onSuccess={() => refreshUser?.()}
                />
            </div>
        );
    }

    return (
        <div className="dev-plugins-container">
            <div className="dev-plugins-card">
                {/* Header */}
                <div className="dev-plugins-header">
                    <div className="dev-plugins-title-area">
                        <h3 className="dev-plugins-title">{t('developer.dashboard.plugins')}</h3>
                        <span className="dev-plugins-count">{plugins.length}</span>
                    </div>
                    <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus size={18} style={{ marginRight: '8px' }} />
                        {t('developer.dashboard.add_plugin')}
                    </button>
                </div>

                {/* Incoming Plugin Transfer Requests */}
                {incomingTransfers.length > 0 && (
                    <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {incomingTransfers.map((req: any) => (
                            <div key={req.id} style={{
                                background: 'rgba(249, 115, 22, 0.08)',
                                border: '1px solid rgba(249, 115, 22, 0.35)',
                                borderRadius: '12px',
                                padding: '1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '10px',
                                        background: req.preview_url ? `url(${req.preview_url}) center/cover no-repeat` : 'rgba(249, 115, 22, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.25rem',
                                        fontWeight: 700,
                                        color: '#f97316',
                                        flexShrink: 0,
                                        border: '1px solid rgba(249, 115, 22, 0.3)'
                                    }}>
                                        {!req.preview_url && req.plugin_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: 600, fontSize: '1rem' }}>{req.plugin_name}</span>
                                            {req.plugin_category && (
                                                <span className="dev-plugins-badge" style={{ fontSize: '0.7rem' }}>
                                                    {req.plugin_category}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--dash-text-muted)', marginTop: '0.2rem' }}>
                                            Transfer request from <strong>@{req.sender_name}</strong>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <button
                                        className="btn btn-secondary"
                                        disabled={transferLoadingId === req.id}
                                        onClick={() => handleRejectTransfer(req.id)}
                                        style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem', color: '#f87171' }}
                                    >
                                        <X size={14} style={{ marginRight: '4px' }} />
                                        Decline
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        disabled={transferLoadingId === req.id}
                                        onClick={() => handleAcceptTransfer(req.id)}
                                        style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
                                    >
                                        <CheckCircle size={14} style={{ marginRight: '4px' }} />
                                        {transferLoadingId === req.id ? 'Accepting…' : 'Accept Transfer'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Toolbar */}
                <div className="dev-plugins-toolbar">
                    <div className="dev-plugins-filter-box">
                        <Search size={15} color="var(--dash-text-muted)" />
                        <input
                            type="text"
                            placeholder="Filter your plugins..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </div>

                    <div className="dev-plugins-filter-tabs">
                        <button
                            type="button"
                            className={`dev-plugins-filter-tab ${filterType === 'all' ? 'active' : ''}`}
                            onClick={() => setFilterType('all')}
                        >
                            All ({plugins.length})
                        </button>
                        {hasPaidPlugins && (
                            <button
                                type="button"
                                className={`dev-plugins-filter-tab ${filterType === 'paid' ? 'active' : ''}`}
                                onClick={() => setFilterType('paid')}
                            >
                                Paid
                            </button>
                        )}
                        <button
                            type="button"
                            className={`dev-plugins-filter-tab ${filterType === 'free' ? 'active' : ''}`}
                            onClick={() => setFilterType('free')}
                        >
                            Free
                        </button>
                        <button
                            type="button"
                            className={`dev-plugins-filter-tab ${filterType === 'early_access' ? 'active' : ''}`}
                            onClick={() => setFilterType('early_access')}
                        >
                            Early Access
                        </button>
                    </div>
                </div>
                
                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table className="dev-plugins-table">
                        <thead>
                            <tr>
                                <th className="dev-plugins-col-main">Plugin</th>
                                <th>Visibility</th>
                                <th>{t('developer.dashboard.total_downloads')}</th>
                                {hasPaidPlugins && <th>{t('developer.dashboard.total_revenue')}</th>}
                                <th>Date</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPlugins.map((p: any) => {
                                const pluginType = (p.pluginType || 'free').toLowerCase();
                                const isPaid = pluginType === 'paid' || (p.priceCents && p.priceCents > 0);
                                const priceFormatted = isPaid ? `€${((p.priceCents || 0) / 100).toFixed(2)}` : 'Free';
                                const initial = (p.name || '?').charAt(0).toUpperCase();
                                const isDraft = p.status === 'draft';

                                return (
                                    <tr key={p.id} className="dev-plugins-row">
                                        {/* Plugin Details (Wide Column) */}
                                        <td className="dev-plugins-col-main">
                                            <div className="dev-plugins-cell">
                                                {/* 16:9 Thumbnail */}
                                                <div
                                                    className="dev-plugins-thumb"
                                                    onClick={() => navigate(`/dashboard/manage-plugin/${p.id}`)}
                                                    title="Manage Plugin"
                                                >
                                                    {p.previewPath ? (
                                                        <img src={p.previewPath} alt={p.name} loading="lazy" />
                                                    ) : (
                                                        <div className="dev-plugins-thumb-fallback">
                                                            <span>{initial}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info & Meta */}
                                                <div className="dev-plugins-info">
                                                    <div className="dev-plugins-title-row">
                                                        <span
                                                            className="dev-plugins-item-title"
                                                            onClick={() => navigate(`/dashboard/manage-plugin/${p.id}`)}
                                                            title={p.name}
                                                        >
                                                            {p.name}
                                                        </span>
                                                    </div>

                                                    <div className="dev-plugins-meta-row">
                                                        <span className="dev-plugins-badge dev-plugins-badge-mono">
                                                            {p.version ? `v${p.version}` : `ID: ${p.id}`}
                                                        </span>
                                                        {p.category && (
                                                            <span className="dev-plugins-badge">
                                                                {p.category}
                                                            </span>
                                                        )}
                                                        {p.isEarlyAccess && (
                                                            <span className="dev-plugins-badge dev-plugins-badge-early">
                                                                Early Access
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Hover Quick Actions */}
                                                    <div className="dev-plugins-hover-actions">
                                                        <button
                                                            type="button"
                                                            className="dev-plugins-action-icon-btn"
                                                            onClick={() => navigate(`/dashboard/manage-plugin/${p.id}`)}
                                                            title="Edit plugin details & settings"
                                                        >
                                                            <Settings size={13} style={{ marginRight: 3 }} />
                                                            <span style={{ fontSize: '0.72rem' }}>Edit</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="dev-plugins-action-icon-btn"
                                                            onClick={() => navigate(getPluginUrl(p))}
                                                            title="View in Marketplace"
                                                        >
                                                            <ExternalLink size={13} style={{ marginRight: 3 }} />
                                                            <span style={{ fontSize: '0.72rem' }}>Store</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="dev-plugins-action-icon-btn"
                                                            onClick={() => navigate(`/dashboard/manage-plugin/${p.id}?tab=analytics`)}
                                                            title="Plugin Analytics"
                                                        >
                                                            <BarChart2 size={13} style={{ marginRight: 3 }} />
                                                            <span style={{ fontSize: '0.72rem' }}>Analytics</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Visibility & Type */}
                                        <td>
                                            <div className="dev-plugins-visibility-cell">
                                                <div className={`dev-plugins-visibility-status ${isDraft ? 'draft' : ''}`}>
                                                    <span className={`dev-plugins-status-dot ${isDraft ? 'draft' : ''}`} />
                                                    <span>{isDraft ? t('developer.dashboard.status_draft', 'Offline (Draft)') : t('developer.dashboard.status_published', 'Published')}</span>
                                                </div>
                                                <span className="dev-plugins-type-pill">
                                                    {isPaid ? priceFormatted : 'Free'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Total Downloads */}
                                        <td className="mono">
                                            {p.downloads.toLocaleString()}
                                        </td>

                                        {/* Total Revenue (Only shown if hasPaidPlugins is true) */}
                                        {hasPaidPlugins && (
                                            <td className="mono" style={{ color: p.earnings > 0 ? 'var(--success)' : 'var(--dash-text-muted)' }}>
                                                {isPaid || p.earnings > 0 ? (
                                                    p.earnings > 0 ? `+€${p.earnings.toFixed(2)}` : '€0.00'
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                        )}

                                        {/* Dates */}
                                        <td>
                                            <div className="dev-plugins-date-cell">
                                                <div className="dev-plugins-date-primary">{formatDate(p.created_at)}</div>
                                                <div style={{ fontSize: '0.72rem' }}>Uploaded</div>
                                            </div>
                                        </td>

                                        {/* Quick Actions */}
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button 
                                                    className="btn btn-icon-only" 
                                                    onClick={() => navigate(getPluginUrl(p))}
                                                    title="View in Store"
                                                >
                                                    <ExternalLink size={16} />
                                                </button>
                                                
                                                <button 
                                                    className="btn btn-secondary" 
                                                    onClick={() => navigate(`/dashboard/manage-plugin/${p.id}`)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                                                >
                                                    <Settings size={14} />
                                                    {t('developer.dashboard.manage_plugin')}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            
                            {filteredPlugins.length === 0 && (
                                <tr>
                                    <td colSpan={hasPaidPlugins ? 6 : 5} style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', opacity: 0.7 }}>
                                            <Package size={36} color="var(--dash-text-muted)" />
                                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>
                                                {searchTerm ? 'No plugins matched your filter.' : 'No plugins created yet.'}
                                            </p>
                                            <small style={{ color: 'var(--dash-text-muted)' }}>
                                                {searchTerm ? 'Try adjusting your search or category filter.' : 'Click "Add New Plugin" to create your first plugin.'}
                                            </small>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create New Plugin Draft Modal */}
            {isCreateModalOpen && (
                <div className="create-plugin-overlay" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="create-plugin-modal" onClick={e => e.stopPropagation()}>
                        <button className="create-plugin-close" onClick={() => setIsCreateModalOpen(false)} aria-label="Close">
                            <X size={18} />
                        </button>

                        <div className="create-plugin-header">
                            <h3>{t('developer.dashboard.create_plugin_title', 'Create New Plugin')}</h3>
                            <p>{t('developer.dashboard.create_plugin_desc', 'Set up your plugin draft. You can configure your store listing, upload builds, and test offline before publishing.')}</p>
                        </div>

                        {createError && (
                            <div style={{
                                padding: '0.75rem 1rem',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '8px',
                                color: '#f87171',
                                fontSize: '0.85rem',
                                marginBottom: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <AlertTriangle size={16} />
                                <span>{createError}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateDraft} className="create-plugin-form">
                            <div className="create-plugin-field">
                                <label htmlFor="newPluginName">Plugin Name *</label>
                                <input
                                    id="newPluginName"
                                    type="text"
                                    className="create-plugin-input"
                                    placeholder="e.g. QuantumVault, DragonFly"
                                    value={newPluginName}
                                    onChange={e => setNewPluginName(e.target.value)}
                                    maxLength={64}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="create-plugin-field">
                                <label htmlFor="newPluginCategory">Category *</label>
                                <select
                                    id="newPluginCategory"
                                    className="create-plugin-select"
                                    value={newPluginCategory}
                                    onChange={e => setNewPluginCategory(e.target.value)}
                                >
                                    {PLUGIN_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="create-plugin-field">
                                <label>Distribution Type</label>
                                <div className="create-plugin-type-grid">
                                    <div
                                        className={`create-plugin-type-card ${newPluginType === 'free' ? 'selected' : ''}`}
                                        onClick={() => setNewPluginType('free')}
                                    >
                                        <h5>Free Plugin</h5>
                                        <p>Available to the entire community for free.</p>
                                    </div>
                                    <div
                                        className={`create-plugin-type-card ${newPluginType === 'paid' ? 'selected' : ''}`}
                                        onClick={() => setNewPluginType('paid')}
                                    >
                                        <h5>Paid / Premium</h5>
                                        <p>Sell licenses with instant Stripe payouts.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="create-plugin-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setIsCreateModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={!newPluginName.trim() || creatingPlugin}
                                >
                                    {creatingPlugin ? 'Creating Draft…' : t('developer.dashboard.btn_create_draft', 'Create Draft & Manage →')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPlugins;