import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
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
import { useTranslation } from 'react-i18next';
import api from '../../lib/api';
import { useAuth } from '../../app/auth';
import { Select } from '../../components/Select';
import { GuidelineRejectionPicker, RejectionReasonsList } from '../../components/GuidelineRejectionPicker';
import {
    serializeRejectionReason,
    parseRejectionReason,
    formatRejectionReasonSummary,
} from '../../lib/guidelines';
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

type StaffTab = 'queue' | 'plugins' | 'reports' | 'users' | 'logs' | 'analytics';
type AnalyticsTimeframe = '7d' | '30d' | '365d';

interface ActionModalState {
    kind: 'reject_plugin' | 'delete_plugin' | 'delete_user' | 'resolve_report';
    targetId: number;
    targetName: string;
    extra?: any;
}

const StaffPage = () => {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin';
    const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
    const hasSecureAuth = Boolean(
        currentUser?.totp_enabled ||
        currentUser?.has_passkey ||
        (typeof currentUser?.passkey_count === 'number' && currentUser.passkey_count > 0)
    );

    const formatRelativeTime = (iso?: string | null) => {
        if (!iso) return '—';
        const dt = new Date(iso);
        const diffMs = Date.now() - dt.getTime();
        if (Number.isNaN(diffMs)) return '—';
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return t('staff.time_just_now');
        if (diffMins < 60) return t('staff.time_m_ago', { count: diffMins });
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return t('staff.time_h_ago', { count: diffHours });
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 30) return t('staff.time_d_ago', { count: diffDays });
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths < 12) return t('staff.time_mo_ago', { count: diffMonths });
        return t('staff.time_y_ago', { count: Math.floor(diffMonths / 12) });
    };

    const REMOVAL_POLICY_PRESETS = [
        {
            label: t('staff.modal.preset_malware_label'),
            text: t('staff.modal.preset_malware_text'),
        },
        {
            label: t('staff.modal.preset_dmca_label'),
            text: t('staff.modal.preset_dmca_text'),
        },
        {
            label: t('staff.modal.preset_spam_label'),
            text: t('staff.modal.preset_spam_text'),
        },
        {
            label: t('staff.modal.preset_dev_label'),
            text: t('staff.modal.preset_dev_text'),
        },
    ];

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
    const [rejectGuidelineCodes, setRejectGuidelineCodes] = useState<string[]>([]);
    const [rejectOtherChecked, setRejectOtherChecked] = useState(false);
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
            setRescanNotice(t('staff.rescan_notice', { scanned, updated }));
            await fetchAllOverviewData();
        } catch (err: any) {
            setError(extractErrorMessage(err, 'Failed to rescan plugin WASM metadata'));
        } finally {
            setRescanBusy(false);
        }
    };

    const initialMountRef = useRef(true);

    useEffect(() => {
        fetchAllOverviewData();
    }, []);

    useEffect(() => {
        if (initialMountRef.current) {
            initialMountRef.current = false;
            return;
        }
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
            if (results[0].status === 'rejected') {
                throw results[0].reason;
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
        setActionPreset('');
        setActionDeleteReview(false);
        setActionResolutionStatus('resolved');
        if (state.kind === 'reject_plugin') {
            const parsed = parseRejectionReason(state.extra?.rejection_reason || defaultReason);
            setRejectGuidelineCodes(parsed.guidelines);
            setRejectOtherChecked(Boolean(parsed.custom));
            setActionReason(parsed.custom);
        } else {
            setRejectGuidelineCodes([]);
            setRejectOtherChecked(false);
            setActionReason(defaultReason);
        }
    };

    const closeActionModal = () => {
        if (actionBusy) return;
        setActionModal(null);
        setActionReason('');
        setActionPreset('');
        setRejectGuidelineCodes([]);
        setRejectOtherChecked(false);
    };

    const toggleRejectGuidelineCode = (code: string) => {
        setRejectGuidelineCodes(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    const canSubmitRejectPlugin =
        rejectGuidelineCodes.length > 0
            ? !rejectOtherChecked || Boolean(actionReason.trim())
            : rejectOtherChecked && Boolean(actionReason.trim());

    const handleSubmitActionModal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!actionModal) return;

        setActionBusy(true);
        try {
            if (actionModal.kind === 'reject_plugin') {
                if (!canSubmitRejectPlugin) return;
                const reason = serializeRejectionReason(
                    rejectGuidelineCodes,
                    rejectOtherChecked ? actionReason : ''
                );
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
        const q = searchQuery.toLowerCase();
        const formattedReason = formatRejectionReasonSummary(l.reason, t).toLowerCase();
        const matchesSearch =
            l.moderator_name.toLowerCase().includes(q) ||
            l.action.toLowerCase().includes(q) ||
            l.target_type.toLowerCase().includes(q) ||
            l.reason?.toLowerCase().includes(q) ||
            formattedReason.includes(q) ||
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
                {t('staff.status.deleted')}
            </span>
        ) : (
            <span className="status">
                <span className="mark-box mark-box-success">
                    <Check />
                </span>
                {t('staff.status.active')}
            </span>
        );

    const pluginStatusBadge = (p: any) => {
        if (p.deleted_at) {
            return (
                <span className="status">
                    <span className="mark-box mark-box-danger">
                        <X />
                    </span>
                    {t('staff.status.deleted')}
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
                        {t('staff.status.published')}
                    </span>
                );
            case 'under_review':
                return p.claimed_by_name ? (
                    <span className="tag tag-info">
                        {t('staff.status.in_review', { name: p.claimed_by_name })}
                    </span>
                ) : (
                    <span className="tag tag-warning">{t('staff.status.pending_review')}</span>
                );
            case 'rejected':
                return <span className="tag tag-danger">{t('staff.status.changes_requested')}</span>;
            case 'draft':
                return (
                    <span className="tag tag-fg">
                        <Lock size={12} /> {t('staff.status.draft')}
                    </span>
                );
            default:
                return <span className="tag tag-fg">{p.status || t('staff.status.draft')}</span>;
        }
    };

    const renderReadinessSignals = (p: any) => {
        const hasBin = Boolean(p.has_binary);
        const hasDesc = Boolean(p.has_description);
        const hasIcon = Boolean(p.has_icon);
        const hasMedia = (p.screenshots_count || 0) > 0;

        return (
            <div className="sf-checks" title={`${formatBytes(p.file_size)} • ${p.screenshots_count || 0} • ${p.commands_count || 0}`}>
                <span className={`sf-check-pill ${hasBin ? 'sf-check-ok' : 'sf-check-warn'}`}>
                    {hasBin ? <Check /> : <X />} {t('staff.checks.wasm')}
                </span>
                <span className={`sf-check-pill ${hasDesc ? 'sf-check-ok' : 'sf-check-warn'}`}>
                    {hasDesc ? <Check /> : <X />} {t('staff.checks.docs')}
                </span>
                <span className={`sf-check-pill ${hasIcon ? 'sf-check-ok' : 'sf-check-warn'}`}>
                    {hasIcon ? <Check /> : <X />} {t('staff.checks.icon')}
                </span>
                <span className={`sf-check-pill ${hasMedia ? 'sf-check-ok' : 'sf-check-warn'}`}>
                    {hasMedia ? <Check /> : <X />} {t('staff.checks.media')}
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
                [t('staff.inspection.fields.id'), selectedItem.data.id],
                [t('staff.inspection.fields.username'), selectedItem.data.username],
                [t('staff.inspection.fields.email'), selectedItem.data.email],
                [t('staff.inspection.fields.role'), selectedItem.data.role],
                [t('staff.inspection.fields.dev_account'), selectedItem.data.is_developer ? t('staff.inspection.yes') : t('staff.inspection.no')],
                [t('staff.inspection.fields.verified_badge'), selectedItem.data.is_verified ? t('staff.table.verified') : t('staff.inspection.fields.standard_badge')],
                [t('staff.inspection.fields.published_total_plugins'), selectedItem.data.plugin_count ?? 0],
                ...(isAdmin ? [[t('staff.inspection.fields.stripe_ready'), selectedItem.data.stripe_ready ? t('staff.inspection.yes') : t('staff.inspection.no')] as [string, any]] : []),
                [t('staff.inspection.fields.totp_enabled'), selectedItem.data.totp_enabled ? t('staff.inspection.yes') : t('staff.inspection.no')],
                [t('staff.inspection.fields.passkey_enabled'), selectedItem.data.has_passkey ? t('staff.inspection.yes') : t('staff.inspection.no')],
                [t('staff.inspection.fields.created'), new Date(selectedItem.data.created_at).toLocaleString()],
                [t('staff.inspection.fields.status'), selectedItem.data.deleted_at ? t('staff.inspection.deleted_at', { date: new Date(selectedItem.data.deleted_at).toLocaleString() }) : t('staff.status.active')],
            ]
          : selectedItem.type === 'plugin'
            ? [
                  [t('staff.inspection.fields.id_public_id'), `${selectedItem.data.id} (${selectedItem.data.public_id || '—'})`],
                  [t('staff.inspection.fields.name'), selectedItem.data.name],
                  [t('staff.inspection.fields.version'), selectedItem.data.version ? `v${selectedItem.data.version}` : '—'],
                  [t('staff.inspection.fields.api_target'), selectedItem.data.api_version ? `v${selectedItem.data.api_version}` : '—'],
                  [t('staff.inspection.fields.file_size'), formatBytes(selectedItem.data.file_size)],
                  [t('staff.inspection.fields.sha256'), selectedItem.data.sha256 ? <code className="mono">{selectedItem.data.sha256}</code> : t('staff.inspection.no_binary')],
                  [
                      t('staff.inspection.fields.permissions'),
                      selectedItem.data.wasm_capabilities?.permissions?.length
                          ? selectedItem.data.wasm_capabilities.permissions.join(', ')
                          : selectedItem.data.has_binary
                            ? t('staff.inspection.none')
                            : '—',
                  ],
                  [
                      t('staff.inspection.fields.dependencies'),
                      selectedItem.data.wasm_capabilities?.dependencies?.length
                          ? selectedItem.data.wasm_capabilities.dependencies.join(', ')
                          : t('staff.inspection.none'),
                  ],
                  [
                      t('staff.inspection.fields.wasm_capabilities'),
                      selectedItem.data.wasm_capabilities?.capabilities?.length
                          ? selectedItem.data.wasm_capabilities.capabilities.join(', ')
                          : selectedItem.data.has_binary
                            ? t('staff.inspection.standard_sandbox')
                            : '—',
                  ],
                  [t('staff.inspection.fields.developer'), `@${selectedItem.data.dev_name}${selectedItem.data.dev_verified ? ` (${t('staff.table.verified')})` : ''}`],
                  [t('staff.inspection.fields.dev_security'), selectedItem.data.dev_secure_auth ? t('staff.inspection.mfa_active') : t('staff.inspection.mfa_none')],
                  [t('staff.inspection.fields.license_pricing'), `${selectedItem.data.type} (€${((selectedItem.data.price_cents || 0) / 100).toFixed(2)})`],
                  [t('staff.inspection.fields.category'), selectedItem.data.category || '—'],
                  [
                      t('staff.inspection.fields.source_repo'),
                      selectedItem.data.source_link ? (
                          <a href={selectedItem.data.source_link} target="_blank" rel="noreferrer" className="link">
                              {selectedItem.data.source_link}
                          </a>
                      ) : (
                          t('staff.inspection.not_provided')
                      ),
                  ],
                  [t('staff.inspection.fields.downloads'), (selectedItem.data.downloads ?? 0).toLocaleString()],
                  [t('staff.inspection.fields.created_uploaded'), selectedItem.data.created_at ? new Date(selectedItem.data.created_at).toLocaleString() : '—'],
                  [t('staff.inspection.fields.last_updated'), selectedItem.data.updated_at ? new Date(selectedItem.data.updated_at).toLocaleString() : '—'],
                  [t('staff.inspection.fields.review_status'), selectedItem.data.deleted_at ? t('staff.inspection.deleted_at', { date: new Date(selectedItem.data.deleted_at).toLocaleString() }) : selectedItem.data.status || 'draft'],
                  ...(selectedItem.data.claimed_by_name ? [[t('staff.inspection.fields.claimed_by'), `@${selectedItem.data.claimed_by_name}`] as [string, any]] : []),
                  ...(selectedItem.data.rejection_reason
                      ? [[t('staff.inspection.fields.reviewer_feedback'), <RejectionReasonsList rejectionReason={selectedItem.data.rejection_reason} />] as [string, any]]
                      : []),
              ]
            : selectedItem.type === 'report'
              ? [
                    [t('staff.inspection.fields.report_id'), selectedItem.data.id],
                    [t('staff.inspection.fields.target_type'), selectedItem.data.target_type],
                    [t('staff.inspection.fields.plugin'), `${selectedItem.data.plugin_name} (${selectedItem.data.plugin_public_id})`],
                    [t('staff.inspection.fields.reported_by'), `@${selectedItem.data.reporter_username}`],
                    [t('staff.inspection.fields.reason'), selectedItem.data.reason],
                    ...(selectedItem.data.review_comment
                        ? [
                              [t('staff.inspection.fields.review_author'), `@${selectedItem.data.review_author_username || 'Unknown'}`] as [string, any],
                              [t('staff.inspection.fields.review_rating'), `${selectedItem.data.review_rating} / 5`] as [string, any],
                              [t('staff.inspection.fields.review_content'), selectedItem.data.review_comment] as [string, any],
                          ]
                        : []),
                    [t('staff.inspection.fields.status'), selectedItem.data.status],
                    [t('staff.inspection.fields.submitted_at'), new Date(selectedItem.data.created_at).toLocaleString()],
                    ...(selectedItem.data.resolved_by_username
                        ? [
                              [t('staff.inspection.fields.resolved_by'), `@${selectedItem.data.resolved_by_username}`] as [string, any],
                              [t('staff.inspection.fields.resolution_note'), selectedItem.data.resolution_note || '—'] as [string, any],
                          ]
                        : []),
                ]
              : [
                    [t('staff.inspection.fields.date'), new Date(selectedItem.data.created_at).toLocaleString()],
                    [t('staff.inspection.fields.moderator'), selectedItem.data.moderator_name],
                    [t('staff.inspection.fields.action'), selectedItem.data.action],
                    [t('staff.inspection.fields.target_type'), selectedItem.data.target_type],
                    [t('staff.inspection.fields.target_id'), selectedItem.data.target_id],
                    [
                        t('staff.inspection.fields.reason'),
                        selectedItem.data.action === 'reject_plugin' && selectedItem.data.reason ? (
                            <RejectionReasonsList rejectionReason={selectedItem.data.reason} />
                        ) : (
                            selectedItem.data.reason || t('staff.inspection.no_reason')
                        ),
                    ],
                ];

    const tabs: [StaffTab, string][] = [
        ['queue', kpis.pendingReview > 0 ? t('staff.tabs.queue_pending', { count: kpis.pendingReview }) : t('staff.tabs.queue')],
        ['plugins', t('staff.tabs.plugins', { count: kpis.totalActivePlugins })],
        ...(isStaff
            ? [
                  ['reports', kpis.openReports > 0 ? t('staff.tabs.reports_open', { count: kpis.openReports }) : t('staff.tabs.reports')] as [StaffTab, string],
                  ['users', t('staff.tabs.users')] as [StaffTab, string],
              ]
            : []),
        ['logs', t('staff.tabs.logs')],
        ...(isAdmin ? [['analytics', t('staff.tabs.analytics')] as [StaffTab, string]] : []),
    ];

    const renderPluginActions = (p: any) => (
        <div className="row sf-actions">
            <Link
                className="button button-sm"
                to={getPluginUrl(p)}
                target="_blank"
                rel="noreferrer"
            >
                <ExternalLink size={14} />
                {p.status === 'draft' ? t('staff.actions.inspect_draft') : t('staff.actions.inspect')}
            </Link>
            <button className="button button-sm" onClick={() => setSelectedItem({ type: 'plugin', data: p })}>
                {t('staff.actions.readiness')}
            </button>
            {!p.deleted_at && p.status === 'under_review' && !p.claimed_by_id && (
                <button className="button button-primary button-sm" onClick={() => claimPlugin(p.id)}>
                    {t('staff.actions.claim_review')}
                </button>
            )}
            {!p.deleted_at &&
                p.status === 'under_review' &&
                p.claimed_by_id &&
                (p.claimed_by_id === currentUser?.id || isAdmin) && (
                    <>
                        <button className="button button-primary button-sm" onClick={() => approvePlugin(p.id)}>
                            {t('staff.actions.approve')}
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
                            {t('staff.actions.request_changes')}
                        </button>
                        <button className="button button-ghost button-sm" onClick={() => unclaimPlugin(p.id)}>
                            {t('staff.actions.release')}
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
                    {t('staff.actions.unapprove')}
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
                    {t('staff.actions.remove')}
                </button>
            )}
        </div>
    );

    const renderPluginsTable = (list: any[], mode: 'queue' | 'catalog') => (
        <div className="scroll-x">
            <table className="ledger">
                <thead>
                    <tr>
                        <th>{t('staff.table.plugin')}</th>
                        <th>{t('staff.table.developer')}</th>
                        <th>{mode === 'queue' ? t('staff.table.submitted_updated') : t('staff.table.downloads_updated')}</th>
                        <th>{t('staff.table.prelaunch_checks')}</th>
                        <th>{t('staff.table.license')}</th>
                        <th>{t('staff.table.status')}</th>
                        <th className="end">{t('staff.table.actions')}</th>
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
                                                <span className="tag tag-danger">
                                                    <Flag size={11} /> {p.open_reports_count}
                                                </span>
                                            )}
                                        </div>
                                        <span className="small mono muted">
                                            #{p.id} · {p.version ? `v${p.version}` : t('staff.table.no_build')}
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
                                            <span className="tag tag-info">
                                                {t('staff.table.verified')}
                                            </span>
                                        )}
                                    </div>
                                    <span className="small muted">
                                        {p.dev_secure_auth ? t('staff.table.mfa_ok') : t('staff.table.no_mfa')}
                                        {p.type === 'paid' ? (p.dev_stripe_ready ? ` · ${t('staff.table.stripe_ready')}` : ` · ${t('staff.table.no_stripe')}`) : ''}
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
                                            ? t('staff.table.updated_ago', { time: formatRelativeTime(p.updated_at || p.created_at) })
                                            : p.created_at
                                              ? t('staff.table.uploaded_on', { date: new Date(p.created_at).toLocaleDateString() })
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
        <div className="page page-wide stack sf-pad sf-staff">
            <header className="stack">
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="stack" style={{ '--gap': '4px' } as React.CSSProperties}>
                        <span className="label">{t('staff.header_label')}</span>
                        <h1 className="display-2">
                            {t('staff.title_lead')} <span className="mark">{t('staff.title_mark')}</span>
                        </h1>
                    </div>
                    <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                        {isStaff && (
                            <button
                                type="button"
                                className="button button-sm"
                                onClick={handleRescanWasmMetadata}
                                disabled={rescanBusy || loading}
                                title={t('staff.rescan_wasm_tooltip')}
                            >
                                <FileCode2 size={14} /> {rescanBusy ? t('staff.scanning_wasm') : t('staff.rescan_wasm')}
                            </button>
                        )}
                        <button type="button" className="button button-sm" onClick={fetchAllOverviewData} disabled={loading}>
                            <RefreshCw size={14} /> {t('staff.refresh_console')}
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
                            <span className="label">{t('staff.kpi.review_queue')}</span>
                            <ShieldCheck size={18} className="pumpkin" />
                        </div>
                        <span className="sf-kpi-val">{t('staff.kpi.pending_count', { count: kpis.pendingReview })}</span>
                        <div className="sf-kpi-meta">
                            <span>{t('staff.kpi.claimed_count', { count: kpis.claimedReview })}</span>
                            <span>•</span>
                            <span>{t('staff.kpi.needs_changes_count', { count: kpis.rejectedCount })}</span>
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
                            <span className="label">{t('staff.kpi.all_plugins')}</span>
                            <Package size={18} className="pumpkin" />
                        </div>
                        <span className="sf-kpi-val">{t('staff.kpi.live_count', { count: kpis.publishedCount })}</span>
                        <div className="sf-kpi-meta">
                            {isStaff && (
                                <>
                                    <span>{t('staff.kpi.drafts_count', { count: kpis.draftCount })}</span>
                                    <span>•</span>
                                </>
                            )}
                            <span>{t('staff.kpi.total_count', { count: kpis.totalActivePlugins })}</span>
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
                                <span className="label">{t('staff.kpi.flagged_content')}</span>
                                <Flag size={18} className="pumpkin" />
                            </div>
                            <span className="sf-kpi-val">{t('staff.kpi.open_count', { count: kpis.openReports })}</span>
                            <div className="sf-kpi-meta">
                                <span>{t('staff.kpi.resolved_count', { count: kpis.resolvedReports })}</span>
                                <span>•</span>
                                <span>{t('staff.kpi.plugin_review_reports')}</span>
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
                                <span className="label">{t('staff.kpi.users_security')}</span>
                                <Users size={18} className="pumpkin" />
                            </div>
                            <span className="sf-kpi-val">{t('staff.kpi.active_count', { count: kpis.activeUsersCount })}</span>
                            <div className="sf-kpi-meta">
                                <span>{t('staff.kpi.verified_devs_count', { count: kpis.verifiedDevs })}</span>
                                <span>•</span>
                                <span>{t('staff.kpi.mfa_users_count', { count: kpis.mfaUsers })}</span>
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
                                <span className="label">{t('staff.kpi.platform_analytics')}</span>
                                <BarChart3 size={18} className="pumpkin" />
                            </div>
                            <span className="sf-kpi-val">{t('staff.kpi.uploaded_30d', { count: kpis.uploaded30d })}</span>
                            <div className="sf-kpi-meta">
                                <span>{t('staff.kpi.updated_7d', { count: kpis.updated7d })}</span>
                                <span>•</span>
                                <span>{t('staff.kpi.new_users_30d', { count: kpis.newUsers30d })}</span>
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
                                ? t('staff.search.queue')
                                : activeTab === 'plugins'
                                  ? t('staff.search.plugins')
                                  : activeTab === 'reports'
                                    ? t('staff.search.reports')
                                    : activeTab === 'users'
                                      ? t('staff.search.users')
                                      : t('staff.search.logs')
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
                            { value: 'under_review', label: t('staff.filters.pending_review', { count: kpis.pendingReview }) },
                            { value: 'unclaimed', label: t('staff.filters.unclaimed', { count: kpis.unclaimedReview }) },
                            { value: 'claimed_by_me', label: t('staff.filters.claimed_by_me', { count: kpis.claimedByMe }) },
                            { value: 'rejected', label: t('staff.filters.changes_requested', { count: kpis.rejectedCount }) },
                            { value: 'all', label: t('staff.filters.all_queue', { count: kpis.pendingReview + kpis.rejectedCount }) },
                        ]}
                        value={queueFilter}
                        onChange={setQueueFilter}
                        aria-label={t('staff.kpi.review_queue')}
                    />
                )}
                {activeTab === 'plugins' && (
                    <>
                        <Select
                            options={[
                                { value: 'all', label: t('staff.filters.all_active', { count: kpis.totalActivePlugins }) },
                                { value: 'published', label: t('staff.filters.published', { count: kpis.publishedCount }) },
                                { value: 'under_review', label: t('staff.filters.pending_review', { count: kpis.pendingReview }) },
                                { value: 'rejected', label: t('staff.filters.changes_requested', { count: kpis.rejectedCount }) },
                                ...(isStaff ? [{ value: 'draft', label: t('staff.filters.drafts', { count: kpis.draftCount }) }] : []),
                                { value: 'flagged', label: t('staff.filters.flagged') },
                                { value: 'deleted', label: t('staff.filters.deleted') },
                            ]}
                            value={pluginStatusFilter}
                            onChange={setPluginStatusFilter}
                            aria-label={t('staff.table.status')}
                        />
                        <Select
                            options={[
                                { value: 'recently_updated', label: t('staff.filters.sort_recently_updated') },
                                { value: 'newest', label: t('staff.filters.sort_newest') },
                                { value: 'downloads', label: t('staff.filters.sort_downloads') },
                                { value: 'name', label: t('staff.filters.sort_name') },
                            ]}
                            value={pluginSortBy}
                            onChange={setPluginSortBy}
                            aria-label={t('staff.kpi.all_plugins')}
                        />
                    </>
                )}
                {activeTab === 'reports' && (
                    <Select
                        options={[
                            { value: 'open', label: t('staff.filters.open_reports', { count: kpis.openReports }) },
                            { value: 'resolved', label: t('staff.filters.resolved') },
                            { value: 'dismissed', label: t('staff.filters.dismissed') },
                            { value: 'all', label: t('staff.filters.all_reports') },
                        ]}
                        value={reportStatusFilter}
                        onChange={setReportStatusFilter}
                        aria-label={t('staff.tabs.reports')}
                    />
                )}
                {activeTab === 'logs' && (
                    <>
                        <Select
                            options={[
                                { value: 'all', label: t('staff.filters.all_actions') },
                                { value: 'approve_plugin', label: t('staff.filters.action_approve_plugin') },
                                { value: 'reject_plugin', label: t('staff.filters.action_reject_plugin') },
                                { value: 'resolve_report', label: t('staff.filters.action_resolve_report') },
                                { value: 'dismiss_report', label: t('staff.filters.action_dismiss_report') },
                                { value: 'soft_delete', label: t('staff.filters.action_soft_delete') },
                                { value: 'role_change', label: t('staff.filters.action_role_change') },
                            ]}
                            value={logFilterAction}
                            onChange={setLogFilterAction}
                            aria-label={t('staff.filters.all_actions')}
                        />
                        <Select
                            options={[{ value: 'all', label: t('staff.filters.all_moderators') }, ...uniqueModerators]}
                            value={logFilterModerator}
                            onChange={setLogFilterModerator}
                            aria-label={t('staff.filters.all_moderators')}
                        />
                    </>
                )}
                {activeTab === 'analytics' && isAdmin && (
                    <div className="segmented" role="group" aria-label={t('staff.kpi.platform_analytics')}>
                        <button
                            type="button"
                            aria-pressed={analyticsTimeframe === '7d'}
                            onClick={() => setAnalyticsTimeframe('7d')}
                        >
                            {t('staff.filters.week_7d')}
                        </button>
                        <button
                            type="button"
                            aria-pressed={analyticsTimeframe === '30d'}
                            onClick={() => setAnalyticsTimeframe('30d')}
                        >
                            {t('staff.filters.month_30d')}
                        </button>
                        <button
                            type="button"
                            aria-pressed={analyticsTimeframe === '365d'}
                            onClick={() => setAnalyticsTimeframe('365d')}
                        >
                            {t('staff.filters.year_12m')}
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
                        {t('staff.mfa_warning')}
                    </p>
                    <Link to="/settings" className="button button-primary button-sm">
                        {t('staff.enable_mfa')}
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
                    <p className="small">{t('staff.loading')}</p>
                </div>
            ) : activeTab === 'queue' ? (
                queuePlugins.length === 0 ? (
                    <div className="blank">
                        <p className="h3">
                            {queueFilter === 'under_review'
                                ? t('staff.empty.queue_clear_title')
                                : t('staff.empty.queue_filter_title')}
                        </p>
                        <p className="small muted">
                            {queueFilter === 'under_review'
                                ? t('staff.empty.queue_clear_desc')
                                : t('staff.empty.queue_filter_desc')}
                        </p>
                        <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
                            {queueFilter !== 'all' && (
                                <button type="button" className="button button-sm" onClick={() => setQueueFilter('all')}>
                                    {t('staff.empty.show_all_queue', { count: kpis.pendingReview + kpis.rejectedCount })}
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
                                {t('staff.empty.browse_all_plugins', { count: kpis.totalActivePlugins })}
                            </button>
                        </div>
                    </div>
                ) : (
                    renderPluginsTable(queuePlugins, 'queue')
                )
            ) : activeTab === 'plugins' ? (
                filteredPlugins.length === 0 ? (
                    <div className="blank">
                        <p className="h3">{t('staff.empty.no_plugins_title')}</p>
                        <p className="small muted">{t('staff.empty.no_plugins_desc')}</p>
                    </div>
                ) : (
                    renderPluginsTable(filteredPlugins, 'catalog')
                )
            ) : activeTab === 'reports' ? (
                filteredReports.length === 0 ? (
                    <div className="blank">
                        <p className="h3">{t('staff.empty.no_reports_title')}</p>
                        <p className="small muted">{t('staff.empty.no_reports_desc')}</p>
                    </div>
                ) : (
                    <div className="scroll-x">
                        <table className="ledger">
                            <thead>
                                <tr>
                                    <th>{t('staff.table.id')}</th>
                                    <th>{t('staff.table.target')}</th>
                                    <th>{t('staff.table.plugin')}</th>
                                    <th>{t('staff.table.reason_evidence')}</th>
                                    <th>{t('staff.table.reporter')}</th>
                                    <th>{t('staff.table.status')}</th>
                                    <th className="end">{t('staff.table.actions')}</th>
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
                                                        {r.review_deleted && <span className="tag tag-danger" style={{ marginLeft: 6 }}>{t('staff.status.deleted')}</span>}
                                                    </div>
                                                )}
                                                {r.resolution_note && (
                                                    <span className="small muted">{t('staff.table.note_prefix', { note: r.resolution_note })}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>@{r.reporter_username}</td>
                                        <td>
                                            {r.status === 'open' ? (
                                                <span className="tag tag-warning">{t('staff.status.open')}</span>
                                            ) : r.status === 'resolved' ? (
                                                <span className="tag tag-success">{t('staff.status.resolved')}</span>
                                            ) : (
                                                <span className="tag tag-fg">{t('staff.status.dismissed')}</span>
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
                                                    <ExternalLink size={14} /> {t('staff.actions.inspect_plugin')}
                                                </Link>
                                                <button className="button button-sm" onClick={() => setSelectedItem({ type: 'report', data: r })}>
                                                    {t('staff.actions.details')}
                                                </button>
                                                {r.status === 'open' && (
                                                    <button
                                                        className="button button-primary button-sm"
                                                        onClick={() =>
                                                            openActionModal({
                                                                kind: 'resolve_report',
                                                                targetId: r.id,
                                                                targetName: `${r.target_type} — ${r.plugin_name}`,
                                                                extra: r,
                                                            })
                                                        }
                                                    >
                                                        {t('staff.actions.resolve_triage')}
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
                                <th>{t('staff.table.id')}</th>
                                <th>{t('staff.table.user')}</th>
                                <th>{t('staff.table.email')}</th>
                                <th>{t('staff.table.security_dev')}</th>
                                <th>{t('staff.table.role')}</th>
                                <th>{t('staff.table.status')}</th>
                                <th className="end">{t('staff.table.actions')}</th>
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
                                                {u.is_verified && <span className="tag tag-info">{t('staff.table.verified')}</span>}
                                            </div>
                                            {u.plugin_count > 0 && <span className="small muted">{t('staff.table.plugins_count', { count: u.plugin_count })}</span>}
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
                                                    <Check /> {t('staff.table.dev_badge')}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {isAdmin && !u.deleted_at ? (
                                            <Select
                                                options={[
                                                    { value: 'user', label: t('staff.roles.user') },
                                                    { value: 'reviewer', label: t('staff.roles.reviewer') },
                                                    { value: 'moderator', label: t('staff.roles.moderator') },
                                                    { value: 'admin', label: t('staff.roles.admin') },
                                                ]}
                                                value={u.role}
                                                onChange={role => role !== u.role && changeRole(u.id, role)}
                                                aria-label={t('staff.table.role')}
                                            />
                                        ) : (
                                            <span className={`tag ${roleTone[u.role] || ''}`}>
                                                {u.role === 'admin'
                                                    ? t('staff.roles.admin')
                                                    : u.role === 'moderator'
                                                      ? t('staff.roles.moderator')
                                                      : u.role === 'reviewer'
                                                        ? t('staff.roles.reviewer')
                                                        : u.role === 'user'
                                                          ? t('staff.roles.user')
                                                          : u.role}
                                            </span>
                                        )}
                                    </td>
                                    <td>{status(u.deleted_at)}</td>
                                    <td>
                                        <div className="row sf-actions">
                                            <button className="button button-sm" onClick={() => setSelectedItem({ type: 'user', data: u })}>
                                                {t('staff.actions.view')}
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
                                                    {t('staff.actions.deactivate')}
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
                                <span className="label">{t('staff.analytics.new_plugins_uploaded')}</span>
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
                                    ({analyticsTimeframe === '7d' ? t('staff.analytics.this_week') : analyticsTimeframe === '30d' ? t('staff.analytics.this_month') : t('staff.analytics.this_year')})
                                </span>
                            </span>
                            <div className="sf-an-periods">
                                <div className="sf-an-period">
                                    <span className="small muted">{t('staff.analytics.week_7d')}</span>
                                    <strong className="num">{adminAnalytics?.plugins?.uploaded_7d ?? kpis.uploaded7d}</strong>
                                </div>
                                <div className="sf-an-period">
                                    <span className="small muted">{t('staff.analytics.month_30d')}</span>
                                    <strong className="num">{adminAnalytics?.plugins?.uploaded_30d ?? kpis.uploaded30d}</strong>
                                </div>
                                <div className="sf-an-period">
                                    <span className="small muted">{t('staff.analytics.year_365d')}</span>
                                    <strong className="num">{adminAnalytics?.plugins?.uploaded_365d ?? kpis.uploaded365d}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="sf-kpi">
                            <div className="sf-kpi-head">
                                <span className="label">{t('staff.analytics.plugin_updates_releases')}</span>
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
                                <span className="small muted">{t('staff.analytics.updated')}</span>
                            </span>
                            <div className="sf-an-periods">
                                <div className="sf-an-period">
                                    <span className="small muted">{t('staff.analytics.week_7d')}</span>
                                    <strong className="num">
                                        {adminAnalytics?.plugins?.updated_7d ?? kpis.updated7d}
                                    </strong>
                                </div>
                                <div className="sf-an-period">
                                    <span className="small muted">{t('staff.analytics.month_30d')}</span>
                                    <strong className="num">
                                        {adminAnalytics?.plugins?.updated_30d ?? kpis.updated30d}
                                    </strong>
                                </div>
                                <div className="sf-an-period">
                                    <span className="small muted">{t('staff.analytics.year_365d')}</span>
                                    <strong className="num">
                                        {adminAnalytics?.plugins?.updated_365d ?? kpis.uploaded365d}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        <div className="sf-kpi">
                            <div className="sf-kpi-head">
                                <span className="label">{t('staff.analytics.registered_users')}</span>
                                <Users size={18} className="pumpkin" />
                            </div>
                            <span className="sf-kpi-val">
                                {(adminAnalytics?.users?.total_active ?? kpis.activeUsersCount).toLocaleString()}{' '}
                                <span className="small muted">{t('staff.analytics.total')}</span>
                            </span>
                            <div className="sf-an-periods">
                                <div className="sf-an-period">
                                    <span className="small muted">+{t('staff.analytics.week_7d')}</span>
                                    <strong className="num">+{adminAnalytics?.users?.new_7d ?? 0}</strong>
                                </div>
                                <div className="sf-an-period">
                                    <span className="small muted">+{t('staff.analytics.month_30d')}</span>
                                    <strong className="num">+{adminAnalytics?.users?.new_30d ?? kpis.newUsers30d}</strong>
                                </div>
                                <div className="sf-an-period">
                                    <span className="small muted">+{t('staff.analytics.year_365d')}</span>
                                    <strong className="num">+{adminAnalytics?.users?.new_365d ?? kpis.activeUsersCount}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="sf-kpi">
                            <div className="sf-kpi-head">
                                <span className="label">{t('staff.analytics.platform_downloads')}</span>
                                <Download size={18} className="pumpkin" />
                            </div>
                            <span className="sf-kpi-val">
                                {(adminAnalytics?.activity?.total_downloads ?? 0).toLocaleString()}{' '}
                                <span className="small muted">{t('staff.analytics.all_time')}</span>
                            </span>
                            <div className="sf-an-periods">
                                <div className="sf-an-period">
                                    <span className="small muted">{t('staff.analytics.week_7d')}</span>
                                    <strong className="num">{adminAnalytics?.activity?.downloads_7d ?? 0}</strong>
                                </div>
                                <div className="sf-an-period">
                                    <span className="small muted">{t('staff.analytics.month_30d')}</span>
                                    <strong className="num">{adminAnalytics?.activity?.downloads_30d ?? 0}</strong>
                                </div>
                                <div className="sf-an-period">
                                    <span className="small muted">{t('staff.analytics.year_365d')}</span>
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
                                    {t('staff.analytics.chart_uploads_title', {
                                        period: analyticsTimeframe === '7d' ? t('staff.analytics.past_7_days') : analyticsTimeframe === '30d' ? t('staff.analytics.past_30_days') : t('staff.analytics.past_12_months'),
                                    })}
                                </h3>
                                <span className="spacer" />
                                <span className="status small">
                                    <span className="dot dot-pumpkin" /> {t('staff.analytics.new_plugins')}
                                </span>
                                <span className="status small">
                                    <span className="dot st-an-dot-fg" /> {t('staff.analytics.version_releases')}
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
                                            <Bar dataKey="plugins_uploaded" name={t('staff.analytics.new_plugins')} fill="var(--pumpkin)" radius={0} />
                                            <Bar dataKey="plugin_updates" name={t('staff.analytics.version_releases')} fill="var(--fg)" radius={0} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </section>

                        <section className="panel">
                            <div className="panel-head st-an-head">
                                <TrendingUp className="st-an-icon" />
                                <h3 className="h3">
                                    {t('staff.analytics.chart_users_title', {
                                        period: analyticsTimeframe === '7d' ? t('staff.analytics.past_7_days') : analyticsTimeframe === '30d' ? t('staff.analytics.past_30_days') : t('staff.analytics.past_12_months'),
                                    })}
                                </h3>
                                <span className="spacer" />
                                <span className="status small">
                                    <span className="dot dot-pumpkin" /> {t('staff.analytics.new_users')}
                                </span>
                                <span className="status small">
                                    <span className="dot st-an-dot-fg" /> {t('staff.analytics.downloads')}
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
                                                name={t('staff.analytics.downloads')}
                                                stroke="var(--fg)"
                                                strokeWidth={2.5}
                                                fill="var(--fg)"
                                                fillOpacity={0.08}
                                            />
                                            <Area
                                                type="linear"
                                                dataKey="new_users"
                                                name={t('staff.analytics.new_users')}
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
                                <h3 className="h3">{t('staff.analytics.user_dev_breakdown')}</h3>
                            </div>
                            <div className="panel-body stack">
                                <dl className="specs">
                                    <dt>{t('staff.analytics.total_active_users')}</dt>
                                    <dd>
                                        <strong>{(adminAnalytics?.users?.total_active ?? kpis.activeUsersCount).toLocaleString()}</strong>
                                        {adminAnalytics?.users?.total_deleted > 0 && (
                                            <span className="small muted"> {t('staff.analytics.deactivated_count', { count: adminAnalytics.users.total_deleted })}</span>
                                        )}
                                    </dd>
                                    <dt>{t('staff.analytics.onboarded_developers')}</dt>
                                    <dd>
                                        <strong>{adminAnalytics?.users?.developers_count ?? 0}</strong>
                                        <span className="small muted"> {t('staff.analytics.verified_count', { count: adminAnalytics?.users?.verified_devs_count ?? kpis.verifiedDevs })}</span>
                                    </dd>
                                    <dt>{t('staff.analytics.stripe_ready_sellers')}</dt>
                                    <dd>
                                        <strong>{adminAnalytics?.users?.stripe_ready_devs_count ?? 0}</strong>
                                    </dd>
                                    <dt>{t('staff.analytics.mfa_secured')}</dt>
                                    <dd>
                                        <strong>{adminAnalytics?.users?.mfa_enabled_count ?? kpis.mfaUsers}</strong>
                                        <span className="small muted">
                                            {' '}
                                            {t('staff.analytics.adoption_pct', {
                                                pct: kpis.activeUsersCount > 0
                                                    ? Math.round(((adminAnalytics?.users?.mfa_enabled_count ?? kpis.mfaUsers) / kpis.activeUsersCount) * 100)
                                                    : 0,
                                            })}
                                        </span>
                                    </dd>
                                    <dt>{t('staff.analytics.staff_reviewers')}</dt>
                                    <dd className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
                                        <span className="tag tag-pumpkin">{t('staff.analytics.admins_count', { count: adminAnalytics?.users?.admins_count ?? 0 })}</span>
                                        <span className="tag tag-info">{t('staff.analytics.mods_count', { count: adminAnalytics?.users?.moderators_count ?? 0 })}</span>
                                        <span className="tag tag-success">{t('staff.analytics.reviewers_count', { count: adminAnalytics?.users?.reviewers_count ?? 0 })}</span>
                                    </dd>
                                </dl>
                            </div>
                        </section>

                        <section className="panel">
                            <div className="panel-head st-an-head">
                                <Layers className="st-an-icon" />
                                <h3 className="h3">{t('staff.analytics.catalog_distribution')}</h3>
                            </div>
                            <div className="panel-body stack">
                                <div className="row" style={{ '--gap': '6px' } as React.CSSProperties}>
                                    <span className="tag tag-success">
                                        {t('staff.analytics.published_count', { count: adminAnalytics?.plugins?.total_published ?? kpis.publishedCount })}
                                    </span>
                                    <span className="tag tag-warning">
                                        {t('staff.analytics.in_queue_count', { count: adminAnalytics?.plugins?.total_under_review ?? kpis.pendingReview })}
                                    </span>
                                    <span className="tag tag-danger">
                                        {t('staff.analytics.rejected_count', { count: adminAnalytics?.plugins?.total_rejected ?? kpis.rejectedCount })}
                                    </span>
                                    <span className="tag tag-fg">
                                        {t('staff.analytics.drafts_count', { count: adminAnalytics?.plugins?.total_drafts ?? kpis.draftCount })}
                                    </span>
                                    <span className="spacer" />
                                    <span className="small muted">
                                        <Star size={13} className="pumpkin" style={{ verticalAlign: '-2px' }} />{' '}
                                        {adminAnalytics?.activity?.avg_rating ? `${adminAnalytics.activity.avg_rating}★` : '—'} (
                                        {t('staff.analytics.reviews_count', { count: adminAnalytics?.activity?.total_reviews ?? 0 })})
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
                                                            {t('staff.table.plugins_count', { count: cat.count })} · {(cat.downloads || 0).toLocaleString()} dl
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
                                    <p className="small muted">{t('staff.analytics.no_category_breakdown')}</p>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* 4. Recently Updated & Uploaded Plugins Feed */}
                    <section className="panel">
                        <div className="panel-head st-an-head">
                            <Clock className="st-an-icon" />
                            <h3 className="h3">{t('staff.analytics.recently_updated_title')}</h3>
                            <span className="spacer" />
                            <div className="segmented" role="group" aria-label={t('staff.analytics.recently_updated_title')}>
                                <button
                                    type="button"
                                    aria-pressed={recentActivityFilter === 'all'}
                                    onClick={() => setRecentActivityFilter('all')}
                                >
                                    {t('staff.analytics.all_activity')}
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={recentActivityFilter === 'updates'}
                                    onClick={() => setRecentActivityFilter('updates')}
                                >
                                    {t('staff.analytics.updates_only')}
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={recentActivityFilter === 'uploads'}
                                    onClick={() => setRecentActivityFilter('uploads')}
                                >
                                    {t('staff.analytics.new_uploads')}
                                </button>
                            </div>
                        </div>
                        <div className="panel-body" style={{ padding: 0 }}>
                            {recentlyUpdatedList.length === 0 ? (
                                <div className="blank">
                                    <p className="h3">{t('staff.empty.no_recent_activity')}</p>
                                </div>
                            ) : (
                                <div className="scroll-x">
                                    <table className="ledger">
                                        <thead>
                                            <tr>
                                                <th>{t('staff.table.plugin')}</th>
                                                <th>{t('staff.table.update_details')}</th>
                                                <th>{t('staff.table.developer')}</th>
                                                <th>{t('staff.table.status')}</th>
                                                <th>{t('staff.table.when')}</th>
                                                <th className="end">{t('staff.table.actions')}</th>
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
                                                                        {isUpdate ? t('staff.analytics.badge_updated') : t('staff.analytics.badge_new_upload')}
                                                                    </span>
                                                                    <span className="mono">
                                                                        {p.version ? `v${p.version}` : t('staff.table.no_build')}
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
                                                                        ({t('staff.analytics.releases_count', { count: p.versions_count || 1 })})
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
                                                                {p.dev_verified && <span className="tag tag-info">{t('staff.table.verified')}</span>}
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
                                                                    <ExternalLink size={14} /> {t('staff.actions.inspect')}
                                                                </Link>
                                                                <button
                                                                    className="button button-sm"
                                                                    onClick={() => setSelectedItem({ type: 'plugin', data: fullPlugin })}
                                                                >
                                                                    {t('staff.actions.readiness')}
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
                                <th>{t('staff.table.date')}</th>
                                <th>{t('staff.table.moderator')}</th>
                                <th>{t('staff.table.action')}</th>
                                <th>{t('staff.table.target')}</th>
                                <th>{t('staff.table.reason_policy')}</th>
                                <th className="end">{t('staff.table.actions')}</th>
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
                                        <span className="small">{formatRejectionReasonSummary(l.reason, t) || '—'}</span>
                                    </td>
                                    <td>
                                        <div className="row sf-actions">
                                            <button className="button button-sm" onClick={() => setSelectedItem({ type: 'log', data: l })}>
                                                {t('staff.actions.view')}
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
                                    {selectedItem.type === 'plugin'
                                        ? t('staff.inspection.plugin_title', { name: selectedItem.data.name })
                                        : t('staff.inspection.item_title', { type: selectedItem.type.toUpperCase() })}
                                </h2>
                            </div>
                            <button className="button button-ghost button-icon" aria-label={t('common.close', 'Close')} onClick={() => setSelectedItem(null)}>
                                <X />
                            </button>
                        </div>
                        <div className="sheet-body stack">
                            {selectedItem.type === 'plugin' && (
                                <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
                                    <span className="label">{t('staff.inspection.prelaunch_heading')}</span>
                                    <div className="sf-checklist">
                                        <div className="sf-checklist-item">
                                            <FileCode2 size={16} className={selectedItem.data.has_binary ? 'pumpkin' : 'muted'} />
                                            <div>
                                                <strong>{t('staff.inspection.wasm_binary')}</strong>
                                                <p className="small muted">
                                                    {selectedItem.data.has_binary
                                                        ? t('staff.inspection.wasm_uploaded', {
                                                              size: formatBytes(selectedItem.data.file_size),
                                                              count: selectedItem.data.versions_count || 1,
                                                          })
                                                        : t('staff.inspection.wasm_missing')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="sf-checklist-item">
                                            <FileText size={16} className={selectedItem.data.has_description ? 'pumpkin' : 'muted'} />
                                            <div>
                                                <strong>{t('staff.inspection.store_docs')}</strong>
                                                <p className="small muted">
                                                    {selectedItem.data.has_description
                                                        ? t('staff.inspection.docs_ready', { count: selectedItem.data.commands_count || 0 })
                                                        : t('staff.inspection.docs_missing')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="sf-checklist-item">
                                            <ImageIcon size={16} className={selectedItem.data.has_icon ? 'pumpkin' : 'muted'} />
                                            <div>
                                                <strong>{t('staff.inspection.visual_assets')}</strong>
                                                <p className="small muted">
                                                    {selectedItem.data.has_icon ? t('staff.inspection.icon_ok') : t('staff.inspection.icon_missing')} · {t('staff.inspection.screenshots_count', { count: selectedItem.data.screenshots_count || 0 })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="sf-checklist-item">
                                            <ShieldCheck size={16} className={selectedItem.data.dev_secure_auth ? 'pumpkin' : 'muted'} />
                                            <div>
                                                <strong>{t('staff.inspection.dev_trust')}</strong>
                                                <p className="small muted">
                                                    {selectedItem.data.dev_secure_auth ? t('staff.inspection.mfa_active') : t('staff.inspection.mfa_none')}
                                                    {selectedItem.data.open_reports_count > 0
                                                        ? ` · ${t('staff.inspection.open_reports_count', { count: selectedItem.data.open_reports_count })}`
                                                        : ` · ${t('staff.inspection.clean_reports')}`}
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
                                        <ExternalLink size={14} /> {t('staff.actions.open_full_page')}
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
                                    <AlertTriangle size={12} /> {t('staff.modal.badge')}
                                </span>
                                <h2 className="h2" id="sf-moderation-modal-title">
                                    {actionModal.kind === 'reject_plugin'
                                        ? t('staff.modal.title_reject', { name: actionModal.targetName })
                                        : actionModal.kind === 'delete_plugin'
                                          ? t('staff.modal.title_delete_plugin', { name: actionModal.targetName })
                                          : actionModal.kind === 'delete_user'
                                            ? t('staff.modal.title_delete_user', { name: actionModal.targetName })
                                            : t('staff.modal.title_resolve_report', { name: actionModal.targetName })}
                                </h2>
                            </div>
                            <button className="button button-ghost button-icon" aria-label={t('common.close', 'Close')} onClick={closeActionModal}>
                                <X />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitActionModal} className="sheet-body stack">
                            {actionModal.kind === 'reject_plugin' && (
                                <GuidelineRejectionPicker
                                    selectedCodes={rejectGuidelineCodes}
                                    onToggleCode={toggleRejectGuidelineCode}
                                    otherChecked={rejectOtherChecked}
                                    onToggleOther={checked => {
                                        setRejectOtherChecked(checked);
                                        if (!checked) setActionReason('');
                                    }}
                                    customReason={actionReason}
                                    onChangeCustomReason={setActionReason}
                                />
                            )}

                            {actionModal.kind === 'delete_plugin' && (
                                <div className="field">
                                    <span className="field-label">{t('staff.modal.preset_label')}</span>
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
                                        <span className="field-label">{t('staff.modal.resolution_outcome')}</span>
                                        <div className="segmented">
                                            <button
                                                type="button"
                                                aria-pressed={actionResolutionStatus === 'resolved'}
                                                onClick={() => setActionResolutionStatus('resolved')}
                                            >
                                                {t('staff.modal.mark_resolved')}
                                            </button>
                                            <button
                                                type="button"
                                                aria-pressed={actionResolutionStatus === 'dismissed'}
                                                onClick={() => setActionResolutionStatus('dismissed')}
                                            >
                                                {t('staff.modal.mark_dismissed')}
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
                                            <span>{t('staff.modal.also_remove_review')}</span>
                                        </label>
                                    )}
                                </>
                            )}

                            {actionModal.kind !== 'reject_plugin' && (
                                <label className="field">
                                    <span className="field-label">
                                        {actionModal.kind === 'resolve_report'
                                            ? t('staff.modal.resolution_note_label')
                                            : t('staff.modal.moderation_reason_label')}
                                    </span>
                                    <span className="control">
                                        <textarea
                                            className="input"
                                            rows={4}
                                            placeholder={t('staff.modal.reason_placeholder')}
                                            value={actionReason}
                                            onChange={e => setActionReason(e.target.value)}
                                            required={actionModal.kind !== 'resolve_report'}
                                        />
                                    </span>
                                </label>
                            )}

                            <div className="row" style={{ justifyContent: 'flex-end' }}>
                                <button type="button" className="button button-ghost" onClick={closeActionModal} disabled={actionBusy}>
                                    {t('common.cancel', 'Cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className={`button ${actionModal.kind === 'resolve_report' ? 'button-primary' : 'button-danger'}`}
                                    disabled={
                                        actionBusy ||
                                        (actionModal.kind === 'reject_plugin'
                                            ? !canSubmitRejectPlugin
                                            : actionModal.kind !== 'resolve_report' && !actionReason.trim())
                                    }
                                >
                                    {actionBusy
                                        ? t('staff.modal.processing')
                                        : actionModal.kind === 'reject_plugin'
                                          ? t('staff.modal.btn_send_reject')
                                          : actionModal.kind === 'resolve_report'
                                            ? t('staff.modal.btn_save_resolution')
                                            : t('staff.modal.btn_confirm_action')}
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
