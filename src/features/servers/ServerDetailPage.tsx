import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  ArrowBigUp,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Globe,
  MessageCircle,
  Package,
  Server,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react';
import { useAuth } from '../../app/auth';
import SEO from '../../components/SEO';
import api from '../../lib/api';
import {
  IS_SERVERS_SURFACE,
  getMarketUrl,
  useCrossSubdomainSso,
} from '../../lib/domains';
import { getPluginUrl } from '../../lib/url';
import { ServerTagBadge } from './ServerTagBadge';
import { type PublicServerDetailResponse } from './constants';
import '../../styles/store.css';
import '../../styles/servers.css';

const formatRelativeTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const safeMarkdownComponents = {
  img: ({ src, alt }: { src?: string | Blob; alt?: string }) => {
    const isSafe =
      typeof src === 'string' &&
      (src.startsWith('https://') || src.startsWith('http://') || src.startsWith('/'));
    return isSafe ? (
      <img
        src={src}
        alt={alt || 'Server illustration'}
        loading="lazy"
        decoding="async"
        style={{ maxWidth: '100%', borderRadius: 0, border: '2px solid var(--line)', marginTop: 8 }}
      />
    ) : null;
  },
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    const isSafe = typeof href === 'string' && (href.startsWith('https://') || href.startsWith('http://'));
    return isSafe ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className="link link-pumpkin">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    );
  },
};

const ServerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sso = useCrossSubdomainSso();

  const [detail, setDetail] = useState<PublicServerDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<'java' | 'bedrock' | null>(null);
  const [upvoting, setUpvoting] = useState(false);

  const loadServer = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PublicServerDetailResponse>(`/servers/${encodeURIComponent(id)}`);
      setDetail(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Server listing not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadServer();
  }, [loadServer]);

  const handleCopy = (kind: 'java' | 'bedrock', value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(kind);
    setTimeout(() => {
      setCopiedField((prev) => (prev === kind ? null : prev));
    }, 2000);
  };

  const handleUpvote = async () => {
    if (!detail) return;
    if (!user) {
      navigate('/login', {
        state: { from: `${location.pathname}${location.search}` },
      });
      return;
    }
    if (upvoting) return;
    setUpvoting(true);
    try {
      const res = await api.post<{ upvoted: boolean; upvotesCount: number }>(
        `/servers/${detail.server.publicId}/upvote`
      );
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              server: {
                ...prev.server,
                hasUpvoted: res.data.upvoted,
                upvotesCount: res.data.upvotesCount,
              },
            }
          : prev
      );
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Could not update server upvote.');
    } finally {
      setUpvoting(false);
    }
  };

  const backPath = IS_SERVERS_SURFACE ? '/' : '/servers';

  if (loading) {
    return (
      <div className="sf-loader">
        <span className="loading" />
        <p className="small">Loading server showcase…</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <section className="band">
        <div className="page">
          <div className="panel">
            <div className="blank">
              <Server size={36} className="muted" />
              <p className="h2">Server not found</p>
              <p className="small">{error || 'This server listing may have been unlisted or removed.'}</p>
              <Link to={backPath} className="button button-primary">
                <ArrowLeft size={15} /> Back to Server List
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const { server } = detail;
  const chartData = detail.samples.map((pt) => {
    const dt = new Date(pt.timestamp);
    return {
      label: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      onlinePlayers: pt.onlinePlayers,
    };
  });

  return (
    <>
      <SEO title={`${server.name} — Pumpkin Servers`} description={server.tagline} />

      <section className="band">
        <div className="page stack" style={{ '--gap': '1.25rem' } as React.CSSProperties}>
          <div>
            <Link to={backPath} className="button button-sm">
              <ArrowLeft size={14} /> All Pumpkin Servers
            </Link>
          </div>

          {/* Showcase Header Panel */}
          <div className="panel" style={{ padding: '1.5rem' }}>
            <div
              className="row"
              style={{
                gap: '1.25rem',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              <div className="sv-icon sv-icon-lg">
                {server.iconUrl ? (
                  <img src={server.iconUrl} alt={`${server.name} icon`} />
                ) : (
                  server.name.charAt(0).toUpperCase()
                )}
              </div>

              <div className="stack" style={{ flex: '1 1 20rem', '--gap': '8px' } as React.CSSProperties}>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <h1 className="h1" style={{ margin: 0 }}>
                    {server.name}
                  </h1>
                  <span
                    className={`sticker sticker-sm ${server.isOnline ? 'sticker-success' : ''}`}
                  >
                    {server.isOnline ? 'Online' : 'Offline'}
                  </span>
                  <span className="tag tag-pumpkin" title="Live telemetry signed by server Ed25519 key">
                    <ShieldCheck size={12} /> Verified Ed25519
                  </span>
                </div>

                <p className="body" style={{ color: 'var(--fg-2)' }}>
                  {server.tagline}
                </p>

                <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                  {server.tags.map((tag, idx) => (
                    <ServerTagBadge
                      key={tag}
                      tag={tag}
                      size="md"
                      primary={idx === 0}
                      onClick={() =>
                        navigate(`${backPath}?tags=${encodeURIComponent(tag)}`)
                      }
                    />
                  ))}
                  {server.bedrockAddress && (
                    <span className="tag tag-info">
                      <Smartphone size={11} /> Crossplay
                    </span>
                  )}
                </div>
              </div>

              <div className="row" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="sv-upvote-btn"
                  data-active={server.hasUpvoted}
                  disabled={upvoting}
                  onClick={() => void handleUpvote()}
                >
                  <ArrowBigUp size={20} />
                  <span>Upvote • {server.upvotesCount.toLocaleString()}</span>
                </button>
              </div>
            </div>

            {/* Join Bar */}
            <div
              className="row"
              style={{
                marginTop: '1.25rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--line)',
                gap: '0.75rem',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                className="sv-ip-btn"
                onClick={() => handleCopy('java', server.javaAddress)}
              >
                <span className="label" style={{ fontSize: 11 }}>
                  Java IP
                </span>
                <strong>{server.javaAddress}</strong>
                {copiedField === 'java' ? (
                  <Check size={15} style={{ color: 'var(--success)' }} />
                ) : (
                  <Copy size={15} className="muted" />
                )}
              </button>

              {server.bedrockAddress && (
                <button
                  type="button"
                  className="sv-ip-btn"
                  onClick={() => handleCopy('bedrock', server.bedrockAddress!)}
                >
                  <span className="label" style={{ fontSize: 11 }}>
                    Bedrock
                  </span>
                  <strong>{server.bedrockAddress}</strong>
                  {copiedField === 'bedrock' ? (
                    <Check size={15} style={{ color: 'var(--success)' }} />
                  ) : (
                    <Copy size={15} className="muted" />
                  )}
                </button>
              )}

              <span className="spacer" />

              {detail.discordUrl && (
                <a
                  href={detail.discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-sm"
                >
                  <MessageCircle size={15} /> Discord <ExternalLink size={12} />
                </a>
              )}

              {detail.websiteUrl && (
                <a
                  href={detail.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-sm"
                >
                  <Globe size={15} /> Website <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>

          {/* Main 2-Column Content */}
          <div className="sv-detail-grid">
            <div className="stack">
              {/* About / Markdown Description */}
              <section className="panel">
                <header className="panel-head">
                  <h2 className="h3">About {server.name}</h2>
                </header>
                <div className="panel-body">
                  {detail.description ? (
                    <div className="body stack" style={{ '--gap': '0.75rem' } as React.CSSProperties}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={safeMarkdownComponents}
                      >
                        {detail.description}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="small muted">{server.tagline}</p>
                  )}
                </div>
              </section>

              {/* 24h Live Player Activity Sparkline */}
              <section className="panel">
                <header className="panel-head">
                  <div className="row" style={{ width: '100%', alignItems: 'center' }}>
                    <h2 className="h3">
                      <Activity
                        size={16}
                        className="pumpkin"
                        style={{ verticalAlign: '-2px', marginRight: 6 }}
                      />
                      Player Activity (Last 24h)
                    </h2>
                    <span className="spacer" />
                    <span className="small muted">
                      24h Peak: <strong>{detail.peakPlayers24h}</strong> players
                    </span>
                  </div>
                </header>
                <div className="panel-body">
                  {chartData.length > 1 ? (
                    <div style={{ width: '100%', height: 210 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                          <XAxis dataKey="label" stroke="var(--muted)" fontSize={11} />
                          <YAxis allowDecimals={false} stroke="var(--muted)" fontSize={11} width={32} />
                          <Tooltip
                            contentStyle={{
                              background: 'var(--surface)',
                              border: '2px solid var(--line-2)',
                              borderRadius: 0,
                              fontSize: 12,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="onlinePlayers"
                            name="Players Online"
                            stroke="var(--pumpkin)"
                            fill="var(--pumpkin)"
                            fillOpacity={0.22}
                            strokeWidth={2.5}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="small muted">
                      24-hour player trend chart will populate automatically as periodic telemetry
                      heartbeats arrive.
                    </p>
                  )}
                </div>
              </section>

              {/* Matched Marketplace Plugins */}
              {detail.marketPlugins.length > 0 && (
                <section className="panel">
                  <header className="panel-head">
                    <div className="row" style={{ width: '100%', alignItems: 'center' }}>
                      <h2 className="h3">
                        <Package
                          size={16}
                          className="pumpkin"
                          style={{ verticalAlign: '-2px', marginRight: 6 }}
                        />
                        Powered by Pumpkin Market Plugins ({detail.marketPlugins.length})
                      </h2>
                    </div>
                  </header>
                  <div className="panel-body">
                    <div className="sv-plugins-grid">
                      {detail.marketPlugins.map((pl) => {
                        const pluginPath = getPluginUrl({
                          id: pl.pluginId,
                          public_id: pl.publicId,
                          name: pl.name,
                        });
                        const content = (
                          <>
                            <span className="avatar">
                              {pl.previewUrl ? (
                                <img src={pl.previewUrl} alt="" />
                              ) : (
                                pl.name.charAt(0).toUpperCase()
                              )}
                            </span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <strong
                                style={{
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {pl.name}
                              </strong>
                              <span className="small muted">
                                {[pl.version ? `v${pl.version}` : null, pl.category]
                                  .filter(Boolean)
                                  .join(' • ') || 'WASM Plugin'}
                              </span>
                            </div>
                            <ExternalLink size={14} className="muted" />
                          </>
                        );

                        return sso || IS_SERVERS_SURFACE ? (
                          <a
                            key={pl.publicId}
                            href={getMarketUrl(pluginPath)}
                            className="sv-plugin-card"
                          >
                            {content}
                          </a>
                        ) : (
                          <Link key={pl.publicId} to={pluginPath} className="sv-plugin-card">
                            {content}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Right Sidebar Specs */}
            <aside className="panel">
              <header className="panel-head">
                <h2 className="h3">Live Telemetry</h2>
              </header>
              <div className="panel-body stack">
                <div>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="small muted">
                      <Users size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                      Players Online
                    </span>
                    <strong>
                      {server.onlinePlayers} / {server.maxPlayers}
                    </strong>
                  </div>
                  <div className="meter meter-pumpkin">
                    <span
                      style={{
                        width: `${
                          server.maxPlayers > 0
                            ? Math.min(100, Math.round((server.onlinePlayers / server.maxPlayers) * 100))
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <dl className="specs">
                  <dt>Status</dt>
                  <dd>{server.isOnline ? 'Online' : 'Offline'}</dd>

                  <dt>Minecraft</dt>
                  <dd className="mono">{server.minecraftVersion || '—'}</dd>

                  <dt>Runtime</dt>
                  <dd className="mono">
                    {server.serverType === 'vine' ? 'Vine' : 'Pumpkin'}{' '}
                    {server.serverVersion || ''}
                  </dd>

                  {server.countryName && (
                    <>
                      <dt>Region</dt>
                      <dd>{server.countryName}</dd>
                    </>
                  )}

                  <dt>Owner</dt>
                  <dd>
                    {sso || IS_SERVERS_SURFACE ? (
                      <a
                        href={getMarketUrl(`/profile/${server.ownerUsername}`)}
                        className="link link-pumpkin"
                      >
                        @{server.ownerUsername}
                      </a>
                    ) : (
                      <Link to={`/profile/${server.ownerUsername}`} className="link link-pumpkin">
                        @{server.ownerUsername}
                      </Link>
                    )}
                  </dd>

                  <dt>Last Heartbeat</dt>
                  <dd>{formatRelativeTime(server.lastPing)}</dd>
                </dl>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
};

export default ServerDetailPage;
