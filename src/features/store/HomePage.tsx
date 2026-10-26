import { useState, useEffect, useRef, useMemo, type ReactNode, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import api from '../../lib/api';
import SEO from '../../components/SEO';
import PluginCard from '../../components/PluginCard';
import { useAuth } from '../../app/auth';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

import { getPluginUrl } from '../../lib/url';
import '../../styles/store.css';

const PAGE_SIZE = 12;

const markFirst = (text: string): ReactNode => {
    const i = text.trim().indexOf(' ');
    if (i < 0) return <span className="mark">{text}</span>;
    return <><span className="mark">{text.slice(0, i)}</span>{text.slice(i)}</>;
};

let homeCache: {
    popular: any[];
    newest: any[];
    all: any[];
    nextCursor: string | null;
    hasMore: boolean;
} | null = null;

const HomePage = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [popular, setPopular] = useState<any[]>(homeCache?.popular || []);
    const [newest, setNewest] = useState<any[]>(homeCache?.newest || []);
    const [allPlugins, setAllPlugins] = useState<any[]>(homeCache?.all || []);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [moreFailed, setMoreFailed] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(homeCache?.nextCursor ?? null);
    const [hasMore, setHasMore] = useState<boolean>(homeCache?.hasMore ?? true);
    const [heroIndex, setHeroIndex] = useState(0);
    const [heroSubImageIndex, setHeroSubImageIndex] = useState(0);

    const popularRef = useRef<HTMLElement | null>(null);
    const newestRef = useRef<HTMLElement | null>(null);
    const fetched = useRef({ popular: !!homeCache?.popular, newest: !!homeCache?.newest, all: !!homeCache?.all });
    const prevUserIdRef = useRef<number | undefined>(user?.id);

    useEffect(() => {
        const userChanged = prevUserIdRef.current !== user?.id;
        prevUserIdRef.current = user?.id;

        if (userChanged) {
            homeCache = null;
            fetched.current = { popular: false, newest: false, all: false };
        } else if (fetched.current.popular && fetched.current.newest && fetched.current.all) {
            return;
        }

        const loadSections = async () => {
            setLoading(true);
            try {
                const [popRes, newRes, allRes] = await Promise.all([
                    api.get('/plugins', { params: { sort: 'downloads', limit: 10 } }),
                    api.get('/plugins', { params: { sort: 'newest', limit: 10 } }),
                    api.get('/plugins', { params: { limit: PAGE_SIZE, paginated: true } })
                ]);
                const popData = Array.isArray(popRes.data) ? popRes.data : (popRes.data?.items || []);
                const newData = Array.isArray(newRes.data) ? newRes.data : (newRes.data?.items || []);
                const allData = allRes.data?.items || (Array.isArray(allRes.data) ? allRes.data : []);
                const cursor = allRes.data?.next_cursor || allRes.headers?.['x-next-cursor'] || null;
                const more = allRes.data?.has_more ?? (allRes.headers?.['x-has-more'] === 'true' || allData.length === PAGE_SIZE);

                setPopular(popData);
                setNewest(newData);
                setAllPlugins(allData);
                setNextCursor(cursor);
                setHasMore(more);

                homeCache = {
                    popular: popData,
                    newest: newData,
                    all: allData,
                    nextCursor: cursor,
                    hasMore: more,
                };

                fetched.current = { popular: true, newest: true, all: true };
            } catch (err) {
                console.error('Fetch error for home sections:', err);
            } finally {
                setLoading(false);
            }
        };

        loadSections();
    }, []);

    const loadMorePlugins = async () => {
        if (loadingMore || !hasMore || loading) return;
        setLoadingMore(true);
        try {
            const params: any = { limit: PAGE_SIZE, paginated: true };
            if (nextCursor) {
                params.cursor = nextCursor;
            } else {
                params.offset = allPlugins.length;
            }

            const res = await api.get('/plugins', { params });
            const newItems = res.data?.items || (Array.isArray(res.data) ? res.data : []);
            const cursor = res.data?.next_cursor || res.headers?.['x-next-cursor'] || null;
            const more = res.data?.has_more ?? (res.headers?.['x-has-more'] === 'true' || newItems.length === PAGE_SIZE);

            if (newItems.length === 0) {
                setHasMore(false);
                if (homeCache) homeCache.hasMore = false;
            } else {
                setAllPlugins(prev => {
                    const existingIds = new Set(prev.map((p: any) => p.id));
                    const uniqueNew = newItems.filter((p: any) => !existingIds.has(p.id));
                    const updated = [...prev, ...uniqueNew];
                    if (homeCache) {
                        homeCache.all = updated;
                        homeCache.nextCursor = cursor;
                        homeCache.hasMore = more;
                    }
                    return updated;
                });
                setNextCursor(cursor);
                setHasMore(more);
            }
        } catch (err) {
            console.error('Failed to load more plugins:', err);
            setMoreFailed(true);
        } finally {
            setLoadingMore(false);
        }
    };

    const observerTarget = useInfiniteScroll(loadMorePlugins, hasMore && !loading && !loadingMore && !moreFailed);

    const featuredPlugins = useMemo(() => popular.slice(0, 5), [popular]);

    useEffect(() => {
        if (featuredPlugins.length <= 1) return;
        const timer = setInterval(() => {
            setHeroIndex((prev) => (prev + 1) % featuredPlugins.length);
            setHeroSubImageIndex(0);
        }, 6000);
        return () => clearInterval(timer);
    }, [featuredPlugins.length]);

    const activeFeatured = featuredPlugins[heroIndex];

    const featuredImages = useMemo(() => {
        if (!activeFeatured) return [];
        const imgs = [];
        if (activeFeatured.preview_path) imgs.push(activeFeatured.preview_path);
        if (activeFeatured.screenshots && activeFeatured.screenshots.length > 0) {
            imgs.push(...activeFeatured.screenshots);
        }
        return imgs;
    }, [activeFeatured]);

    const activeImage = featuredImages[heroSubImageIndex] || featuredImages[0];

    const getDesc = (translated?: Record<string, string> | string) => {
        if (!translated) return 'Discover this high performance Minecraft plugin.';
        try {
            const data = typeof translated === 'string' ? JSON.parse(translated) : translated;
            const currentLang = i18n.language.split('-')[0];
            return data[currentLang] || data.en || Object.values(data)[0] || 'Discover this high performance Minecraft plugin.';
        } catch {
            return typeof translated === 'string' ? translated : 'Discover this high performance Minecraft plugin.';
        }
    };

    if (loading && popular.length === 0) {
        return (
            <div className="sf-loader">
                <span className="loading" />
                <p className="small">Discovering best plugins...</p>
            </div>
        );
    }

    const isSale = activeFeatured?.sale_active && activeFeatured.sale_discount_percent > 0;
    const shelf = (title: string, items: any[], ref?: Ref<HTMLElement>, surface?: boolean) => (
        <section className={`band${surface ? ' band-surface' : ''}`} ref={ref}>
            <div className="page sect">
                <h2 className="sect-title">{markFirst(title)}</h2>
                {items.length > 0 ? (
                    <div className="catalogue">
                        {items.map((plugin: any) => <PluginCard key={plugin.id} plugin={plugin} />)}
                    </div>
                ) : (
                    <p className="small">{t('home.no_plugins')}</p>
                )}
            </div>
        </section>
    );

    return (
        <>
            <SEO
                title="Home"
                description="Discover the best WASM-powered Minecraft plugins at Pumpkin Market. Performance, security, and variety in one place."
            />

            {activeFeatured && (
                <section className="band">
                    <div className="page">
                        <Link to={getPluginUrl(activeFeatured)} className="feature sf-feature">
                            <div className="feature-cover">
                                {activeImage ? (
                                    <img src={activeImage} alt={activeFeatured.name} />
                                ) : (
                                    <div className="placeholder">
                                        <span className="avatar">{activeFeatured.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                )}
                                {activeFeatured.type !== 'free' && isSale && (
                                    <div className="entry-flags">
                                        <span className="sticker">-{activeFeatured.sale_discount_percent}% OFF</span>
                                    </div>
                                )}
                            </div>

                            <div className="feature-body">
                                <span className="sticker sticker-success">Trending & Popular</span>
                                <h2 className="display-2 sf-feature-name" title={activeFeatured.name}>{activeFeatured.name}</h2>
                                <p className="entry-by">by <strong>{activeFeatured.dev_name}</strong></p>

                                <div className="sf-thumbs">
                                    {[0, 1, 2, 3].map((idx) => {
                                        const src = featuredImages.length > 1 ? featuredImages[idx] : undefined;
                                        return src ? (
                                            <span
                                                key={src + idx}
                                                data-active={idx === heroSubImageIndex || undefined}
                                                onMouseEnter={(e) => {
                                                    e.preventDefault();
                                                    setHeroSubImageIndex(idx);
                                                }}
                                            >
                                                <img src={src} alt="thumbnail" />
                                            </span>
                                        ) : (
                                            <span key={idx} data-empty />
                                        );
                                    })}
                                </div>

                                <p className="sf-feature-desc">{getDesc(activeFeatured.translated_descriptions)}</p>

                                <dl className="specs">
                                    <dt>Downloads</dt><dd>{(activeFeatured.downloads || 0).toLocaleString()}</dd>
                                    <dt>Version</dt><dd className="mono">{activeFeatured.version ? `v${activeFeatured.version}` : '—'}</dd>
                                </dl>

                                <div className="row sf-feature-foot">
                                    {activeFeatured.type === 'free' ? (
                                        <span className="cost cost-free cost-lg">Free</span>
                                    ) : isSale ? (
                                        <span className="cost cost-sale cost-lg">
                                            <s>€{((activeFeatured.price_cents || 0) / 100).toFixed(2)}</s>
                                            €{(Math.round((activeFeatured.price_cents || 0) * (1 - activeFeatured.sale_discount_percent / 100)) / 100).toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className="cost cost-lg">€{((activeFeatured.price_cents || 0) / 100).toFixed(2)}</span>
                                    )}
                                    <span className="spacer" />
                                    <span className="button button-primary">View Plugin<ArrowRight /></span>
                                </div>
                            </div>
                        </Link>

                        <div className="feature-steps">
                            {featuredPlugins.map((item, idx) => (
                                <button
                                    key={item.id}
                                    className="feature-step sf-feature-step"
                                    aria-current={idx === heroIndex}
                                    onClick={() => {
                                        setHeroIndex(idx);
                                        setHeroSubImageIndex(0);
                                    }}
                                >
                                    <span className="num">{String(idx + 1).padStart(2, '0')}</span>
                                    <span>{item.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            <div id="browse">
                {shelf(t('home.trending'), popular.slice(0, 10), popularRef, true)}
                {shelf(t('home.latest'), newest.slice(0, 10), newestRef)}

                <section className="band band-surface">
                    <div className="page sect">
                        <h2 className="sect-title">{markFirst(t('home.all_plugins'))}</h2>
                        {allPlugins.length > 0 ? (
                            <div className="catalogue">
                                {allPlugins.map((plugin: any) => (
                                    <PluginCard key={plugin.id} plugin={plugin} />
                                ))}
                            </div>
                        ) : (
                            !loading && <p className="small">{t('home.no_plugins')}</p>
                        )}

                        <div ref={observerTarget} className="sf-sentinel" />

                        {loadingMore && (
                            <div className="row sf-more">
                                <span className="loading" />
                                <span className="small">Loading more plugins...</span>
                            </div>
                        )}

                        {moreFailed && (
                            <div className="row sf-more">
                                <button className="button" onClick={() => setMoreFailed(false)}>Retry</button>
                            </div>
                        )}

                        {!hasMore && allPlugins.length > 0 && (
                            <span className="sticker sticker-fg sf-end">You've reached the end of the plugins catalog.</span>
                        )}

                        {(fetched.current?.popular && fetched.current?.newest && popular.length === 0 && newest.length === 0 && allPlugins.length === 0) && (
                            <div className="blank">
                                <p className="h2">No plugins found. Check back later!</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </>
    );
};

export default HomePage;