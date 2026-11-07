import { useState, useEffect, useMemo, Fragment } from 'react';
import { Link } from 'react-router-dom';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';
import {
    Check,
    CircleAlert,
    ExternalLink,
    Search,
    X,
    ShieldCheck,
    Flag,
    Package,
    Users,
    FileCode2,
    Image as ImageIcon,
    FileText,
    Lock,
    AlertTriangle,
    RefreshCw,
    BarChart3,
    TrendingUp,
    Upload,
    Download,
    Clock,
    Layers,
    Star,
} from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../app/auth';
import { Select } from '../../components/Select';
import { getPluginUrl } from '../../lib/url';
import '../../styles/store.css';
import '../../styles/studio.css';

const extractErrorMessage = (err: any, fallback: string) => {
    if (err?.response?.data?.error) return err.response.data.error;
    if (typeof err?.response?.data === 'string' && err.response.data.trim()) return err.response.data;
    return fallback;
};

const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
};

const formatRelativeTime = (iso?: string | null) => {
    if (!iso) return '—';
    const dt = new Date(iso);
    const diffMs = Date.now() - dt.getTime();
    if (Number.isNaN(diffMs)) return '—';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    return `${Math.floor(diffMonths / 12)}y ago`;
};

const CHART_AXIS = { axisLine: false, tickLine: false, tick: { fill: 'var(--muted)', fontSize: 12 } } as const;
const CHART_GRID = <CartesianGrid stroke="var(--line)" vertical={false} />;
const CHART_CURSOR = { stroke: 'var(--fg)', strokeWidth: 1, fill: 'rgba(255, 255, 255, 0.04)' };

const StaffChartTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="st-tip">
            <span className="label label-fg">{label}</span>
            {payload.map((entry: any, index: number) => (
                <span key={index} className="st-tip-row">
                    <span className="dot" style={{ background: entry.color }} />
                    {entry.name}: {Number(entry.value || 0).toLocaleString()}
                </span>
            ))}
        </div>
    );
};

const REJECTION_POLICY_PRESETS = [
    {
        code: 'Guideline 2.1 — Binary Completeness',
        label: '2.1 Binary / Crash',
        text: 'Guideline 2.1 (Binary Completeness): Your plugin WASM binary failed to initialize or is missing required exports for the declared Pumpkin API version. Please verify the build and resubmit.',
    },
    {
        code: 'Guideline 2.3 — Accurate Metadata',
        label: '2.3 Store Listing & Docs',
        text: 'Guideline 2.3 (Accurate Store Metadata): Please provide a clear plugin description, installation/configuration instructions, and accurate command documentation before publishing.',
    },
    {
        code: 'Guideline 4.2 — Minimum Functionality',
        label: '4.2 Minimum Functionality',
        text: 'Guideline 4.2 (Minimum Functionality): Your submission appears to be a placeholder, empty test build, or lacks sufficient user-facing functionality for the public marketplace.',
    },
    {
        code: 'Policy 5.1 — Security & Safety',
        label: '5.1 Security / Safety',
        text: 'Policy 5.1 (Security & Trust): This build contains unsafe, obfuscated, or unauthorized network/filesystem behavior that violates PumpkinMarket safety guidelines.',
    },
    {
        code: 'Policy 5.2 — Intellectual Property',
        label: '5.2 Copyright / IP',
        text: 'Policy 5.2 (Intellectual Property): Please provide proof of authorship or an open-source repository link demonstrating permission to distribute this plugin.',
    },
    {
        code: 'Pricing & Monetization Policy',
        label: 'Monetization / Stripe',
        text: 'Monetization Policy: Paid plugins must clearly list all included features in the store description and have an active, verified Stripe Connect payout account.',
    },
];

const REMOVAL_POLICY_PRESETS = [
    {
        label: 'Malware / Malicious WASM',
        text: 'Removed for violating PumpkinMarket Security Policy (malicious or harmful binary).',
    },
    {
        label: 'DMCA / Stolen Content',
        text: 'Removed due to unauthorized redistribution / copyright infringement.',
    },
    {
        label: 'Spam / Duplicate Listing',
        text: 'Removed as spam or duplicate marketplace listing.',
    },
    {
        label: 'Developer Requested Removal',
        text: 'Removed at the request of the plugin author.',
    },
];

type StaffTab = 'queue' | 'plugins' | 'reports' | 'users' | 'logs' | 'analytics';
type AnalyticsTimeframe = '7d' | '30d' | '365d';

interface ActionModalState {
    kind: 'reject_plugin' | 'delete_plugin' | 'delete_user' | 'resolve_report';
    targetId: number;
    targetName: string;
    extra?: any;
}

