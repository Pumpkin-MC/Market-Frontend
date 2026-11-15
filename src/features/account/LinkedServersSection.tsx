import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  ArrowBigUp,
  Check,
  Copy,
  Cpu,
  ExternalLink,
  GitFork,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Server,
  ShieldCheck,
  Terminal,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import api from '../../lib/api';
import {
  IS_ACCOUNTS_SURFACE,
  getMarketUrl,
  getServerDetailUrl,
  getServersUrl,
  useCrossSubdomainSso,
} from '../../lib/domains';
import { validateAndSanitizeImage } from '../../lib/fileValidation';
import { getPluginUrl } from '../../lib/url';
import { ServerTagPicker } from '../servers/ServerTagBadge';
import {
  MAX_SERVER_TAGS,
  type OwnerServerListingResponse,
} from '../servers/constants';
import {
  ServerTopologyGraph,
  type ServerTopologyEdge,
  type UnlinkedProxyBackend,
} from './ServerTopologyGraph';

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
  onlineMode?: boolean | null;
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

interface DistributionItem {
  label: string;
  count: number;
  percentage: number;
}

interface PlayerBreakdown {
  uniquePlayers: number;
  editions: DistributionItem[];
  clientBrands: DistributionItem[];
  locales: DistributionItem[];
  viewDistances: DistributionItem[];
}

interface NewVsReturningPoint {
  timestamp: string;
  newPlayers: number;
  returningPlayers: number;
}

interface BounceRateStats {
  percentage: number | null;
  bouncedPlayers: number;
  firstTimeJoins: number;
}

interface RetentionCohort {
  percentage: number | null;
  retained: number;
  eligible: number;
}

interface RetentionStats {
  d1: RetentionCohort;
  d7: RetentionCohort;
  d30: RetentionCohort;
}

interface PlaytimeStats {
  avgSessionSecs: number;
  medianSessionSecs: number;
  totalSessions: number;
  tiers: DistributionItem[];
}

interface PeakHeatmapCell {
  dayOfWeek: number;
  hourUtc: number;
  avgPlayers: number;
  peakPlayers: number;
}

interface PlayerAnalytics {
  dau: number;
  wau: number;
  mau: number;
  bucketUnit: 'hour' | 'day' | string;
  newVsReturning: NewVsReturningPoint[];
  bounceRate: BounceRateStats;
  retention: RetentionStats;
  playtime: PlaytimeStats;
  peakHeatmap: PeakHeatmapCell[];
}

interface LinkedServerTelemetryDetail {
  server: LinkedServerSummary;
  range: '24h' | '7d' | '30d';
  peakPlayers: number;
  avgPlayers: number;
  samples: TelemetryPoint[];
  plugins: PluginEntry[];
  crashes: CrashEntry[];
  playerBreakdown?: PlayerBreakdown;
  playerAnalytics?: PlayerAnalytics;
}

