import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPluginUrl } from '../utils/url';
import { extractYoutubeVideoId } from './PluginVideoPlayer';

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

const PluginCard = ({ plugin, hideDescription, viewMode = 'grid' }: { plugin: any; hideDescription?: boolean; viewMode?: 'grid' | 'list' }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const timerRef = useRef<any>(null);
    const cycleRef = useRef<any>(null);

    const accent = useMemo(() => getAccentColor(plugin?.name || ''), [plugin?.name]);
    
    const priceInfo = useMemo(() => (plugin ? getEffectivePrice(plugin) : { display: '€0.00', isSale: false, originalDisplay: '' }), [plugin]);
    const isSale = plugin?.type === 'paid' && priceInfo.isSale;
    const initial = (plugin?.name || '?').charAt(0).toUpperCase();

    const videoId = useMemo(() => {
        return extractYoutubeVideoId(plugin?.youtube_video_url);
    }, [plugin?.youtube_video_url]);

    const screenshots = useMemo(() => {
        if (!plugin) return [];
        const imgs: string[] = [];
        if (plugin.screenshots && plugin.screenshots.length > 0) {
            imgs.push(...plugin.screenshots);
        } else if (videoId) {
            imgs.push(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
        }
        return imgs;
    }, [plugin, videoId]);

    const stopHover = useCallback(() => {
        setIsHovering(false);
        setCurrentIndex(0);
        if (timerRef.current) clearTimeout(timerRef.current);
        if (cycleRef.current) clearInterval(cycleRef.current);
    }, []);

    useEffect(() => {
        if (!isHovering) return;
        const handleScroll = () => {
            stopHover();
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isHovering, stopHover]);

    if (!plugin) return null;

    const startHover = () => {
        setIsHovering(true);
        if (videoId) return;
        if (screenshots.length <= 1) return;

        const next = () => setCurrentIndex(prev => (prev + 1) % screenshots.length);
        next();
        cycleRef.current = setInterval(next, 2000);
    };

    const hasScreenshots = screenshots.length > 0;

    const renderPriceBadge = (isStatic = false) => {
        const className = `pcv2-price-badge ${isStatic ? 'static' : ''}`;
        if (plugin.type === 'free') {
            return <span className={`${className} free`}>Free</span>;
        }
        if (plugin.is_preorder) {
            return (
                <span className={`${className} paid`} style={{ background: '#f97316', color: '#fff' }}>
                    Pre-Order {priceInfo.display}
                </span>
            );
        }
        if (isSale) {
            return (
                <span className={`${className} sale`}>
                    <span className="pcv2-price-original">{priceInfo.originalDisplay}</span>
                    {priceInfo.display}
                    <span className="pcv2-sale-pct">-{plugin.sale_discount_percent}%</span>
                </span>
            );
        }
        return <span className={`${className} paid`}>{priceInfo.display}</span>;
    };

    if (viewMode === 'list') {
        return (
            <Link to={getPluginUrl(plugin)} className="plugin-list-link">
                <div className="plugin-list-row">
                    <div className="plr-icon-wrap">
                        {plugin.preview_path ? (
                            <img src={plugin.preview_path} alt="" className="plr-icon" loading="lazy" />
                        ) : (
                            <div className="plr-icon-fallback" style={{ background: `linear-gradient(135deg, ${accent}22 0%, #0d0f12 100%)` }}>
                                <span style={{ color: accent }}>{initial}</span>
                            </div>
                        )}
                    </div>

                    <div className="plr-main">
                        <div className="plr-header">
                            <span className="plr-title">{plugin.name}</span>
                            <span className="plr-dev">by {plugin.dev_name}</span>
                            {plugin.category && (
                                <span className="plr-category">{plugin.category}</span>
                            )}
                            {plugin.is_preorder && (
                                <span className="plr-badge preorder">Pre-Order</span>
                            )}
                            {plugin.is_early_access && (
                                <span className="plr-badge ea">Early Access</span>
                            )}
                        </div>
                        {!hideDescription && (
                            <p className="plr-desc">
                                {plugin.description || 
                                 (plugin.translated_descriptions && typeof plugin.translated_descriptions === 'object' 
                                    ? plugin.translated_descriptions.en || Object.values(plugin.translated_descriptions)[0] 
                                    : '') || ''}
                            </p>
                        )}
                    </div>

                    <div className="plr-meta">
                        <div className="plr-stats">
                            <span className="plr-stat">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                                </svg>
                                {(plugin.downloads ?? 0).toLocaleString()}
                            </span>
                            {plugin.version && (
                                <span className="plr-version">v{plugin.version}</span>
                            )}
                        </div>
                        <div className="plr-price-col">
                            {renderPriceBadge(true)}
                        </div>
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link to={getPluginUrl(plugin)} className="plugin-card-link" onMouseEnter={startHover} onMouseLeave={stopHover}>
            <div className={`plugin-card-v2 ${!hasScreenshots ? 'no-screenshot-banner' : ''}`}>
                {hasScreenshots ? (
                    <div className="pcv2-preview">
                        {isHovering && videoId ? (
                            <div className="pcv2-video-container">
                                <iframe
                                    className="pcv2-video-iframe"
                                    src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=0&playsinline=1&rel=0&modestbranding=1&disablekb=1&fs=0&showinfo=0&iv_load_policy=3`}
                                    title={plugin.name}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    tabIndex={-1}
                                />
                            </div>
                        ) : (
                            <div className="pcv2-slideshow">
                                {screenshots.map((src: string, i: number) => (
                                    <img 
                                        key={src} 
                                        src={src} 
                                        className={`pcv2-slideshow-img ${i === currentIndex ? 'active' : ''}`} 
                                        alt={plugin.name}
                                        loading="lazy"
                                    />
                                ))}
                                
                                {isHovering && screenshots.length > 1 && !videoId && (
                                    <div className="pcv2-slideshow-progress">
                                        {screenshots.map((_: any, i: number) => (
                                            <div key={i} className={`pcv2-progress-dot ${i === currentIndex ? 'active' : ''}`} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {plugin.category && (
                            <span className="pcv2-category-badge">{plugin.category}</span>
                        )}
                        {renderPriceBadge(false)}
                    </div>
                ) : (
                    <div className="pcv2-top-badge-row">
                        {plugin.category ? (
                            <span className="pcv2-category-badge static">{plugin.category}</span>
                        ) : <div />}
                        {renderPriceBadge(true)}
                    </div>
                )}

                <div className="pcv2-info">
                    <div className={`pcv2-header-row ${!hasScreenshots ? 'large-header' : ''}`}>
                        {plugin.preview_path ? (
                            <img
                                src={plugin.preview_path}
                                alt=""
                                className={hasScreenshots ? "pcv2-mini-icon" : "pcv2-large-icon"}
                                loading="lazy"
                            />
                        ) : !hasScreenshots ? (
                            <div className="pcv2-icon-fallback" style={{ background: `linear-gradient(135deg, ${accent}22 0%, #0d0f12 100%)` }}>
                                <span style={{ color: accent }}>{initial}</span>
                            </div>
                        ) : null}
                        <div className="pcv2-title-col">
                            <p className="pcv2-name">
                                {plugin.name}
                                {plugin.is_preorder && (
                                    <span style={{ marginLeft: 6, fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: 0, background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)', verticalAlign: 'middle' }}>
                                        Pre-Order
                                    </span>
                                )}
                                {plugin.is_early_access && <span className="pcv2-badge-ea">Early Access</span>}
                            </p>
                            <p className="pcv2-dev">by {plugin.dev_name}</p>
                        </div>
                    </div>

                    {!hideDescription && (
                        <p className="pcv2-desc">
                            {plugin.description || 
                             (plugin.translated_descriptions && typeof plugin.translated_descriptions === 'object' 
                                ? plugin.translated_descriptions.en || Object.values(plugin.translated_descriptions)[0] 
                                : '') || ''}
                        </p>
                    )}

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
                        Sale — {plugin.sale_discount_percent}% off
                    </div>
                )}
            </div>
        </Link>
    );
};

export default PluginCard;