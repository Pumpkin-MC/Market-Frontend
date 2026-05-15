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
    const [loading, setLoading] = useState(!homeCache);
    const hasFetched = useRef(!!homeCache);

    useEffect(() => {
        if (hasFetched.current) return;
        
        const fetchSections = async () => {
            try {
                const [topPaidRes, popularRes, newestRes] = await Promise.all([
                    api.get('/plugins', { params: { type: 'paid', sort: 'downloads', limit: 4 } }),
                    api.get('/plugins', { params: { sort: 'downloads', limit: 8 } }),
                    api.get('/plugins', { params: { sort: 'newest', limit: 12 } })
                ]);

                const data = {
                    topPaid: Array.isArray(topPaidRes.data) ? topPaidRes.data : [],
                    popular: Array.isArray(popularRes.data) ? popularRes.data : [],
                    newest: Array.isArray(newestRes.data) ? newestRes.data : []
                };

                setTopPaid(data.topPaid);
                setPopular(data.popular);
                setNewest(data.newest);
                homeCache = data;
                hasFetched.current = true;
            } catch (err) {
                console.error('Fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSections();
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
                {topPaid.length > 0 && (
                    <section className="home-section">
                        <h2 className="section-title"><span>Top</span> Premium</h2>
                        <div className="home-plugin-grid">
                            {topPaid.map((plugin) => (
                                <PluginCard key={`top-${plugin.id}`} plugin={plugin} />
                            ))}
                        </div>
                    </section>
                )}

                <section className="home-section">
                    <h2 className="section-title"><span>Most</span> Popular</h2>
                    <div className="home-plugin-grid">
                        {popular.map((plugin) => (
                            <PluginCard key={`pop-${plugin.id}`} plugin={plugin} />
                        ))}
                    </div>
                </section>

                <section className="home-section">
                    <h2 className="section-title"><span>New</span> & Trending</h2>
                    <div className="home-plugin-grid">
                        {newest.map((plugin) => (
                            <PluginCard key={`new-${plugin.id}`} plugin={plugin} />
                        ))}
                    </div>
                </section>

                {topPaid.length === 0 && popular.length === 0 && newest.length === 0 && (
                    <div className="empty-state">
                        <p>No plugins found. Check back later!</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default Home;