import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api';
import SEO from '../components/SEO';
import PluginCard from '../components/PluginCard';

const Home = () => {
    const { t } = useTranslation();
    const [plugins, setPlugins] = useState<any[]>([]);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (hasFetched.current) return;
        api.get('/plugins', { params: { q: '', sort: 'newest' } })
            .then(res => {
                setPlugins(Array.isArray(res.data) ? res.data : []);
                hasFetched.current = true;
            })
            .catch(err => {
                console.error('Fetch error:', err);
                setPlugins([]);
            });
    }, []);

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
                <div className="home-plugin-grid">
                    {plugins.map((plugin) => (
                        <PluginCard key={plugin.id} plugin={plugin} />
                    ))}

                    {plugins.length === 0 && (
                        <div className="empty-state">
                            <p>No plugins found. Check back later!</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Home;