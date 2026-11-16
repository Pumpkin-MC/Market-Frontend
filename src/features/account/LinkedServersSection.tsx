import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

const formatDuration = (t: TFunction, secs: number | null | undefined): string => {
  if (secs == null || secs <= 0) return '—';
  const rounded = Math.round(secs);
  if (rounded < 60) return t('servers.duration.seconds', { count: rounded });
  const mins = Math.floor(rounded / 60);
  const remSecs = rounded % 60;
  if (mins < 60) {
    return remSecs > 0
      ? t('servers.duration.minutes_seconds', { minutes: mins, seconds: remSecs })
      : t('servers.duration.minutes', { count: mins });
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0
    ? t('servers.duration.hours_minutes', { hours, minutes: remMins })
    : t('servers.duration.hours', { count: hours });
};

const formatMemory = (mb: number | null | undefined): string => {
  if (mb == null || mb <= 0) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
};

const formatRelativeTime = (t: TFunction, iso: string | null | undefined): string => {
  if (!iso) return t('servers.time.never');
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return t('staff.time_just_now');
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return t('staff.time_m_ago', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('staff.time_h_ago', { count: hours });
  const days = Math.floor(hours / 24);
  return t('staff.time_d_ago', { count: days });
};

export const LinkedServersSection: React.FC<{
  onToast?: (text: string, type: 'success' | 'error') => void;
}> = ({ onToast }) => {
  const { t, i18n } = useTranslation();
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
        onToast?.(err.response?.data?.error || t('servers.manage.load_listing_failed'), 'error');
      } finally {
        setLoadingListing(false);
      }
    },
    [onToast, t]
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
      onToast?.(err.response?.data?.error || t('servers.manage.load_servers_failed'), 'error');
    } finally {
      setLoadingList(false);
    }
  }, [onToast, t]);

  const loadDetail = useCallback(
    async (serverId: number, selectedRange: '24h' | '7d' | '30d') => {
      setLoadingDetail(true);
      try {
        const res = await api.get<LinkedServerTelemetryDetail>(
          `/user/servers/${serverId}/telemetry?range=${selectedRange}`
        );
        setDetail(res.data);
      } catch (err: any) {
        onToast?.(err.response?.data?.error || t('servers.manage.load_telemetry_failed'), 'error');
      } finally {
        setLoadingDetail(false);
      }
    },
    [onToast, t]
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
      onToast?.(t('servers.manage.connect_route_success'), 'success');
      return true;
    } catch (err: any) {
      onToast?.(
        err.response?.data?.error || t('servers.manage.connect_route_failed'),
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
      onToast?.(t('servers.manage.disconnect_route_success'), 'success');
    } catch (err: any) {
      onToast?.(err.response?.data?.error || t('servers.manage.disconnect_route_failed'), 'error');
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
      onToast?.(t('servers.manage.renamed'), 'success');
    } catch (err: any) {
      onToast?.(err.response?.data?.error || t('servers.manage.rename_failed'), 'error');
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
      onToast?.(t('servers.manage.unlinked'), 'success');
    } catch (err: any) {
      onToast?.(err.response?.data?.error || t('servers.manage.unlink_failed'), 'error');
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
          ? t('servers.manage.listing_published')
          : t('servers.manage.listing_saved'),
        'success'
      );
    } catch (err: any) {
      onToast?.(err.response?.data?.error || t('servers.manage.listing_save_failed'), 'error');
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
        onToast?.(validated.error || t('servers.manage.invalid_icon'), 'error');
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
      onToast?.(t('servers.manage.icon_updated'), 'success');
    } catch (err: any) {
      onToast?.(err.response?.data?.error || t('servers.manage.icon_upload_failed'), 'error');
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
      onToast?.(t('servers.manage.icon_removed'), 'success');
    } catch (err: any) {
      onToast?.(err.response?.data?.error || t('servers.manage.icon_remove_failed'), 'error');
    } finally {
      setUploadingIcon(false);
    }
  };

  const activeServer =
    detail?.server || servers.find((s) => s.id === selectedId) || null;

  const chartData = (detail?.samples || []).map((pt) => {
    const d = new Date(pt.timestamp);
    const loc = i18n.language || undefined;
    const label =
      range === '24h'
        ? d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString(loc, { month: 'short', day: 'numeric', hour: '2-digit' });
    return {
      label,
      fullTime: d.toLocaleString(loc),
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
              <Trans t={t} i18nKey="servers.manage.heading" components={{ mark: <span className="mark" /> }} />
            </h2>
            <p className="small">
              {t('servers.manage.subtitle')}
            </p>
          </div>
          <span className="spacer" />
          <Link to="/link" className="button button-primary button-sm">
            <Plus size={16} /> {t('servers.manage.link_node')}
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
              <strong style={{ display: 'block' }}>{t('servers.manage.quick_link_title')}</strong>
              <span className="small">
                <Trans t={t} i18nKey="servers.manage.quick_link_desc" components={{ code: <code /> }} />
              </span>
            </div>
            <div className="row" style={{ gap: '0.45rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="button button-sm"
                onClick={() => handleCopyCommand('pumpkin')}
              >
                {copiedCmd === 'pumpkin' ? <Check size={14} /> : <Copy size={14} />}
                {copiedCmd === 'pumpkin' ? t('plugin.copied') : t('servers.manage.copy_cmd')}
              </button>
              <button
                type="button"
                className="button button-sm"
                onClick={() => handleCopyCommand('vine')}
              >
                {copiedCmd === 'vine' ? <Check size={14} /> : <GitFork size={14} />}
                {copiedCmd === 'vine' ? t('plugin.copied') : t('servers.manage.copy_vine_cmd')}
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
              {t('servers.manage.loading_servers')}
            </p>
          </div>
        </div>
      ) : servers.length === 0 ? (
        <div className="panel">
          <div className="blank">
            <Server size={32} style={{ opacity: 0.6 }} />
            <p className="h2">
              <Trans t={t} i18nKey="servers.manage.empty_title" components={{ mark: <span className="mark" /> }} />
            </p>
            <p className="small">
              <Trans t={t} i18nKey="servers.manage.empty_desc" components={{ code: <code /> }} />
            </p>
            <Link to="/link" className="button button-primary">
              {t('servers.manage.link_existing')}
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
                      {srv.isOnline ? t('servers.common.online') : t('servers.common.offline')}
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
                            <GitFork size={12} style={{ marginRight: 4 }} /> {t('servers.common.vine_proxy')}
                          </span>
                        )}
                        <h3 className="h3" style={{ margin: 0 }}>
                          {activeServer.displayName}
                        </h3>
                        <button
                          type="button"
                          className="button button-icon button-sm"
                          title={t('servers.manage.rename_server')}
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
                      {t('servers.manage.last_heartbeat', { time: formatRelativeTime(t, activeServer.lastPing) })}
                    </span>
                  </div>

                  <span className="spacer" />

                  <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div className="segmented" role="group" aria-label={t('servers.manage.time_range_aria')}>
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
                      title={t('servers.manage.refresh_telemetry')}
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
                          {t('servers.manage.confirm_unlink')}
                        </button>
                        <button
                          type="button"
                          className="button button-sm"
                          onClick={() => setConfirmUnlinkId(null)}
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="button button-sm"
                        onClick={() => setConfirmUnlinkId(activeServer.id)}
                        title={t('servers.manage.unlink_server')}
                      >
                        <Trash2 size={14} /> {t('servers.manage.unlink')}
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
                      {activeServer.serverType === 'vine' ? (
                        <Trans
                          t={t}
                          i18nKey="servers.manage.awaiting_telemetry_proxy"
                          components={{ code: <code /> }}
                        />
                      ) : (
                        <Trans
                          t={t}
                          i18nKey="servers.manage.awaiting_telemetry"
                          components={{ code: <code /> }}
                        />
                      )}
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
                      {t('servers.detail.players_online')}
                    </span>
                    <div className="h2" style={{ marginTop: '0.35rem' }}>
                      {activeServer.onlinePlayers}{' '}
                      <span className="small muted">/ {activeServer.maxPlayers}</span>
                    </div>
                    <span className="small muted">
                      {t('servers.manage.peak_avg_line', {
                        range,
                        peak: detail?.peakPlayers ?? activeServer.onlinePlayers,
                        avg: detail?.avgPlayers ?? activeServer.onlinePlayers,
                      })}
                      {detail?.playerBreakdown && detail.playerBreakdown.uniquePlayers > 0
                        ? ` • ${t('servers.manage.unique_count', { count: detail.playerBreakdown.uniquePlayers.toLocaleString() })}`
                        : ''}
                    </span>
                  </div>

                  <div className="panel" style={{ padding: '0.9rem 1rem' }}>
                    <span className="label">
                      <HardDrive size={13} style={{ verticalAlign: 'text-bottom', marginRight: 5 }} />
                      {t('servers.manage.system_memory')}
                    </span>
                    <div className="h2" style={{ marginTop: '0.35rem' }}>
                      {formatMemory(activeServer.ramAllocatedMb)}
                      {activeServer.totalRamMb ? (
                        <span className="small muted"> / {formatMemory(activeServer.totalRamMb)}</span>
                      ) : null}
                    </div>
                    <span className="small muted">
                      {ramPct != null ? t('servers.manage.memory_pct', { pct: ramPct }) : t('servers.manage.reported_via_heartbeat')}
                    </span>
                  </div>

                  <div className="panel" style={{ padding: '0.9rem 1rem' }}>
                    <span className="label">
                      <Cpu size={13} style={{ verticalAlign: 'text-bottom', marginRight: 5 }} />
                      {t('servers.manage.host_hardware')}
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
                      {activeServer.cpuModel || t('servers.manage.unknown_cpu')}
                    </div>
                    <span className="small muted">
                      {[
                        activeServer.cpuCores ? t('servers.manage.cores_count', { count: activeServer.cpuCores }) : null,
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
                      {t('servers.manage.runtime_region')}
                    </span>
                    <div style={{ marginTop: '0.35rem', fontWeight: 600 }}>
                      {activeServer.serverType === 'vine' ? 'Vine' : 'Pumpkin'}{' '}
                      {activeServer.serverVersion || ''}
                    </div>
                    <span className="small muted">
                      {[
                        activeServer.minecraftVersion ? `MC ${activeServer.minecraftVersion}` : null,
                        activeServer.onlineMode === true
                          ? t('servers.manage.online_mode')
                          : activeServer.onlineMode === false
                            ? t('servers.manage.offline_mode')
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
                        <span className="label">{t('servers.manage.player_activity_range', { range: range.toUpperCase() })}</span>
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
                              name={t('servers.manage.players_series')}
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
                        <span className="label">{t('servers.manage.memory_usage_range', { range: range.toUpperCase() })}</span>
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
                              name={t('servers.manage.ram_series')}
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
                    {t('servers.manage.charts_empty')}
                  </p>
                )}

                {/* Player Engagement, Retention & Concurrency */}
                {detail?.playerAnalytics && (() => {
                  const pa = detail.playerAnalytics;
                  const stickiness =
                    pa.mau > 0 ? Math.min(100, Math.round((pa.dau / pa.mau) * 1000) / 10) : null;

                  const nvrChartData = pa.newVsReturning.map((pt) => {
                    const d = new Date(pt.timestamp);
                    const loc = i18n.language || undefined;
                    const label =
                      pa.bucketUnit === 'hour'
                        ? d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })
                        : d.toLocaleDateString(loc, { month: 'short', day: 'numeric' });
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
                          {t('servers.manage.audience_heading')}
                        </h4>
                        {stickiness != null && (
                          <span className="sticker sticker-sm">
                            {t('servers.manage.stickiness', { pct: stickiness.toFixed(1) })}
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
                          <span className="label">{t('servers.manage.active_unique_players')}</span>
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
                              <span className="small muted mono">{t('servers.manage.dau_label')}</span>
                            </div>
                            <div>
                              <div className="h3" style={{ margin: 0 }}>
                                {pa.wau.toLocaleString()}
                              </div>
                              <span className="small muted mono">{t('servers.manage.wau_label')}</span>
                            </div>
                            <div>
                              <div className="h3" style={{ margin: 0 }}>
                                {pa.mau.toLocaleString()}
                              </div>
                              <span className="small muted mono">{t('servers.manage.mau_label')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="panel" style={{ padding: '0.9rem 1rem' }}>
                          <span className="label">{t('servers.manage.bounce_rate_label')}</span>
                          <div
                            className="h2"
                            style={{ marginTop: '0.35rem', color: bounceTone }}
                          >
                            {bouncePct != null ? `${bouncePct.toFixed(1)}%` : '—'}
                          </div>
                          <span className="small muted">
                            {pa.bounceRate.firstTimeJoins > 0
                              ? t('servers.manage.bounce_rate_detail', {
                                  bounced: pa.bounceRate.bouncedPlayers.toLocaleString(),
                                  total: pa.bounceRate.firstTimeJoins.toLocaleString(),
                                  range,
                                })
                              : t('servers.manage.bounce_rate_empty', { range })}
                          </span>
                        </div>

                        <div className="panel" style={{ padding: '0.9rem 1rem' }}>
                          <span className="label">{t('servers.manage.session_duration_label', { range: range.toUpperCase() })}</span>
                          <div className="h2" style={{ marginTop: '0.35rem' }}>
                            {formatDuration(t, pa.playtime.avgSessionSecs)}{' '}
                            <span className="small muted">{t('servers.manage.avg_abbr')}</span>
                          </div>
                          <span className="small muted">
                            {t('servers.manage.median_prefix')}: <strong>{formatDuration(t, pa.playtime.medianSessionSecs)}</strong>{' '}
                            • {t('servers.manage.sessions_count', {
                              count: pa.playtime.totalSessions,
                              formatted: pa.playtime.totalSessions.toLocaleString(),
                            })}
                          </span>
                        </div>

                        <div className="panel" style={{ padding: '0.9rem 1rem' }}>
                          <span className="label">{t('servers.manage.cohort_retention')}</span>
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
                                { label: 'D1', days: '1', cohort: pa.retention.d1 },
                                { label: 'D7', days: '7', cohort: pa.retention.d7 },
                                { label: 'D30', days: '30', cohort: pa.retention.d30 },
                              ] as const
                            ).map(({ label, days, cohort }) => (
                              <div
                                key={label}
                                title={
                                  cohort.eligible > 0
                                    ? t('servers.manage.cohort_tooltip_ready', { retained: cohort.retained, eligible: cohort.eligible })
                                    : t('servers.manage.cohort_tooltip_maturing', { days })
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
                              {t('servers.manage.nvr_chart_title', {
                                unit: pa.bucketUnit === 'hour' ? t('servers.manage.unit_hour') : t('servers.manage.unit_day'),
                              })}
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
                                    name={t('servers.manage.returning_series')}
                                    stackId="players"
                                    fill="var(--pumpkin)"
                                  />
                                  <Bar
                                    dataKey="newPlayers"
                                    name={t('servers.manage.new_series')}
                                    stackId="players"
                                    fill="#22c55e"
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <p className="small muted" style={{ margin: '2rem 0' }}>
                              {t('servers.manage.nvr_empty')}
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
                            <span className="label">{t('servers.manage.playtime_tiers_title', { range: range.toUpperCase() })}</span>
                            <span className="small muted">{t('servers.manage.cumulative_per_player')}</span>
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
                                      {t('servers.manage.players_pct', {
                                        count: tier.count.toLocaleString(),
                                        pct: tier.percentage.toFixed(1),
                                      })}
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
                              {t('servers.manage.playtime_tiers_empty')}
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
                              {t('servers.manage.heatmap_title')}
                            </span>
                            <span className="small muted">
                              {t('servers.manage.heatmap_tz', { tz: tzName })}
                            </span>
                          </div>
                          {bestSlot && (
                            <span className="tag tag-pumpkin">
                              {t('servers.manage.best_window', {
                                day: t(`servers.weekdays.long.${WEEKDAY_KEYS[bestSlot.day]}` as any),
                                hour: `${String(bestSlot.hour).padStart(2, '0')}:00`,
                                peak: bestSlot.peak,
                              })}
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
                              {WEEKDAY_KEYS.map((dayKey, dayIdx) => (
                                <div
                                  key={dayKey}
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2.6rem repeat(24, minmax(18px, 1fr))',
                                    gap: 3,
                                    alignItems: 'center',
                                  }}
                                >
                                  <span className="small muted mono" style={{ fontSize: 11 }}>
                                    {t(`servers.weekdays.short.${dayKey}` as any)}
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
                                        title={t('servers.manage.heatmap_cell_tooltip', {
                                          day: t(`servers.weekdays.long.${dayKey}` as any),
                                          hour: `${String(hr).padStart(2, '0')}:00`,
                                          peak: slot.peak,
                                          avg: slot.avg.toFixed(1),
                                        })}
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
                      {t('servers.manage.player_breakdown_title', { range: range.toUpperCase() })}
                    </h4>
                    {detail?.playerBreakdown && detail.playerBreakdown.uniquePlayers > 0 && (
                      <span className="sticker sticker-sm">
                        {t('servers.manage.unique_players_badge', {
                          count: detail.playerBreakdown.uniquePlayers,
                          formatted: detail.playerBreakdown.uniquePlayers.toLocaleString(),
                        })}
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
                          { title: t('servers.manage.breakdown_editions'), items: detail.playerBreakdown.editions },
                          { title: t('servers.manage.breakdown_brands'), items: detail.playerBreakdown.clientBrands },
                          { title: t('servers.manage.breakdown_locales'), items: detail.playerBreakdown.locales },
                          { title: t('servers.manage.breakdown_view_distance'), items: detail.playerBreakdown.viewDistances },
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
                            <span className="small muted">{t('servers.manage.no_data_yet')}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="small muted">
                      {t('servers.manage.breakdown_empty')}
                    </p>
                  )}
                </div>

                {/* Active Plugins List */}
                <div>
                  <h4 className="h3" style={{ marginBottom: '0.6rem' }}>
                    {t('servers.manage.loaded_plugins', { count: detail?.plugins.length ?? activeServer.pluginsCount })}
                  </h4>
                  {detail && detail.plugins.length > 0 ? (
                    <div className="scroll-x">
                      <table className="ledger">
                        <thead>
                          <tr>
                            <th>{t('staff.table.plugin')}</th>
                            <th>{t('plugin.version')}</th>
                            <th>{t('servers.detail.runtime')}</th>
                            <th className="end">{t('servers.manage.col_marketplace')}</th>
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
                                        {t('servers.manage.view_on_market')} <ExternalLink size={12} />
                                      </a>
                                    ) : (
                                      <Link to={marketPath} className="link link-pumpkin small">
                                        {t('servers.manage.view_on_market')}
                                      </Link>
                                    )
                                  ) : (
                                    <span className="small muted">{t('servers.manage.custom_local')}</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="small muted">{t('servers.manage.no_active_plugins')}</p>
                  )}
                </div>

                {/* Plugin Crashes on This Server */}
                <div>
                  <h4 className="h3" style={{ marginBottom: '0.6rem' }}>
                    {t('servers.manage.recent_crashes')}
                  </h4>
                  {detail && detail.crashes.length > 0 ? (
                    <div className="scroll-x">
                      <table className="ledger">
                        <thead>
                          <tr>
                            <th>{t('staff.table.plugin')}</th>
                            <th>{t('servers.manage.col_trap_error')}</th>
                            <th>{t('staff.table.status')}</th>
                            <th className="end">{t('servers.manage.col_hits')}</th>
                            <th className="end">{t('servers.manage.col_last_seen')}</th>
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
                                {formatRelativeTime(t, cr.lastSeen)}
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
                        {t('servers.manage.zero_crashes')}
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
                    {t('servers.manage.ed25519_key')}
                  </span>
                  <code style={{ wordBreak: 'break-all' }}>{activeServer.serverPublicKey}</code>
                  <span className="spacer" />
                  <button
                    type="button"
                    className="button button-sm"
                    onClick={() => handleCopyKey(activeServer.serverPublicKey)}
                  >
                    {copiedKey ? <Check size={13} /> : <Copy size={13} />}
                    {copiedKey ? t('studio.crashes.copied') : t('plugin.copy_license')}
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
                      {t('servers.manage.public_list_title')}
                    </h3>
                    {listing?.isListed && listing.moderationStatus === 'active' ? (
                      <span className="sticker sticker-sm sticker-success">{t('servers.manage.listed_publicly')}</span>
                    ) : listing?.moderationStatus === 'hidden' ? (
                      <span className="tag tag-warning">{t('servers.manage.hidden_by_staff')}</span>
                    ) : listing?.moderationStatus === 'banned' ? (
                      <span className="tag tag-danger">{t('staff.servers.status_banned')}</span>
                    ) : (
                      <span className="sticker sticker-sm">{t('staff.servers.status_unlisted')}</span>
                    )}
                    {listing && listing.upvotesCount > 0 && (
                      <span className="tag tag-pumpkin">
                        <ArrowBigUp size={13} /> {t('staff.servers.upvotes_count', { count: listing.upvotesCount, formatted: listing.upvotesCount.toLocaleString() })}
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
                          {t('servers.manage.view_public_page')} <ExternalLink size={13} />
                        </a>
                      ) : (
                        <Link
                          to={getServerDetailUrl(listing.publicId, listing.slug)}
                          className="button button-sm"
                        >
                          {t('servers.manage.view_public_page')} <ExternalLink size={13} />
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
                          <strong>{t('servers.manage.banned_notice')}</strong>
                          {listing.moderationReason && (
                            <span className="small">{t('servers.manage.moderation_reason', { reason: listing.moderationReason })}</span>
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
                          <strong>{t('servers.manage.hidden_notice')}</strong>
                          {listing.moderationReason && (
                            <span className="small">{t('servers.manage.moderation_reason', { reason: listing.moderationReason })}</span>
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
                          {activeServer.serverType === 'vine' ? (
                            <Trans
                              t={t}
                              i18nKey="servers.manage.offline_listing_notice_proxy"
                              components={{ strong: <strong />, code: <code /> }}
                            />
                          ) : (
                            <Trans
                              t={t}
                              i18nKey="servers.manage.offline_listing_notice"
                              components={{ strong: <strong />, code: <code /> }}
                            />
                          )}
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
                              alt={t('servers.manage.icon_alt')}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <ImageIcon size={26} className="muted" />
                          )}
                        </div>

                        <div className="stack" style={{ '--gap': '6px' } as React.CSSProperties}>
                          <span className="field-label" style={{ margin: 0 }}>
                            {t('servers.manage.server_icon')}
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
                                ? t('studio.onboarding.uploading')
                                : listing?.iconUrl
                                  ? t('studio.listing.change_icon')
                                  : t('studio.readiness.fix_icon')}
                            </button>
                            {listing?.iconUrl && (
                              <button
                                type="button"
                                className="button button-ghost button-sm"
                                disabled={uploadingIcon}
                                onClick={handleRemoveIcon}
                              >
                                {t('studio.onboarding.remove_picture')}
                              </button>
                            )}
                          </div>
                          <span className="small muted">{t('servers.manage.icon_hint')}</span>
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
                            {t('servers.manage.publish_toggle_title')}
                          </strong>
                          <span className="small muted">
                            {t('servers.manage.publish_toggle_desc')}
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
                          {t('servers.manage.java_address_label')} {formIsListed ? '*' : ''}
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
                          {t('servers.manage.java_address_hint')}
                        </span>
                      </label>

                      <label className="field">
                        <span className="field-label">{t('servers.manage.bedrock_address_label')}</span>
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
                          {t('servers.manage.bedrock_address_hint')}
                        </span>
                      </label>
                    </div>

                    {/* Tagline */}
                    <label className="field">
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span className="field-label">
                          {t('servers.manage.tagline_label')} {formIsListed ? '*' : ''}
                        </span>
                        <span className="small muted">{formTagline.length}/140</span>
                      </div>
                      <span className="control">
                        <input
                          type="text"
                          className="input"
                          placeholder={t('servers.manage.tagline_placeholder')}
                          value={formTagline}
                          onChange={(e) => setFormTagline(e.target.value)}
                          maxLength={140}
                          required={formIsListed}
                        />
                      </span>
                    </label>

                    {/* Categorized Server Tags Picker */}
                    <div className="field">
                      <span className="field-label">{t('servers.manage.server_tags_label', { max: MAX_SERVER_TAGS })}</span>
                      <ServerTagPicker
                        value={formTags}
                        onChange={setFormTags}
                        maxTags={MAX_SERVER_TAGS}
                        onMaxReached={() =>
                          onToast?.(
                            t('servers.manage.max_tags_toast', { max: MAX_SERVER_TAGS }),
                            'error'
                          )
                        }
                      />
                    </div>

                    {/* Full Description */}
                    <label className="field">
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span className="field-label">{t('servers.manage.description_label')}</span>
                        <span className="small muted">{formDescription.length}/4000</span>
                      </div>
                      <span className="control">
                        <textarea
                          className="input"
                          rows={6}
                          placeholder={t('servers.manage.description_placeholder')}
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
                        <span className="field-label">{t('servers.manage.website_label')}</span>
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
                        <span className="field-label">{t('servers.manage.discord_label')}</span>
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
                          ? t('studio.listing.saving')
                          : formIsListed
                            ? t('servers.manage.save_publish')
                            : t('servers.manage.save_draft')}
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
