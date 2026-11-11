import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    Bug, ShieldCheck, AlertTriangle, Server, Activity,
    CheckCircle2, EyeOff, RotateCcw, Trash2, Copy, Check,
    ChevronDown, ChevronUp, Terminal, Layers, Cpu
} from 'lucide-react';
import api from '../../../lib/api';
import { AXIS, GRID, CURSOR, ChartTip, formatValue } from './Analytics';
import type { PluginData } from './ManagePluginPage';

interface CrashBacktraceFrame {
    func_index?: number;
    func_name?: string;
    module_name?: string;
    wasm_offset?: number;
}

interface DistributionItem {
    label: string;
    count: number;
    percentage: number;
}

interface CrashTrendPoint {
    date: string;
    occurrences: number;
}

interface PluginCrashGroupItem {
    id: number;
    pluginId: number;
    pluginVersion: string;
    apiVersion?: string | null;
    fingerprint: string;
    trapCode: string;
    entryHook?: string | null;
    errorMessage: string;
    location?: string | null;
    wasmBacktrace: CrashBacktraceFrame[];
    verifiedSignature: boolean;
    status: 'open' | 'resolved' | 'ignored';
    resolvedInVersion?: string | null;
    occurrences: number;
    affectedServersCount: number;
    latestOs?: string | null;
    latestArch?: string | null;
    latestServerType?: string | null;
    latestServerVersion?: string | null;
    latestMinecraftVersion?: string | null;
    firstSeen: string;
    lastSeen: string;
    osDistribution: DistributionItem[];
    serverVersionDistribution: DistributionItem[];
}

interface PluginCrashOverview {
    crashFreeServersPct: number;
    activeServersCount: number;
    crashedServersCount: number;
    totalOccurrences: number;
    openIssuesCount: number;
    resolvedIssuesCount: number;
    ignoredIssuesCount: number;
    availableVersions: string[];
    dailyTrend: CrashTrendPoint[];
    issues: PluginCrashGroupItem[];
}

type Props = {
    plugin: PluginData;
};

