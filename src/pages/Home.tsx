import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../api';
import SEO from '../components/SEO';

const Home = () => {
    const { t, i18n } = useTranslation();
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

    const getDescription = (translatedStr: string) => {
        try {
            const data = JSON.parse(translatedStr);
            const currentLang = i18n.language.split('-')[0];
            return data[currentLang] || data.en || Object.values(data)[0] || 'No description available.';
        } catch {
            return 'No description available.';
        }
    };

    const getAccentColor = (name: string) => {
        const colors = [
            '#4f7eff', '#ff6b6b', '#ffd166', '#06d6a0',
            '#a855f7', '#f97316', '#06b6d4', '#ec4899',
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    // Compute effective display price respecting active sale
    const getEffectivePrice = (plugin: any): { display: string; isSale: boolean; originalDisplay: string } => {
        const base = plugin.price_cents ?? 0;
        const saleActive = plugin.sale_active && plugin.sale_discount_percent > 0;
        if (saleActive) {
            const saleCents = Math.round(base * (1 - plugin.sale_discount_percent / 100));
            return {
                display: `€${(saleCents / 100).toFixed(2)}`,
                isSale: true,
                originalDisplay: `€${(base / 100).toFixed(2)}`,
            };
        }
        return {
            display: `€${(base / 100).toFixed(2)}`,
            isSale: false,
            originalDisplay: '',
        };
    };

    return (
        <>
            <SEO 
                title="Home" 
                description="Discover the best WASM-powered Minecraft plugins at Pumpkin Market. Performance, security, and variety in one place." 
            />
            <style>{`
                .home-plugin-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.25rem;
                    padding: 2rem 0 4rem;
                }
                .plugin-card-link { text-decoration: none; display: block; }
                .plugin-card-v2 {
                    position: relative;
                    border-radius: 10px;
                    overflow: hidden;
                    background: var(--mp-surface, #16191f);
                    border: 1px solid var(--mp-border, rgba(255,255,255,0.07));
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
                    will-change: transform;
                }
                .plugin-card-v2:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 16px 40px rgba(0,0,0,0.45);
                    border-color: rgba(255,255,255,0.14);
                }
                .pcv2-preview {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 16 / 9;
                    overflow: hidden;
                    background: var(--mp-bg, #0d0f12);
                }
                .pcv2-preview-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                    transition: transform 0.35s ease;
                }
                .plugin-card-v2:hover .pcv2-preview-img { transform: scale(1.04); }
                .pcv2-preview-fallback {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.8rem;
                    font-weight: 800;
                    letter-spacing: -0.04em;
                    color: rgba(255,255,255,0.9);
                    font-family: var(--font-display, system-ui);
                    user-select: none;
                }
                .pcv2-preview-fade {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to bottom, transparent 30%, rgba(13,15,18,0.55) 65%, rgba(13,15,18,0.96) 100%);
                    pointer-events: none;
                }
                .pcv2-category-badge {
                    position: absolute;
                    top: 10px; left: 10px;
                    font-size: 0.62rem;
                    font-weight: 700;
                    letter-spacing: 0.07em;
                    text-transform: uppercase;
                    background: rgba(13,15,18,0.72);
                    backdrop-filter: blur(6px);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: rgba(255,255,255,0.75);
                    padding: 0.2rem 0.5rem;
                    border-radius: 4px;
                }
                .pcv2-price-badge {
                    position: absolute;
                    top: 10px; right: 10px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    padding: 0.2rem 0.55rem;
                    border-radius: 4px;
                    backdrop-filter: blur(6px);
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                }
                .pcv2-price-badge.free {
                    background: rgba(6,214,160,0.18);
                    border: 1px solid rgba(6,214,160,0.35);
                    color: #06d6a0;
                }
                .pcv2-price-badge.paid {
                    background: rgba(255,209,102,0.16);
                    border: 1px solid rgba(255,209,102,0.35);
                    color: #ffd166;
                }
                .pcv2-price-badge.sale {
                    background: rgba(255,107,107,0.18);
                    border: 1px solid rgba(255,107,107,0.4);
                    color: #ff6b6b;
                }
                .pcv2-price-original {
                    text-decoration: line-through;
                    opacity: 0.55;
                    font-weight: 500;
                }
                .pcv2-sale-pct {
                    font-size: 0.58rem;
                    font-weight: 800;
                    background: rgba(255,107,107,0.25);
                    border-radius: 3px;
                    padding: 1px 4px;
                    letter-spacing: 0.04em;
                }
                .pcv2-info { padding: 0.85rem 1rem 1rem; }
                .pcv2-name {
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: var(--mp-text-1, #f0f0f0);
                    margin: 0 0 0.15rem;
                    font-family: var(--font-display, system-ui);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .pcv2-dev { font-size: 0.72rem; color: var(--mp-text-3, #5a6070); margin: 0 0 0.55rem; }
                .pcv2-desc {
                    font-size: 0.77rem;
                    color: var(--mp-text-2, #8b909a);
                    line-height: 1.55;
                    margin: 0 0 0.75rem;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .pcv2-footer {
                    display: flex;
                    align-items: center;
                    gap: 0.9rem;
                    padding-top: 0.65rem;
                    border-top: 1px solid var(--mp-border, rgba(255,255,255,0.06));
                }
                .pcv2-stat {
                    display: flex; align-items: center; gap: 0.3rem;
                    font-size: 0.7rem; color: var(--mp-text-3, #5a6070);
                }
                .pcv2-stat svg { opacity: 0.6; }
                .pcv2-accent-bar {
                    position: absolute; bottom: 0; left: 0; right: 0;
                    height: 2px; opacity: 0;
                    transition: opacity 0.2s ease;
                }
                .plugin-card-v2:hover .pcv2-accent-bar { opacity: 1; }

                /* Sale banner strip at bottom of card */
                .pcv2-sale-strip {
                    background: linear-gradient(90deg, rgba(255,107,107,0.15), rgba(255,107,107,0.05));
                    border-top: 1px solid rgba(255,107,107,0.2);
                    padding: 0.3rem 1rem;
                    font-size: 0.65rem;
                    font-weight: 700;
                    color: #ff6b6b;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                }
            `}</style>

            <section className="hero">
                <h1>{t('welcome')}</h1>
                <p>Explore powerful plugins for your PumpkinMC experience.</p>
            </section>

            <div className="container" id="browse">
                <div className="home-plugin-grid">
                    {plugins.map((plugin) => {
                        const accent = getAccentColor(plugin.name);
                        const desc = getDescription(plugin.translated_descriptions);
                        const initial = plugin.name.charAt(0).toUpperCase();
                        const priceInfo = getEffectivePrice(plugin);
                        const isSale = plugin.type === 'paid' && priceInfo.isSale;

                        const imageUrl = plugin.preview_path;
                            console.log(imageUrl);

                        return (
                            <Link to={`/plugin/${plugin.id}`} key={plugin.id} className="plugin-card-link">
                                <div className="plugin-card-v2">

                                    {/* Preview image */}
                                    <div className="pcv2-preview">
                                        {imageUrl ? (
                                            <img
                                                className="pcv2-preview-img"
                                                src={imageUrl}
                                                alt={plugin.name}
                                                onError={(e) => {
                                                    // Fallback if image 404s
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div
                                                className="pcv2-preview-fallback"
                                                style={{ background: `linear-gradient(135deg, ${accent}22 0%, #0d0f12 100%)` }}
                                            >
                                                <span style={{ color: accent }}>{initial}</span>
                                            </div>
                                        )}
                                        <div className="pcv2-preview-fade" />
                                        <span className="pcv2-category-badge">{plugin.category}</span>

                                        {/* Price badge */}
                                        {plugin.type === 'free' ? (
                                            <span className="pcv2-price-badge free">Free</span>
                                        ) : isSale ? (
                                            <span className="pcv2-price-badge sale">
                                                <span className="pcv2-price-original">{priceInfo.originalDisplay}</span>
                                                {priceInfo.display}
                                                <span className="pcv2-sale-pct">-{plugin.sale_discount_percent}%</span>
                                            </span>
                                        ) : (
                                            <span className="pcv2-price-badge paid">{priceInfo.display}</span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="pcv2-info">
                                        <p className="pcv2-name">{plugin.name}</p>
                                        <p className="pcv2-dev">by {plugin.dev_name}</p>
                                        <p className="pcv2-desc">{desc}</p>

                                        <div className="pcv2-footer">
                                            <span className="pcv2-stat">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                                </svg>
                                                {(plugin.downloads ?? 0).toLocaleString()}
                                            </span>
                                            {plugin.rating != null && (
                                                <span className="pcv2-stat">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" opacity="0.7"/>
                                                    </svg>
                                                    {Number(plugin.rating).toFixed(1)}
                                                </span>
                                            )}
                                            {plugin.version && (
                                                <span className="pcv2-stat" style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.65rem' }}>
                                                    v{plugin.version}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sale strip at bottom */}
                                    {isSale && (
                                        <div className="pcv2-sale-strip">
                                            🔥 Sale — {plugin.sale_discount_percent}% off
                                        </div>
                                    )}

                                    <div
                                        className="pcv2-accent-bar"
                                        style={{ background: `linear-gradient(90deg, ${isSale ? '#ff6b6b' : accent}, transparent)` }}
                                    />
                                </div>
                            </Link>
                        );
                    })}

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