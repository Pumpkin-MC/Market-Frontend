import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SlidersHorizontal, ChevronDown, X, LayoutGrid, List, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import api from '../api';
import SEO from '../components/SEO';
import PluginCard from '../components/PluginCard';
import { useAuth } from '../App';
import { getPluginUrl } from '../utils/url';

const PAGE_SIZE = 12;
const PLUGIN_CATEGORIES = ['Admin Tools', 'Economy', 'Fun', 'World Management', 'Utilities', 'Chat', 'Other'];

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

    const [activeTab, setActiveTab] = useState<'trending' | 'latest' | 'all'>('trending');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const filterDropdownRef = useRef<HTMLDivElement>(null);
    const observerTarget = useRef<HTMLDivElement | null>(null);
    const fetched = useRef({ popular: !!homeCache?.popular, newest: !!homeCache?.newest, all: !!homeCache?.all });
    const prevUserIdRef = useRef<number | undefined>(user?.id);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && activeTab === 'all' && !selectedCategory && !selectedType) {
                    loadMorePlugins();
                }
            },
            { rootMargin: '300px' }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [hasMore, loading, loadingMore, allPlugins.length, activeTab, selectedCategory, selectedType]);

    const featuredPlugins = useMemo(() => {
        const withScreenshots = popular.filter(
            (p: any) => Array.isArray(p.screenshots) && p.screenshots.length > 0 && p.screenshots.some((s: string) => s && s.trim().length > 0)
        );
        return withScreenshots.slice(0, 5);
    }, [popular]);

    useEffect(() => {
        if (featuredPlugins.length <= 1) return;
        const timer = setInterval(() => {
            setHeroIndex((prev) => (prev + 1) % featuredPlugins.length);
        }, 6000);
        return () => clearInterval(timer);
    }, [featuredPlugins.length]);

    const activeFeatured = featuredPlugins[heroIndex];

    const featuredScreenshots = useMemo(() => {
        if (!activeFeatured) return [];
        if (activeFeatured.screenshots && activeFeatured.screenshots.length > 0) {
            return activeFeatured.screenshots;
        }
        return [];
    }, [activeFeatured]);

    const hasScreenshots = featuredScreenshots.length > 0;
    const activeImage = hasScreenshots
        ? featuredScreenshots[0]
        : activeFeatured?.preview_path;

    const getDesc = (translated?: Record<string, string> | string) => {
        if (!translated) return 'High performance Minecraft plugin.';
        try {
            const data = typeof translated === 'string' ? JSON.parse(translated) : translated;
            const currentLang = i18n.language.split('-')[0];
            return data[currentLang] || data.en || Object.values(data)[0] || 'High performance Minecraft plugin.';
        } catch {
            return typeof translated === 'string' ? translated : 'High performance Minecraft plugin.';
        }
    };

    const handlePrevSpotlight = () => {
        if (featuredPlugins.length === 0) return;
        setHeroIndex((prev) => (prev - 1 + featuredPlugins.length) % featuredPlugins.length);
    };

    const handleNextSpotlight = () => {
        if (featuredPlugins.length === 0) return;
        setHeroIndex((prev) => (prev + 1) % featuredPlugins.length);
    };

    const currentList = useMemo(() => {
        let baseList = popular;
        if (activeTab === 'latest') {
            baseList = newest;
        } else if (activeTab === 'all') {
            baseList = allPlugins;
        }

        return baseList.filter((plugin: any) => {
            if (selectedCategory && plugin.category !== selectedCategory) {
                return false;
            }
            if (selectedType && plugin.type !== selectedType) {
                return false;
            }
            return true;
        });
    }, [activeTab, popular, newest, allPlugins, selectedCategory, selectedType]);

    const activeFilterCount = (activeTab !== 'trending' ? 1 : 0) + (selectedCategory ? 1 : 0) + (selectedType ? 1 : 0);

    return (
        <>
            <SEO
                title="Home"
                description="Discover high-performance WebAssembly plugins for PumpkinMC at the official marketplace."
            />

            <section className="home-hero-section">
                <div className="home-hero-container">
                    <div className="home-hero-main">
                        <div className="home-hero-badge">PUMPKIN MARKETPLACE</div>
                        <h1 className="home-hero-title">
                            High-Performance Plugins for <span className="hero-hl">PumpkinMC</span>
                        </h1>
                        <p className="home-hero-subtitle">
                            Discover, download, and publish WASM-powered Minecraft plugins with sub-millisecond execution and memory safety.
                        </p>
                        <div className="home-hero-actions">
                            <a href="#browse" className="btn btn-hero-primary">
                                Explore Plugins &rarr;
                            </a>
                            <Link to="/dashboard" className="btn btn-hero-secondary">
                                Developer Studio
                            </Link>
                            <a
                                href="https://docs.pumpkinmc.org/plugin-dev/introduction"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hero-docs-link"
                            >
                                Plugin Dev Docs &rarr;
                            </a>
                        </div>
                        <div className="home-hero-metrics">
                            <div className="hero-metric-item">
                                <span className="hero-metric-label">EXECUTION</span>
                                <span className="hero-metric-value">WASM <small>native</small></span>
                            </div>
                            <div className="hero-metric-item">
                                <span className="hero-metric-label">SANDBOX</span>
                                <span className="hero-metric-value">100% <small>memory safe</small></span>
                            </div>
                            <div className="hero-metric-item">
                                <span className="hero-metric-label">LANGUAGES</span>
                                <span className="hero-metric-value">9+ <small>Rust, Py, TS</small></span>
                            </div>
                        </div>
                    </div>

                    <div aria-hidden="true" className="home-hero-mascot-wrap">
                        <img src="/icon.png" alt="" className="home-hero-mascot" />
                    </div>
                </div>
            </section>

            {loading && popular.length === 0 ? (
                <section className="spotlight-section">
                    <div className="spotlight-skeleton shimmer" />
                </section>
            ) : activeFeatured && (
                <section className="spotlight-section">
                    <div className="spotlight-header">
                        <div className="spotlight-header-left">
                            <span className="spotlight-tag-pill">HOT &amp; POPULAR</span>
                            <h2 className="spotlight-heading">Spotlight <span className="hl-tag">showcase</span></h2>
                        </div>

                        {featuredPlugins.length > 1 && (
                            <div className="spotlight-controls">
                                <button
                                    type="button"
                                    className="spotlight-nav-btn"
                                    onClick={handlePrevSpotlight}
                                    aria-label="Previous spotlight"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <div className="spotlight-indicators">
                                    {featuredPlugins.map((item, idx) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={`spotlight-dot ${idx === heroIndex ? 'active' : ''}`}
                                            onClick={() => setHeroIndex(idx)}
                                            aria-label={item.name}
                                        />
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="spotlight-nav-btn"
                                    onClick={handleNextSpotlight}
                                    aria-label="Next spotlight"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="spotlight-card">
                        <Link to={getPluginUrl(activeFeatured)} className="spotlight-card-inner">
                            <div className="spotlight-visual">
                                {hasScreenshots && activeImage ? (
                                    <img key={activeImage} src={activeImage} alt={activeFeatured.name} className="spotlight-img" />
                                ) : activeFeatured.preview_path ? (
                                    <div className="spotlight-icon-wrap">
                                        <img src={activeFeatured.preview_path} alt={activeFeatured.name} className="spotlight-icon-lg" />
                                    </div>
                                ) : (
                                    <div className="spotlight-fallback-letter">
                                        <span>{activeFeatured.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                )}

                                <div className="spotlight-badge-overlay">
                                    {activeFeatured.category && (
                                        <span className="spotlight-badge-cat">{activeFeatured.category}</span>
                                    )}
                                    {activeFeatured.type === 'free' ? (
                                        <span className="spotlight-badge-price free">Free</span>
                                    ) : activeFeatured.sale_active && activeFeatured.sale_discount_percent > 0 ? (
                                        <span className="spotlight-badge-price sale">
                                            -{activeFeatured.sale_discount_percent}%
                                        </span>
                                    ) : (
                                        <span className="spotlight-badge-price paid">
                                            €{((activeFeatured.price_cents || 0) / 100).toFixed(2)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="spotlight-body">
                                <div className="spotlight-body-top">
                                    <div className="spotlight-brand-row">
                                        {activeFeatured.preview_path && (
                                            <img src={activeFeatured.preview_path} alt="" className="spotlight-brand-icon" />
                                        )}
                                        <div className="spotlight-title-group">
                                            <h3 className="spotlight-title">{activeFeatured.name}</h3>
                                            <span className="spotlight-dev">by <strong>{activeFeatured.dev_name}</strong></span>
                                        </div>
                                    </div>

                                    <p className="spotlight-desc">{getDesc(activeFeatured.translated_descriptions)}</p>
                                </div>

                                <div className="spotlight-body-bottom">
                                    <div className="spotlight-meta">
                                        <span className="spotlight-stat">
                                            <Download size={13} />
                                            {(activeFeatured.downloads || 0).toLocaleString()}
                                        </span>
                                        {activeFeatured.version && (
                                            <span className="spotlight-version">v{activeFeatured.version}</span>
                                        )}
                                    </div>

                                    <span className="spotlight-cta">
                                        View Plugin &rarr;
                                    </span>
                                </div>
                            </div>
                        </Link>
                    </div>
                </section>
            )}

            <div className="container" id="browse">
                <div className="catalog-header-bar">
                    <div className="catalog-title-group">
                        <h2 className="catalog-title">Explore <span className="hl-tag">plugins</span></h2>
                        <span className="catalog-count-badge">
                            {currentList.length} {currentList.length === 1 ? 'plugin' : 'plugins'}
                        </span>
                    </div>

                    <div className="catalog-controls-group">
                        <div className="catalog-view-toggle">
                            <button
                                type="button"
                                className={`catalog-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => setViewMode('grid')}
                                aria-label="Grid view"
                                title="Grid view"
                            >
                                <LayoutGrid size={15} />
                            </button>
                            <button
                                type="button"
                                className={`catalog-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => setViewMode('list')}
                                aria-label="List view"
                                title="List view"
                            >
                                <List size={15} />
                            </button>
                        </div>

                        <div className="catalog-filter-dropdown-container" ref={filterDropdownRef}>
                            <button
                                type="button"
                                className={`catalog-filter-btn ${isFilterOpen || activeFilterCount > 0 ? 'active' : ''}`}
                                onClick={() => setIsFilterOpen((prev) => !prev)}
                                aria-expanded={isFilterOpen}
                            >
                                <SlidersHorizontal size={14} />
                                <span>Filter &amp; Sort</span>
                                {activeFilterCount > 0 && (
                                    <span className="catalog-filter-count">
                                        {activeFilterCount}
                                    </span>
                                )}
                                <ChevronDown size={14} className={`catalog-filter-chevron ${isFilterOpen ? 'open' : ''}`} />
                            </button>

                            {isFilterOpen && (
                                <>
                                    <div className="catalog-filter-backdrop" onClick={() => setIsFilterOpen(false)} />
                                    <div className="catalog-filter-menu">
                                        <div className="catalog-filter-mobile-header">
                                            <h3 className="catalog-filter-mobile-title">Filter &amp; Sort</h3>
                                            <button
                                                type="button"
                                                className="catalog-filter-close-btn"
                                                onClick={() => setIsFilterOpen(false)}
                                                aria-label="Close filters"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>

                                        <div className="catalog-filter-item">
                                            <label className="catalog-filter-label">Sort Feed</label>
                                            <div className="catalog-filter-toggle-group">
                                                <button
                                                    type="button"
                                                    className={`catalog-filter-opt ${activeTab === 'trending' ? 'active' : ''}`}
                                                    onClick={() => setActiveTab('trending')}
                                                >
                                                    {t('home.trending')}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`catalog-filter-opt ${activeTab === 'latest' ? 'active' : ''}`}
                                                    onClick={() => setActiveTab('latest')}
                                                >
                                                    {t('home.latest')}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`catalog-filter-opt ${activeTab === 'all' ? 'active' : ''}`}
                                                    onClick={() => setActiveTab('all')}
                                                >
                                                    {t('home.all_plugins')}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="catalog-filter-item">
                                            <label className="catalog-filter-label">Category</label>
                                            <select
                                                className="catalog-filter-select"
                                                value={selectedCategory}
                                                onChange={(e) => setSelectedCategory(e.target.value)}
                                            >
                                                <option value="">{t('home.filter_all')}</option>
                                                {PLUGIN_CATEGORIES.map((cat) => (
                                                    <option key={cat} value={cat}>
                                                        {cat}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="catalog-filter-item">
                                            <label className="catalog-filter-label">Pricing</label>
                                            <div className="catalog-filter-toggle-group">
                                                <button
                                                    type="button"
                                                    className={`catalog-filter-opt ${selectedType === '' ? 'active' : ''}`}
                                                    onClick={() => setSelectedType('')}
                                                >
                                                    All
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`catalog-filter-opt ${selectedType === 'free' ? 'active' : ''}`}
                                                    onClick={() => setSelectedType(selectedType === 'free' ? '' : 'free')}
                                                >
                                                    Free
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`catalog-filter-opt ${selectedType === 'paid' ? 'active' : ''}`}
                                                    onClick={() => setSelectedType(selectedType === 'paid' ? '' : 'paid')}
                                                >
                                                    Paid
                                                </button>
                                            </div>
                                        </div>

                                        <div className="catalog-filter-actions">
                                            {activeFilterCount > 0 && (
                                                <button
                                                    type="button"
                                                    className="catalog-filter-clear-all"
                                                    onClick={() => {
                                                        setActiveTab('trending');
                                                        setSelectedCategory('');
                                                        setSelectedType('');
                                                    }}
                                                >
                                                    Clear All
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="catalog-filter-apply-btn"
                                                onClick={() => setIsFilterOpen(false)}
                                            >
                                                Apply Filters
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {activeFilterCount > 0 && (
                    <div className="catalog-active-filters-row">
                        <span className="catalog-active-filter-label">Active Filters:</span>
                        {activeTab !== 'trending' && (
                            <span className="catalog-active-tag">
                                {activeTab === 'latest' ? t('home.latest') : t('home.all_plugins')}
                                <button type="button" onClick={() => setActiveTab('trending')}>x</button>
                            </span>
                        )}
                        {selectedCategory && (
                            <span className="catalog-active-tag">
                                {selectedCategory}
                                <button type="button" onClick={() => setSelectedCategory('')}>x</button>
                            </span>
                        )}
                        {selectedType && (
                            <span className="catalog-active-tag">
                                {selectedType.toUpperCase()}
                                <button type="button" onClick={() => setSelectedType('')}>x</button>
                            </span>
                        )}
                        <button
                            type="button"
                            className="catalog-clear-filters-btn"
                            onClick={() => {
                                setActiveTab('trending');
                                setSelectedCategory('');
                                setSelectedType('');
                            }}
                        >
                            Clear Filters
                        </button>
                    </div>
                )}

                <div className={viewMode === 'grid' ? 'home-plugin-grid' : 'home-plugin-list'}>
                    {loading && currentList.length === 0 ? (
                        Array.from({ length: 6 }).map((_, idx) => (
                            <div key={idx} className={viewMode === 'grid' ? 'plugin-card-skeleton shimmer' : 'plugin-list-skeleton shimmer'}>
                                <div className="skeleton-thumb" />
                                <div className="skeleton-content">
                                    <div className="skeleton-bar title" />
                                    <div className="skeleton-bar subtitle" />
                                    <div className="skeleton-bar text" />
                                </div>
                            </div>
                        ))
                    ) : currentList.length > 0 ? (
                        currentList.map((plugin: any) => (
                            <PluginCard key={plugin.id} plugin={plugin} viewMode={viewMode} />
                        ))
                    ) : (
                        !loading && <p className="no-plugins">{t('home.no_plugins')}</p>
                    )}
                </div>

                {activeTab === 'all' && !selectedCategory && !selectedType && (
                    <>
                        <div ref={observerTarget} style={{ height: '1px', width: '100%', pointerEvents: 'none' }} />
                        {loadingMore && (
                            <div className="infinite-scroll-loader">
                                <div className="spinner"></div>
                                <p>Loading more plugins...</p>
                            </div>
                        )}
                        {!hasMore && allPlugins.length > 0 && (
                            <div className="infinite-scroll-end">
                                <p>End of plugins catalog.</p>
                            </div>
                        )}
                    </>
                )}

                {fetched.current?.popular && fetched.current?.newest && popular.length === 0 && newest.length === 0 && allPlugins.length === 0 && (
                    <div className="empty-state">
                        <p>No plugins found. Check back later!</p>
                    </div>
                )}
            </div>

            <section className="home-cta-section">
                <div className="home-cta-card">
                    <h2 className="home-cta-title">
                        Build plugins for <span className="hl-tag">Pumpkin</span>
                    </h2>
                    <p className="home-cta-desc">
                        Write plugins in Rust, Kotlin, Python, Go, C#, C++, D, Zig, or TypeScript. Compiled to WebAssembly for native performance, safety, and instant hot-reloading.
                    </p>
                    <div className="home-cta-actions">
                        <Link to="/dashboard" className="btn btn-hero-primary">
                            Publish a Plugin
                        </Link>
                        <a
                            href="https://docs.pumpkinmc.org/plugin-dev/introduction"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-hero-secondary"
                        >
                            Developer Docs
                        </a>
                        <a
                            href="https://github.com/Pumpkin-MC/pumpkin-plugin-examples"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-hero-secondary"
                        >
                            Plugin Examples
                        </a>
                    </div>
                </div>
            </section>
        </>
    );
};

export default Home;