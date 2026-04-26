import { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const getAccentColor = (name: string) => {
    const colors = [
        '#4f7eff', '#ff6b6b', '#ffd166', '#06d6a0',
        '#a855f7', '#f97316', '#06b6d4', '#ec4899',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

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

const PluginCard = ({ plugin }: { plugin: any }) => {
    const { i18n } = useTranslation();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const timerRef = useRef<any>(null);
    const cycleRef = useRef<any>(null);

    const accent = useMemo(() => getAccentColor(plugin.name), [plugin.name]);
    
    const getDescription = (translatedStr: string) => {
        try {
            const data = JSON.parse(translatedStr);
            const currentLang = i18n.language.split('-')[0];
            return data[currentLang] || data.en || Object.values(data)[0] || 'No description available.';
        } catch {
            return 'No description available.';
        }
    };

    const priceInfo = useMemo(() => getEffectivePrice(plugin), [plugin]);
    const isSale = plugin.type === 'paid' && priceInfo.isSale;
    const desc = getDescription(plugin.translated_descriptions);
    const initial = plugin.name.charAt(0).toUpperCase();

    const slideshowImages = useMemo(() => {
        const images = [];
        if (plugin.preview_path) images.push(plugin.preview_path);
        if (plugin.screenshots && plugin.screenshots.length > 0) {
            images.push(...plugin.screenshots);
        }
        return images;
    }, [plugin.preview_path, plugin.screenshots]);

    const startHover = () => {
        setIsHovering(true);
        if (slideshowImages.length <= 1) return;

        timerRef.current = setTimeout(() => {
            cycleRef.current = setInterval(() => {
                setCurrentIndex(prev => (prev + 1) % slideshowImages.length);
            }, 2000);
        }, 200);
    };

    const stopHover = () => {
        setIsHovering(false);
        setCurrentIndex(0);
        if (timerRef.current) clearTimeout(timerRef.current);
        if (cycleRef.current) clearInterval(cycleRef.current);
    };

    return (
        <Link to={`/plugin/${plugin.id}`} className="plugin-card-link" onMouseEnter={startHover} onMouseLeave={stopHover}>
            <div className="plugin-card-v2">
                <div className="pcv2-preview">
                    {slideshowImages.length > 0 ? (
                        <div className="pcv2-slideshow">
                            {slideshowImages.map((src: string, i: number) => (
                                <img 
                                    key={src} 
                                    src={src} 
                                    className={`pcv2-slideshow-img ${i === currentIndex ? 'active' : ''}`} 
                                    alt={plugin.name}
                                />
                            ))}
                            
                            {isHovering && slideshowImages.length > 1 && (
                                <div className="pcv2-slideshow-progress">
                                    {slideshowImages.map((_: any, i: number) => (
                                        <div key={i} className={`pcv2-progress-dot ${i === currentIndex ? 'active' : ''}`} />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="pcv2-preview-fallback" style={{ background: `linear-gradient(135deg, ${accent}22 0%, #0d0f12 100%)` }}>
                            <span style={{ color: accent }}>{initial}</span>
                        </div>
                    )}

                    <div className="pcv2-preview-fade" />
                    <span className="pcv2-category-badge">{plugin.category}</span>

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

                <div className="pcv2-info">
                    <p className="pcv2-name">
                        {plugin.name}
                        {plugin.is_early_access && <span className="pcv2-badge-ea">Early Access</span>}
                    </p>
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
};

export default PluginCard;