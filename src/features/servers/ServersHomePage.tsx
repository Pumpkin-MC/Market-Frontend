import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
  { value: 'popular', label: 'Sort: Trending & Active' },
  { value: 'players', label: 'Sort: Most Players Online' },
  { value: 'upvotes', label: 'Sort: Most Upvoted' },
  { value: 'newest', label: 'Sort: Recently Listed' },
];

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
      setError(err?.response?.data?.error || 'Failed to load Pumpkin Server List.');
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
      alert(err?.response?.data?.error || 'Could not update server upvote.');
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
        title="Pumpkin Servers"
        description="Discover community Pumpkin Minecraft servers with live player counts, Rust performance, and community upvotes."
      />

      <section className="band">
        <div className="page">
          <div className="sv-hero">
            <div className="stack" style={{ '--gap': '10px' } as React.CSSProperties}>
              <h1 className="display-2">
                <span className="mark">Pumpkin</span> Server List
              </h1>
              <p className="lede">
                Explore community Minecraft servers powered by <strong>Pumpkin</strong>, with live
                player counts and zero fake slots.
              </p>
            </div>

            <div className="row" style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
              {sso ? (
                <a href={listServerHref} className="button button-primary brutal">
                  <Plus size={16} /> List Your Server
                </a>
              ) : (
                <Link to={listServerHref} className="button button-primary brutal">
                  <Plus size={16} /> List Your Server
                </Link>
              )}
            </div>
          </div>

          <div className="sv-stats">
            <div className="sv-stat">
              <span className="label">Online Servers</span>
              <span className="sv-stat-val">
                <span
                  className="dot"
                  style={{ background: 'var(--success)', width: 10, height: 10 }}
                />
                {(data?.stats.onlineServers ?? 0).toLocaleString()}
              </span>
              <span className="small muted">Active heartbeat in last 15m</span>
            </div>

            <div className="sv-stat">
              <span className="label">Players Online Now</span>
              <span className="sv-stat-val">
                <Users size={22} className="pumpkin" />
                {(data?.stats.onlinePlayers ?? 0).toLocaleString()}
              </span>
              <span className="small muted">Across listed servers</span>
            </div>

            <div className="sv-stat">
              <span className="label">Listed Servers</span>
              <span className="sv-stat-val">
                <Server size={22} className="pumpkin" />
                {(data?.stats.totalServers ?? 0).toLocaleString()}
              </span>
              <span className="small muted">Linked via console pumpkin link</span>
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
                placeholder="Search servers by name, tagline, tag, owner, or IP…"
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
              Online Only
            </button>

            <button
              type="button"
              className="sv-tag-chip"
              aria-pressed={bedrockOnly}
              onClick={() => updateFilterParam({ edition: bedrockOnly ? null : 'bedrock' })}
            >
              <Smartphone size={13} /> Bedrock / Crossplay
            </button>

            <Select
              options={SORT_OPTIONS}
              value={sort}
              onChange={(nextSort) => updateFilterParam({ sort: nextSort })}
              aria-label="Sort servers"
            />
          </div>

          {/* Categorized Multi-Tag Filter Box */}
          <div className="sv-filter-box" role="region" aria-label="Filter servers by tags">
            <div className="sv-cat-tabs" role="tablist" aria-label="Tag categories">
              <button
                type="button"
                role="tab"
                className="sv-cat-tab"
                aria-selected={tagTab === 'popular'}
                aria-pressed={tagTab === 'popular'}
                onClick={() => setTagTab('popular')}
              >
                Popular
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
                  {cat.label}
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
                All Tags ({SERVER_TAGS.length})
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
                <span className="small muted">Matching tags:</span>
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
                  <X size={13} /> Clear tags
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
              <p className="small">Loading Pumpkin servers…</p>
            </div>
          ) : !data || data.servers.length === 0 ? (
            <div className="panel">
              <div className="blank">
                <Server size={36} className="pumpkin" />
                <p className="h2">
                  {hasActiveFilters ? (
                    <>
                      No matching <span className="mark">servers</span> found
                    </>
                  ) : (
                    <>
                      Be the first to list your <span className="mark">Pumpkin</span> server
                    </>
                  )}
                </p>
                <p className="small" style={{ maxWidth: '44ch' }}>
                  {hasActiveFilters ? (
                    'Try removing one of your selected tag filters or clearing your search query.'
                  ) : (
                    <>
                      Run <code>pumpkin link</code> in your Pumpkin server console, claim it on your
                      Pumpkin Account, and toggle your public listing on in seconds.
                    </>
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
                      Clear All Filters
                    </button>
                  )}
                  {sso ? (
                    <a href={listServerHref} className="button button-primary">
                      <Terminal size={15} /> Link &amp; List Your Server
                    </a>
                  ) : (
                    <Link to={listServerHref} className="button button-primary">
                      <Terminal size={15} /> Link &amp; List Your Server
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
                          <img src={srv.iconUrl} alt={`${srv.name} icon`} loading="lazy" />
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
                              ? `${srv.onlinePlayers}/${srv.maxPlayers} Players`
                              : 'Offline'}
                          </span>
                          {srv.bedrockAddress && !srv.tags.includes('crossplay') && (
                            <span className="tag tag-info" title={`Bedrock: ${srv.bedrockAddress}`}>
                              Crossplay
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
                          <span className="muted">by @{srv.ownerUsername}</span>
                        </div>
                      </div>

                      <div className="sv-card-actions">
                        <button
                          type="button"
                          className="sv-ip-btn"
                          onClick={() => handleCopyAddress(srv.publicId, srv.javaAddress)}
                          title="Click to copy Java join IP"
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
                                ? 'Remove upvote'
                                : 'Upvote this server'
                              : 'Sign in with Pumpkin Account to upvote'
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
                    Page {data.page} of {totalPages} ({data.total.toLocaleString()} servers)
                  </span>
                  <div className="row" style={{ gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="button button-sm"
                      disabled={data.page <= 1}
                      onClick={() => updateFilterParam({ page: String(data.page - 1) })}
                    >
                      <ChevronLeft size={15} /> Previous
                    </button>
                    <button
                      type="button"
                      className="button button-sm"
                      disabled={data.page >= totalPages}
                      onClick={() => updateFilterParam({ page: String(data.page + 1) })}
                    >
                      Next <ChevronRight size={15} />
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
