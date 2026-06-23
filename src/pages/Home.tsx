import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import SEO from '../components/SEO';
import PluginCard from '../components/PluginCard';

// Global cache to persist data across component unmounts (navigation)
// This allows the page to render immediately when going "back", 
// which is required for the browser to restore scroll position.
let homeCache: {
    topPaid: any[];
    popular: any[];
    newest: any[];
} | null = null;

const Home = () => {
    const { t } = useTranslation();
    const [topPaid, setTopPaid] = useState<any[]>(homeCache?.topPaid || []);
    const [popular, setPopular] = useState<any[]>(homeCache?.popular || []);
    const [newest, setNewest] = useState<any[]>(homeCache?.newest || []);
    // Load sections lazily when the user scrolls them into view
    const [loading, setLoading] = useState(false);

    const topPaidRef = useRef<HTMLElement | null>(null);
    const popularRef = useRef<HTMLElement | null>(null);
    const newestRef = useRef<HTMLElement | null>(null);

    const fetched = useRef({ topPaid: !!homeCache?.topPaid, popular: !!homeCache?.popular, newest: !!homeCache?.newest });

    const saveSection = (key: 'topPaid' | 'popular' | 'newest', data: any[]) => {
        if (key === 'topPaid') setTopPaid(data);
        if (key === 'popular') setPopular(data);
        if (key === 'newest') setNewest(data);

        homeCache = {
            topPaid: key === 'topPaid' ? data : homeCache?.topPaid || [],
            popular: key === 'popular' ? data : homeCache?.popular || [],
            newest: key === 'newest' ? data : homeCache?.newest || []
        };

        fetched.current[key] = true;
    };

    useEffect(() => {
        if (fetched.current.topPaid && fetched.current.popular && fetched.current.newest) return;

        const observers: IntersectionObserver[] = [];

        const createObserver = (el: HTMLElement | null, key: 'topPaid' | 'popular' | 'newest', params: any) => {
            if (!el || fetched.current[key]) return;
            const obs = new IntersectionObserver(async (entries, observer) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        fetched.current[key] = true; // prevent duplicate triggers
                        try {
                            setLoading(true);
                            const res = await api.get('/plugins', { params });
                            const list = Array.isArray(res.data) ? res.data : [];
                            saveSection(key, list);
                        } catch (err) {
                            console.error('Fetch error for', key, err);
                        } finally {
                            setLoading(false);
                            observer.disconnect();
                        }
                    }
                }
            }, { rootMargin: '200px' });

            obs.observe(el);
            observers.push(obs);
        };

        // Ensure refs are attached before creating observers
        requestAnimationFrame(() => {
            createObserver(topPaidRef.current, 'topPaid', { type: 'paid', sort: 'downloads', limit: 4 });
            createObserver(popularRef.current, 'popular', { sort: 'downloads', limit: 8 });
            createObserver(newestRef.current, 'newest', { sort: 'newest', limit: 12 });
        });

        return () => observers.forEach(o => o.disconnect());
    }, []);

    if (loading) {
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

            <section className="hero">
                <h1>{t('welcome')}</h1>
                <p>Explore powerful plugins for your PumpkinMC experience.</p>
            </section>

            <div className="container" id="browse">
                <section className="home-section" ref={topPaidRef}> 
                    <h2 className="section-title"><span>Top</span> Premium</h2>
                    <div className="home-plugin-grid">
                        {topPaid.length > 0 ? (
                            topPaid.map((plugin) => (
                                <PluginCard key={`top-${plugin.id}`} plugin={plugin} />
                            ))
                        ) : (
                            <div className="section-placeholder">{loading ? 'Loading premium plugins...' : 'Scroll to load premium plugins'}</div>
                        )}
                    </div>
                </section>

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

                {(fetched.current?.topPaid && fetched.current?.popular && fetched.current?.newest && topPaid.length === 0 && popular.length === 0 && newest.length === 0) && (
                    <div className="empty-state">
                        <p>No plugins found. Check back later!</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default Home;