import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAnalytics } from './useAnalytics';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Settings, Plus, ExternalLink, Search, BarChart2, Package, CheckCircle, X, AlertTriangle, Check } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../app/auth';
import DeveloperOnboardingModal from './DeveloperOnboardingModal';
import { getPluginUrl } from '../../lib/url';
import { Select } from '../../components/Select';
import '../../styles/studio.css';

const PLUGIN_CATEGORIES = ['Admin Tools', 'Economy', 'Fun', 'World Management', 'Utilities', 'Chat', 'Other'];

const PluginsPage = () => {
    const { t } = useTranslation();
    const { user, refreshUser } = useAuth();
    const { timeSeries } = useAnalytics();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [incomingTransfers, setIncomingTransfers] = useState<any[]>([]);
    const [transferLoadingId, setTransferLoadingId] = useState<number | null>(null);

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
            <div className="page page-wide st-page st-plugins-onboard">
                <DeveloperOnboardingModal
                    embedded={true}
                    onSuccess={() => refreshUser?.()}
                />
            </div>
        );
    }

    const filters: [string, string][] = [
        ['all', `All (${plugins.length})`],
        ...(hasPaidPlugins ? [['paid', 'Paid'] as [string, string]] : []),
        ['free', 'Free'],
        ['early_access', 'Early Access'],
    ];

    return (
        <div className="page page-wide st-page">
            <header className="st-head">
                <div className="st-head-text">
                    <h1 className="display-2">{t('developer.dashboard.plugins')} <span className="mark num">{plugins.length}</span></h1>
                </div>
                <div className="st-head-actions">
                    <button className="button button-primary" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus />
                        {t('developer.dashboard.add_plugin')}
                    </button>
                </div>
            </header>

            {incomingTransfers.length > 0 && (
                <div className="stack">
                    {incomingTransfers.map((req: any) => (
                        <div key={req.id} className="notice notice-pumpkin">
                            <span className="avatar st-plugins-avatar">
                                {req.preview_url ? <img src={req.preview_url} alt="" /> : req.plugin_name?.charAt(0).toUpperCase()}
                            </span>
                            <div className="notice-text stack st-plugins-transfer">
                                <span className="row">
                                    <strong>{req.plugin_name}</strong>
                                    {req.plugin_category && <span className="tag tag-fg">{req.plugin_category}</span>}
                                </span>
                                <span className="small">Transfer request from <strong>@{req.sender_name}</strong></span>
                            </div>
                            <div className="row">
                                <button
                                    className="button button-danger button-sm"
                                    disabled={transferLoadingId === req.id}
                                    onClick={() => handleRejectTransfer(req.id)}
                                >
                                    <X />
                                    Decline
                                </button>
                                <button
                                    className="button button-primary button-sm"
                                    disabled={transferLoadingId === req.id}
                                    onClick={() => handleAcceptTransfer(req.id)}
                                >
                                    <CheckCircle />
                                    {transferLoadingId === req.id ? 'Accepting…' : 'Accept Transfer'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="row">
                <label className="search st-plugins-search">
                    <Search />
                    <input
                        type="text"
                        className="input"
                        placeholder="Filter your plugins..."
                        aria-label="Filter your plugins..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </label>
                <span className="spacer" />
                <div className="segmented" role="group" aria-label="Filter">
                    {filters.map(([key, label]) => (
                        <button key={key} type="button" aria-pressed={filterType === key} onClick={() => setFilterType(key)}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {filteredPlugins.length === 0 ? (
                <div className="blank">
                    <Package size={36} className="pumpkin" />
                    <span className="h2">{searchTerm ? 'No plugins matched your filter.' : 'No plugins created yet.'}</span>
                    <p className="small">
                        {searchTerm ? 'Try adjusting your search or category filter.' : 'Click "Add New Plugin" to create your first plugin.'}
                    </p>
                </div>
            ) : (
                <div className="scroll-x">
                    <table className="ledger st-plugins-table">
                        <thead>
                            <tr>
                                <th>Plugin</th>
                                <th>Visibility</th>
                                <th className="end">{t('developer.dashboard.total_downloads')}</th>
                                {hasPaidPlugins && <th className="end">{t('developer.dashboard.total_revenue')}</th>}
                                <th>Date</th>
                                <th className="end">Actions</th>
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
                                    <tr key={p.id}>
                                        <td>
                                            <div className="st-plugins-cell">
                                                <button
                                                    type="button"
                                                    className="st-plugins-thumb"
                                                    onClick={() => navigate(`/dashboard/manage-plugin/${p.id}`)}
                                                    title="Manage Plugin"
                                                >
                                                    {p.previewPath ? (
                                                        <img src={p.previewPath} alt={p.name} loading="lazy" />
                                                    ) : (
                                                        <span className="avatar">{initial}</span>
                                                    )}
                                                </button>
                                                <div className="st-plugins-info">
                                                    <button
                                                        type="button"
                                                        className="st-plugins-name"
                                                        onClick={() => navigate(`/dashboard/manage-plugin/${p.id}`)}
                                                        title={p.name}
                                                    >
                                                        {p.name}
                                                    </button>
                                                    <div className="row st-plugins-tags">
                                                        <span className="tag mono st-case">{p.version ? `v${p.version}` : `ID: ${p.id}`}</span>
                                                        {p.category && <span className="tag tag-fg">{p.category}</span>}
                                                        {p.isEarlyAccess && <span className="tag tag-warning">Early Access</span>}
                                                    </div>
                                                    <div className="row st-plugins-quick">
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/dashboard/manage-plugin/${p.id}`)}
                                                            title="Edit plugin details & settings"
                                                        >
                                                            <Settings />Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(getPluginUrl(p))}
                                                            title="View in Marketplace"
                                                        >
                                                            <ExternalLink />Store
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/dashboard/manage-plugin/${p.id}?tab=analytics`)}
                                                            title="Plugin Analytics"
                                                        >
                                                            <BarChart2 />Analytics
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        <td data-label="Visibility">
                                            <div className="stack st-plugins-vis">
                                                <span className="status">
                                                    {isDraft ? <span className="dot" /> : <span className="mark-box mark-box-success"><Check /></span>}
                                                    {isDraft ? t('developer.dashboard.status_draft', 'Offline (Draft)') : t('developer.dashboard.status_published', 'Published')}
                                                </span>
                                                <span className={`tag ${isPaid ? 'tag-pumpkin' : 'tag-success'}`}>{isPaid ? priceFormatted : 'Free'}</span>
                                            </div>
                                        </td>

                                        <td className="end num" data-label={t('developer.dashboard.total_downloads')}>{p.downloads.toLocaleString()}</td>

                                        {hasPaidPlugins && (
                                            <td className={`end num ${p.earnings > 0 ? 'st-pos' : 'muted'}`} data-label={t('developer.dashboard.total_revenue')}>
                                                {isPaid || p.earnings > 0 ? (
                                                    p.earnings > 0 ? `+€${p.earnings.toFixed(2)}` : '€0.00'
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                        )}

                                        <td data-label="Date">
                                            <strong>{formatDate(p.created_at)}</strong>
                                            <span className="ledger-sub">Uploaded</span>
                                        </td>

                                        <td className="end st-plugins-actions-cell">
                                            <div className="row st-plugins-actions">
                                                <button
                                                    className="button button-flat button-sm button-icon"
                                                    onClick={() => navigate(getPluginUrl(p))}
                                                    title="View in Store"
                                                    aria-label="View in Store"
                                                >
                                                    <ExternalLink />
                                                </button>
                                                <button
                                                    className="button button-sm"
                                                    onClick={() => navigate(`/dashboard/manage-plugin/${p.id}`)}
                                                >
                                                    <Settings />
                                                    {t('developer.dashboard.manage_plugin')}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {isCreateModalOpen && (
                <div className="overlay" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="sheet st-sheet" role="dialog" aria-modal="true" aria-labelledby="createPluginTitle" onClick={e => e.stopPropagation()}>
                        <form onSubmit={handleCreateDraft}>
                            <div className="sheet-head">
                                <div className="stack st-sheet-title">
                                    <h2 className="h1" id="createPluginTitle">{t('developer.dashboard.create_plugin_title', 'Create New Plugin')}</h2>
                                </div>
                                <button type="button" className="button button-ghost button-icon" onClick={() => setIsCreateModalOpen(false)} aria-label="Close">
                                    <X />
                                </button>
                            </div>

                            <div className="sheet-body">
                                <p className="small">{t('developer.dashboard.create_plugin_desc', 'Set up your plugin draft. You can configure your store listing, upload builds, and test offline before publishing.')}</p>

                                {createError && (
                                    <span className="field-error"><AlertTriangle size={14} />{createError}</span>
                                )}

                                <label className="field">
                                    <span className="field-label">Plugin Name *</span>
                                    <span className="control">
                                        <input
                                            id="newPluginName"
                                            type="text"
                                            className="input"
                                            placeholder="e.g. QuantumVault, DragonFly"
                                            value={newPluginName}
                                            onChange={e => setNewPluginName(e.target.value)}
                                            maxLength={64}
                                            required
                                            autoFocus
                                        />
                                    </span>
                                </label>

                                <div className="field">
                                    <span className="field-label" id="newPluginCategory">Category *</span>
                                    <Select
                                        options={PLUGIN_CATEGORIES}
                                        value={newPluginCategory}
                                        onChange={setNewPluginCategory}
                                        aria-labelledby="newPluginCategory"
                                    />
                                </div>

                                <div className="field">
                                    <span className="field-label">Distribution Type</span>
                                    <div className="st-pick">
                                        <button type="button" className="st-option" aria-pressed={newPluginType === 'free'} onClick={() => setNewPluginType('free')}>
                                            <strong>Free Plugin</strong>
                                            <span className="small">Available to the entire community for free.</span>
                                        </button>
                                        <button type="button" className="st-option" aria-pressed={newPluginType === 'paid'} onClick={() => setNewPluginType('paid')}>
                                            <strong>Paid / Premium</strong>
                                            <span className="small">Sell licenses with automated developer payouts.</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="sheet-foot">
                                <button
                                    type="button"
                                    className="button button-ghost"
                                    onClick={() => setIsCreateModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="button button-primary"
                                    disabled={!newPluginName.trim() || creatingPlugin}
                                    aria-busy={creatingPlugin}
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

export default PluginsPage;