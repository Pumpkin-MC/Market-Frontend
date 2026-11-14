import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Check,
  Copy,
  Cpu,
  ExternalLink,
  HardDrive,
  Pencil,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import api from '../../lib/api';
import { IS_ACCOUNTS_SURFACE, getMarketUrl } from '../../lib/domains';
import { getPluginUrl } from '../../lib/url';

export interface LinkedServerSummary {
  id: number;
  serverPublicKey: string;
  displayName: string;
  serverType: string;
  serverVersion: string | null;
  minecraftVersion: string | null;
  isOnline: boolean;
  hasTelemetry: boolean;
  onlinePlayers: number;
  maxPlayers: number;
  ramAllocatedMb: number | null;
  totalRamMb: number | null;
  cpuCores: number | null;
  cpuModel: string | null;
  os: string | null;
  arch: string | null;
  country: string | null;
  countryName: string | null;
  pluginsCount: number;
  isPublic: boolean;
  linkedAt: string;
  firstSeen: string | null;
  lastPing: string | null;
}

interface TelemetryPoint {
  timestamp: string;
  onlinePlayers: number;
  maxPlayers: number;
  ramAllocatedMb: number | null;
  totalRamMb: number | null;
}

interface PluginEntry {
  name: string;
  version: string | null;
  language: string | null;
  marketPublicId: string | null;
  marketPluginId: number | null;
}

interface CrashEntry {
  crashGroupId: number;
  pluginId: number;
  pluginPublicId: string | null;
  pluginName: string;
  pluginVersion: string;
  trapCode: string;
  errorMessage: string;
  status: string;
  occurrences: number;
  lastSeen: string;
}

interface LinkedServerTelemetryDetail {
  server: LinkedServerSummary;
  range: '24h' | '7d' | '30d';
  peakPlayers: number;
  avgPlayers: number;
  samples: TelemetryPoint[];
  plugins: PluginEntry[];
  crashes: CrashEntry[];
}

const formatMemory = (mb: number | null | undefined): string => {
  if (mb == null || mb <= 0) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
};