const Crashes: React.FC<Props> = ({ plugin }) => {
    const { t } = useTranslation();
    const [data, setData] = useState<PluginCrashOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState<string>('30d');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [versionFilter, setVersionFilter] = useState<string>('all');
    const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    const fetchCrashes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/plugins/${plugin.id}/crashes`, {
                params: {
                    range,
                    status: statusFilter,
                    version: versionFilter,
                },
            });
            setData(res.data);
        } catch (err) {
            console.error('Failed to fetch plugin crashes:', err);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [plugin.id, range, statusFilter, versionFilter]);

    useEffect(() => {
        fetchCrashes();
    }, [fetchCrashes]);

    const toggleExpand = (id: number) => {
        setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleUpdateStatus = async (issue: PluginCrashGroupItem, newStatus: 'open' | 'resolved' | 'ignored') => {
        setBusyId(issue.id);
        try {
            await api.put(`/plugins/${plugin.id}/crashes/${issue.id}/status`, {
                status: newStatus,
                resolved_in_version: newStatus === 'resolved' ? (plugin.version || issue.pluginVersion) : null,
            });
            await fetchCrashes();
        } catch (err) {
            console.error('Failed to update crash status:', err);
        } finally {
            setBusyId(null);
        }
    };

    const handleDeleteIssue = async (id: number) => {
        if (!window.confirm(t('studio.crashes.confirm_delete'))) return;
        setBusyId(id);
        try {
            await api.delete(`/plugins/${plugin.id}/crashes/${id}`);
            await fetchCrashes();
        } catch (err) {
            console.error('Failed to delete crash group:', err);
        } finally {
            setBusyId(null);
        }
    };

    const handleCopyTrace = (issue: PluginCrashGroupItem) => {
        const lines = [
            `Plugin: ${plugin.name} v${issue.pluginVersion}${issue.apiVersion ? ` (API v${issue.apiVersion})` : ''}`,
            `Trap: ${issue.trapCode}`,
            issue.entryHook ? `Hook: ${issue.entryHook}` : null,
            issue.location ? `Location: ${issue.location}` : null,
            `Error: ${issue.errorMessage}`,
            `Fingerprint: ${issue.fingerprint}`,
            '',
            ...issue.wasmBacktrace.map((f, idx) => {
                const fnLabel = f.func_name || (f.func_index !== undefined ? `wasm-function[${f.func_index}]` : '<unknown>');
                const modLabel = f.module_name ? ` (${f.module_name})` : '';
                const offLabel = f.wasm_offset !== undefined ? ` @ 0x${f.wasm_offset.toString(16)}` : '';
                return `  #${idx} ${fnLabel}${modLabel}${offLabel}`;
            }),
        ].filter(Boolean);

        navigator.clipboard.writeText(lines.join('\n'));
        setCopiedId(issue.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const ranges: [string, string][] = [
        ['24h', t('studio.analytics.tf_today')],
        ['7d', t('studio.analytics.tf_7d')],
        ['30d', t('studio.analytics.tf_1m')],
        ['1y', t('studio.analytics.tf_1y')],
        ['all', t('studio.analytics.tf_lifetime')],
    ];

    const statusTabs: [string, string][] = [
        ['all', t('studio.crashes.status_all')],
        ['open', t('studio.crashes.status_open')],
        ['resolved', t('studio.crashes.status_resolved')],
        ['ignored', t('studio.crashes.status_ignored')],
    ];

    const crashFreePct = data?.crashFreeServersPct ?? 100;
    const totalTrackedServers = Math.max(data?.activeServersCount ?? 0, data?.crashedServersCount ?? 0);
    const healthyServers = Math.max(0, totalTrackedServers - (data?.crashedServersCount ?? 0));

    return (
        <div className="st-tab">
            <header className="st-head">
                <div className="st-tab-head">
                    <h2 className="h1">{t('studio.crashes.title')}</h2>
                    <p className="small">{t('studio.crashes.subtitle', { name: plugin.name })}</p>
                </div>
                <div className="segmented" role="group" aria-label={t('studio.crashes.title')}>
                    {ranges.map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={range === key}
                            onClick={() => setRange(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="stats st-an-stats">
                <div className="stat">
                    <span className="label st-an-label"><ShieldCheck />{t('studio.crashes.kpi_crash_free')}</span>
                    <span className={`stat-value st-an-value ${crashFreePct >= 99 ? 'st-pos' : crashFreePct < 95 ? 'st-neg' : ''}`}>
                        {crashFreePct.toFixed(1)}%
                    </span>
                    <span className="small">
                        {t('studio.crashes.kpi_crash_free_hint', {
                            healthy: healthyServers,
                            total: totalTrackedServers,
                        })}
                    </span>
                </div>

                <div className="stat">
                    <span className="label st-an-label"><AlertTriangle />{t('studio.crashes.kpi_open_issues')}</span>
                    <span className="stat-value st-an-value">{(data?.openIssuesCount ?? 0).toLocaleString()}</span>
                    <span className="small">
                        {t('studio.crashes.kpi_open_issues_hint', {
                            resolved: data?.resolvedIssuesCount ?? 0,
                            ignored: data?.ignoredIssuesCount ?? 0,
                        })}
                    </span>
                </div>

                <div className="stat">
                    <span className="label st-an-label"><Activity />{t('studio.crashes.kpi_total_events')}</span>
                    <span className="stat-value st-an-value">{(data?.totalOccurrences ?? 0).toLocaleString()}</span>
                    <span className="small">{t('studio.crashes.kpi_total_events_hint')}</span>
                </div>

                <div className="stat">
                    <span className="label st-an-label"><Server />{t('studio.crashes.kpi_affected_servers')}</span>
                    <span className="stat-value st-an-value">{(data?.crashedServersCount ?? 0).toLocaleString()}</span>
                    <span className="small">{t('studio.crashes.kpi_affected_servers_hint')}</span>
                </div>
            </div>

            <section className="panel">
                <div className="panel-head st-an-head">
                    <Activity className="st-an-icon" />
                    <h3 className="h3">{t('studio.crashes.chart_title')}</h3>
                    <span className="spacer" />
                    <span className="status small">
                        <span className="dot dot-pumpkin" />
                        {t('studio.crashes.chart_events')}
                    </span>
                </div>
                <div className="panel-body">
                    <div className="st-chart st-chart-sm">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.dailyTrend ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                {GRID}
                                <XAxis dataKey="date" {...AXIS} dy={8} />
                                <YAxis {...AXIS} tickFormatter={formatValue} allowDecimals={false} />
                                <Tooltip content={<ChartTip />} cursor={CURSOR} />
                                <Area
                                    type="linear"
                                    dataKey="occurrences"
                                    name={t('studio.crashes.chart_events')}
                                    stroke="var(--danger)"
                                    strokeWidth={3}
                                    fill="var(--danger)"
                                    fillOpacity={0.14}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </section>

            <section className="stack">
                <div className="st-head">
                    <h3 className="h2">
                        {t('studio.crashes.issues_title')}{' '}
                        <span className="mark num">{data?.issues.length ?? 0}</span>
                    </h3>
                    <div className="st-head-actions">
                        <div className="segmented" role="group" aria-label={t('studio.crashes.issues_title')}>
                            {statusTabs.map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    aria-pressed={statusFilter === key}
                                    onClick={() => setStatusFilter(key)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <select
                            className="input st-narrow"
                            value={versionFilter}
                            onChange={e => setVersionFilter(e.target.value)}
                            aria-label={t('studio.crashes.filter_all_versions')}
                        >
                            <option value="all">{t('studio.crashes.filter_all_versions')}</option>
                            {data?.availableVersions.map(ver => (
                                <option key={ver} value={ver}>
                                    v{ver.replace(/^v/, '')}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <span className="row small">
                        <span className="loading" />
                        {t('studio.crashes.loading')}
                    </span>
                ) : !data || data.issues.length === 0 ? (
                    <div className="blank">
                        <Bug size={32} className="pumpkin" />
                        <p className="h3">{t('studio.crashes.empty_title')}</p>
                        <p className="small">{t('studio.crashes.empty_desc')}</p>
                    </div>
                ) : (
                    <div className="stack st-tight">
                        {data.issues.map(issue => {
                            const isExpanded = !!expandedIds[issue.id];
                            const isResolved = issue.status === 'resolved';
                            const isIgnored = issue.status === 'ignored';
                            const isBusy = busyId === issue.id;

                            return (
                                <article
                                    key={issue.id}
                                    className={`panel ${isIgnored ? 'st-dim' : ''}`}
                                >
                                    <div className="panel-head st-an-head">
                                        <span
                                            className={`tag ${
                                                isResolved
                                                    ? 'tag-success'
                                                    : isIgnored
                                                    ? ''
                                                    : 'tag-danger'
                                            }`}
                                        >
                                            {issue.trapCode}
                                        </span>
                                        <span className="tag tag-pumpkin mono">
                                            v{issue.pluginVersion.replace(/^v/, '')}
                                        </span>
                                        {issue.apiVersion && (
                                            <span className="tag mono">API v{issue.apiVersion}</span>
                                        )}
                                        {issue.verifiedSignature && (
                                            <span className="tag tag-success" title={t('studio.crashes.verified_badge')}>
                                                <ShieldCheck size={12} />
                                                {t('studio.crashes.verified_badge')}
                                            </span>
                                        )}
                                        {isResolved && (
                                            <span className="tag tag-success">
                                                <CheckCircle2 size={12} />
                                                {issue.resolvedInVersion
                                                    ? t('studio.crashes.resolved_in', { version: issue.resolvedInVersion })
                                                    : t('studio.crashes.status_resolved')}
                                            </span>
                                        )}
                                        {isIgnored && (
                                            <span className="tag">
                                                <EyeOff size={12} />
                                                {t('studio.crashes.status_ignored')}
                                            </span>
                                        )}
                                        <span className="spacer" />
                                        <span className="small num">
                                            <strong>{t('studio.crashes.events_count', { count: issue.occurrences })}</strong>
                                            {' • '}
                                            {t('studio.crashes.servers_count', { count: issue.affectedServersCount })}
                                        </span>
                                        <button
                                            type="button"
                                            className="button button-ghost button-sm"
                                            onClick={() => toggleExpand(issue.id)}
                                            aria-expanded={isExpanded}
                                        >
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </div>

                                    <div className="panel-body stack st-tight">
                                        <div className="row st-an-head">
                                            <strong className="mono st-add-break">{issue.errorMessage}</strong>
                                        </div>

                                        <div className="row st-an-head small muted">
                                            {issue.entryHook && (
                                                <span>
                                                    <strong>{t('studio.crashes.hook_label')}:</strong>{' '}
                                                    <code className="mono">{issue.entryHook}</code>
                                                </span>
                                            )}
                                            {issue.location && (
                                                <span>
                                                    <strong>{t('studio.crashes.location_label')}:</strong>{' '}
                                                    <code className="mono">{issue.location}</code>
                                                </span>
                                            )}
                                            <span className="spacer" />
                                            <span>
                                                {t('studio.crashes.last_seen', {
                                                    date: new Date(issue.lastSeen).toLocaleString(),
                                                })}
                                            </span>
                                        </div>

                                        {isExpanded && (
                                            <div className="stack st-an-gap">
                                                <div className="st-callout">
                                                    <div className="row st-an-head">
                                                        <span className="label label-fg st-an-label">
                                                            <Terminal />
                                                            {t('studio.crashes.stacktrace_title')}
                                                        </span>
                                                        <span className="spacer" />
                                                        <button
                                                            type="button"
                                                            className="button button-ghost button-sm"
                                                            onClick={() => handleCopyTrace(issue)}
                                                        >
                                                            {copiedId === issue.id ? <Check className="st-pos" /> : <Copy />}
                                                            {copiedId === issue.id
                                                                ? t('studio.crashes.copied')
                                                                : t('studio.crashes.btn_copy_trace')}
                                                        </button>
                                                    </div>

                                                    {issue.wasmBacktrace && issue.wasmBacktrace.length > 0 ? (
                                                        <pre className="mono small st-pre">
                                                            {issue.wasmBacktrace
                                                                .map((f, idx) => {
                                                                    const fnName =
                                                                        f.func_name ||
                                                                        (f.func_index !== undefined
                                                                            ? `wasm-function[${f.func_index}]`
                                                                            : '<unknown>');
                                                                    const modName = f.module_name ? ` (${f.module_name})` : '';
                                                                    const offset =
                                                                        f.wasm_offset !== undefined
                                                                            ? ` @ 0x${f.wasm_offset.toString(16)}`
                                                                            : '';
                                                                    return `#${idx.toString().padStart(2, '0')}  ${fnName}${modName}${offset}`;
                                                                })
                                                                .join('\n')}
                                                        </pre>
                                                    ) : (
                                                        <p className="small muted">{t('studio.crashes.no_stacktrace')}</p>
                                                    )}
                                                </div>

                                                <div className="st-grid-2">
                                                    <div className="st-an-box">
                                                        <span className="label label-fg st-an-label">
                                                            <Cpu />
                                                            {t('studio.crashes.env_breakdown')}
                                                        </span>
                                                        <div className="row st-an-tight">
                                                            {issue.serverVersionDistribution.map((sw, i) => (
                                                                <span key={i} className="tag tag-fg">
                                                                    {sw.label}: {sw.count} ({sw.percentage}%)
                                                                </span>
                                                            ))}
                                                            {issue.osDistribution.map((os, i) => (
                                                                <span key={i} className="tag">
                                                                    {os.label}: {os.count} ({os.percentage}%)
                                                                </span>
                                                            ))}
                                                            {issue.latestMinecraftVersion && (
                                                                <span className="tag tag-pumpkin">
                                                                    MC {issue.latestMinecraftVersion}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="st-an-box">
                                                        <span className="label label-fg st-an-label">
                                                            <Layers />
                                                            {t('studio.crashes.fingerprint_label')}
                                                        </span>
                                                        <code className="mono small st-add-break">{issue.fingerprint}</code>
                                                        <span className="small muted">
                                                            {t('studio.crashes.first_seen', {
                                                                date: new Date(issue.firstSeen).toLocaleString(),
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="row st-row-end">
                                                    {issue.status !== 'resolved' && (
                                                        <button
                                                            type="button"
                                                            className="button button-primary button-sm"
                                                            disabled={isBusy}
                                                            onClick={() => handleUpdateStatus(issue, 'resolved')}
                                                        >
                                                            <CheckCircle2 />
                                                            {t('studio.crashes.btn_resolve')}
                                                        </button>
                                                    )}
                                                    {issue.status !== 'ignored' && (
                                                        <button
                                                            type="button"
                                                            className="button button-sm"
                                                            disabled={isBusy}
                                                            onClick={() => handleUpdateStatus(issue, 'ignored')}
                                                        >
                                                            <EyeOff />
                                                            {t('studio.crashes.btn_ignore')}
                                                        </button>
                                                    )}
                                                    {issue.status !== 'open' && (
                                                        <button
                                                            type="button"
                                                            className="button button-sm"
                                                            disabled={isBusy}
                                                            onClick={() => handleUpdateStatus(issue, 'open')}
                                                        >
                                                            <RotateCcw />
                                                            {t('studio.crashes.btn_reopen')}
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="button button-danger button-sm button-icon"
                                                        disabled={isBusy}
                                                        onClick={() => handleDeleteIssue(issue.id)}
                                                        title={t('studio.crashes.confirm_delete')}
                                                        aria-label={t('studio.crashes.confirm_delete')}
                                                    >
                                                        <Trash2 />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <div className="st-callout">
                <span className="row st-tight">
                    <ShieldCheck size={16} className="pumpkin" />
                    <strong>{t('studio.crashes.how_it_works_title')}</strong>
                </span>
                <p className="small">{t('studio.crashes.how_it_works_desc')}</p>
            </div>
        </div>
    );
};

export default Crashes;
