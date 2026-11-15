import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import {
  ArrowBigUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Globe,
  Plus,
  Search,
  Server,
  Smartphone,
  Terminal,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../app/auth';
import SEO from '../../components/SEO';
import { Select } from '../../components/Select';
import api from '../../lib/api';
import {
  getAccountsUrl,
  getServerDetailPath,
  useCrossSubdomainSso,
} from '../../lib/domains';
import { ServerTagBadge } from './ServerTagBadge';
import {
  MAX_SERVER_TAGS,
  SERVER_TAGS,
  SERVER_TAG_CATEGORIES,
  SERVER_TAG_MAP,
  type PublicServerCard,
  type PublicServersListResponse,
  type ServerTagCategory,
} from './constants';
import '../../styles/store.css';
import '../../styles/servers.css';

const PAGE_LIMIT = 20;

const SORT_OPTIONS = [
  { value: 'popular', label: 'servers.directory.sort_popular' },
  { value: 'players', label: 'servers.directory.sort_players' },
  { value: 'upvotes', label: 'servers.directory.sort_upvotes' },
  { value: 'newest', label: 'servers.directory.sort_newest' },
] as const;

function parseSelectedTagsFromUrl(params: URLSearchParams): string[] {
  const out: string[] = [];
  for (const raw of [params.get('tags'), params.get('tag')]) {
    if (!raw) continue;
    for (const part of raw.split(',')) {
      const clean = part.trim().toLowerCase();
      if (clean && SERVER_TAG_MAP[clean] && !out.includes(clean)) {
        out.push(clean);
        if (out.length >= MAX_SERVER_TAGS) return out;
      }
    }
  }
  return out;
}

const ServersHomePage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const sso = useCrossSubdomainSso();

  const initialQ = searchParams.get('q') || '';
  const selectedTags = useMemo(() => parseSelectedTagsFromUrl(searchParams), [searchParams]);
  const selectedTagsKey = selectedTags.join(',');
  const onlineOnly = searchParams.get('status') === 'online';
  const bedrockOnly = searchParams.get('edition') === 'bedrock';
  const sort = searchParams.get('sort') || 'popular';
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);

  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [tagTab, setTagTab] = useState<'popular' | ServerTagCategory | 'all'>('popular');

  const [data, setData] = useState<PublicServersListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [upvotingId, setUpvotingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(searchInput.trim());
    }, 260);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateFilterParam = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, val] of Object.entries(updates)) {
        if (!val) {
          next.delete(key);
        } else {
          next.set(key, val);
        }
      }
      if ('tags' in updates) {
        next.delete('tag');
      }
      if (!('page' in updates)) {
        next.delete('page');
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handleToggleTagFilter = useCallback(
    (tag: string) => {
      const nextTags = selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag].slice(0, MAX_SERVER_TAGS);
      updateFilterParam({ tags: nextTags.length > 0 ? nextTags.join(',') : null });
    },
    [selectedTags, updateFilterParam]
  );

  useEffect(() => {
    const currentQ = searchParams.get('q') || '';
    if (debouncedQ !== currentQ) {
      updateFilterParam({ q: debouncedQ || null });
    }
  }, [debouncedQ, searchParams, updateFilterParam]);

  const fetchDirectory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PublicServersListResponse>('/servers', {
        params: {
          q: debouncedQ || undefined,
          tags: selectedTagsKey || undefined,
          status: onlineOnly ? 'online' : undefined,
          edition: bedrockOnly ? 'bedrock' : undefined,
          sort,
          page,
          limit: PAGE_LIMIT,
        },
      });
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || t('servers.directory.load_failed'));
    } finally {
      setLoading(false);
    }
  }, [bedrockOnly, debouncedQ, onlineOnly, page, selectedTagsKey, sort]);

  useEffect(() => {
    void fetchDirectory();
  }, [fetchDirectory]);

  const visibleFilterTags = useMemo(() => {
    if (tagTab === 'popular') {
      return SERVER_TAGS.filter((t) => t.featured);
    }
    if (tagTab === 'all') {
      return SERVER_TAGS;
    }
    return SERVER_TAGS.filter((t) => t.category === tagTab);
  }, [tagTab]);

  const handleCopyAddress = (publicId: string, address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedId(publicId);
    setTimeout(() => {
      setCopiedId((prev) => (prev === publicId ? null : prev));
    }, 2000);
  };

  const handleToggleUpvote = async (srv: PublicServerCard) => {
    if (!user) {
      navigate('/login', {
        state: { from: `${location.pathname}${location.search}` },
      });
      return;
    }
    if (upvotingId) return;
    setUpvotingId(srv.publicId);
    try {
      const res = await api.post<{ upvoted: boolean; upvotesCount: number }>(
        `/servers/${srv.publicId}/upvote`
      );
      setData((prev) =>
        prev
          ? {
              ...prev,
              servers: prev.servers.map((item) =>
                item.publicId === srv.publicId
                  ? {
                      ...item,
                      hasUpvoted: res.data.upvoted,
                      upvotesCount: res.data.upvotesCount,
                    }
                  : item
              ),
            }
          : prev
      );
    } catch (err: any) {
      alert(err?.response?.data?.error || t('servers.directory.upvote_failed'));
    } finally {
      setUpvotingId(null);
    }
  };

  const listServerHref = sso ? getAccountsUrl('/settings?tab=servers') : '/settings?tab=servers';
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const hasActiveFilters =
    Boolean(debouncedQ) || selectedTags.length > 0 || onlineOnly || bedrockOnly;

  return (
    <>
      <SEO
        title={t('servers.directory.seo_title')}
        description={t('servers.directory.seo_description')}
      />

      <section className="band">
        <div className="page">
          <div className="sv-hero">
            <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
              <h1 className="display-2">
                <Trans t={t} i18nKey="servers.directory.title" components={{ mark: <span className="mark" /> }} />
              </h1>
              <p className="lede">
                <Trans t={t} i18nKey="servers.directory.lede" components={{ strong: <strong /> }} />
              </p>
            </div>

            <div className="row" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
              {sso ? (
                <a href={listServerHref} className="button button-primary brutal">
                  <Plus size={16} /> {t('servers.directory.list_your_server')}
                </a>
              ) : (
                <Link to={listServerHref} className="button button-primary brutal">
                  <Plus size={16} /> {t('servers.directory.list_your_server')}
                </Link>
              )}
            </div>
          </div>

          <div className="sv-stats">
            <div className="sv-stat">
              <span className="label">{t('servers.directory.online_servers')}</span>
              <span className="sv-stat-val">
                <span
                  className="dot"
                  style={{ background: 'var(--success)', width: 10, height: 10 }}
                />
                {(data?.stats.onlineServers ?? 0).toLocaleString()}
              </span>
              <span className="small muted">{t('servers.directory.online_servers_hint')}</span>
            </div>

            <div className="sv-stat">
              <span className="label">{t('servers.directory.players_online_now')}</span>
              <span className="sv-stat-val">
                <Users size={22} className="pumpkin" />
                {(data?.stats.onlinePlayers ?? 0).toLocaleString()}
              </span>
              <span className="small muted">{t('servers.directory.players_online_hint')}</span>
            </div>

            <div className="sv-stat">
              <span className="label">{t('servers.directory.listed_servers')}</span>
              <span className="sv-stat-val">
                <Server size={22} className="pumpkin" />
                {(data?.stats.totalServers ?? 0).toLocaleString()}
              </span>
              <span className="small muted">{t('servers.directory.listed_servers_hint')}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="band band-surface">
        <div className="page stack" style={{ '--gap': '1.25rem' } as React.CSSProperties}>
          {/* Search & Sort Controls */}
          <div className="sv-toolbar">
            <label className="search">
              <Search />
              <input
                type="search"
                className="input"
                placeholder={t('servers.directory.search_placeholder')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>

            <button
              type="button"
              className="sv-tag-chip"
              aria-pressed={onlineOnly}
              onClick={() => updateFilterParam({ status: onlineOnly ? null : 'online' })}
            >
              <span
                className="dot"
                style={{
                  background: onlineOnly ? 'var(--on-pumpkin)' : 'var(--success)',
                }}
              />
              {t('servers.directory.online_only')}
            </button>

            <button
              type="button"
              className="sv-tag-chip"
              aria-pressed={bedrockOnly}
              onClick={() => updateFilterParam({ edition: bedrockOnly ? null : 'bedrock' })}
            >
              <Smartphone size={13} /> {t('servers.directory.bedrock_crossplay')}
            </button>

            <Select
              options={SORT_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))}
              value={sort}
              onChange={(nextSort) => updateFilterParam({ sort: nextSort })}
              aria-label={t('servers.directory.sort_aria')}
            />
          </div>

          {/* Categorized Multi-Tag Filter Box */}
          <div className="sv-filter-box" role="region" aria-label={t('servers.directory.filter_tags_aria')}>
            <div className="sv-cat-tabs" role="tablist" aria-label={t('servers.directory.tag_categories_aria')}>
              <button
                type="button"
                role="tab"
                className="sv-cat-tab"
                aria-selected={tagTab === 'popular'}
                aria-pressed={tagTab === 'popular'}
                onClick={() => setTagTab('popular')}
              >
                {t('servers.directory.popular_tags')}
              </button>
              {SERVER_TAG_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  className="sv-cat-tab"
                  aria-selected={tagTab === cat.id}
                  aria-pressed={tagTab === cat.id}
                  onClick={() => setTagTab(cat.id)}
                >
                  {t(`servers.tags.categories.${cat.id}` as any, cat.label)}
                </button>
              ))}
              <button
                type="button"
                role="tab"
                className="sv-cat-tab"
                aria-selected={tagTab === 'all'}
                aria-pressed={tagTab === 'all'}
                onClick={() => setTagTab('all')}
              >
                {t('servers.directory.all_tags', { count: SERVER_TAGS.length })}
              </button>
            </div>

            <div className="sv-tags">
              {visibleFilterTags.map((tag) => (
                <ServerTagBadge
                  key={tag.value}
                  tag={tag.value}
                  size="md"
                  active={selectedTags.includes(tag.value)}
                  count={data?.tagCounts?.[tag.value]}
                  onClick={() => handleToggleTagFilter(tag.value)}
                />
              ))}
            </div>

            {selectedTags.length > 0 && (
              <div className="sv-active-filters">
                <span className="small muted">{t('servers.directory.matching_tags')}</span>
                {selectedTags.map((tagVal) => (
                  <ServerTagBadge
                    key={tagVal}
                    tag={tagVal}
                    size="sm"
                    active
                    removable
                    onClick={() => handleToggleTagFilter(tagVal)}
                  />
                ))}
                <button
                  type="button"
                  className="button button-ghost button-sm"
                  onClick={() => updateFilterParam({ tags: null })}
                >
                  <X size={13} /> {t('servers.directory.clear_tags')}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="notice notice-danger">
              <p className="notice-text">{error}</p>
            </div>
          )}

          {loading && !data ? (
            <div className="sf-loader">
              <span className="loading" />
              <p className="small">{t('servers.directory.loading')}</p>
            </div>
          ) : !data || data.servers.length === 0 ? (
            <div className="panel">
              <div className="blank">
                <Server size={36} className="pumpkin" />
                <p className="h2">
                  {hasActiveFilters ? (
                    <Trans t={t} i18nKey="servers.directory.empty_filtered_title" components={{ mark: <span className="mark" /> }} />
                  ) : (
                    <Trans t={t} i18nKey="servers.directory.empty_title" components={{ mark: <span className="mark" /> }} />
                  )}
                </p>
                <p className="small" style={{ maxWidth: '44ch' }}>
                  {hasActiveFilters ? (
                    t('servers.directory.empty_filtered_desc')
                  ) : (
                    <Trans t={t} i18nKey="servers.directory.empty_desc" components={{ code: <code /> }} />
                  )}
                </p>
                <div className="row" style={{ gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className="button"
                      onClick={() => {
                        setSearchInput('');
                        setDebouncedQ('');
                        setSearchParams({}, { replace: true });
                      }}
                    >
                      {t('search.clear_all')}
                    </button>
                  )}
                  {sso ? (
                    <a href={listServerHref} className="button button-primary">
                      <Terminal size={15} /> {t('servers.directory.link_and_list')}
                    </a>
                  ) : (
                    <Link to={listServerHref} className="button button-primary">
                      <Terminal size={15} /> {t('servers.directory.link_and_list')}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="sv-list">
                {data.servers.map((srv) => {
                  const detailPath = getServerDetailPath(srv.publicId, srv.slug);
                  const isCopied = copiedId === srv.publicId;
                  const visibleCardTags = srv.tags.slice(0, 4);
                  const extraTagsCount = Math.max(0, srv.tags.length - visibleCardTags.length);

                  return (
                    <article key={srv.publicId} className="sv-card">
                      <Link to={detailPath} className="sv-icon" aria-label={srv.name}>
                        {srv.iconUrl ? (
                          <img src={srv.iconUrl} alt={t('servers.directory.server_icon_alt', { name: srv.name })} loading="lazy" />
                        ) : (
                          srv.name.charAt(0).toUpperCase()
                        )}
                      </Link>

                      <div className="sv-card-body">
                        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Link to={detailPath} className="sv-card-title">
                            {srv.name}
                          </Link>
                          <span
                            className={`sticker sticker-sm ${srv.isOnline ? 'sticker-success' : ''}`}
                          >
                            <span
                              className="dot"
                              style={{
                                background: srv.isOnline ? 'var(--on-pumpkin)' : 'var(--muted)',
                              }}
                            />
                            {srv.isOnline
                              ? t('servers.directory.players_ratio', { online: srv.onlinePlayers, max: srv.maxPlayers })
                              : t('servers.common.offline')}
                          </span>
                          {srv.bedrockAddress && !srv.tags.includes('crossplay') && (
                            <span className="tag tag-info" title={`Bedrock: ${srv.bedrockAddress}`}>
                              {t('servers.common.crossplay')}
                            </span>
                          )}
                        </div>

                        <p className="sv-card-tagline">{srv.tagline}</p>

                        <div className="sv-card-meta small">
                          {visibleCardTags.map((tag) => (
                            <ServerTagBadge
                              key={tag}
                              tag={tag}
                              size="sm"
                              active={selectedTags.includes(tag)}
                              onClick={() => handleToggleTagFilter(tag)}
                            />
                          ))}
                          {extraTagsCount > 0 && (
                            <Link
                              to={detailPath}
                              className="tag tag-fg"
                              style={{ textDecoration: 'none' }}
                              title={srv.tags.slice(4).join(', ')}
                            >
                              +{extraTagsCount}
                            </Link>
                          )}
                          {srv.minecraftVersion && (
                            <span className="muted mono">MC {srv.minecraftVersion}</span>
                          )}
                          {srv.countryName && (
                            <span className="muted">
                              <Globe
                                size={12}
                                style={{ verticalAlign: '-2px', marginRight: 4 }}
                              />
                              {srv.countryName}
                            </span>
                          )}
                          <span className="muted">{t('servers.directory.by_owner', { owner: srv.ownerUsername })}</span>
                        </div>
                      </div>

                      <div className="sv-card-actions">
                        <button
                          type="button"
                          className="sv-ip-btn"
                          onClick={() => handleCopyAddress(srv.publicId, srv.javaAddress)}
                          title={t('servers.directory.copy_java_ip')}
                        >
                          <span>{srv.javaAddress}</span>
                          {isCopied ? (
                            <Check size={14} style={{ color: 'var(--success)' }} />
                          ) : (
                            <Copy size={14} className="muted" />
                          )}
                        </button>

                        <button
                          type="button"
                          className="sv-upvote-btn"
                          data-active={srv.hasUpvoted}
                          disabled={upvotingId === srv.publicId}
                          onClick={() => void handleToggleUpvote(srv)}
                          title={
                            user
                              ? srv.hasUpvoted
                                ? t('servers.directory.remove_upvote')
                                : t('servers.directory.upvote_server')
                              : t('servers.directory.sign_in_to_upvote')
                          }
                        >
                          <ArrowBigUp size={18} />
                          <span>{srv.upvotesCount.toLocaleString()}</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div
                  className="row"
                  style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}
                >
                  <span className="small muted">
                    {t('servers.directory.pagination', { page: data.page, totalPages, total: data.total.toLocaleString() })}
                  </span>
                  <div className="row" style={{ gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="button button-sm"
                      disabled={data.page <= 1}
                      onClick={() => updateFilterParam({ page: String(data.page - 1) })}
                    >
                      <ChevronLeft size={15} /> {t('servers.directory.previous')}
                    </button>
                    <button
                      type="button"
                      className="button button-sm"
                      disabled={data.page >= totalPages}
                      onClick={() => updateFilterParam({ page: String(data.page + 1) })}
                    >
                      {t('servers.directory.next')} <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
};

export default ServersHomePage;
