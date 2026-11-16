import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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
import { translateCategory } from '../../lib/categories';
import { ServerTagBadge } from './ServerTagBadge';
import { type PublicServerDetailResponse } from './constants';
import '../../styles/store.css';
import '../../styles/servers.css';

const formatRelativeTime = (t: TFunction, iso: string | null | undefined): string => {
  if (!iso) return '—';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return t('staff.time_just_now');
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return t('staff.time_m_ago', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('staff.time_h_ago', { count: hours });
  const days = Math.floor(hours / 24);
  return t('staff.time_d_ago', { count: days });
};

const SafeServerImage = ({ src, alt }: { src?: string | Blob; alt?: string }) => {
  const { t } = useTranslation();
  const isSafe =
    typeof src === 'string' &&
    (src.startsWith('https://') || src.startsWith('http://') || src.startsWith('/'));
  return isSafe ? (
    <img
      src={src}
      alt={alt || t('servers.detail.illustration')}
      loading="lazy"
      decoding="async"
      style={{ maxWidth: '100%', borderRadius: 0, border: '2px solid var(--line)', marginTop: 8 }}
    />
  ) : null;
};

const safeMarkdownComponents = {
  img: SafeServerImage,
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
  const { t, i18n } = useTranslation();
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
      setError(err?.response?.data?.error || t('servers.detail.not_found_title'));
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
      alert(err?.response?.data?.error || t('servers.directory.upvote_failed'));
    } finally {
      setUpvoting(false);
    }
  };

  const backPath = IS_SERVERS_SURFACE ? '/' : '/servers';

  if (loading) {
    return (
      <div className="sf-loader">
        <span className="loading" />
        <p className="small">{t('servers.detail.loading')}</p>
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
              <p className="h2">{t('servers.detail.not_found_title')}</p>
              <p className="small">{error || t('servers.detail.not_found_desc')}</p>
              <Link to={backPath} className="button button-primary">
                <ArrowLeft size={15} /> {t('servers.detail.back_to_list')}
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
      label: dt.toLocaleTimeString(i18n.language || undefined, { hour: '2-digit', minute: '2-digit' }),
      onlinePlayers: pt.onlinePlayers,
    };
  });

  return (
    <>
      <SEO
        title={server.name}
        description={server.tagline}
        ogImage={server.iconUrl || undefined}
        twitterCard="summary"
      />

      <section className="band">
        <div className="page stack" style={{ '--gap': '1.25rem' } as React.CSSProperties}>
          <div>
            <Link to={backPath} className="button button-sm">
              <ArrowLeft size={14} /> {t('servers.detail.all_servers')}
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
                  <img src={server.iconUrl} alt={t('servers.directory.server_icon_alt', { name: server.name })} />
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
                    {server.isOnline ? t('servers.common.online') : t('servers.common.offline')}
                  </span>
                </div>

                <p className="body" style={{ color: 'var(--fg-2)' }}>
                  {server.tagline}
                </p>

                <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                  {server.tags.map((tag) => (
                    <ServerTagBadge
                      key={tag}
                      tag={tag}
                      size="md"
                      onClick={() =>
                        navigate(`${backPath}?tags=${encodeURIComponent(tag)}`)
                      }
                    />
                  ))}
                  {server.bedrockAddress && !server.tags.includes('crossplay') && (
                    <span className="tag tag-info">
                      <Smartphone size={11} /> {t('servers.common.crossplay')}
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
                  <span>{t('servers.detail.upvote_count', { count: server.upvotesCount.toLocaleString() })}</span>
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
                  {t('servers.detail.java_ip')}
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
                  <Globe size={15} /> {t('servers.detail.website')} <ExternalLink size={12} />
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
                  <h2 className="h3">{t('servers.detail.about', { name: server.name })}</h2>
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
                      {t('servers.detail.player_activity_24h')}
                    </h2>
                    <span className="spacer" />
                    <span className="small muted">
                      {t('servers.detail.peak_24h_prefix')} <strong>{detail.peakPlayers24h}</strong> {t('servers.detail.players_unit')}
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
                            name={t('servers.detail.players_online')}
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
                      {t('servers.detail.activity_empty')}
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
                        {t('servers.detail.powered_by_plugins', { count: detail.marketPlugins.length })}
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
                                {[pl.version ? `v${pl.version}` : null, translateCategory(t, pl.category)]
                                  .filter(Boolean)
                                  .join(' • ') || t('servers.detail.wasm_plugin')}
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
                <h2 className="h3">{t('servers.detail.live_telemetry')}</h2>
              </header>
              <div className="panel-body stack">
                <div>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <span className="small muted">
                      <Users size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                      {t('servers.detail.players_online')}
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
                  <dt>{t('staff.table.status')}</dt>
                  <dd>{server.isOnline ? t('servers.common.online') : t('servers.common.offline')}</dd>

                  <dt>Minecraft</dt>
                  <dd className="mono">{server.minecraftVersion || '—'}</dd>

                  <dt>{t('servers.detail.runtime')}</dt>
                  <dd className="mono">
                    {server.serverType === 'vine' ? 'Vine' : 'Pumpkin'}{' '}
                    {server.serverVersion || ''}
                  </dd>

                  {server.countryName && (
                    <>
                      <dt>{t('servers.detail.region')}</dt>
                      <dd>{server.countryName}</dd>
                    </>
                  )}

                  <dt>{t('servers.detail.owner')}</dt>
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

                  <dt>{t('servers.detail.last_heartbeat')}</dt>
                  <dd>{formatRelativeTime(t, server.lastPing)}</dd>
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