interface ServerNetworkTopologyResponse {
  servers: LinkedServerSummary[];
  edges: ServerTopologyEdge[];
  unlinkedBackends: UnlinkedProxyBackend[];
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const WEEKDAY_LONG = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const formatDuration = (secs: number | null | undefined): string => {
  if (secs == null || secs <= 0) return '—';
  const rounded = Math.round(secs);
  if (rounded < 60) return `${rounded}s`;
  const mins = Math.floor(rounded / 60);
  const remSecs = rounded % 60;
  if (mins < 60) {
    return remSecs > 0 ? `${mins}m ${remSecs}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
};

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
  const sso = useCrossSubdomainSso();
  const [searchParams, setSearchParams] = useSearchParams();
  const [servers, setServers] = useState<LinkedServerSummary[]>([]);
  const [topologyEdges, setTopologyEdges] = useState<ServerTopologyEdge[]>([]);
  const [unlinkedBackends, setUnlinkedBackends] = useState<UnlinkedProxyBackend[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const raw = searchParams.get('server');
    return raw ? Number(raw) || null : null;
  });

  const [range, setRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [detail, setDetail] = useState<LinkedServerTelemetryDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [copiedCmd, setCopiedCmd] = useState<'pumpkin' | 'vine' | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmUnlinkId, setConfirmUnlinkId] = useState<number | null>(null);

  const [listing, setListing] = useState<OwnerServerListingResponse | null>(null);
  const [loadingListing, setLoadingListing] = useState(false);
  const [savingListing, setSavingListing] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const iconInputRef = useRef<HTMLInputElement | null>(null);

  const [formIsListed, setFormIsListed] = useState(false);
  const [formJavaAddress, setFormJavaAddress] = useState('');
  const [formBedrockAddress, setFormBedrockAddress] = useState('');
  const [formTagline, setFormTagline] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formWebsiteUrl, setFormWebsiteUrl] = useState('');
  const [formDiscordUrl, setFormDiscordUrl] = useState('');

  const syncListingForm = (data: OwnerServerListingResponse) => {
    setListing(data);
    setFormIsListed(data.isListed);
    setFormJavaAddress(data.javaAddress || '');
    setFormBedrockAddress(data.bedrockAddress || '');
    setFormTagline(data.tagline || '');
    setFormDescription(data.description || '');
    setFormTags(data.tags || []);
    setFormWebsiteUrl(data.websiteUrl || '');
    setFormDiscordUrl(data.discordUrl || '');
  };

  const loadListing = useCallback(
    async (serverId: number) => {
      setLoadingListing(true);
      try {
        const res = await api.get<OwnerServerListingResponse>(
          `/user/servers/${serverId}/listing`
        );
        syncListingForm(res.data);
      } catch (err: any) {
        onToast?.(err.response?.data?.error || 'Failed to load public listing settings', 'error');
      } finally {
        setLoadingListing(false);
      }
    },
    [onToast]
  );

  const loadServers = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await api.get<ServerNetworkTopologyResponse>('/user/servers/topology');
      const list = res.data?.servers || [];
      setServers(list);
      setTopologyEdges(res.data?.edges || []);
      setUnlinkedBackends(res.data?.unlinkedBackends || []);
      setSelectedId((prev) => {
        if (prev && list.some((s) => s.id === prev)) return prev;
        // Prefer selecting a root Vine proxy first when present so network overview is front-and-center
        const firstVine = list.find((s) => s.serverType === 'vine');
        return firstVine?.id ?? list[0]?.id ?? null;
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

  useEffect(() => {
    if (selectedId != null) {
      void loadListing(selectedId);
    } else {
      setListing(null);
    }
  }, [loadListing, selectedId]);

  const handleSelectServer = (id: number) => {
    setSelectedId(id);
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'servers');
    next.set('server', String(id));
    setSearchParams(next, { replace: true });
  };

  const handleCopyCommand = (kind: 'pumpkin' | 'vine') => {
    navigator.clipboard.writeText(kind === 'vine' ? 'vine link' : 'pumpkin link');
    setCopiedCmd(kind);
    setTimeout(() => setCopiedCmd((prev) => (prev === kind ? null : prev)), 2000);
  };

  const handleConnectServer = async (
    proxyServerId: number,
    backendServerId: number,
    routeLabel: string | null,
    isDefault: boolean
  ): Promise<boolean> => {
    try {
      await api.post(`/user/servers/${proxyServerId}/connections`, {
        backendServerId,
        routeLabel,
        isDefault,
      });
      await loadServers();
      onToast?.('Backend server connected to Vine proxy', 'success');
      return true;
    } catch (err: any) {
      onToast?.(
        err.response?.data?.error || 'Failed to connect backend server to Vine proxy',
        'error'
      );
      return false;
    }
  };

  const handleDisconnectServer = async (
    proxyServerId: number,
    backendServerId: number
  ): Promise<void> => {
    try {
      await api.delete(`/user/servers/${proxyServerId}/connections/${backendServerId}`);
      await loadServers();
      onToast?.('Route disconnected from Vine proxy', 'success');
    } catch (err: any) {
      onToast?.(err.response?.data?.error || 'Failed to disconnect route', 'error');
    }
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
      void loadServers();
      onToast?.('Server renamed', 'success');
    } catch (err: any) {
      onToast?.(err.response?.data?.error || 'Failed to rename server', 'error');
    }
  };

  const handleUnlink = async (serverId: number) => {
    try {
      await api.delete(`/user/servers/${serverId}`);
      setConfirmUnlinkId(null);
      setTopologyEdges((prev) =>
        prev.filter((e) => e.proxyServerId !== serverId && e.backendServerId !== serverId)
      );
      setUnlinkedBackends((prev) => prev.filter((u) => u.proxyServerId !== serverId));
      setServers((prev) => {
        const remaining = prev.filter((s) => s.id !== serverId);
        if (selectedId === serverId) {
          setSelectedId(remaining[0]?.id ?? null);
        }
        return remaining;
      });
      onToast?.('Unlinked from your Pumpkin Account', 'success');
    } catch (err: any) {
      onToast?.(err.response?.data?.error || 'Failed to unlink server', 'error');
    }
  };

  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeServer) return;
    setSavingListing(true);
    try {
      const res = await api.put<OwnerServerListingResponse>(
        `/user/servers/${activeServer.id}/listing`,
        {
          isListed: formIsListed,
          javaAddress: formJavaAddress.trim(),
          bedrockAddress: formBedrockAddress.trim() || null,
          tagline: formTagline.trim(),
          description: formDescription,
          tags: formTags,
          websiteUrl: formWebsiteUrl.trim() || null,
          discordUrl: formDiscordUrl.trim() || null,
        }
      );
      syncListingForm(res.data);
      setServers((prev) =>
        prev.map((s) => (s.id === activeServer.id ? { ...s, isPublic: res.data.isListed } : s))
      );
      onToast?.(
        res.data.isListed
          ? 'Server published on Pumpkin Servers!'
          : 'Server listing settings saved',
        'success'
      );
    } catch (err: any) {
      onToast?.(err.response?.data?.error || 'Failed to save public server listing', 'error');
    } finally {
      setSavingListing(false);
    }
  };

  const handleIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    e.target.value = '';
    if (!rawFile || !activeServer) return;

    setUploadingIcon(true);
    try {
      const validated = await validateAndSanitizeImage(rawFile, {
        maxWidth: 512,
        maxHeight: 512,
        minWidth: 32,
        minHeight: 32,
        quality: 0.9,
      });
      if (!validated.valid || !validated.file) {
        onToast?.(validated.error || 'Invalid server icon image', 'error');
        return;
      }

      const fd = new FormData();
      fd.append('image', validated.file);
      const res = await api.post<{ iconUrl: string }>(
        `/user/servers/${activeServer.id}/icon`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setListing((prev) => (prev ? { ...prev, iconUrl: res.data.iconUrl } : prev));
      onToast?.('Server icon updated', 'success');
    } catch (err: any) {
      onToast?.(err.response?.data?.error || 'Failed to upload server icon', 'error');
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleRemoveIcon = async () => {
    if (!activeServer) return;
    setUploadingIcon(true);
    try {
      await api.delete(`/user/servers/${activeServer.id}/icon`);
      setListing((prev) => (prev ? { ...prev, iconUrl: null } : prev));
      onToast?.('Server icon removed', 'success');
    } catch (err: any) {
      onToast?.(err.response?.data?.error || 'Failed to remove server icon', 'error');
    } finally {
      setUploadingIcon(false);
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
              <span className="mark">Your</span> Servers &amp; Proxies
            </h2>
            <p className="small">
              Manage your Pumpkin servers and Vine proxies, visualize your network topology, and monitor live player counts, hardware telemetry, plugins, and crash reports.
            </p>
          </div>
          <span className="spacer" />
          <Link to="/link" className="button button-primary button-sm">
            <Plus size={16} /> Link Node
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
              <strong style={{ display: 'block' }}>
                Link a Pumpkin Server or Vine Proxy in Seconds
              </strong>
              <span className="small">
                Run <code>pumpkin link</code> on your Pumpkin server or <code>vine link</code> on your Vine proxy console, then open the claim link. Connected Vine proxies &amp; Pumpkin backends automatically form your live network tree.
              </span>
            </div>
            <div className="row" style={{ gap: '0.45rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="button button-sm"
                onClick={() => handleCopyCommand('pumpkin')}
              >
                {copiedCmd === 'pumpkin' ? <Check size={14} /> : <Copy size={14} />}
                {copiedCmd === 'pumpkin' ? 'Copied!' : 'Copy pumpkin link'}
              </button>
              <button
                type="button"
                className="button button-sm"
                onClick={() => handleCopyCommand('vine')}
              >
                {copiedCmd === 'vine' ? <Check size={14} /> : <GitFork size={14} />}
                {copiedCmd === 'vine' ? 'Copied!' : 'Copy vine link'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {loadingList ? (
        <div className="panel">
          <div className="panel-body" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <span className="loading" />
            <p className="small" style={{ marginTop: '0.75rem' }}>
              Loading your servers &amp; network topology…
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
              Run <code>pumpkin link</code> on a Pumpkin server or <code>vine link</code> on a Vine proxy console to manage them, visualize your network tree, and view real-time telemetry here.
            </p>
            <Link to="/link" className="button button-primary">
              Link Server or Proxy
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Interactive Network Topology Tree / Node Graph (shown whenever a Vine proxy or route exists) */}
          <ServerTopologyGraph
            servers={servers}
            edges={topologyEdges}
            unlinkedBackends={unlinkedBackends}
            selectedId={selectedId}
            onSelectServer={handleSelectServer}
            onConnectServer={handleConnectServer}
            onDisconnectServer={handleDisconnectServer}
          />

          {/* Server & Proxy Selector Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(17rem, 1fr))',
              gap: '0.75rem',
            }}
          >
            {servers.map((srv) => {
              const isSelected = srv.id === selectedId;
              const isVine = srv.serverType === 'vine';
              const accentColor = isVine ? 'var(--success)' : 'var(--pumpkin)';
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
                    borderColor: isSelected ? accentColor : undefined,
                    boxShadow: isSelected ? `0 0 0 1px ${accentColor}` : undefined,
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
                    {isVine && (
                      <span className="sticker sticker-sm ac-sticker-vine">Vine</span>
                    )}
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
                      {srv.minecraftVersion
                        ? `MC ${srv.minecraftVersion}`
                        : isVine
                          ? `Vine ${srv.serverVersion || ''}`.trim()
                          : srv.serverVersion || 'Pumpkin'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Server Telemetry Dashboard */}
          {activeServer && (
            <>
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
                        {activeServer.serverType === 'vine' && (
                          <span className="sticker sticker-sm ac-sticker-vine">
                            <GitFork size={12} style={{ marginRight: 4 }} /> Vine Proxy
                          </span>
                        )}
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
                      Waiting for the first telemetry heartbeat from this{' '}
                      {activeServer.serverType === 'vine' ? 'Vine proxy' : 'server'}. Make sure{' '}
                      <code>[telemetry] enabled = true</code> is active in your{' '}
                      <code>
                        {activeServer.serverType === 'vine' ? 'vine.toml' : 'pumpkin.toml'}
                      </code>
                      .
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
                      {detail?.playerBreakdown && detail.playerBreakdown.uniquePlayers > 0
                        ? ` • Unique: ${detail.playerBreakdown.uniquePlayers.toLocaleString()}`
                        : ''}
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
                        activeServer.onlineMode === true
                          ? 'Online Mode'
                          : activeServer.onlineMode === false
                            ? 'Offline Mode'
                            : null,
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

                {/* Player Engagement, Retention & Concurrency */}
                {detail?.playerAnalytics && (() => {
                  const pa = detail.playerAnalytics;
                  const stickiness =
                    pa.mau > 0 ? Math.min(100, Math.round((pa.dau / pa.mau) * 1000) / 10) : null;

                  const nvrChartData = pa.newVsReturning.map((pt) => {
                    const d = new Date(pt.timestamp);
                    const label =
                      pa.bucketUnit === 'hour'
                        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    return {
                      label,
                      newPlayers: pt.newPlayers,
                      returningPlayers: pt.returningPlayers,
                    };
                  });

                  // Shift UTC (dayOfWeek 0=Mon..6=Sun, hourUtc 0..23) into viewer's local timezone
                  const tzOffsetHours = -Math.round(new Date().getTimezoneOffset() / 60);
                  const tzName =
                    typeof Intl !== 'undefined'
                      ? Intl.DateTimeFormat().resolvedOptions().timeZone
                      : 'Local';
                  const localGrid: { peak: number; avg: number }[][] = Array.from(
                    { length: 7 },
                    () => Array.from({ length: 24 }, () => ({ peak: 0, avg: 0 })),
                  );
                  let maxHeatmapPeak = 0;
                  let bestSlot: { day: number; hour: number; peak: number; avg: number } | null =
                    null;

                  for (const cell of pa.peakHeatmap) {
                    const totalHours = cell.dayOfWeek * 24 + cell.hourUtc + tzOffsetHours;
                    const wrapped = ((totalHours % 168) + 168) % 168;
                    const localDay = Math.floor(wrapped / 24);
                    const localHour = wrapped % 24;
                    const target = localGrid[localDay][localHour];
                    if (cell.peakPlayers >= target.peak) {
                      target.peak = cell.peakPlayers;
                      target.avg = cell.avgPlayers;
                    }
                    if (target.peak > maxHeatmapPeak) {
                      maxHeatmapPeak = target.peak;
                    }
                    if (
                      target.peak > 0 &&
                      (!bestSlot ||
                        target.peak > bestSlot.peak ||
                        (target.peak === bestSlot.peak && target.avg > bestSlot.avg))
                    ) {
                      bestSlot = {
                        day: localDay,
                        hour: localHour,
                        peak: target.peak,
                        avg: target.avg,
                      };
                    }
                  }

                  const bouncePct = pa.bounceRate.percentage;
                  const bounceTone =
                    bouncePct == null
                      ? 'var(--fg)'
                      : bouncePct <= 25
                        ? 'var(--success, #22c55e)'
                        : bouncePct <= 50
                          ? '#f59e0b'
                          : 'var(--danger, #ef4444)';

                  return (
                    <div className="stack" style={{ '--gap': '1rem' } as React.CSSProperties}>
                      <div
                        className="row"
                        style={{ gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}
                      >
                        <h4 className="h3" style={{ margin: 0 }}>
                          Audience, Retention &amp; Sessions
                        </h4>
                        {stickiness != null && (
                          <span className="sticker sticker-sm">
                            {stickiness.toFixed(1)}% DAU/MAU stickiness
                          </span>
                        )}
                      </div>

                      {/* Top 4 KPI Cards: DAU/WAU/MAU, Bounce Rate, Session Duration, D1/D7/D30 Retention */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(14.5rem, 1fr))',
                          gap: '0.75rem',
                        }}
                      >
                        <div className="panel" style={{ padding: '0.9rem 1rem' }}>
                          <span className="label">Active Unique Players</span>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '0.5rem',
                              marginTop: '0.45rem',
                            }}
                          >
                            <div>
                              <div className="h3" style={{ margin: 0 }}>
                                {pa.dau.toLocaleString()}
                              </div>
                              <span className="small muted mono">DAU (24h)</span>
                            </div>
                            <div>
                              <div className="h3" style={{ margin: 0 }}>
                                {pa.wau.toLocaleString()}
                              </div>
                              <span className="small muted mono">WAU (7d)</span>
                            </div>
                            <div>
                              <div className="h3" style={{ margin: 0 }}>
                                {pa.mau.toLocaleString()}
                              </div>
                              <span className="small muted mono">MAU (30d)</span>
                            </div>
                          </div>
                        </div>

                        <div className="panel" style={{ padding: '0.9rem 1rem' }}>
                          <span className="label">First-Join Bounce Rate (&lt; 2m)</span>
                          <div
                            className="h2"
                            style={{ marginTop: '0.35rem', color: bounceTone }}
                          >
                            {bouncePct != null ? `${bouncePct.toFixed(1)}%` : '—'}
                          </div>
                          <span className="small muted">
                            {pa.bounceRate.firstTimeJoins > 0
                              ? `${pa.bounceRate.bouncedPlayers.toLocaleString()} of ${pa.bounceRate.firstTimeJoins.toLocaleString()} new joins (${range}) left in < 2m`
                              : `No resolved first-time joins in ${range} yet`}
                          </span>
                        </div>

                        <div className="panel" style={{ padding: '0.9rem 1rem' }}>
                          <span className="label">Session Duration ({range.toUpperCase()})</span>
                          <div className="h2" style={{ marginTop: '0.35rem' }}>
                            {formatDuration(pa.playtime.avgSessionSecs)}{' '}
                            <span className="small muted">avg</span>
                          </div>
                          <span className="small muted">
                            Median: <strong>{formatDuration(pa.playtime.medianSessionSecs)}</strong>{' '}
                            • {pa.playtime.totalSessions.toLocaleString()}{' '}
                            {pa.playtime.totalSessions === 1 ? 'session' : 'sessions'}
                          </span>
                        </div>

                        <div className="panel" style={{ padding: '0.9rem 1rem' }}>
                          <span className="label">Cohort Retention</span>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '0.5rem',
                              marginTop: '0.45rem',
                            }}
                          >
                            {(
                              [
                                { label: 'D1', cohort: pa.retention.d1 },
                                { label: 'D7', cohort: pa.retention.d7 },
                                { label: 'D30', cohort: pa.retention.d30 },
                              ] as const
                            ).map(({ label, cohort }) => (
                              <div
                                key={label}
                                title={
                                  cohort.eligible > 0
                                    ? `${cohort.retained} of ${cohort.eligible} eligible players returned`
                                    : `Cohort maturing — needs ${label.slice(1)}d history`
                                }
                              >
                                <div className="h3" style={{ margin: 0 }}>
                                  {cohort.percentage != null
                                    ? `${cohort.percentage.toFixed(0)}%`
                                    : '—'}
                                </div>
                                <span className="small muted mono">
                                  {label}{' '}
                                  {cohort.eligible > 0
                                    ? `(${cohort.retained}/${cohort.eligible})`
                                    : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* New vs. Returning Chart + Playtime Tiers */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
                          gap: '0.85rem',
                        }}
                      >
                        <div className="panel" style={{ padding: '1rem' }}>
                          <div
                            className="row"
                            style={{
                              marginBottom: '0.75rem',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.4rem',
                            }}
                          >
                            <span className="label">
                              New vs. Returning Players (per {pa.bucketUnit})
                            </span>
                            <span className="small muted mono">{range.toUpperCase()}</span>
                          </div>
                          {nvrChartData.length > 0 ? (
                            <div style={{ width: '100%', height: 210 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={nvrChartData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                                  <XAxis dataKey="label" stroke="var(--muted)" fontSize={11} />
                                  <YAxis
                                    stroke="var(--muted)"
                                    fontSize={11}
                                    width={34}
                                    allowDecimals={false}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      background: 'var(--surface)',
                                      border: '1px solid var(--line-2)',
                                      borderRadius: 8,
                                      fontSize: 12,
                                    }}
                                  />
                                  <Legend wrapperStyle={{ fontSize: 12 }} />
                                  <Bar
                                    dataKey="returningPlayers"
                                    name="Returning"
                                    stackId="players"
                                    fill="var(--pumpkin)"
                                  />
                                  <Bar
                                    dataKey="newPlayers"
                                    name="New"
                                    stackId="players"
                                    fill="#22c55e"
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <p className="small muted" style={{ margin: '2rem 0' }}>
                              New vs. returning player buckets will populate once sessions are recorded in this range.
                            </p>
                          )}
                        </div>

                        <div className="panel" style={{ padding: '1rem' }}>
                          <div
                            className="row"
                            style={{
                              marginBottom: '0.75rem',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.4rem',
                            }}
                          >
                            <span className="label">Playtime Tiers ({range.toUpperCase()})</span>
                            <span className="small muted">Cumulative per player</span>
                          </div>
                          {pa.playtime.tiers.length > 0 ? (
                            <div
                              className="stack"
                              style={{ '--gap': '0.85rem', marginTop: '0.5rem' } as React.CSSProperties}
                            >
                              {pa.playtime.tiers.map((tier) => (
                                <div key={tier.label}>
                                  <div
                                    className="row small"
                                    style={{ justifyContent: 'space-between', marginBottom: 4 }}
                                  >
                                    <strong>{tier.label}</strong>
                                    <span className="muted mono">
                                      {tier.count.toLocaleString()} players (
                                      {tier.percentage.toFixed(1)}%)
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      height: 8,
                                      background: 'var(--sunk)',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <div
                                      style={{
                                        height: '100%',
                                        width: `${Math.min(100, Math.max(tier.count > 0 ? 3 : 0, tier.percentage))}%`,
                                        background: 'var(--pumpkin)',
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="small muted" style={{ margin: '2rem 0' }}>
                              Casual (&lt; 1h), Regular (1–10h), and Core (10h+) player tiers will appear once sessions are recorded.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 7x24 Peak Concurrency Heatmap */}
                      <div className="panel" style={{ padding: '1rem' }}>
                        <div
                          className="row"
                          style={{
                            marginBottom: '0.75rem',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          <div>
                            <span className="label" style={{ display: 'block' }}>
                              7×24 Peak Concurrency Heatmap (Last 30 Days)
                            </span>
                            <span className="small muted">
                              Hours shown in {tzName}
                            </span>
                          </div>
                          {bestSlot && (
                            <span className="tag tag-pumpkin">
                              Best Window: {WEEKDAY_LONG[bestSlot.day]}{' '}
                              {String(bestSlot.hour).padStart(2, '0')}:00 ({bestSlot.peak} peak)
                            </span>
                          )}
                        </div>

                        <div className="scroll-x">
                          <div style={{ minWidth: 540 }}>
                            {/* Hour Labels */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '2.6rem repeat(24, minmax(18px, 1fr))',
                                gap: 3,
                                marginBottom: 4,
                              }}
                            >
                              <span />
                              {Array.from({ length: 24 }, (_, hr) => (
                                <span
                                  key={hr}
                                  className="mono muted"
                                  style={{
                                    fontSize: 10,
                                    textAlign: 'center',
                                    opacity: hr % 3 === 0 ? 1 : 0.45,
                                  }}
                                >
                                  {hr % 3 === 0 ? String(hr).padStart(2, '0') : '·'}
                                </span>
                              ))}
                            </div>

                            {/* 7 Day Rows */}
                            <div className="stack" style={{ '--gap': '3px' } as React.CSSProperties}>
                              {WEEKDAY_SHORT.map((dayLabel, dayIdx) => (
                                <div
                                  key={dayLabel}
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2.6rem repeat(24, minmax(18px, 1fr))',
                                    gap: 3,
                                    alignItems: 'center',
                                  }}
                                >
                                  <span className="small muted mono" style={{ fontSize: 11 }}>
                                    {dayLabel}
                                  </span>
                                  {localGrid[dayIdx].map((slot, hr) => {
                                    const ratio =
                                      maxHeatmapPeak > 0 ? slot.peak / maxHeatmapPeak : 0;
                                    const alpha =
                                      slot.peak > 0
                                        ? (0.18 + ratio * 0.82).toFixed(2)
                                        : '0';
                                    return (
                                      <div
                                        key={hr}
                                        title={`${WEEKDAY_LONG[dayIdx]} ${String(hr).padStart(2, '0')}:00 — Peak: ${slot.peak} players, Avg: ${slot.avg.toFixed(1)}`}
                                        style={{
                                          height: 18,
                                          borderRadius: 2,
                                          background:
                                            slot.peak > 0
                                              ? `rgba(249, 115, 22, ${alpha})`
                                              : 'var(--sunk)',
                                          border:
                                            bestSlot &&
                                            bestSlot.day === dayIdx &&
                                            bestSlot.hour === hr
                                              ? '1px solid var(--fg)'
                                              : '1px solid transparent',
                                        }}
                                      />
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Player Breakdown */}
                <div>
                  <div
                    className="row"
                    style={{
                      marginBottom: '0.6rem',
                      gap: '0.6rem',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                    }}
                  >
                    <h4 className="h3" style={{ margin: 0 }}>
                      Player Breakdown ({range.toUpperCase()})
                    </h4>
                    {detail?.playerBreakdown && detail.playerBreakdown.uniquePlayers > 0 && (
                      <span className="sticker sticker-sm">
                        {detail.playerBreakdown.uniquePlayers.toLocaleString()} unique{' '}
                        {detail.playerBreakdown.uniquePlayers === 1 ? 'player' : 'players'}
                      </span>
                    )}
                  </div>

                  {detail?.playerBreakdown && detail.playerBreakdown.uniquePlayers > 0 ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(14.5rem, 1fr))',
                        gap: '0.75rem',
                      }}
                    >
                      {(
                        [
                          { title: 'Editions', items: detail.playerBreakdown.editions },
                          { title: 'Client Brands', items: detail.playerBreakdown.clientBrands },
                          { title: 'Player Locales', items: detail.playerBreakdown.locales },
                          { title: 'View Distance', items: detail.playerBreakdown.viewDistances },
                        ] as const
                      ).map((group) => (
                        <div key={group.title} className="panel" style={{ padding: '0.9rem 1rem' }}>
                          <span className="label" style={{ display: 'block', marginBottom: '0.65rem' }}>
                            {group.title}
                          </span>
                          {group.items.length > 0 ? (
                            <div className="stack" style={{ '--gap': '0.5rem' } as React.CSSProperties}>
                              {group.items.slice(0, 6).map((item) => (
                                <div key={item.label}>
                                  <div
                                    className="row small"
                                    style={{ justifyContent: 'space-between', marginBottom: 3 }}
                                  >
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                      title={item.label}
                                    >
                                      {item.label}
                                    </span>
                                    <span className="muted mono" style={{ flexShrink: 0 }}>
                                      {item.count.toLocaleString()} ({item.percentage.toFixed(1)}%)
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      height: 5,
                                      background: 'var(--sunk)',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <div
                                      style={{
                                        height: '100%',
                                        width: `${Math.min(100, Math.max(2, item.percentage))}%`,
                                        background: 'var(--pumpkin)',
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="small muted">No data yet</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="small muted">
                      Anonymous player edition, client brand, locale, and view distance stats will appear once players join your server.
                    </p>
                  )}
                </div>

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

            {/* Public Server Directory Listing Editor */}
            <section className="panel">
              <header className="panel-head">
                <div
                  className="row"
                  style={{ width: '100%', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}
                >
                  <div className="row" style={{ gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Globe size={18} className="pumpkin" />
                    <h3 className="h3" style={{ margin: 0 }}>
                      Public Server List
                    </h3>
                    {listing?.isListed && listing.moderationStatus === 'active' ? (
                      <span className="sticker sticker-sm sticker-success">Listed Publicly</span>
                    ) : listing?.moderationStatus === 'hidden' ? (
                      <span className="tag tag-warning">Hidden by Staff</span>
                    ) : listing?.moderationStatus === 'banned' ? (
                      <span className="tag tag-danger">Banned</span>
                    ) : (
                      <span className="sticker sticker-sm">Unlisted</span>
                    )}
                    {listing && listing.upvotesCount > 0 && (
                      <span className="tag tag-pumpkin">
                        <ArrowBigUp size={13} /> {listing.upvotesCount.toLocaleString()} Upvotes
                      </span>
                    )}
                  </div>

                  <span className="spacer" />

                  <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                    {listing?.isListed &&
                      listing.publicId &&
                      listing.moderationStatus === 'active' &&
                      (IS_ACCOUNTS_SURFACE || sso ? (
                        <a
                          href={getServerDetailUrl(listing.publicId, listing.slug)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="button button-sm"
                        >
                          View Public Page <ExternalLink size={13} />
                        </a>
                      ) : (
                        <Link
                          to={getServerDetailUrl(listing.publicId, listing.slug)}
                          className="button button-sm"
                        >
                          View Public Page <ExternalLink size={13} />
                        </Link>
                      ))}
                    <a
                      href={getServersUrl('/')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button button-ghost button-sm"
                    >
                      servers.pumpkinmc.org <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              </header>

              <div className="panel-body">
                {loadingListing && !listing ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <span className="loading" />
                  </div>
                ) : (
                  <form onSubmit={handleSaveListing} className="stack">
                    {listing?.moderationStatus === 'banned' && (
                      <div className="notice notice-danger">
                        <span className="mark-box mark-box-danger">
                          <AlertTriangle />
                        </span>
                        <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                          <strong>This server listing has been banned by Pumpkin Staff.</strong>
                          {listing.moderationReason && (
                            <span className="small">Reason: {listing.moderationReason}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {listing?.moderationStatus === 'hidden' && (
                      <div className="notice notice-warning">
                        <span className="mark-box mark-box-warning">
                          <AlertTriangle />
                        </span>
                        <div className="stack" style={{ '--gap': '2px' } as React.CSSProperties}>
                          <strong>This server listing was hidden by Pumpkin Staff.</strong>
                          {listing.moderationReason && (
                            <span className="small">Reason: {listing.moderationReason}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {!activeServer.isOnline && (
                      <div className="notice">
                        <span className="mark-box">
                          <Activity />
                        </span>
                        <p className="notice-text">
                          To publish on <strong>servers.pumpkinmc.org</strong>, your{' '}
                          {activeServer.serverType === 'vine' ? 'Vine proxy' : 'server'} must be
                          online with <code>[telemetry] enabled = true</code> in{' '}
                          <code>
                            {activeServer.serverType === 'vine' ? 'vine.toml' : 'pumpkin.toml'}
                          </code>
                          . You can still configure and save your draft listing details below.
                        </p>
                      </div>
                    )}

                    {/* Server Icon + Visibility Toggle Row */}
                    <div
                      className="row"
                      style={{
                        gap: '1.25rem',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        paddingBottom: '1rem',
                        borderBottom: '1px solid var(--line)',
                      }}
                    >
                      <div className="row" style={{ gap: '0.85rem', alignItems: 'center' }}>
                        <div
                          style={{
                            width: 68,
                            height: 68,
                            border: '2px solid var(--line-2)',
                            background: 'var(--sunk)',
                            display: 'grid',
                            placeItems: 'center',
                            overflow: 'hidden',
                            fontWeight: 800,
                            fontSize: '1.5rem',
                            color: 'var(--pumpkin)',
                            flexShrink: 0,
                          }}
                        >
                          {listing?.iconUrl ? (
                            <img
                              src={listing.iconUrl}
                              alt="Server icon"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <ImageIcon size={26} className="muted" />
                          )}
                        </div>

                        <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
                          <span className="field-label" style={{ margin: 0 }}>
                            Server Icon
                          </span>
                          <div className="row" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                            <input
                              ref={iconInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              style={{ display: 'none' }}
                              onChange={handleIconFileChange}
                            />
                            <button
                              type="button"
                              className="button button-sm"
                              disabled={uploadingIcon}
                              onClick={() => iconInputRef.current?.click()}
                            >
                              <Upload size={14} />{' '}
                              {uploadingIcon
                                ? 'Uploading…'
                                : listing?.iconUrl
                                  ? 'Change Icon'
                                  : 'Upload Icon'}
                            </button>
                            {listing?.iconUrl && (
                              <button
                                type="button"
                                className="button button-ghost button-sm"
                                disabled={uploadingIcon}
                                onClick={handleRemoveIcon}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <span className="small muted">PNG, JPEG, or WebP (square recommended)</span>
                        </div>
                      </div>

                      <span className="spacer" />

                      <label
                        className="panel row"
                        style={{
                          padding: '0.85rem 1rem',
                          gap: '0.75rem',
                          cursor:
                            !activeServer.isOnline ||
                            listing?.moderationStatus === 'banned' ||
                            listing?.moderationStatus === 'hidden'
                              ? 'not-allowed'
                              : 'pointer',
                          opacity:
                            !activeServer.isOnline && !formIsListed
                              ? 0.65
                              : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formIsListed}
                          disabled={
                            (!activeServer.isOnline && !formIsListed) ||
                            listing?.moderationStatus === 'banned' ||
                            listing?.moderationStatus === 'hidden'
                          }
                          onChange={(e) => setFormIsListed(e.target.checked)}
                        />
                        <div>
                          <strong style={{ display: 'block' }}>
                            Publish on Pumpkin Server List
                          </strong>
                          <span className="small muted">
                            Show live players, plugins, and join IP publicly
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* Join Addresses */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
                        gap: '1rem',
                      }}
                    >
                      <label className="field">
                        <span className="field-label">
                          Java Join Address {formIsListed ? '*' : ''}
                        </span>
                        <span className="control">
                          <input
                            type="text"
                            className="input mono"
                            placeholder="play.example.com"
                            value={formJavaAddress}
                            onChange={(e) => setFormJavaAddress(e.target.value)}
                            required={formIsListed}
                            maxLength={253}
                          />
                        </span>
                        <span className="small muted">
                          Public domain or IPv4 (default port 25565 omitted automatically)
                        </span>
                      </label>

                      <label className="field">
                        <span className="field-label">Bedrock Address (Optional Crossplay)</span>
                        <span className="control">
                          <input
                            type="text"
                            className="input mono"
                            placeholder="bedrock.example.com:19132"
                            value={formBedrockAddress}
                            onChange={(e) => setFormBedrockAddress(e.target.value)}
                            maxLength={253}
                          />
                        </span>
                        <span className="small muted">
                          Adds a Crossplay badge for Bedrock players
                        </span>
                      </label>
                    </div>

                    {/* Tagline */}
                    <label className="field">
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span className="field-label">
                          Short Tagline {formIsListed ? '*' : ''}
                        </span>
                        <span className="small muted">{formTagline.length}/140</span>
                      </div>
                      <span className="control">
                        <input
                          type="text"
                          className="input"
                          placeholder="High-performance vanilla+ Survival SMP running on Rust…"
                          value={formTagline}
                          onChange={(e) => setFormTagline(e.target.value)}
                          maxLength={140}
                          required={formIsListed}
                        />
                      </span>
                    </label>

                    {/* Categorized Server Tags Picker */}
                    <div className="field">
                      <span className="field-label">Server Tags (Up to {MAX_SERVER_TAGS})</span>
                      <ServerTagPicker
                        value={formTags}
                        onChange={setFormTags}
                        maxTags={MAX_SERVER_TAGS}
                        onMaxReached={() =>
                          onToast?.(
                            `You can select up to ${MAX_SERVER_TAGS} tags per server`,
                            'error'
                          )
                        }
                      />
                    </div>

                    {/* Full Description */}
                    <label className="field">
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span className="field-label">Full Description (Markdown supported)</span>
                        <span className="small muted">{formDescription.length}/4000</span>
                      </div>
                      <span className="control">
                        <textarea
                          className="input"
                          rows={6}
                          placeholder="Tell players what makes your Pumpkin server special, rules, custom WASM plugins, and community events…"
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          maxLength={4000}
                        />
                      </span>
                    </label>

                    {/* Community Links */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
                        gap: '1rem',
                      }}
                    >
                      <label className="field">
                        <span className="field-label">Website URL (Optional)</span>
                        <span className="control">
                          <input
                            type="url"
                            className="input"
                            placeholder="https://example.com"
                            value={formWebsiteUrl}
                            onChange={(e) => setFormWebsiteUrl(e.target.value)}
                            maxLength={255}
                          />
                        </span>
                      </label>

                      <label className="field">
                        <span className="field-label">Discord Invite URL (Optional)</span>
                        <span className="control">
                          <input
                            type="url"
                            className="input"
                            placeholder="https://discord.gg/yourserver"
                            value={formDiscordUrl}
                            onChange={(e) => setFormDiscordUrl(e.target.value)}
                            maxLength={255}
                          />
                        </span>
                      </label>
                    </div>

                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        className="button button-primary"
                        disabled={savingListing}
                      >
                        <Save size={15} />{' '}
                        {savingListing
                          ? 'Saving…'
                          : formIsListed
                            ? 'Save & Publish Server'
                            : 'Save Listing Draft'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </section>
            </>
          )}
        </>
      )}
    </div>
  );
};