const formatRelativeTime = (iso: string | null | undefined): string => {
  if (!iso) return 'Never';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const LinkedServersSection: React.FC<{
  onToast?: (text: string, type: 'success' | 'error') => void;
}> = ({ onToast }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [servers, setServers] = useState<LinkedServerSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const raw = searchParams.get('server');
    return raw ? Number(raw) || null : null;
  });

  const [range, setRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [detail, setDetail] = useState<LinkedServerTelemetryDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmUnlinkId, setConfirmUnlinkId] = useState<number | null>(null);

  const loadServers = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await api.get<LinkedServerSummary[]>('/user/servers');
      const list = res.data || [];
      setServers(list);
      setSelectedId((prev) => {
        if (prev && list.some((s) => s.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (err: any) {
      onToast?.(err.response?.data?.error || 'Failed to load your servers', 'error');
    } finally {
      setLoadingList(false);
    }
  }, [onToast]);

  const loadDetail = useCallback(
    async (serverId: number, selectedRange: '24h' | '7d' | '30d') => {
      setLoadingDetail(true);
      try {
        const res = await api.get<LinkedServerTelemetryDetail>(
          `/user/servers/${serverId}/telemetry?range=${selectedRange}`
        );
        setDetail(res.data);
      } catch (err: any) {
        onToast?.(err.response?.data?.error || 'Failed to load server telemetry', 'error');
      } finally {
        setLoadingDetail(false);
      }
    },
    [onToast]
  );

  useEffect(() => {
    void loadServers();
  }, [loadServers]);

  useEffect(() => {
    if (selectedId != null) {
      void loadDetail(selectedId, range);
    } else {
      setDetail(null);
    }
  }, [loadDetail, range, selectedId]);

  const handleSelectServer = (id: number) => {
    setSelectedId(id);
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'servers');
    next.set('server', String(id));
    setSearchParams(next, { replace: true });
  };

  const handleCopyCommand = () => {
    navigator.clipboard.writeText('pumpkin link');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleSaveRename = async (serverId: number) => {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    try {
      const res = await api.patch(`/user/servers/${serverId}`, { displayName: trimmed });
      const updatedName = res.data?.displayName || trimmed;
      setServers((prev) =>
        prev.map((s) => (s.id === serverId ? { ...s, displayName: updatedName } : s))
      );
      setDetail((prev) =>
        prev && prev.server.id === serverId
          ? { ...prev, server: { ...prev.server, displayName: updatedName } }
          : prev
      );
      setRenamingId(null);
      onToast?.('Server renamed', 'success');
    } catch (err: any) {
      onToast?.(err.response?.data?.error || 'Failed to rename server', 'error');
    }
  };

  const handleUnlink = async (serverId: number) => {
    try {
      await api.delete(`/user/servers/${serverId}`);
      setConfirmUnlinkId(null);
      setServers((prev) => {
        const remaining = prev.filter((s) => s.id !== serverId);
        if (selectedId === serverId) {
          setSelectedId(remaining[0]?.id ?? null);
        }
        return remaining;
      });
      onToast?.('Server unlinked from your Pumpkin Account', 'success');
    } catch (err: any) {
      onToast?.(err.response?.data?.error || 'Failed to unlink server', 'error');
    }
  };

  const activeServer =
    detail?.server || servers.find((s) => s.id === selectedId) || null;

  const chartData = (detail?.samples || []).map((pt) => {
    const d = new Date(pt.timestamp);
    const label =
      range === '24h'
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' });
    return {
      label,
      fullTime: d.toLocaleString(),
      onlinePlayers: pt.onlinePlayers,
      ramGb: pt.ramAllocatedMb != null ? Number((pt.ramAllocatedMb / 1024).toFixed(2)) : null,
    };
  });

  const ramPct =
    activeServer?.ramAllocatedMb && activeServer?.totalRamMb && activeServer.totalRamMb > 0
      ? Math.min(100, Math.round((activeServer.ramAllocatedMb / activeServer.totalRamMb) * 100))
      : null;

  return (
    <div className="stack">
      <header className="ac-section-head">
        <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="h1">
              <span className="mark">Your</span> Servers
            </h2>
            <p className="small">
              Manage your Pumpkin servers and monitor live player counts, hardware telemetry, active plugins, and crash reports.
            </p>
          </div>
          <span className="spacer" />
          <Link to="/link" className="button button-primary button-sm">
            <Plus size={16} /> Link Server
          </Link>
        </div>
      </header>

      {/* Quick Link Command Banner */}
      <section className="panel">
        <div className="panel-body">
          <div className="row" style={{ flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <span className="ac-icon">
              <Terminal />
            </span>
            <div style={{ flex: '1 1 16rem' }}>
              <strong style={{ display: 'block' }}>Link a Pumpkin Server in Seconds</strong>
              <span className="small">
                Run <code>pumpkin link</code> in your server terminal/console (restricted to console for security), then open the generated link.
              </span>
            </div>
            <button type="button" className="button button-sm" onClick={handleCopyCommand}>
              {copiedCmd ? <Check size={14} /> : <Copy size={14} />}
              {copiedCmd ? 'Copied!' : 'Copy pumpkin link'}
            </button>
          </div>
        </div>
      </section>

      {loadingList ? (
        <div className="panel">
          <div className="panel-body" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <span className="loading" />
            <p className="small" style={{ marginTop: '0.75rem' }}>
              Loading your servers…
            </p>
          </div>
        </div>
      ) : servers.length === 0 ? (
        <div className="panel">
          <div className="blank">
            <Server size={32} style={{ opacity: 0.6 }} />
            <p className="h2">
              No <span className="mark">servers</span> yet
            </p>
            <p className="small">
              Start any Pumpkin server, type <code>pumpkin link</code> in the console, and confirm the claim link to manage it and view real-time telemetry here.
            </p>
            <Link to="/link" className="button button-primary">
              Link Existing Server
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Server Selector Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(17rem, 1fr))',
              gap: '0.75rem',
            }}
          >
            {servers.map((srv) => {
              const isSelected = srv.id === selectedId;
              return (
                <div
                  key={srv.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectServer(srv.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectServer(srv.id);
                    }
                  }}
                  className="panel"
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--pumpkin)' : undefined,
                    boxShadow: isSelected ? '0 0 0 1px var(--pumpkin)' : undefined,
                    padding: '1rem',
                  }}
                >
                  <div className="row" style={{ alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      className="dot"
                      style={{
                        background: srv.isOnline ? 'var(--success)' : 'var(--muted)',
                      }}
                    />
                    <strong
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {srv.displayName}
                    </strong>
                    <span className="spacer" />
                    <span className={`sticker sticker-sm ${srv.isOnline ? 'sticker-success' : ''}`}>
                      {srv.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>

                  <div className="row small" style={{ marginTop: '0.65rem', gap: '0.75rem' }}>
                    <span>
                      <Users size={13} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
                      <strong>{srv.onlinePlayers}</strong>/{srv.maxPlayers}
                    </span>
                    <span>
                      <HardDrive size={13} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
                      {formatMemory(srv.ramAllocatedMb)}
                    </span>
                    <span className="spacer" />
                    <span className="muted">
                      {srv.minecraftVersion ? `MC ${srv.minecraftVersion}` : srv.serverVersion || 'Pumpkin'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Server Telemetry Dashboard */}
          {activeServer && (
            <section className="panel">
              <header className="panel-head">
                <div
                  className="row"
                  style={{ width: '100%', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {renamingId === activeServer.id ? (
                      <div className="row" style={{ gap: '0.4rem' }}>
                        <input
                          className="input"
                          style={{ height: '2rem', width: '14rem' }}
                          value={renameValue}
                          maxLength={64}
                          onChange={(e) => setRenameValue(e.target.value)}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="button button-primary button-sm"
                          onClick={() => void handleSaveRename(activeServer.id)}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          className="button button-sm"
                          onClick={() => setRenamingId(null)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="h3" style={{ margin: 0 }}>
                          {activeServer.displayName}
                        </h3>
                        <button
                          type="button"
                          className="button button-icon button-sm"
                          title="Rename server"
                          onClick={() => {
                            setRenamingId(activeServer.id);
                            setRenameValue(activeServer.displayName);
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                      </>
                    )}
                    <span className="small muted">
                      Last heartbeat: {formatRelativeTime(activeServer.lastPing)}
                    </span>
                  </div>

                  <span className="spacer" />

                  <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div className="segmented" role="group" aria-label="Telemetry time range">
                      {(['24h', '7d', '30d'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          className="st-an-cap"
                          aria-pressed={range === r}
                          onClick={() => setRange(r)}
                        >
                          {r.toUpperCase()}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="button button-icon button-sm"
                      title="Refresh telemetry"
                      onClick={() => {
                        void loadServers();
                        void loadDetail(activeServer.id, range);
                      }}
                    >
                      <RefreshCw size={14} />
                    </button>

                    {confirmUnlinkId === activeServer.id ? (
                      <div className="row" style={{ gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="button button-danger button-sm"
                          onClick={() => void handleUnlink(activeServer.id)}
                        >
                          Confirm Unlink
                        </button>
                        <button
                          type="button"
                          className="button button-sm"
                          onClick={() => setConfirmUnlinkId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="button button-sm"
                        onClick={() => setConfirmUnlinkId(activeServer.id)}
                        title="Unlink server"
                      >
                        <Trash2 size={14} /> Unlink
                      </button>
                    )}
                  </div>
                </div>
              </header>

              <div className="panel-body stack">
                {!activeServer.hasTelemetry && (
                  <div className="notice">
                    <span className="mark-box">
                      <Activity />
                    </span>
                    <p className="notice-text">
                      Waiting for the first telemetry heartbeat from this server. Make sure{' '}
                      <code>[telemetry] enabled = true</code> is active in your server&apos;s{' '}
                      <code>pumpkin.toml</code>.
                    </p>
                  </div>
                )}

                {/* KPI Metrics Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(12.5rem, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  <div className="panel" style={{ padding: '0.9rem 1rem' }}>
                    <span className="label">
                      <Users size={13} style={{ verticalAlign: 'text-bottom', marginRight: 5 }} />
                      Online Players
                    </span>
                    <div className="h2" style={{ marginTop: '0.35rem' }}>
                      {activeServer.onlinePlayers}{' '}
                      <span className="small muted">/ {activeServer.maxPlayers}</span>
                    </div>
                    <span className="small muted">
                      Peak ({range}): {detail?.peakPlayers ?? activeServer.onlinePlayers} • Avg:{' '}
                      {detail?.avgPlayers ?? activeServer.onlinePlayers}
                    </span>
                  </div>

                  <div className="panel" style={{ padding: '0.9rem 1rem' }}>
                    <span className="label">
                      <HardDrive size={13} style={{ verticalAlign: 'text-bottom', marginRight: 5 }} />
                      System Memory
                    </span>
                    <div className="h2" style={{ marginTop: '0.35rem' }}>
                      {formatMemory(activeServer.ramAllocatedMb)}
                      {activeServer.totalRamMb ? (
                        <span className="small muted"> / {formatMemory(activeServer.totalRamMb)}</span>
                      ) : null}
                    </div>
                    <span className="small muted">
                      {ramPct != null ? `${ramPct}% host memory utilized` : 'Reported via heartbeat'}
                    </span>
                  </div>

                  <div className="panel" style={{ padding: '0.9rem 1rem' }}>
                    <span className="label">
                      <Cpu size={13} style={{ verticalAlign: 'text-bottom', marginRight: 5 }} />
                      Host Hardware
                    </span>
                    <div
                      style={{
                        marginTop: '0.35rem',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={activeServer.cpuModel || undefined}
                    >
                      {activeServer.cpuModel || 'Unknown CPU'}
                    </div>
                    <span className="small muted">
                      {[
                        activeServer.cpuCores ? `${activeServer.cpuCores} cores` : null,
                        activeServer.os,
                        activeServer.arch,
                      ]
                        .filter(Boolean)
                        .join(' • ') || '—'}
                    </span>
                  </div>

                  <div className="panel" style={{ padding: '0.9rem 1rem' }}>
                    <span className="label">
                      <ShieldCheck size={13} style={{ verticalAlign: 'text-bottom', marginRight: 5 }} />
                      Runtime & Region
                    </span>
                    <div style={{ marginTop: '0.35rem', fontWeight: 600 }}>
                      {activeServer.serverType === 'vine' ? 'Vine' : 'Pumpkin'}{' '}
                      {activeServer.serverVersion || ''}
                    </div>
                    <span className="small muted">
                      {[
                        activeServer.minecraftVersion ? `MC ${activeServer.minecraftVersion}` : null,
                        activeServer.countryName || activeServer.country,
                      ]
                        .filter(Boolean)
                        .join(' • ') || '—'}
                    </span>
                  </div>
                </div>

                {/* Historical Charts */}
                {loadingDetail && !detail ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <span className="loading" />
                  </div>
                ) : chartData.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(19rem, 1fr))',
                      gap: '1rem',
                    }}
                  >
                    <div className="panel" style={{ padding: '1rem' }}>
                      <div className="row" style={{ marginBottom: '0.75rem' }}>
                        <span className="label">Player Activity ({range.toUpperCase()})</span>
                      </div>
                      <div style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                            <XAxis dataKey="label" stroke="var(--muted)" fontSize={11} />
                            <YAxis allowDecimals={false} stroke="var(--muted)" fontSize={11} width={32} />
                            <Tooltip
                              contentStyle={{
                                background: 'var(--surface)',
                                border: '1px solid var(--line-2)',
                                borderRadius: 8,
                                fontSize: 12,
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="onlinePlayers"
                              name="Players"
                              stroke="var(--pumpkin)"
                              fill="var(--pumpkin)"
                              fillOpacity={0.2}
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="panel" style={{ padding: '1rem' }}>
                      <div className="row" style={{ marginBottom: '0.75rem' }}>
                        <span className="label">Memory Usage GB ({range.toUpperCase()})</span>
                      </div>
                      <div style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                            <XAxis dataKey="label" stroke="var(--muted)" fontSize={11} />
                            <YAxis stroke="var(--muted)" fontSize={11} width={38} />
                            <Tooltip
                              contentStyle={{
                                background: 'var(--surface)',
                                border: '1px solid var(--line-2)',
                                borderRadius: 8,
                                fontSize: 12,
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="ramGb"
                              name="RAM (GB)"
                              stroke="#38bdf8"
                              fill="#38bdf8"
                              fillOpacity={0.18}
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="small muted">
                    Historical player & memory trend points will populate automatically as your server sends periodic 5-minute heartbeats.
                  </p>
                )}

                {/* Active Plugins List */}
                <div>
                  <h4 className="h3" style={{ marginBottom: '0.6rem' }}>
                    Loaded Plugins ({detail?.plugins.length ?? activeServer.pluginsCount})
                  </h4>
                  {detail && detail.plugins.length > 0 ? (
                    <div className="scroll-x">
                      <table className="ledger">
                        <thead>
                          <tr>
                            <th>Plugin</th>
                            <th>Version</th>
                            <th>Runtime</th>
                            <th className="end">Marketplace</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.plugins.map((pl, idx) => {
                            const marketPath = pl.marketPluginId
                              ? getPluginUrl({
                                  id: pl.marketPluginId,
                                  public_id: pl.marketPublicId || undefined,
                                  name: pl.name,
                                })
                              : null;

                            return (
                              <tr key={`${pl.name}-${idx}`}>
                                <td>
                                  <strong>{pl.name}</strong>
                                </td>
                                <td>
                                  <code>{pl.version || '—'}</code>
                                </td>
                                <td>
                                  {pl.language ? (
                                    <span className="sticker sticker-sm">{pl.language}</span>
                                  ) : (
                                    <span className="muted">—</span>
                                  )}
                                </td>
                                <td className="end">
                                  {marketPath ? (
                                    IS_ACCOUNTS_SURFACE ? (
                                      <a
                                        href={getMarketUrl(marketPath)}
                                        className="link link-pumpkin small"
                                      >
                                        View on Market <ExternalLink size={12} />
                                      </a>
                                    ) : (
                                      <Link to={marketPath} className="link link-pumpkin small">
                                        View on Market
                                      </Link>
                                    )
                                  ) : (
                                    <span className="small muted">Custom / Local</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="small muted">No active plugins reported in the latest heartbeat.</p>
                  )}
                </div>

                {/* Plugin Crashes on This Server */}
                <div>
                  <h4 className="h3" style={{ marginBottom: '0.6rem' }}>
                    Recent Plugin Crashes on This Server
                  </h4>
                  {detail && detail.crashes.length > 0 ? (
                    <div className="scroll-x">
                      <table className="ledger">
                        <thead>
                          <tr>
                            <th>Plugin</th>
                            <th>Trap / Error</th>
                            <th>Status</th>
                            <th className="end">Hits</th>
                            <th className="end">Last Seen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.crashes.map((cr) => (
                            <tr key={cr.crashGroupId}>
                              <td>
                                <strong>{cr.pluginName}</strong>{' '}
                                <span className="small muted">v{cr.pluginVersion}</span>
                              </td>
                              <td>
                                <code>{cr.trapCode}</code>:{' '}
                                <span className="small">{cr.errorMessage}</span>
                              </td>
                              <td>
                                <span
                                  className={`sticker sticker-sm ${
                                    cr.status === 'resolved' ? 'sticker-success' : ''
                                  }`}
                                >
                                  {cr.status}
                                </span>
                              </td>
                              <td className="end">{cr.occurrences}</td>
                              <td className="end small muted">
                                {formatRelativeTime(cr.lastSeen)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="notice notice-success">
                      <span className="mark-box mark-box-success">
                        <Check />
                      </span>
                      <p className="notice-text">
                        Zero WASM plugin crashes reported from this server.
                      </p>
                    </div>
                  )}
                </div>

                {/* Ed25519 Server Public Key Footer */}
                <div
                  className="row small"
                  style={{
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--line)',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <span className="muted">
                    <AlertTriangle size={13} style={{ display: 'none' }} />
                    Ed25519 Public Key:
                  </span>
                  <code style={{ wordBreak: 'break-all' }}>{activeServer.serverPublicKey}</code>
                  <span className="spacer" />
                  <button
                    type="button"
                    className="button button-sm"
                    onClick={() => handleCopyKey(activeServer.serverPublicKey)}
                  >
                    {copiedKey ? <Check size={13} /> : <Copy size={13} />}
                    {copiedKey ? 'Copied' : 'Copy Key'}
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
