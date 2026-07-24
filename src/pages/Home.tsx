import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../api';
import SEO from '../components/SEO';
import PluginCard from '../components/PluginCard';

// Global cache to persist data across component unmounts (navigation)
let homeCache: {
    popular: any[];
    newest: any[];
    all: any[];
} | null = null;

const Home = () => {
    const { i18n } = useTranslation();
    const [popular, setPopular] = useState<any[]>(homeCache?.popular || []);
    const [newest, setNewest] = useState<any[]>(homeCache?.newest || []);
    const [allPlugins, setAllPlugins] = useState<any[]>(homeCache?.all || []);
    const [loading, setLoading] = useState(false);
    const [heroIndex, setHeroIndex] = useState(0);
    const [heroSubImageIndex, setHeroSubImageIndex] = useState(0);

    const popularRef = useRef<HTMLElement | null>(null);
    const newestRef = useRef<HTMLElement | null>(null);
    const fetched = useRef({ popular: !!homeCache?.popular, newest: !!homeCache?.newest, all: !!homeCache?.all });

    const saveSection = (key: 'popular' | 'newest' | 'all', data: any[]) => {
        if (key === 'popular') setPopular(data);
        if (key === 'newest') setNewest(data);
        if (key === 'all') setAllPlugins(data);

        homeCache = {
            popular: key === 'popular' ? data : homeCache?.popular || [],
            newest: key === 'newest' ? data : homeCache?.newest || [],
            all: key === 'all' ? data : homeCache?.all || []
        };

        fetched.current[key] = true;
    };

    useEffect(() => {
        if (fetched.current.popular && fetched.current.newest && fetched.current.all) return;

        const loadSections = async () => {
            setLoading(true);
            try {
                const [popRes, newRes, allRes] = await Promise.all([
                    api.get('/plugins', { params: { sort: 'downloads' } }),
                    api.get('/plugins', { params: { sort: 'newest' } }),
                    api.get('/plugins')
                ]);
                saveSection('popular', Array.isArray(popRes.data) ? popRes.data : []);
                saveSection('newest', Array.isArray(newRes.data) ? newRes.data : []);
                saveSection('all', Array.isArray(allRes.data) ? allRes.data : []);
            } catch (err) {
                console.error('Fetch error for home sections:', err);
            } finally {
                setLoading(false);
            }
        };

        loadSections();
    }, []);

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

    const getDesc = (translatedStr?: string) => {
        if (!translatedStr) return 'Discover this high performance Minecraft plugin.';
        try {
            const data = JSON.parse(translatedStr);
            const currentLang = i18n.language.split('-')[0];
            return data[currentLang] || data.en || Object.values(data)[0] || 'Discover this high performance Minecraft plugin.';
        } catch {
            return 'Discover this high performance Minecraft plugin.';
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
                        <Link to={`/plugin/${activeFeatured.id}`} className="featured-showcase-link">
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
                    <h2 className="section-title"><span>Most</span> Popular</h2>
                    <div className="home-plugin-grid">
                        {popular.length > 0 ? (
                            popular.map((plugin) => (
                                <PluginCard key={`pop-${plugin.id}`} plugin={plugin} />
                            ))
                        ) : (
                            <div className="section-placeholder">{loading ? 'Loading popular plugins...' : 'Scroll to load popular plugins'}</div>
                        )}
                    </div>
                </section>

                <section className="home-section" ref={newestRef}>
                    <h2 className="section-title"><span>New</span> & Trending</h2>
                    <div className="home-plugin-grid">
                        {newest.length > 0 ? (
                            newest.map((plugin) => (
                                <PluginCard key={`new-${plugin.id}`} plugin={plugin} />
                            ))
                        ) : (
                            <div className="section-placeholder">{loading ? 'Loading new plugins...' : 'Scroll to load new plugins'}</div>
                        )}
                    </div>
                </section>

                <section className="home-section">
                    <h2 className="section-title"><span>All</span> Plugins ({allPlugins.length})</h2>
                    <div className="home-plugin-grid">
                        {allPlugins.length > 0 ? (
                            allPlugins.map((plugin) => (
                                <PluginCard key={`all-${plugin.id}`} plugin={plugin} />
                            ))
                        ) : (
                            <div className="section-placeholder">{loading ? 'Loading all plugins...' : 'No plugins available'}</div>
                        )}
                    </div>
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