const StaffPage = () => {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin';
    const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
    const hasSecureAuth = Boolean(
        currentUser?.totp_enabled ||
        currentUser?.has_passkey ||
        (typeof currentUser?.passkey_count === 'number' && currentUser.passkey_count > 0)
    );

    const [activeTab, setActiveTab] = useState<StaffTab>('queue');
    const [users, setUsers] = useState<any[]>([]);
    const [plugins, setPlugins] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [adminAnalytics, setAdminAnalytics] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [queueFilter, setQueueFilter] = useState('under_review');
    const [pluginStatusFilter, setPluginStatusFilter] = useState('all');
    const [pluginSortBy, setPluginSortBy] = useState('recently_updated');
    const [reportStatusFilter, setReportStatusFilter] = useState('open');
    const [logFilterAction, setLogFilterAction] = useState('all');
    const [logFilterModerator, setLogFilterModerator] = useState('all');

    const [analyticsTimeframe, setAnalyticsTimeframe] = useState<AnalyticsTimeframe>('30d');
    const [recentActivityFilter, setRecentActivityFilter] = useState<'all' | 'updates' | 'uploads'>('all');

    const [selectedItem, setSelectedItem] = useState<{ type: 'user' | 'plugin' | 'log' | 'report'; data: any } | null>(null);

    // Structured Moderation Action Modal state (replaces raw window.prompt)
    const [actionModal, setActionModal] = useState<ActionModalState | null>(null);
    const [actionReason, setActionReason] = useState('');
    const [actionPreset, setActionPreset] = useState('');
    const [actionDeleteReview, setActionDeleteReview] = useState(false);
    const [actionResolutionStatus, setActionResolutionStatus] = useState<'resolved' | 'dismissed'>('resolved');
    const [actionBusy, setActionBusy] = useState(false);
    const [rescanBusy, setRescanBusy] = useState(false);
    const [rescanNotice, setRescanNotice] = useState<string | null>(null);

    const handleRescanWasmMetadata = async () => {
        if (rescanBusy) return;
        setRescanBusy(true);
        setRescanNotice(null);
        setError(null);
        try {
            const res = await api.post('/admin/plugins/rescan-wasm', { force_all: true });
            const scanned = res.data?.scanned ?? 0;
            const updated = res.data?.updated ?? 0;
            setRescanNotice(`Rescanned ${scanned} plugin binaries (${updated} updated with WIT metadata).`);
            await fetchAllOverviewData();
        } catch (err: any) {
            setError(extractErrorMessage(err, 'Failed to rescan plugin WASM metadata'));
        } finally {
            setRescanBusy(false);
        }
    };

    useEffect(() => {
        fetchAllOverviewData();
    }, []);

    useEffect(() => {
        fetchTabData(activeTab);
        setSearchQuery('');
    }, [activeTab]);

    const fetchAllOverviewData = async () => {
        setLoading(true);
        setError(null);
        try {
            const requests: Promise<any>[] = [
                api.get('/admin/plugins'),
                api.get('/admin/logs'),
            ];
            if (isStaff) {
                requests.push(api.get('/admin/users'));
                requests.push(api.get('/admin/reports'));
            }
            if (isAdmin) {
                requests.push(api.get('/admin/analytics'));
            }
            const results = await Promise.allSettled(requests);

            if (results[0].status === 'fulfilled') {
                setPlugins(Array.isArray(results[0].value.data) ? results[0].value.data : []);
            } else {
                throw results[0].reason;
            }
            if (results[1].status === 'fulfilled') {
                setLogs(Array.isArray(results[1].value.data) ? results[1].value.data : []);
            }
            if (isStaff && results[2]?.status === 'fulfilled') {
                setUsers(Array.isArray(results[2].value.data) ? results[2].value.data : []);
            }
            if (isStaff && results[3]?.status === 'fulfilled') {
                setReports(Array.isArray(results[3].value.data) ? results[3].value.data : []);
            }
            if (isAdmin && results[4]?.status === 'fulfilled') {
                setAdminAnalytics(results[4].value.data);
            }
        } catch (err: any) {
            setError(extractErrorMessage(err, 'Failed to fetch staff dashboard data'));
        } finally {
            setLoading(false);
        }
    };

    const fetchTabData = async (tab: StaffTab) => {
        setError(null);
        try {
            if (tab === 'users' && isStaff) {
                const res = await api.get('/admin/users');
                setUsers(Array.isArray(res.data) ? res.data : []);
            } else if (tab === 'queue' || tab === 'plugins') {
                const res = await api.get('/admin/plugins');
                setPlugins(Array.isArray(res.data) ? res.data : []);
            } else if (tab === 'reports' && isStaff) {
                const res = await api.get('/admin/reports');
                setReports(Array.isArray(res.data) ? res.data : []);
            } else if (tab === 'logs') {
                const res = await api.get('/admin/logs');
                setLogs(Array.isArray(res.data) ? res.data : []);
            } else if (tab === 'analytics' && isAdmin) {
                const res = await api.get('/admin/analytics');
                setAdminAnalytics(res.data);
            }
        } catch (err: any) {
            setError(extractErrorMessage(err, 'Failed to refresh tab data'));
        }
    };

    const openActionModal = (state: ActionModalState, defaultReason = '') => {
        setActionModal(state);
        setActionReason(defaultReason);
        setActionPreset('');
        setActionDeleteReview(false);
        setActionResolutionStatus('resolved');
    };

    const closeActionModal = () => {
        if (actionBusy) return;
        setActionModal(null);
        setActionReason('');
        setActionPreset('');
    };

    const handleSubmitActionModal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!actionModal) return;

        setActionBusy(true);
        try {
            if (actionModal.kind === 'reject_plugin') {
                const reason = actionReason.trim();
                if (!reason) return;
                await api.post(`/admin/plugins/${actionModal.targetId}/reject`, { reason });
                setPlugins(prev =>
                    prev.map(p =>
                        p.id === actionModal.targetId
                            ? { ...p, status: 'rejected', rejection_reason: reason, claimed_by_id: null, claimed_by_name: null, claimed_at: null }
                            : p
                    )
                );
                if (selectedItem?.type === 'plugin' && selectedItem.data.id === actionModal.targetId) {
                    setSelectedItem({
                        type: 'plugin',
                        data: { ...selectedItem.data, status: 'rejected', rejection_reason: reason, claimed_by_id: null, claimed_by_name: null, claimed_at: null },
                    });
                }
            } else if (actionModal.kind === 'delete_plugin') {
                const reason = actionReason.trim();
                if (!reason) return;
                await api.delete(`/admin/plugins/${actionModal.targetId}`, { data: { reason } });
                const nowIso = new Date().toISOString();
                setPlugins(prev => prev.map(p => (p.id === actionModal.targetId ? { ...p, deleted_at: nowIso } : p)));
                if (selectedItem?.type === 'plugin' && selectedItem.data.id === actionModal.targetId) {
                    setSelectedItem({ type: 'plugin', data: { ...selectedItem.data, deleted_at: nowIso } });
                }
            } else if (actionModal.kind === 'delete_user') {
                const reason = actionReason.trim();
                if (!reason) return;
                await api.delete(`/admin/users/${actionModal.targetId}`, { data: { reason } });
                const nowIso = new Date().toISOString();
                setUsers(prev => prev.map(u => (u.id === actionModal.targetId ? { ...u, deleted_at: nowIso } : u)));
            } else if (actionModal.kind === 'resolve_report') {
                await api.post(`/admin/reports/${actionModal.targetId}/resolve`, {
                    status: actionResolutionStatus,
                    note: actionReason.trim() || undefined,
                    delete_review: actionDeleteReview,
                });
                const nowIso = new Date().toISOString();
                setReports(prev =>
                    prev.map(r =>
                        r.id === actionModal.targetId
                            ? {
                                  ...r,
                                  status: actionResolutionStatus,
                                  resolution_note: actionReason.trim() || null,
                                  resolved_at: nowIso,
                                  resolved_by_username: currentUser?.username,
                                  review_deleted: actionDeleteReview ? true : r.review_deleted,
                              }
                            : r
                    )
                );
            }
            setActionModal(null);
            setActionReason('');
        } catch (err: any) {
            alert(extractErrorMessage(err, 'Failed to complete moderation action'));
        } finally {
            setActionBusy(false);
        }
    };

    const changeRole = async (id: number, newRole: string) => {
        try {
            await api.put(`/admin/users/${id}/role`, { role: newRole, reason: `Role updated to ${newRole}` });
            setUsers(users.map(u => (u.id === id ? { ...u, role: newRole } : u)));
        } catch (err: any) {
            alert(extractErrorMessage(err, 'Failed to update role'));
        }
    };

    const approvePlugin = async (id: number) => {
        try {
            await api.post(`/admin/plugins/${id}/approve`, { reason: 'Passed pre-launch & policy review' });
            setPlugins(
                plugins.map(p =>
                    p.id === id
                        ? { ...p, status: 'published', rejection_reason: null, claimed_by_id: null, claimed_by_name: null, claimed_at: null }
                        : p
                )
            );
            if (selectedItem?.type === 'plugin' && selectedItem.data.id === id) {
                setSelectedItem({
                    type: 'plugin',
                    data: { ...selectedItem.data, status: 'published', rejection_reason: null, claimed_by_id: null, claimed_by_name: null, claimed_at: null },
                });
            }
        } catch (err: any) {
            alert(extractErrorMessage(err, 'Failed to approve plugin'));
        }
    };

    const claimPlugin = async (id: number) => {
        try {
            const res = await api.post(`/admin/plugins/${id}/claim`);
            const claimData = {
                claimed_by_id: res.data.claimed_by_id,
                claimed_by_name: res.data.claimed_by_name,
                claimed_at: res.data.claimed_at,
            };
            setPlugins(plugins.map(p => (p.id === id ? { ...p, ...claimData } : p)));
            if (selectedItem?.type === 'plugin' && selectedItem.data.id === id) {
                setSelectedItem({ type: 'plugin', data: { ...selectedItem.data, ...claimData } });
            }
        } catch (err: any) {
            alert(extractErrorMessage(err, 'Failed to claim plugin'));
            fetchTabData(activeTab);
        }
    };

    const unclaimPlugin = async (id: number) => {
        try {
            await api.post(`/admin/plugins/${id}/unclaim`);
            setPlugins(plugins.map(p => (p.id === id ? { ...p, claimed_by_id: null, claimed_by_name: null, claimed_at: null } : p)));
            if (selectedItem?.type === 'plugin' && selectedItem.data.id === id) {
                setSelectedItem({ type: 'plugin', data: { ...selectedItem.data, claimed_by_id: null, claimed_by_name: null, claimed_at: null } });
            }
        } catch (err: any) {
            alert(extractErrorMessage(err, 'Failed to unclaim plugin'));
        }
    };

    // ── KPI Calculations ──────────────────────────────────────────────────────
    const kpis = useMemo(() => {
        const activePlugins = plugins.filter(p => !p.deleted_at);
        const pendingReview = activePlugins.filter(p => p.status === 'under_review').length;
        const claimedReview = activePlugins.filter(p => p.status === 'under_review' && p.claimed_by_id).length;
        const unclaimedReview = activePlugins.filter(p => p.status === 'under_review' && !p.claimed_by_id).length;
        const claimedByMe = activePlugins.filter(p => p.status === 'under_review' && p.claimed_by_id === currentUser?.id).length;
        const publishedCount = activePlugins.filter(p => p.status === 'published').length;
        const draftCount = activePlugins.filter(p => !p.status || p.status === 'draft').length;
        const rejectedCount = activePlugins.filter(p => p.status === 'rejected').length;

        const nowMs = Date.now();
        const dayMs = 86400000;
        const uploaded7d = activePlugins.filter(p => p.created_at && nowMs - new Date(p.created_at).getTime() <= 7 * dayMs).length;
        const uploaded30d = activePlugins.filter(p => p.created_at && nowMs - new Date(p.created_at).getTime() <= 30 * dayMs).length;
        const uploaded365d = activePlugins.filter(p => p.created_at && nowMs - new Date(p.created_at).getTime() <= 365 * dayMs).length;
        const updated7d = activePlugins.filter(p => (p.updated_at || p.created_at) && nowMs - new Date(p.updated_at || p.created_at).getTime() <= 7 * dayMs).length;
        const updated30d = activePlugins.filter(p => (p.updated_at || p.created_at) && nowMs - new Date(p.updated_at || p.created_at).getTime() <= 30 * dayMs).length;

        const openReports = reports.filter(r => r.status === 'open').length;
        const resolvedReports = reports.filter(r => r.status !== 'open').length;

        const activeUsers = users.filter(u => !u.deleted_at);
        const verifiedDevs = activeUsers.filter(u => u.is_verified).length;
        const mfaUsers = activeUsers.filter(u => u.totp_enabled || u.has_passkey).length;
        const newUsers30d = activeUsers.filter(u => u.created_at && nowMs - new Date(u.created_at).getTime() <= 30 * dayMs).length;

        return {
            totalActivePlugins: activePlugins.length,
            pendingReview,
            claimedReview,
            unclaimedReview,
            claimedByMe,
            publishedCount,
            draftCount,
            rejectedCount,
            uploaded7d: adminAnalytics?.plugins?.uploaded_7d ?? uploaded7d,
            uploaded30d: adminAnalytics?.plugins?.uploaded_30d ?? uploaded30d,
            uploaded365d: adminAnalytics?.plugins?.uploaded_365d ?? uploaded365d,
            updated7d: adminAnalytics?.plugins?.updated_7d ?? updated7d,
            updated30d: adminAnalytics?.plugins?.updated_30d ?? updated30d,
            openReports,
            resolvedReports,
            activeUsersCount: adminAnalytics?.users?.total_active ?? activeUsers.length,
            verifiedDevs,
            mfaUsers,
            newUsers30d: adminAnalytics?.users?.new_30d ?? newUsers30d,
        };
    }, [plugins, reports, users, adminAnalytics, currentUser?.id]);

    const filteredUsers = users.filter(
        u =>
            u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.id.toString().includes(searchQuery)
    );

    const matchesPluginSearch = (p: any, q: string) => {
        if (!q) return true;
        return (
            p.name?.toLowerCase().includes(q) ||
            p.dev_name?.toLowerCase().includes(q) ||
            (p.public_id && p.public_id.toLowerCase().includes(q)) ||
            (p.category && p.category.toLowerCase().includes(q)) ||
            p.id.toString().includes(q)
        );
    };

    // Dedicated Review Queue list (separated from All Plugins catalog)
    const queuePlugins = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return plugins
            .filter(p => {
                if (p.deleted_at) return false;
                if (!matchesPluginSearch(p, q)) return false;
                if (queueFilter === 'under_review') return p.status === 'under_review';
                if (queueFilter === 'unclaimed') return p.status === 'under_review' && !p.claimed_by_id;
                if (queueFilter === 'claimed_by_me') return p.status === 'under_review' && p.claimed_by_id === currentUser?.id;
                if (queueFilter === 'rejected') return p.status === 'rejected';
                return p.status === 'under_review' || p.status === 'rejected';
            })
            .sort((a, b) => {
                if (a.status === 'under_review' && b.status !== 'under_review') return -1;
                if (a.status !== 'under_review' && b.status === 'under_review') return 1;
                return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
            });
    }, [plugins, searchQuery, queueFilter, currentUser?.id]);

    // Dedicated All Plugins catalog list
    const filteredPlugins = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return plugins
            .filter(p => {
                if (!matchesPluginSearch(p, q)) return false;
                if (pluginStatusFilter === 'deleted') return Boolean(p.deleted_at);
                if (p.deleted_at) return false;
                if (pluginStatusFilter === 'all') return true;
                if (pluginStatusFilter === 'flagged') return (p.open_reports_count || 0) > 0;
                return p.status === pluginStatusFilter;
            })
            .sort((a, b) => {
                if (pluginSortBy === 'recently_updated') {
                    return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
                }
                if (pluginSortBy === 'newest') {
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                }
                if (pluginSortBy === 'downloads') {
                    return (b.downloads || 0) - (a.downloads || 0);
                }
                if (pluginSortBy === 'name') {
                    return (a.name || '').localeCompare(b.name || '');
                }
                return 0;
            });
    }, [plugins, searchQuery, pluginStatusFilter, pluginSortBy]);

    const filteredReports = reports.filter(r => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
            r.plugin_name?.toLowerCase().includes(q) ||
            r.reporter_username?.toLowerCase().includes(q) ||
            r.reason?.toLowerCase().includes(q) ||
            r.review_comment?.toLowerCase().includes(q);
        const matchesStatus = reportStatusFilter === 'all' || r.status === reportStatusFilter;
        return matchesSearch && matchesStatus;
    });

    const filteredLogs = logs.filter(l => {
        const matchesSearch =
            l.moderator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.target_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.target_id.toString().includes(searchQuery);

        const matchesAction = logFilterAction === 'all' || l.action === logFilterAction;
        const matchesModerator = logFilterModerator === 'all' || l.moderator_name === logFilterModerator;

        return matchesSearch && matchesAction && matchesModerator;
    });

    const uniqueModerators = Array.from(new Set(logs.map(l => l.moderator_name)));

    // ── Analytics Computations ────────────────────────────────────────────────
    const analyticsChartData = useMemo(() => {
        const daily = adminAnalytics?.timeline?.daily_30d || [];
        const monthly = adminAnalytics?.timeline?.monthly_12m || [];
        if (analyticsTimeframe === '7d') {
            return daily.slice(-7);
        }
        if (analyticsTimeframe === '30d') {
            return daily;
        }
        return monthly;
    }, [adminAnalytics, analyticsTimeframe]);

    const recentlyUpdatedList = useMemo(() => {
        const rawList: any[] =
            adminAnalytics?.recently_updated_plugins ||
            [...plugins]
                .filter(p => !p.deleted_at)
                .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
                .slice(0, 25);

        const q = searchQuery.toLowerCase().trim();
        return rawList.filter(p => {
            if (!matchesPluginSearch(p, q)) return false;
            const createdMs = p.created_at ? new Date(p.created_at).getTime() : 0;
            const updatedMs = p.updated_at ? new Date(p.updated_at).getTime() : createdMs;
            const isUpdate = (p.versions_count || 1) > 1 || updatedMs - createdMs > 5 * 60 * 1000;
            if (recentActivityFilter === 'updates') return isUpdate;
            if (recentActivityFilter === 'uploads') return !isUpdate;
            return true;
        });
    }, [adminAnalytics, plugins, searchQuery, recentActivityFilter]);

    const status = (deletedAt?: string) =>
        deletedAt ? (
            <span className="status">
                <span className="mark-box mark-box-danger">
                    <X />
                </span>
                Deleted
            </span>
        ) : (
            <span className="status">
                <span className="mark-box mark-box-success">
                    <Check />
                </span>
                Active
            </span>
        );

    const pluginStatusBadge = (p: any) => {
        if (p.deleted_at) {
            return (
                <span className="status">
                    <span className="mark-box mark-box-danger">
                        <X />
                    </span>
                    Deleted
                </span>
            );
        }
        switch (p.status) {
            case 'published':
                return (
                    <span className="status">
                        <span className="mark-box mark-box-success">
                            <Check />
                        </span>
                        Published
                    </span>
                );
            case 'under_review':
                return p.claimed_by_name ? (
                    <span className="tag tag-info" title="Claimed for review (60 min lease)">
                        In Review (@{p.claimed_by_name})
                    </span>
                ) : (
                    <span className="tag tag-warning">Pending Review</span>
                );
            case 'rejected':
                return <span className="tag tag-danger">Changes Requested</span>;
            case 'draft':
                return (
                    <span className="tag tag-fg">
                        <Lock size={12} /> Draft
                    </span>
                );
            default:
                return <span className="tag tag-fg">{p.status || 'Draft'}</span>;
        }
    };

    const renderReadinessSignals = (p: any) => {
        const hasBin = Boolean(p.has_binary);
        const hasDesc = Boolean(p.has_description);
        const hasIcon = Boolean(p.has_icon);
        const hasMedia = (p.screenshots_count || 0) > 0;

        return (
            <div className="sf-checks" title={`Binary: ${formatBytes(p.file_size)} • Screenshots: ${p.screenshots_count || 0} • Commands: ${p.commands_count || 0}`}>
                <span className={`sf-check-pill ${hasBin ? 'sf-check-ok' : 'sf-check-warn'}`}>
                    {hasBin ? <Check /> : <X />} WASM
                </span>
                <span className={`sf-check-pill ${hasDesc ? 'sf-check-ok' : 'sf-check-warn'}`}>
                    {hasDesc ? <Check /> : <X />} Docs
                </span>
                <span className={`sf-check-pill ${hasIcon ? 'sf-check-ok' : 'sf-check-warn'}`}>
                    {hasIcon ? <Check /> : <X />} Icon
                </span>
                <span className={`sf-check-pill ${hasMedia ? 'sf-check-ok' : 'sf-check-warn'}`}>
                    {hasMedia ? <Check /> : <X />} Media
                </span>
            </div>
        );
    };

    const roleTone: Record<string, string> = {
        admin: 'tag-pumpkin',
        moderator: 'tag-info',
        reviewer: 'tag-success',
        user: 'tag-fg',
    };
    const typeTone: Record<string, string> = {
        free: 'tag-success',
        paid: 'tag-pumpkin',
        adwall: 'tag-info',
    };

    const details: [string, any][] = !selectedItem
        ? []
        : selectedItem.type === 'user'
          ? [
                ['ID', selectedItem.data.id],
                ['Username', selectedItem.data.username],
                ['Email', selectedItem.data.email],
                ['Role', selectedItem.data.role],
                ['Developer Account', selectedItem.data.is_developer ? 'Yes' : 'No'],
                ['Verified Badge', selectedItem.data.is_verified ? 'Verified' : 'Standard'],
                ['Published / Total Plugins', selectedItem.data.plugin_count ?? 0],
                ...(isAdmin ? [['Stripe Ready', selectedItem.data.stripe_ready ? 'Yes' : 'No'] as [string, any]] : []),
                ['2FA Enabled', selectedItem.data.totp_enabled ? 'Yes' : 'No'],
                ['Passkey Enabled', selectedItem.data.has_passkey ? 'Yes' : 'No'],
                ['Created', new Date(selectedItem.data.created_at).toLocaleString()],
                ['Status', selectedItem.data.deleted_at ? `Deleted at ${new Date(selectedItem.data.deleted_at).toLocaleString()}` : 'Active'],
            ]
          : selectedItem.type === 'plugin'
            ? [
                  ['ID / Public ID', `${selectedItem.data.id} (${selectedItem.data.public_id || '—'})`],
                  ['Name', selectedItem.data.name],
                  ['Version', selectedItem.data.version ? `v${selectedItem.data.version}` : '—'],
                  ['Pumpkin API Target', selectedItem.data.api_version ? `v${selectedItem.data.api_version}` : '—'],
                  ['Binary File Size', formatBytes(selectedItem.data.file_size)],
                  ['SHA-256 Digest', selectedItem.data.sha256 ? <code className="mono">{selectedItem.data.sha256}</code> : 'No binary uploaded'],
                  [
                      'Permissions',
                      selectedItem.data.wasm_capabilities?.permissions?.length
                          ? selectedItem.data.wasm_capabilities.permissions.join(', ')
                          : selectedItem.data.has_binary
                            ? 'None'
                            : '—',
                  ],
                  [
                      'Dependencies',
                      selectedItem.data.wasm_capabilities?.dependencies?.length
                          ? selectedItem.data.wasm_capabilities.dependencies.join(', ')
                          : 'None',
                  ],
                  [
                      'WASM Capabilities',
                      selectedItem.data.wasm_capabilities?.capabilities?.length
                          ? selectedItem.data.wasm_capabilities.capabilities.join(', ')
                          : selectedItem.data.has_binary
                            ? 'Standard Sandbox (events, commands)'
                            : '—',
                  ],
                  ['Developer', `@${selectedItem.data.dev_name}${selectedItem.data.dev_verified ? ' (Verified)' : ''}`],
                  ['Developer Security', selectedItem.data.dev_secure_auth ? '2FA / Passkey Enabled' : 'No 2FA / Passkey'],
                  ['License & Pricing', `${selectedItem.data.type} (€${((selectedItem.data.price_cents || 0) / 100).toFixed(2)})`],
                  ['Category', selectedItem.data.category || '—'],
                  [
                      'Source Repository',
                      selectedItem.data.source_link ? (
                          <a href={selectedItem.data.source_link} target="_blank" rel="noreferrer" className="link">
                              {selectedItem.data.source_link}
                          </a>
                      ) : (
                          'Not provided'
                      ),
                  ],
                  ['Downloads', (selectedItem.data.downloads ?? 0).toLocaleString()],
                  ['Created / Uploaded', selectedItem.data.created_at ? new Date(selectedItem.data.created_at).toLocaleString() : '—'],
                  ['Last Updated', selectedItem.data.updated_at ? new Date(selectedItem.data.updated_at).toLocaleString() : '—'],
                  ['Review Status', selectedItem.data.deleted_at ? `Deleted at ${new Date(selectedItem.data.deleted_at).toLocaleString()}` : selectedItem.data.status || 'draft'],
                  ...(selectedItem.data.claimed_by_name ? [['Claimed By', `@${selectedItem.data.claimed_by_name}`] as [string, any]] : []),
                  ...(selectedItem.data.rejection_reason ? [['Reviewer Feedback', selectedItem.data.rejection_reason] as [string, any]] : []),
              ]
            : selectedItem.type === 'report'
              ? [
                    ['Report ID', selectedItem.data.id],
                    ['Target Type', selectedItem.data.target_type],
                    ['Plugin', `${selectedItem.data.plugin_name} (${selectedItem.data.plugin_public_id})`],
                    ['Reported By', `@${selectedItem.data.reporter_username}`],
                    ['Reason', selectedItem.data.reason],
                    ...(selectedItem.data.review_comment
                        ? [
                              ['Review Author', `@${selectedItem.data.review_author_username || 'Unknown'}`] as [string, any],
                              ['Review Rating', `${selectedItem.data.review_rating} / 5`] as [string, any],
                              ['Review Content', selectedItem.data.review_comment] as [string, any],
                          ]
                        : []),
                    ['Status', selectedItem.data.status],
                    ['Submitted At', new Date(selectedItem.data.created_at).toLocaleString()],
                    ...(selectedItem.data.resolved_by_username
                        ? [
                              ['Resolved By', `@${selectedItem.data.resolved_by_username}`] as [string, any],
                              ['Resolution Note', selectedItem.data.resolution_note || '—'] as [string, any],
                          ]
                        : []),
                ]
              : [
                    ['Date', new Date(selectedItem.data.created_at).toLocaleString()],
                    ['Moderator', selectedItem.data.moderator_name],
                    ['Action', selectedItem.data.action],
                    ['Target Type', selectedItem.data.target_type],
                    ['Target ID', selectedItem.data.target_id],
                    ['Reason', selectedItem.data.reason || 'No reason provided'],
                ];

    const tabs: [StaffTab, string][] = [
        ['queue', kpis.pendingReview > 0 ? `Review Queue (${kpis.pendingReview} Pending)` : 'Review Queue'],
        ['plugins', `All Plugins (${kpis.totalActivePlugins})`],
        ...(isStaff
            ? [
                  ['reports', kpis.openReports > 0 ? `User Reports (${kpis.openReports} Open)` : 'User Reports'] as [StaffTab, string],
                  ['users', 'Users & Roles'] as [StaffTab, string],
              ]
            : []),
        ['logs', 'Audit Logs'],
        ...(isAdmin ? [['analytics', 'Platform Analytics'] as [StaffTab, string]] : []),
    ];

    const renderPluginActions = (p: any) => (
        <div className="row sf-actions">
            <Link
                className="button button-sm"
                to={getPluginUrl(p)}
                target="_blank"
                rel="noreferrer"
                title={
                    p.status === 'draft'
                        ? 'Inspect private draft page (visible only to Admins, Moderators & Developer)'
                        : 'Inspect plugin store page'
                }
            >
                <ExternalLink size={14} />
                {p.status === 'draft' ? 'Inspect Draft' : 'Inspect'}
            </Link>
            <button className="button button-sm" onClick={() => setSelectedItem({ type: 'plugin', data: p })}>
                Readiness
            </button>
            {!p.deleted_at && p.status === 'under_review' && !p.claimed_by_id && (
                <button className="button button-primary button-sm" onClick={() => claimPlugin(p.id)}>
                    Claim Review
                </button>
            )}
            {!p.deleted_at &&
                p.status === 'under_review' &&
                p.claimed_by_id &&
                (p.claimed_by_id === currentUser?.id || isAdmin) && (
                    <>
                        <button className="button button-primary button-sm" onClick={() => approvePlugin(p.id)}>
                            Approve
                        </button>
                        <button
                            className="button button-sm"
                            onClick={() =>
                                openActionModal({
                                    kind: 'reject_plugin',
                                    targetId: p.id,
                                    targetName: p.name,
                                    extra: p,
                                })
                            }
                        >
                            Request Changes
                        </button>
                        <button className="button button-ghost button-sm" onClick={() => unclaimPlugin(p.id)}>
                            Release
                        </button>
                    </>
                )}
            {!p.deleted_at && p.status === 'published' && isStaff && (
                <button
                    className="button button-sm"
                    onClick={() =>
                        openActionModal({
                            kind: 'reject_plugin',
                            targetId: p.id,
                            targetName: p.name,
                            extra: p,
                        })
                    }
                >
                    Unapprove
                </button>
            )}
            {isStaff && !p.deleted_at && (
                <button
                    className="button button-danger button-sm"
                    onClick={() =>
                        openActionModal({
                            kind: 'delete_plugin',
                            targetId: p.id,
                            targetName: p.name,
                        })
                    }
                >
                    Remove
                </button>
            )}
        </div>
    );

    const renderPluginsTable = (list: any[], mode: 'queue' | 'catalog') => (
        <div className="scroll-x">
            <table className="ledger">
                <thead>
                    <tr>
                        <th>Plugin</th>
                        <th>Developer</th>
                        <th>{mode === 'queue' ? 'Submitted / Updated' : 'Downloads & Updated'}</th>
                        <th>Pre-Launch Checks</th>
                        <th>License</th>
                        <th>Status</th>
                        <th className="end">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {list.map(p => (
                        <tr key={p.id} className={p.deleted_at ? 'sf-row-off' : undefined}>
                            <td>
                                <div className="sf-plugin-cell">
                                    <span className="avatar">
                                        {p.preview_url ? <img src={p.preview_url} alt="" /> : p.name?.charAt(0)?.toUpperCase() || 'P'}
                                    </span>
                                    <div className="sf-plugin-meta">
                                        <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
                                            <strong>{p.name}</strong>
                                            {p.category && <span className="tag tag-fg">{p.category}</span>}
                                            {(p.open_reports_count || 0) > 0 && (
                                                <span className="tag tag-danger" title="Open user reports on this plugin">
                                                    <Flag size={11} /> {p.open_reports_count}
                                                </span>
                                            )}
                                        </div>
                                        <span className="small mono muted">
                                            #{p.id} · {p.version ? `v${p.version}` : 'No build'}
                                            {p.api_version ? ` · API v${p.api_version}` : ''}
                                            {p.file_size ? ` · ${formatBytes(p.file_size)}` : ''}
                                        </span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div className="sf-plugin-meta">
                                    <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
                                        <Link className="link" to={`/profile/${p.dev_name}`}>
                                            @{p.dev_name}
                                        </Link>
                                        {p.dev_verified && (
                                            <span className="tag tag-info" title="Verified Developer">
                                                Verified
                                            </span>
                                        )}
                                    </div>
                                    <span className="small muted">
                                        {p.dev_secure_auth ? '2FA/Passkey OK' : 'No 2FA'}
                                        {p.type === 'paid' ? (p.dev_stripe_ready ? ' · Stripe Ready' : ' · No Stripe') : ''}
                                    </span>
                                </div>
                            </td>
                            <td>
                                <div className="sf-plugin-meta">
                                    {mode === 'catalog' ? (
                                        <strong>
                                            {(p.downloads ?? 0).toLocaleString()} dl · {p.versions_count || 1} rel
                                        </strong>
                                    ) : (
                                        <strong>{formatRelativeTime(p.updated_at || p.created_at)}</strong>
                                    )}
                                    <span className="small muted" title={p.updated_at ? new Date(p.updated_at).toLocaleString() : undefined}>
                                        {mode === 'catalog'
                                            ? `Updated ${formatRelativeTime(p.updated_at || p.created_at)}`
                                            : p.created_at
                                              ? `Uploaded ${new Date(p.created_at).toLocaleDateString()}`
                                              : '—'}
                                    </span>
                                </div>
                            </td>
                            <td>{renderReadinessSignals(p)}</td>
                            <td>
                                <div className="sf-plugin-meta">
                                    <span className={`tag ${typeTone[p.type] || ''}`}>{p.type}</span>
                                    {p.type === 'paid' && <span className="small mono">€{((p.price_cents || 0) / 100).toFixed(2)}</span>}
                                </div>
                            </td>
                            <td>{pluginStatusBadge(p)}</td>
                            <td>{renderPluginActions(p)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="page stack sf-pad sf-staff">
            <header className="stack">
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
                        <span className="label">Trust, Safety &amp; Release Operations</span>
                        <h1 className="display-2">
                            Staff <span className="mark">Console</span>
                        </h1>
                    </div>
                    <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                        {isStaff && (
                            <button
                                type="button"
                                className="button button-sm"
                                onClick={handleRescanWasmMetadata}
                                disabled={rescanBusy || loading}
                                title="Re-run all existing plugin .wasm binaries through the sandboxed WIT get-metadata extractor"
                            >
                                <FileCode2 size={14} /> {rescanBusy ? 'Scanning WASM...' : 'Rescan WASM Metadata'}
                            </button>
                        )}
                        <button type="button" className="button button-sm" onClick={fetchAllOverviewData} disabled={loading}>
                            <RefreshCw size={14} /> Refresh Console
                        </button>
                    </div>
                </div>
                {rescanNotice && (
                    <div className="notice notice-success">
                        <Check />
                        <span>{rescanNotice}</span>
                    </div>
                )}

                {/* Big-Platform KPI Overview Strip (Play Console / App Store Connect / YT Studio style) */}
                <div className="sf-kpis">
                    <button
                        type="button"
                        className="sf-kpi"
                        data-active={activeTab === 'queue'}
                        onClick={() => {
                            setActiveTab('queue');
                            setQueueFilter(kpis.pendingReview > 0 ? 'under_review' : 'all');
                        }}
                    >
                        <div className="sf-kpi-head">
                            <span className="label">Review Queue</span>
                            <ShieldCheck size={18} className="pumpkin" />
                        </div>
                        <span className="sf-kpi-val">{kpis.pendingReview} Pending</span>
                        <div className="sf-kpi-meta">
                            <span>{kpis.claimedReview} Claimed</span>
                            <span>•</span>
                            <span>{kpis.rejectedCount} Needs Changes</span>
                        </div>
                    </button>

                    <button
                        type="button"
                        className="sf-kpi"
                        data-active={activeTab === 'plugins'}
                        onClick={() => {
                            setActiveTab('plugins');
                            setPluginStatusFilter('all');
                        }}
                    >
                        <div className="sf-kpi-head">
                            <span className="label">All Plugins</span>
                            <Package size={18} className="pumpkin" />
                        </div>
                        <span className="sf-kpi-val">{kpis.publishedCount} Live</span>
                        <div className="sf-kpi-meta">
                            {isStaff && (
                                <>
                                    <span>{kpis.draftCount} Drafts</span>
                                    <span>•</span>
                                </>
                            )}
                            <span>{kpis.totalActivePlugins} Total</span>
                        </div>
                    </button>

                    {isStaff && (
                        <button
                            type="button"
                            className="sf-kpi"
                            data-active={activeTab === 'reports'}
                            onClick={() => {
                                setActiveTab('reports');
                                setReportStatusFilter('open');
                            }}
                        >
                            <div className="sf-kpi-head">
                                <span className="label">Flagged Content</span>
                                <Flag size={18} className="pumpkin" />
                            </div>
                            <span className="sf-kpi-val">{kpis.openReports} Open</span>
                            <div className="sf-kpi-meta">
                                <span>{kpis.resolvedReports} Resolved</span>
                                <span>•</span>
                                <span>Plugin &amp; Review Reports</span>
                            </div>
                        </button>
                    )}

                    {isStaff && (
                        <button
                            type="button"
                            className="sf-kpi"
                            data-active={activeTab === 'users'}
                            onClick={() => setActiveTab('users')}
                        >
                            <div className="sf-kpi-head">
                                <span className="label">Users &amp; Security</span>
                                <Users size={18} className="pumpkin" />
                            </div>
                            <span className="sf-kpi-val">{kpis.activeUsersCount} Active</span>
                            <div className="sf-kpi-meta">
                                <span>{kpis.verifiedDevs} Verified Devs</span>
                                <span>•</span>
                                <span>{kpis.mfaUsers} 2FA/Passkey</span>
                            </div>
                        </button>
                    )}

                    {isAdmin && (
                        <button
                            type="button"
                            className="sf-kpi"
                            data-active={activeTab === 'analytics'}
                            onClick={() => setActiveTab('analytics')}
                        >
                            <div className="sf-kpi-head">
                                <span className="label">Platform Analytics</span>
                                <BarChart3 size={18} className="pumpkin" />
                            </div>
                            <span className="sf-kpi-val">+{kpis.uploaded30d} (30d)</span>
                            <div className="sf-kpi-meta">
                                <span>{kpis.updated7d} Updated (7d)</span>
                                <span>•</span>
                                <span>+{kpis.newUsers30d} Users (30d)</span>
                            </div>
                        </button>
                    )}
                </div>

                <div className="tabs" role="tablist">
                    {tabs.map(([id, label]) => (
                        <button key={id} role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)}>
                            {label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="row sf-staff-controls">
                <label className="search">
                    <Search />
                    <input
                        id="adminSearchInput"
                        name="adminSearch"
                        className="input"
                        type="search"
                        placeholder={
                            activeTab === 'queue'
                                ? 'Search review queue by plugin, developer, or ID...'
                                : activeTab === 'analytics'
                                  ? 'Filter recently updated plugins...'
                                  : `Search ${activeTab}...`
                        }
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                    />
                </label>
                {activeTab === 'queue' && (
                    <Select
                        options={[
                            { value: 'under_review', label: `Pending Review (${kpis.pendingReview})` },
                            { value: 'unclaimed', label: `Unclaimed (${kpis.unclaimedReview})` },
                            { value: 'claimed_by_me', label: `Claimed by Me (${kpis.claimedByMe})` },
                            { value: 'rejected', label: `Changes Requested (${kpis.rejectedCount})` },
                            { value: 'all', label: `All Queue & Rejected (${kpis.pendingReview + kpis.rejectedCount})` },
                        ]}
                        value={queueFilter}
                        onChange={setQueueFilter}
                        aria-label="Filter Review Queue"
                    />
                )}
                {activeTab === 'plugins' && (
                    <>
                        <Select
                            options={[
                                { value: 'all', label: `All Active (${kpis.totalActivePlugins})` },
                                { value: 'published', label: `Published (${kpis.publishedCount})` },
                                { value: 'under_review', label: `Pending Review (${kpis.pendingReview})` },
                                { value: 'rejected', label: `Changes Requested (${kpis.rejectedCount})` },
                                ...(isStaff ? [{ value: 'draft', label: `Drafts (${kpis.draftCount})` }] : []),
                                { value: 'flagged', label: 'Flagged by Users' },
                                { value: 'deleted', label: 'Deleted' },
                            ]}
                            value={pluginStatusFilter}
                            onChange={setPluginStatusFilter}
                            aria-label="Filter by Status"
                        />
                        <Select
                            options={[
                                { value: 'recently_updated', label: 'Sort: Recently Updated' },
                                { value: 'newest', label: 'Sort: Newest Uploaded' },
                                { value: 'downloads', label: 'Sort: Most Downloads' },
                                { value: 'name', label: 'Sort: Name (A–Z)' },
                            ]}
                            value={pluginSortBy}
                            onChange={setPluginSortBy}
                            aria-label="Sort Plugins"
                        />
                    </>
                )}
                {activeTab === 'reports' && (
                    <Select
                        options={[
                            { value: 'open', label: `Open Reports (${kpis.openReports})` },
                            { value: 'resolved', label: 'Resolved' },
                            { value: 'dismissed', label: 'Dismissed' },
                            { value: 'all', label: 'All Reports' },
                        ]}
                        value={reportStatusFilter}
                        onChange={setReportStatusFilter}
                        aria-label="Filter Reports"
                    />
                )}
                {activeTab === 'logs' && (
                    <>
                        <Select
                            options={[
                                { value: 'all', label: 'All Actions' },
                                { value: 'approve_plugin', label: 'Approve Plugin' },
                                { value: 'reject_plugin', label: 'Reject Plugin' },
                                { value: 'resolve_report', label: 'Resolve Report' },
                                { value: 'dismiss_report', label: 'Dismiss Report' },
                                { value: 'soft_delete', label: 'Soft Delete' },
                                { value: 'role_change', label: 'Role Change' },
                            ]}
                            value={logFilterAction}
                            onChange={setLogFilterAction}
                            aria-label="All Actions"
                        />
                        <Select
                            options={[{ value: 'all', label: 'All Moderators' }, ...uniqueModerators]}
                            value={logFilterModerator}
                            onChange={setLogFilterModerator}
                            aria-label="All Moderators"
                        />
                    </>
                )}
                {activeTab === 'analytics' && isAdmin && (
                    <div className="segmented" role="group" aria-label="Analytics Timeframe">
                        <button
                            type="button"
                            aria-pressed={analyticsTimeframe === '7d'}
                            onClick={() => setAnalyticsTimeframe('7d')}
                        >
                            Week (7d)
                        </button>
                        <button
                            type="button"
                            aria-pressed={analyticsTimeframe === '30d'}
                            onClick={() => setAnalyticsTimeframe('30d')}
                        >
                            Month (30d)
                        </button>
                        <button
                            type="button"
                            aria-pressed={analyticsTimeframe === '365d'}
                            onClick={() => setAnalyticsTimeframe('365d')}
                        >
                            Year (12m)
                        </button>
                    </div>
                )}
            </div>

            {!hasSecureAuth && (
                <div className="notice notice-warning">
                    <span className="mark-box mark-box-warning">
                        <CircleAlert />
                    </span>
                    <p className="notice-text">
                        Staff accounts require <strong>Two-Factor Authentication (2FA)</strong> or a <strong>Passkey</strong> to access moderation and admin endpoints.
                    </p>
                    <Link to="/settings" className="button button-primary button-sm">
                        Enable 2FA / Passkey
                    </Link>
                </div>
            )}

            {error && (
                <div className="notice notice-danger">
                    <span className="mark-box mark-box-danger">
                        <CircleAlert />
                    </span>
                    <p className="notice-text">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="sf-loader">
                    <span className="loading" />
                    <p className="small">Loading staff console…</p>
                </div>
            ) : activeTab === 'queue' ? (
                queuePlugins.length === 0 ? (
                    <div className="blank">
                        <p className="h3">
                            {queueFilter === 'under_review'
                                ? 'Review queue is clear!'
                                : 'No plugin submissions matching this queue filter.'}
                        </p>
                        <p className="small muted">
                            {queueFilter === 'under_review'
                                ? 'All submitted plugins have been reviewed. You can inspect changes-requested submissions or browse the full catalog.'
                                : 'Try switching the queue filter or searching the full plugin catalog.'}
                        </p>
                        <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
                            {queueFilter !== 'all' && (
                                <button type="button" className="button button-sm" onClick={() => setQueueFilter('all')}>
                                    Show All Queue &amp; Rejected ({kpis.pendingReview + kpis.rejectedCount})
                                </button>
                            )}
                            <button
                                type="button"
                                className="button button-primary button-sm"
                                onClick={() => {
                                    setActiveTab('plugins');
                                    setPluginStatusFilter('all');
                                }}
                            >
                                Browse All Plugins ({kpis.totalActivePlugins})
                            </button>
                        </div>
                    </div>
                ) : (
                    renderPluginsTable(queuePlugins, 'queue')
                )
            ) : activeTab === 'plugins' ? (
                filteredPlugins.length === 0 ? (
                    <div className="blank">
                        <p className="h3">No plugins match your filter.</p>
                        <p className="small muted">Try clearing your search query or selecting a different status filter.</p>
                    </div>
                ) : (
                    renderPluginsTable(filteredPlugins, 'catalog')
                )
            ) : activeTab === 'reports' ? (
                filteredReports.length === 0 ? (
                    <div className="blank">
                        <p className="h3">No reports matching this filter.</p>
                        <p className="small muted">All user-submitted plugin and review reports appear here for staff triage.</p>
                    </div>
                ) : (
                    <div className="scroll-x">
                        <table className="ledger">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Target</th>
                                    <th>Plugin</th>
                                    <th>Reason &amp; Evidence</th>
                                    <th>Reporter</th>
                                    <th>Status</th>
                                    <th className="end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReports.map(r => (
                                    <tr key={r.id}>
                                        <td className="mono">#{r.id}</td>
                                        <td>
                                            <span className={`tag ${r.target_type === 'plugin' ? 'tag-pumpkin' : 'tag-info'}`}>
                                                {r.target_type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="sf-plugin-meta">
                                                <strong>{r.plugin_name}</strong>
                                                <span className="small mono muted">{r.plugin_public_id}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="sf-plugin-meta">
                                                <strong>{r.reason}</strong>
                                                {r.review_comment && (
                                                    <div className="sf-report-quote">
                                                        <span className="mono muted">@{r.review_author_username} ({r.review_rating}★): </span>
                                                        "{r.review_comment}"
                                                        {r.review_deleted && <span className="tag tag-danger" style={{ marginLeft: 6 }}>Deleted</span>}
                                                    </div>
                                                )}
                                                {r.resolution_note && (
                                                    <span className="small muted">Note: {r.resolution_note}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>@{r.reporter_username}</td>
                                        <td>
                                            {r.status === 'open' ? (
                                                <span className="tag tag-warning">Open</span>
                                            ) : r.status === 'resolved' ? (
                                                <span className="tag tag-success">Resolved</span>
                                            ) : (
                                                <span className="tag tag-fg">Dismissed</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="row sf-actions">
                                                <Link
                                                    className="button button-sm"
                                                    to={getPluginUrl({ id: r.plugin_id, public_id: r.plugin_public_id, name: r.plugin_name })}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    <ExternalLink size={14} /> Inspect Plugin
                                                </Link>
                                                <button className="button button-sm" onClick={() => setSelectedItem({ type: 'report', data: r })}>
                                                    Details
                                                </button>
                                                {r.status === 'open' && (
                                                    <button
                                                        className="button button-primary button-sm"
                                                        onClick={() =>
                                                            openActionModal({
                                                                kind: 'resolve_report',
                                                                targetId: r.id,
                                                                targetName: `${r.target_type} report on ${r.plugin_name}`,
                                                                extra: r,
                                                            })
                                                        }
                                                    >
                                                        Resolve / Triage
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : activeTab === 'users' ? (
                <div className="scroll-x">
                    <table className="ledger">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>User</th>
                                <th>Email</th>
                                <th>Security &amp; Dev</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th className="end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(u => (
                                <tr key={u.id} className={u.deleted_at ? 'sf-row-off' : undefined}>
                                    <td className="mono">{u.id}</td>
                                    <td>
                                        <div className="sf-plugin-meta">
                                            <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
                                                <strong>{u.username}</strong>
                                                {u.is_verified && <span className="tag tag-info">Verified</span>}
                                            </div>
                                            {u.plugin_count > 0 && <span className="small muted">{u.plugin_count} plugin(s)</span>}
                                        </div>
                                    </td>
                                    <td>{u.email}</td>
                                    <td>
                                        <div className="sf-checks">
                                            <span className={`sf-check-pill ${u.totp_enabled || u.has_passkey ? 'sf-check-ok' : 'sf-check-warn'}`}>
                                                {u.totp_enabled || u.has_passkey ? <Check /> : <X />} 2FA/Passkey
                                            </span>
                                            {u.is_developer && (
                                                <span className="sf-check-pill sf-check-ok">
                                                    <Check /> Dev
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {isAdmin && !u.deleted_at ? (
                                            <Select
                                                options={[
                                                    { value: 'user', label: 'User' },
                                                    { value: 'reviewer', label: 'Reviewer' },
                                                    { value: 'moderator', label: 'Moderator' },
                                                    { value: 'admin', label: 'Admin' },
                                                ]}
                                                value={u.role}
                                                onChange={role => role !== u.role && changeRole(u.id, role)}
                                                aria-label="Role"
                                            />
                                        ) : (
                                            <span className={`tag ${roleTone[u.role] || ''}`}>{u.role}</span>
                                        )}
                                    </td>
                                    <td>{status(u.deleted_at)}</td>
                                    <td>
                                        <div className="row sf-actions">
                                            <button className="button button-sm" onClick={() => setSelectedItem({ type: 'user', data: u })}>
                                                View
                                            </button>
                                            {!u.deleted_at && (
                                                <button
                                                    className="button button-danger button-sm"
                                                    onClick={() =>
                                                        openActionModal({
                                                            kind: 'delete_user',
                                                            targetId: u.id,
                                                            targetName: `@${u.username}`,
                                                        })
                                                    }
                                                >
                                                    Deactivate
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : activeTab === 'analytics' && isAdmin ? (
                <div className="stack" style={{ '--gap': 'var(--s-5)' } as React.CSSProperties}>
                    {/* 1. Week / Month / Year Upload, Update, User & Download Cadence Cards */}
                    <div className="sf-kpis">
                        <div className="sf-kpi">
                            <div className="sf-kpi-head">
                                <span className="label">New Plugins Uploaded</span>
                                <Upload size={18} className="pumpkin" />
                            </div>
                            <span className="sf-kpi-val">
                                +{
                                    analyticsTimeframe === '7d'
                                        ? (adminAnalytics?.plugins?.uploaded_7d ?? kpis.uploaded7d)
                                        : analyticsTimeframe === '30d'
                                          ? (adminAnalytics?.plugins?.uploaded_30d ?? kpis.uploaded30d)
                                          : (adminAnalytics?.plugins?.uploaded_365d ?? kpis.uploaded365d)
                                }{' '}
                                <span className="small muted">
                                    ({analyticsTimeframe === '7d' ? 'This Week' : analyticsTimeframe === '30d' ? 'This Month' : 'This Year'})
                                </span>
                            </span>
                            <div className="sf-an-periods">
                                <div className="sf-an-period">
                                    <span className="small muted">Week (7d)</span>
                                    <strong className="num">{adminAnalytics?.plugins?.uploaded_7d ?? kpis.uploaded7d}</strong>
                                </div>
                                <div className="sf-an-period">
                                    <span className="small muted">Month (30d)</span>
                                    <strong className="num">{adminAnalytics?.plugins?.uploaded_30d ?? kpis.uploaded30d}</strong>
                                </div>
                                <div className="sf-an-period">
                                    <span className="small muted">Year (365d)</span>
                                    <strong className="num">{adminAnalytics?.plugins?.uploaded_365d ?? kpis.uploaded365d}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="sf-kpi">
                            <div className="sf-kpi-head">
                                <span className="label">Plugin Updates &amp; Releases</span>
                                <Clock size={18} className="pumpkin" />
                            </div>
                            <span className="sf-kpi-val">
                                {
                                    analyticsTimeframe === '7d'
                                        ? (adminAnalytics?.plugins?.updated_7d ?? kpis.updated7d)
                                        : analyticsTimeframe === '30d'
                                          ? (adminAnalytics?.plugins?.updated_30d ?? kpis.updated30d)
                                          : (adminAnalytics?.plugins?.updated_365d ?? kpis.uploaded365d)
                                }{' '}
                                <span className="small muted">Updated</span>
                            </span>
                            <div className="sf-an-periods">
                                <div className="sf-an-period">
                                    <span className="small muted">Week (7d)</span>
                                    <strong className="num">
                                        {adminAnalytics?.plugins?.updated_7d ?? kpis.updated7d}
                                    </strong>
                                </div>
                                <div className="sf-an-period">
                                    <span className="small muted">Month (30d)</span>
                                    <strong className="num">
                                        {adminAnalytics?.plugins?.updated_30d ?? kpis.updated30d}
                                    </strong>
                                </div>
                                <div className="sf-an-period">
                                    <span className="small muted">Year (365d)</span>
                                    <strong className="num">
                                        {adminAnalytics?.plugins?.updated_365d ?? kpis.uploaded365d}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        <div className="sf-kpi">
                            <div className="sf-kpi-head">
                                <span className="label">Registered Users</span>
                                <Users size={18} className="pumpkin" />
                            </div>
                            <span className="sf-kpi-val">
                                {(adminAnalytics?.users?.total_active ?? kpis.activeUsersCount).toLocaleString()}{' '}
                                <span className="small muted">Total</span>
                            </span>
                            <div className="sf-an-periods">
                                <div className="sf-an-period">
                                    <span className="small muted">+Week (7d)</span>
                                    <strong className="num">+{adminAnalytics?.users?.new_7d ?? 0}</strong>
                                </div>
                                <div className="sf-an-period">
                                    <span className="small muted">+Month (30d)</span>
                                    <strong className="num">+{adminAnalytics?.users?.new_30d ?? kpis.newUsers30d}</strong>
                                </div>
                                <div className="sf-an-period">
                                    <span className="small muted">+Year (365d)</span>
                                    <strong className="num">+{adminAnalytics?.users?.new_365d ?? kpis.activeUsersCount}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="sf-kpi">
                            <div className="sf-kpi-head">
                                <span className="label">Platform Downloads</span>
                                <Download size={18} className="pumpkin" />
                            </div>
                            <span className="sf-kpi-val">
                                {(adminAnalytics?.activity?.total_downloads ?? 0).toLocaleString()}{' '}
                                <span className="small muted">All-Time</span>
                            </span>
                            <div className="sf-an-periods">
                                <div className="sf-an-period">
                                    <span className="small muted">Week (7d)</span>
                                    <strong className="num">{adminAnalytics?.activity?.downloads_7d ?? 0}</strong>
                                </div>
                                <div className="sf-an-period">
                                    <span className="small muted">Month (30d)</span>
                                    <strong className="num">{adminAnalytics?.activity?.downloads_30d ?? 0}</strong>
                                </div>
                                <div className="sf-an-period">
                                    <span className="small muted">Year (365d)</span>
                                    <strong className="num">{adminAnalytics?.activity?.downloads_365d ?? 0}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Trend Charts: Uploads & Releases + User Signups & Downloads */}
                    <div className="st-grid-2">
                        <section className="panel">
                            <div className="panel-head st-an-head">
                                <Upload className="st-an-icon" />
                                <h3 className="h3">
                                    Plugin Uploads &amp; Version Releases ({analyticsTimeframe === '7d' ? 'Past 7 Days' : analyticsTimeframe === '30d' ? 'Past 30 Days' : 'Past 12 Months'})
                                </h3>
                                <span className="spacer" />
                                <span className="status small">
                                    <span className="dot dot-pumpkin" /> New Plugins
                                </span>
                                <span className="status small">
                                    <span className="dot st-an-dot-fg" /> Version Releases
                                </span>
                            </div>
                            <div className="panel-body">
                                <div className="st-chart st-chart-sm">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analyticsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            {CHART_GRID}
                                            <XAxis dataKey="label" {...CHART_AXIS} dy={8} />
                                            <YAxis allowDecimals={false} {...CHART_AXIS} />
                                            <Tooltip content={<StaffChartTip />} cursor={CHART_CURSOR} />
                                            <Bar dataKey="plugins_uploaded" name="New Plugins" fill="var(--pumpkin)" radius={0} />
                                            <Bar dataKey="plugin_updates" name="Version Releases" fill="var(--fg)" radius={0} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </section>

                        <section className="panel">
                            <div className="panel-head st-an-head">
                                <TrendingUp className="st-an-icon" />
                                <h3 className="h3">
                                    User Signups &amp; Unique Downloads ({analyticsTimeframe === '7d' ? 'Past 7 Days' : analyticsTimeframe === '30d' ? 'Past 30 Days' : 'Past 12 Months'})
                                </h3>
                                <span className="spacer" />
                                <span className="status small">
                                    <span className="dot dot-pumpkin" /> New Users
                                </span>
                                <span className="status small">
                                    <span className="dot st-an-dot-fg" /> Downloads
                                </span>
                            </div>
                            <div className="panel-body">
                                <div className="st-chart st-chart-sm">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={analyticsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            {CHART_GRID}
                                            <XAxis dataKey="label" {...CHART_AXIS} dy={8} />
                                            <YAxis allowDecimals={false} {...CHART_AXIS} />
                                            <Tooltip content={<StaffChartTip />} cursor={CHART_CURSOR} />
                                            <Area
                                                type="linear"
                                                dataKey="downloads"
                                                name="Downloads"
                                                stroke="var(--fg)"
                                                strokeWidth={2.5}
                                                fill="var(--fg)"
                                                fillOpacity={0.08}
                                            />
                                            <Area
                                                type="linear"
                                                dataKey="new_users"
                                                name="New Users"
                                                stroke="var(--pumpkin)"
                                                strokeWidth={2.5}
                                                fill="var(--pumpkin)"
                                                fillOpacity={0.18}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* 3. User Community & Catalog Breakdown */}
                    <div className="st-grid-2">
                        <section className="panel">
                            <div className="panel-head st-an-head">
                                <Users className="st-an-icon" />
                                <h3 className="h3">User &amp; Developer Breakdown</h3>
                            </div>
                            <div className="panel-body stack">
                                <dl className="specs">
                                    <dt>Total Active Users</dt>
                                    <dd>
                                        <strong>{(adminAnalytics?.users?.total_active ?? kpis.activeUsersCount).toLocaleString()}</strong>
                                        {adminAnalytics?.users?.total_deleted > 0 && (
                                            <span className="small muted"> ({adminAnalytics.users.total_deleted} deactivated)</span>
                                        )}
                                    </dd>
                                    <dt>Onboarded Developers</dt>
                                    <dd>
                                        <strong>{adminAnalytics?.users?.developers_count ?? 0}</strong>
                                        <span className="small muted"> ({adminAnalytics?.users?.verified_devs_count ?? kpis.verifiedDevs} verified)</span>
                                    </dd>
                                    <dt>Stripe-Ready Sellers</dt>
                                    <dd>
                                        <strong>{adminAnalytics?.users?.stripe_ready_devs_count ?? 0}</strong>
                                    </dd>
                                    <dt>2FA / Passkey Secured</dt>
                                    <dd>
                                        <strong>{adminAnalytics?.users?.mfa_enabled_count ?? kpis.mfaUsers}</strong>
                                        <span className="small muted">
                                            {' '}
                                            (
                                            {kpis.activeUsersCount > 0
                                                ? Math.round(((adminAnalytics?.users?.mfa_enabled_count ?? kpis.mfaUsers) / kpis.activeUsersCount) * 100)
                                                : 0}
                                            % adoption)
                                        </span>
                                    </dd>
                                    <dt>Staff &amp; Reviewers</dt>
                                    <dd className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
                                        <span className="tag tag-pumpkin">{adminAnalytics?.users?.admins_count ?? 0} Admins</span>
                                        <span className="tag tag-info">{adminAnalytics?.users?.moderators_count ?? 0} Mods</span>
                                        <span className="tag tag-success">{adminAnalytics?.users?.reviewers_count ?? 0} Reviewers</span>
                                    </dd>
                                </dl>
                            </div>
                        </section>

                        <section className="panel">
                            <div className="panel-head st-an-head">
                                <Layers className="st-an-icon" />
                                <h3 className="h3">Catalog &amp; Category Distribution</h3>
                            </div>
                            <div className="panel-body stack">
                                <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
                                    <span className="tag tag-success">
                                        {adminAnalytics?.plugins?.total_published ?? kpis.publishedCount} Published
                                    </span>
                                    <span className="tag tag-warning">
                                        {adminAnalytics?.plugins?.total_under_review ?? kpis.pendingReview} In Queue
                                    </span>
                                    <span className="tag tag-danger">
                                        {adminAnalytics?.plugins?.total_rejected ?? kpis.rejectedCount} Rejected
                                    </span>
                                    <span className="tag tag-fg">
                                        {adminAnalytics?.plugins?.total_drafts ?? kpis.draftCount} Drafts
                                    </span>
                                    <span className="spacer" />
                                    <span className="small muted">
                                        <Star size={13} className="pumpkin" style={{ verticalAlign: '-2px' }} />{' '}
                                        {adminAnalytics?.activity?.avg_rating ? `${adminAnalytics.activity.avg_rating}★` : '—'} (
                                        {adminAnalytics?.activity?.total_reviews ?? 0} reviews)
                                    </span>
                                </div>

                                {adminAnalytics?.categories?.length > 0 ? (
                                    <div className="stack st-an-tight">
                                        {adminAnalytics.categories.slice(0, 6).map((cat: any) => {
                                            const total = Math.max(adminAnalytics?.plugins?.total_active || 1, 1);
                                            const pct = Math.round((cat.count / total) * 100);
                                            return (
                                                <div key={cat.category} className="st-an-version">
                                                    <div className="row">
                                                        <span>{cat.category}</span>
                                                        <span className="spacer" />
                                                        <span className="small num muted">
                                                            {cat.count} {cat.count === 1 ? 'plugin' : 'plugins'} · {(cat.downloads || 0).toLocaleString()} dl
                                                        </span>
                                                    </div>
                                                    <div className="meter meter-pumpkin">
                                                        <span style={{ width: `${Math.max(pct, 4)}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="small muted">No category breakdown available yet.</p>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* 4. Recently Updated & Uploaded Plugins Feed */}
                    <section className="panel">
                        <div className="panel-head st-an-head">
                            <Clock className="st-an-icon" />
                            <h3 className="h3">Recently Updated &amp; Uploaded Plugins</h3>
                            <span className="spacer" />
                            <div className="segmented" role="group" aria-label="Filter recent plugin activity">
                                <button
                                    type="button"
                                    aria-pressed={recentActivityFilter === 'all'}
                                    onClick={() => setRecentActivityFilter('all')}
                                >
                                    All Activity
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={recentActivityFilter === 'updates'}
                                    onClick={() => setRecentActivityFilter('updates')}
                                >
                                    Updates Only
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={recentActivityFilter === 'uploads'}
                                    onClick={() => setRecentActivityFilter('uploads')}
                                >
                                    New Uploads
                                </button>
                            </div>
                        </div>
                        <div className="panel-body" style={{ padding: 0 }}>
                            {recentlyUpdatedList.length === 0 ? (
                                <div className="blank">
                                    <p className="h3">No recent plugin activity matching this filter.</p>
                                </div>
                            ) : (
                                <div className="scroll-x">
                                    <table className="ledger">
                                        <thead>
                                            <tr>
                                                <th>Plugin</th>
                                                <th>Update / Release Details</th>
                                                <th>Developer</th>
                                                <th>Status</th>
                                                <th>When</th>
                                                <th className="end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentlyUpdatedList.map((p: any) => {
                                                const createdMs = p.created_at ? new Date(p.created_at).getTime() : 0;
                                                const updatedMs = p.updated_at ? new Date(p.updated_at).getTime() : createdMs;
                                                const isUpdate = (p.versions_count || 1) > 1 || updatedMs - createdMs > 5 * 60 * 1000;
                                                const fullPlugin = plugins.find(item => item.id === p.id) || p;

                                                return (
                                                    <tr key={p.id}>
                                                        <td>
                                                            <div className="sf-plugin-cell">
                                                                <span className="avatar">
                                                                    {p.preview_url ? (
                                                                        <img src={p.preview_url} alt="" />
                                                                    ) : (
                                                                        p.name?.charAt(0)?.toUpperCase() || 'P'
                                                                    )}
                                                                </span>
                                                                <div className="sf-plugin-meta">
                                                                    <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
                                                                        <strong>{p.name}</strong>
                                                                        {p.category && <span className="tag tag-fg">{p.category}</span>}
                                                                    </div>
                                                                    <span className="small mono muted">
                                                                        #{p.id} · {p.public_id} · {(p.downloads ?? 0).toLocaleString()} dl
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="sf-plugin-meta">
                                                                <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
                                                                    <span className={`tag ${isUpdate ? 'tag-info' : 'tag-pumpkin'}`}>
                                                                        {isUpdate ? 'UPDATED' : 'NEW UPLOAD'}
                                                                    </span>
                                                                    <span className="mono">
                                                                        {p.version ? `v${p.version}` : 'No build'}
                                                                    </span>
                                                                    {p.api_version && (
                                                                        <span className="small mono muted">API v{p.api_version}</span>
                                                                    )}
                                                                    {p.latest_release_track && p.latest_release_track !== 'stable' && (
                                                                        <span className="tag tag-warning">
                                                                            {p.latest_release_track.toUpperCase()}
                                                                        </span>
                                                                    )}
                                                                    <span className="small muted">
                                                                        ({p.versions_count || 1} {p.versions_count === 1 ? 'release' : 'releases'})
                                                                    </span>
                                                                </div>
                                                                {p.latest_release_notes && (
                                                                    <div className="sf-release-note">
                                                                        {p.latest_release_notes.length > 120
                                                                            ? `${p.latest_release_notes.slice(0, 120)}…`
                                                                            : p.latest_release_notes}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
                                                                <Link className="link" to={`/profile/${p.dev_name}`}>
                                                                    @{p.dev_name}
                                                                </Link>
                                                                {p.dev_verified && <span className="tag tag-info">Verified</span>}
                                                            </div>
                                                        </td>
                                                        <td>{pluginStatusBadge(p)}</td>
                                                        <td>
                                                            <div className="sf-plugin-meta">
                                                                <strong>{formatRelativeTime(p.updated_at || p.created_at)}</strong>
                                                                <span className="small muted">
                                                                    {p.updated_at
                                                                        ? new Date(p.updated_at).toLocaleString()
                                                                        : p.created_at
                                                                          ? new Date(p.created_at).toLocaleString()
                                                                          : '—'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="row sf-actions">
                                                                <Link
                                                                    className="button button-sm"
                                                                    to={getPluginUrl(p)}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                >
                                                                    <ExternalLink size={14} /> Inspect
                                                                </Link>
                                                                <button
                                                                    className="button button-sm"
                                                                    onClick={() => setSelectedItem({ type: 'plugin', data: fullPlugin })}
                                                                >
                                                                    Readiness
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
                        </div>
                    </section>
                </div>
            ) : (
                <div className="scroll-x">
                    <table className="ledger">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Moderator</th>
                                <th>Action</th>
                                <th>Target</th>
                                <th>Reason / Policy Note</th>
                                <th className="end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map(l => (
                                <tr key={l.id}>
                                    <td className="muted">{new Date(l.created_at).toLocaleString()}</td>
                                    <td>
                                        <strong>{l.moderator_name}</strong>
                                    </td>
                                    <td>
                                        <span className="tag tag-fg">{l.action.toUpperCase()}</span>
                                    </td>
                                    <td>
                                        {l.target_type} <span className="mono muted">({l.target_id})</span>
                                    </td>
                                    <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        <span className="small">{l.reason || '—'}</span>
                                    </td>
                                    <td>
                                        <div className="row sf-actions">
                                            <button className="button button-sm" onClick={() => setSelectedItem({ type: 'log', data: l })}>
                                                View
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pre-Launch Readiness & Details Sheet */}
            {selectedItem && (
                <div className="overlay sf-modal" onClick={() => setSelectedItem(null)}>
                    <div
                        className="sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="sf-staff-details"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="sheet-head">
                            <div className="stack">
                                <span className="sticker sticker-sm">{selectedItem.type}</span>
                                <h2 className="h1" id="sf-staff-details">
                                    {selectedItem.type === 'plugin' ? `${selectedItem.data.name} — Inspection` : `${selectedItem.type.toUpperCase()} Details`}
                                </h2>
                            </div>
                            <button className="button button-ghost button-icon" aria-label="Close" onClick={() => setSelectedItem(null)}>
                                <X />
                            </button>
                        </div>
                        <div className="sheet-body stack">
                            {selectedItem.type === 'plugin' && (
                                <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
                                    <span className="label">Automated Pre-Launch &amp; Policy Readiness</span>
                                    <div className="sf-checklist">
                                        <div className="sf-checklist-item">
                                            <FileCode2 size={16} className={selectedItem.data.has_binary ? 'pumpkin' : 'muted'} />
                                            <div>
                                                <strong>WASM Binary</strong>
                                                <p className="small muted">
                                                    {selectedItem.data.has_binary
                                                        ? `Uploaded (${formatBytes(selectedItem.data.file_size)}) · ${selectedItem.data.versions_count || 1} release(s)`
                                                        : 'Missing WASM binary'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="sf-checklist-item">
                                            <FileText size={16} className={selectedItem.data.has_description ? 'pumpkin' : 'muted'} />
                                            <div>
                                                <strong>Store Documentation</strong>
                                                <p className="small muted">
                                                    {selectedItem.data.has_description
                                                        ? `Description ready · ${selectedItem.data.commands_count || 0} command(s)`
                                                        : 'Empty or missing description'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="sf-checklist-item">
                                            <ImageIcon size={16} className={selectedItem.data.has_icon ? 'pumpkin' : 'muted'} />
                                            <div>
                                                <strong>Visual Assets</strong>
                                                <p className="small muted">
                                                    {selectedItem.data.has_icon ? 'Store Icon OK' : 'No Store Icon'} · {selectedItem.data.screenshots_count || 0} screenshot(s)
                                                </p>
                                            </div>
                                        </div>
                                        <div className="sf-checklist-item">
                                            <ShieldCheck size={16} className={selectedItem.data.dev_secure_auth ? 'pumpkin' : 'muted'} />
                                            <div>
                                                <strong>Developer Trust</strong>
                                                <p className="small muted">
                                                    {selectedItem.data.dev_secure_auth ? '2FA/Passkey Active' : 'No 2FA/Passkey'}
                                                    {selectedItem.data.open_reports_count > 0 ? ` · ${selectedItem.data.open_reports_count} open report(s)` : ' · Clean report history'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <dl className="specs">
                                {details.map(([label, value]) => (
                                    <Fragment key={label}>
                                        <dt>{label}</dt>
                                        <dd>{value}</dd>
                                    </Fragment>
                                ))}
                            </dl>

                            {selectedItem.type === 'plugin' && (
                                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                                    <Link
                                        className="button button-sm"
                                        to={getPluginUrl(selectedItem.data)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <ExternalLink size={14} /> Open Full Store / Draft Page
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Structured Policy & Moderation Modal (Play Console / App Store Connect style) */}
            {actionModal && (
                <div className="overlay sf-modal" onClick={closeActionModal}>
                    <div
                        className="sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="sf-moderation-modal-title"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="sheet-head">
                            <div className="stack">
                                <span className="sticker sticker-sm sticker-warning">
                                    <AlertTriangle size={12} /> Policy &amp; Review Resolution
                                </span>
                                <h2 className="h2" id="sf-moderation-modal-title">
                                    {actionModal.kind === 'reject_plugin'
                                        ? `Request Changes — ${actionModal.targetName}`
                                        : actionModal.kind === 'delete_plugin'
                                          ? `Remove Plugin — ${actionModal.targetName}`
                                          : actionModal.kind === 'delete_user'
                                            ? `Deactivate Account — ${actionModal.targetName}`
                                            : `Resolve Report — ${actionModal.targetName}`}
                                </h2>
                            </div>
                            <button className="button button-ghost button-icon" aria-label="Close" onClick={closeActionModal}>
                                <X />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitActionModal} className="sheet-body stack">
                            {actionModal.kind === 'reject_plugin' && (
                                <div className="field">
                                    <span className="field-label">Select Guideline / Policy Preset (App Store &amp; Play Console Style)</span>
                                    <div className="sf-presets">
                                        {REJECTION_POLICY_PRESETS.map(p => (
                                            <button
                                                key={p.code}
                                                type="button"
                                                className="sf-preset-chip"
                                                aria-pressed={actionPreset === p.code}
                                                onClick={() => {
                                                    setActionPreset(p.code);
                                                    setActionReason(p.text);
                                                }}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {actionModal.kind === 'delete_plugin' && (
                                <div className="field">
                                    <span className="field-label">Removal Policy Preset</span>
                                    <div className="sf-presets">
                                        {REMOVAL_POLICY_PRESETS.map(p => (
                                            <button
                                                key={p.label}
                                                type="button"
                                                className="sf-preset-chip"
                                                aria-pressed={actionPreset === p.label}
                                                onClick={() => {
                                                    setActionPreset(p.label);
                                                    setActionReason(p.text);
                                                }}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {actionModal.kind === 'resolve_report' && (
                                <>
                                    <div className="field">
                                        <span className="field-label">Resolution Outcome</span>
                                        <div className="segmented">
                                            <button
                                                type="button"
                                                aria-pressed={actionResolutionStatus === 'resolved'}
                                                onClick={() => setActionResolutionStatus('resolved')}
                                            >
                                                Mark Resolved (Action Taken)
                                            </button>
                                            <button
                                                type="button"
                                                aria-pressed={actionResolutionStatus === 'dismissed'}
                                                onClick={() => setActionResolutionStatus('dismissed')}
                                            >
                                                Dismiss (No Violation)
                                            </button>
                                        </div>
                                    </div>

                                    {actionModal.extra?.target_type === 'review' && !actionModal.extra?.review_deleted && (
                                        <label className="row" style={{ cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={actionDeleteReview}
                                                onChange={e => setActionDeleteReview(e.target.checked)}
                                            />
                                            <span>Also remove the reported review from the plugin page</span>
                                        </label>
                                    )}
                                </>
                            )}

                            <label className="field">
                                <span className="field-label">
                                    {actionModal.kind === 'reject_plugin'
                                        ? 'Developer Feedback (Sent via Email & Shown in Developer Studio)'
                                        : actionModal.kind === 'resolve_report'
                                          ? 'Moderator Resolution Note (Optional)'
                                          : 'Moderation Reason (Logged in Audit Trail & Sent to User)'}
                                </span>
                                <span className="control">
                                    <textarea
                                        className="input"
                                        rows={4}
                                        placeholder={
                                            actionModal.kind === 'reject_plugin'
                                                ? 'Explain clearly what the developer needs to fix before resubmitting…'
                                                : 'Provide a clear moderation reason…'
                                        }
                                        value={actionReason}
                                        onChange={e => setActionReason(e.target.value)}
                                        required={actionModal.kind !== 'resolve_report'}
                                    />
                                </span>
                            </label>

                            <div className="row" style={{ justifyContent: 'flex-end' }}>
                                <button type="button" className="button button-ghost" onClick={closeActionModal} disabled={actionBusy}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={`button ${actionModal.kind === 'resolve_report' ? 'button-primary' : 'button-danger'}`}
                                    disabled={actionBusy || (actionModal.kind !== 'resolve_report' && !actionReason.trim())}
                                >
                                    {actionBusy
                                        ? 'Processing…'
                                        : actionModal.kind === 'reject_plugin'
                                          ? 'Send Feedback & Reject'
                                          : actionModal.kind === 'resolve_report'
                                            ? 'Save Resolution'
                                            : 'Confirm Action'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffPage;
