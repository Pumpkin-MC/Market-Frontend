import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../api';
import SEO from '../components/SEO';
import PluginCard from '../components/PluginCard';
import { useAuth } from '../App';

import { getPluginUrl } from '../utils/url';

const PAGE_SIZE = 12;

// Global cache to persist data across component unmounts (navigation)
let homeCache: {
    popular: any[];
    newest: any[];
    all: any[];
    nextCursor: string | null;
    hasMore: boolean;
} | null = null;

const Home = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [popular, setPopular] = useState<any[]>(homeCache?.popular || []);
    const [newest, setNewest] = useState<any[]>(homeCache?.newest || []);
    const [allPlugins, setAllPlugins] = useState<any[]>(homeCache?.all || []);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(homeCache?.nextCursor ?? null);
    const [hasMore, setHasMore] = useState<boolean>(homeCache?.hasMore ?? true);
    const [heroIndex, setHeroIndex] = useState(0);
    const [heroSubImageIndex, setHeroSubImageIndex] = useState(0);

    const popularRef = useRef<HTMLElement | null>(null);
    const newestRef = useRef<HTMLElement | null>(null);
    const observerTarget = useRef<HTMLDivElement | null>(null);
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
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        const target = observerTarget.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
                    loadMorePlugins();
                }
            },
            { rootMargin: '300px' }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, allPlugins.length]);

    // Featured plugins for top Steam-like carousel
    const featuredPlugins = useMemo(() => popular.slice(0, 5), [popular]);

    // Auto rotate hero slide every 6s
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
            <div className="loading-state">
                <div className="spinner"></div>
                <p>Discovering best plugins...</p>
            </div>
        );
    }

    return (
        <>
            <SEO 
                title="Home" 
                description="Discover the best WASM-powered Minecraft plugins at Pumpkin Market. Performance, security, and variety in one place." 
            />

            {activeFeatured && (
                <section className="featured-showcase-container">
                    <div className="featured-showcase-main">
                        <Link to={getPluginUrl(activeFeatured)} className="featured-showcase-link">
                            {/* Main visual display */}
                            <div className="featured-main-visual">
                                {activeImage ? (
                                    <img src={activeImage} alt={activeFeatured.name} className="featured-main-img" />
                                ) : (
                                    <div className="featured-visual-fallback">
                                        <span>{activeFeatured.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                )}

                                <div className="featured-badge-overlay">
                                    <span className="featured-tag">Trending & Popular</span>
                                    {activeFeatured.type === 'free' ? (
                                        <span className="featured-price-tag free">Free</span>
                                    ) : activeFeatured.sale_active && activeFeatured.sale_discount_percent > 0 ? (
                                        <span className="featured-price-tag sale">
                                            -{activeFeatured.sale_discount_percent}% OFF
                                        </span>
                                    ) : (
                                        <span className="featured-price-tag paid">
                                            €{((activeFeatured.price_cents || 0) / 100).toFixed(2)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Sidebar Info */}
                            <div className="featured-sidebar-info">
                                <h2 className="featured-title">{activeFeatured.name}</h2>
                                <p className="featured-dev">by <strong>{activeFeatured.dev_name}</strong></p>

                                <div className="featured-screenshots-grid">
                                    {featuredImages.slice(0, 4).map((src: string, idx: number) => (
                                        <div 
                                            key={src + idx} 
                                            className={`featured-thumb ${idx === heroSubImageIndex ? 'active' : ''}`}
                                            onMouseEnter={(e) => {
                                                e.preventDefault();
                                                setHeroSubImageIndex(idx);
                                            }}
                                        >
                                            <img src={src} alt="thumbnail" />
                                        </div>
                                    ))}
                                </div>

                                <p className="featured-desc">{getDesc(activeFeatured.translated_descriptions)}</p>

                                <div className="featured-meta">
                                    <div className="featured-stat">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                        </svg>
                                        <span>{(activeFeatured.downloads || 0).toLocaleString()} Downloads</span>
                                    </div>
                                    {activeFeatured.version && (
                                        <span className="featured-version">v{activeFeatured.version}</span>
                                    )}
                                </div>

                                <div className="featured-action-btn">
                                    <span>View Plugin</span>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation Dots / Controls */}
                    <div className="featured-nav-dots">
                        {featuredPlugins.map((item, idx) => (
                            <button
                                key={item.id}
                                className={`featured-dot-btn ${idx === heroIndex ? 'active' : ''}`}
                                onClick={() => {
                                    setHeroIndex(idx);
                                    setHeroSubImageIndex(0);
                                }}
                            >
                                <span className="dot-title">{item.name}</span>
                                <div className="dot-bar" />
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <div className="container" id="browse">
                <section className="home-section" ref={popularRef}>
                    <h2 className="section-title"><span>{t('home.trending')}</span></h2>
                    <div className="home-plugin-grid">
                        {popular.length > 0 ? (
                            popular.slice(0, 10).map((plugin: any) => (
                                <PluginCard key={plugin.id} plugin={plugin} />
                            ))
                        ) : (
                            <p className="no-plugins">{t('home.no_plugins')}</p>
                        )}
                    </div>
                </section>

                <section className="home-section" ref={newestRef}>
                    <h2 className="section-title"><span>{t('home.latest')}</span></h2>
                    <div className="home-plugin-grid">
                        {newest.length > 0 ? (
                            newest.slice(0, 10).map((plugin: any) => (
                                <PluginCard key={plugin.id} plugin={plugin} />
                            ))
                        ) : (
                            <p className="no-plugins">{t('home.no_plugins')}</p>
                        )}
                    </div>
                </section>

                <section className="home-section">
                    <h2 className="section-title"><span>{t('home.all_plugins')}</span></h2>
                    <div className="home-plugin-grid">
                        {allPlugins.length > 0 ? (
                            allPlugins.map((plugin: any) => (
                                <PluginCard key={plugin.id} plugin={plugin} />
                            ))
                        ) : (
                            !loading && <p className="no-plugins">{t('home.no_plugins')}</p>
                        )}
                    </div>

                    {/* Sentinel target for infinite scrolling */}
                    <div ref={observerTarget} style={{ height: '1px', width: '100%', pointerEvents: 'none' }} />

                    {loadingMore && (
                        <div className="infinite-scroll-loader">
                            <div className="spinner"></div>
                            <p>Loading more plugins...</p>
                        </div>
                    )}

                    {!hasMore && allPlugins.length > 0 && (
                        <div className="infinite-scroll-end">
                            <p>You've reached the end of the plugins catalog.</p>
                        </div>
                    )}
                </section>

                {(fetched.current?.popular && fetched.current?.newest && popular.length === 0 && newest.length === 0 && allPlugins.length === 0) && (
                    <div className="empty-state">
                        <p>No plugins found. Check back later!</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default Home;