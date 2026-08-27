import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnalytics } from './useAnalytics';
import { useNavigate } from 'react-router-dom';
import { Settings, Plus, ExternalLink, Sparkles, Search, BarChart2, Package, CheckCircle, X, ArrowRightLeft } from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../App';
import DeveloperOnboardingModal from '../../components/DeveloperOnboardingModal';
import { getPluginUrl } from '../../utils/url';

// --- Main Component ---
const DashboardPlugins = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { timeSeries } = useAnalytics();
    const navigate = useNavigate();
    const [isDevModalOpen, setIsDevModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [incomingTransfers, setIncomingTransfers] = useState<any[]>([]);
    const [transferLoadingId, setTransferLoadingId] = useState<number | null>(null);

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
            <div className="dev-plugins-container">
                <div className="dev-plugins-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: 'rgba(249, 115, 22, 0.12)', border: '1px solid rgba(249, 115, 22, 0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem'
                    }}>
                        <Sparkles size={32} color="#f97316" />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Developer Onboarding Required</h2>
                    <p style={{ color: 'var(--dash-text-muted)', maxWidth: '520px', margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
                        To manage existing plugins or publish new ones, please complete the free <strong>Developer Onboarding</strong> wizard to set up your creator & legal profile.
                    </p>
                    <button
                        className="btn btn-primary"
                        style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}
                        onClick={() => setIsDevModalOpen(true)}
                    >
                        <Sparkles size={18} style={{ marginRight: '8px' }} />
                        Complete Free Developer Onboarding
                    </button>

                    <DeveloperOnboardingModal
                        isOpen={isDevModalOpen}
                        onClose={() => setIsDevModalOpen(false)}
                        onSuccess={() => setIsDevModalOpen(false)}
                    />
                </div>
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
                    <button className="btn btn-primary" onClick={() => navigate('/dashboard/add-plugin')}>
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
                                        fontWeight: 700,
                                        color: '#f97316',
                                        fontSize: '1.2rem',
                                        flexShrink: 0,
                                        border: '1px solid rgba(249, 115, 22, 0.3)'
                                    }}>
                                        {!req.preview_url && req.plugin_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--dash-text-primary)' }}>
                                                {req.plugin_name}
                                            </span>
                                            <span className="dev-plugins-badge" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                                                <ArrowRightLeft size={11} style={{ marginRight: 4 }} /> Ownership Transfer Request
                                            </span>
                                        </div>
                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--dash-text-muted)' }}>
                                            <strong>@{req.sender_name}</strong> has requested to transfer ownership of this plugin to your account.
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: '0.5rem 1.1rem', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                        onClick={() => handleAcceptTransfer(req.id)}
                                        disabled={transferLoadingId === req.id}
                                    >
                                        <CheckCircle size={15} />
                                        {transferLoadingId === req.id ? 'Accepting…' : 'Accept Transfer'}
                                    </button>
                                    <button
                                        className="btn"
                                        style={{
                                            padding: '0.5rem 1rem', fontSize: '0.82rem',
                                            background: 'var(--dash-surface-2)', border: '1px solid var(--dash-border)',
                                            color: 'var(--dash-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px'
                                        }}
                                        onClick={() => handleRejectTransfer(req.id)}
                                        disabled={transferLoadingId === req.id}
                                    >
                                        <X size={15} /> Decline
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
                                                <div className="dev-plugins-visibility-status">
                                                    <span className="dev-plugins-status-dot" />
                                                    <span>Public</span>
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
                                                {searchTerm ? 'No plugins matched your filter.' : 'No plugins published yet.'}
                                            </p>
                                            <small style={{ color: 'var(--dash-text-muted)' }}>
                                                {searchTerm ? 'Try adjusting your search or category filter.' : 'Click "Add New Plugin" to publish your first creation.'}
                                            </small>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardPlugins;