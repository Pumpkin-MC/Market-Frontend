import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPluginUrl } from '../utils/url';
import { extractYoutubeVideoId } from './PluginVideoPlayer';
import {
    evaluatePluginForServer,
    formatPumpkinVersionBadge,
    getSavedServerProfileId,
} from '../utils/compatibility';
import { CheckCircle2, Layers } from 'lucide-react';

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

const PluginCard = ({
    plugin,
    selectedServer,
}: {
    plugin: any;
    hideDescription?: boolean;
    selectedServer?: string;
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const [savedServer, setSavedServer] = useState<string>(() => getSavedServerProfileId());
    const timerRef = useRef<any>(null);
    const cycleRef = useRef<any>(null);

    useEffect(() => {
        const onServerChange = (e: Event) => {
            const detail = (e as CustomEvent<string>).detail;
            setSavedServer(detail || '');
        };
        window.addEventListener('pumpkin-server-filter-change', onServerChange);
        return () => window.removeEventListener('pumpkin-server-filter-change', onServerChange);
    }, []);

    const activeServerFilter = selectedServer !== undefined ? selectedServer : savedServer;

    const compatMatch = useMemo(() => {
        if (!plugin) return null;
        return evaluatePluginForServer(plugin, activeServerFilter);
    }, [plugin, activeServerFilter]);

    const primaryBadge = useMemo(() => {
        const targetVer = compatMatch?.recommendedVersion || compatMatch?.latestVersion;
        const firstPv = targetVer?.pumpkinVersions?.[0];
        if (!firstPv) return null;
        return formatPumpkinVersionBadge(firstPv);
    }, [compatMatch]);

    const accent = useMemo(() => getAccentColor(plugin?.name || ''), [plugin?.name]);
    
    const priceInfo = useMemo(() => (plugin ? getEffectivePrice(plugin) : { display: '€0.00', isSale: false, originalDisplay: '' }), [plugin]);
    const isSale = plugin?.type === 'paid' && priceInfo.isSale;
    const initial = (plugin?.name || '?').charAt(0).toUpperCase();

    const videoId = useMemo(() => {
        return extractYoutubeVideoId(plugin?.youtube_video_url);
    }, [plugin?.youtube_video_url]);

    const slideshowImages = useMemo(() => {
        if (!plugin) return [];
        const images: string[] = [];
        if (plugin.preview_path) {
            images.push(plugin.preview_path);
        } else if (videoId) {
            images.push(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
        }
        if (plugin.screenshots && plugin.screenshots.length > 0) {
            images.push(...plugin.screenshots);
        }
        return images;
    }, [plugin?.preview_path, plugin?.screenshots, videoId]);

    const stopHover = useCallback(() => {
        setIsHovering(false);
        setCurrentIndex(0);
        if (timerRef.current) clearTimeout(timerRef.current);
        if (cycleRef.current) clearInterval(cycleRef.current);
    }, []);

    // Stop video playback and slideshow cycling immediately when scrolling down
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
        if (slideshowImages.length <= 1) return;

        const next = () => setCurrentIndex(prev => (prev + 1) % slideshowImages.length);
        next();
        cycleRef.current = setInterval(next, 2000);
    };

    const targetUrl = compatMatch?.requiresOlderVersion
        ? `${getPluginUrl(plugin)}?tab=versions`
        : getPluginUrl(plugin);

    return (
        <Link to={targetUrl} className="plugin-card-link" onMouseEnter={startHover} onMouseLeave={stopHover}>
            <div className="plugin-card-v2">
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
                    ) : slideshowImages.length > 0 ? (
                        <div className="pcv2-slideshow">
                            {slideshowImages.map((src: string, i: number) => (
                                <img 
                                    key={src} 
                                    src={src} 
                                    className={`pcv2-slideshow-img ${i === currentIndex ? 'active' : ''}`} 
                                    alt={plugin.name}
                                    loading="lazy"
                                />
                            ))}
                            
                            {isHovering && slideshowImages.length > 1 && !videoId && (
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

                    {plugin.type === 'free' ? (
                        <span className="pcv2-price-badge free">Free</span>
                    ) : plugin.is_preorder ? (
                        <span className="pcv2-price-badge paid" style={{ background: '#f97316', color: '#fff' }}>
                            Pre-Order • {priceInfo.display}
                        </span>
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
                        {plugin.is_preorder && (
                            <span style={{ marginLeft: 6, fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(249,115,22,0.15)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)', verticalAlign: 'middle' }}>
                                Pre-Order
                            </span>
                        )}
                        {plugin.is_early_access && <span className="pcv2-badge-ea">Early Access</span>}
                    </p>
                    <p className="pcv2-dev">by {plugin.dev_name}</p>

                    {primaryBadge && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '0.35rem', marginBottom: '0.2rem' }}>
                            {activeServerFilter && activeServerFilter !== 'all' && compatMatch?.compatible ? (
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        fontSize: '0.66rem',
                                        fontWeight: 700,
                                        padding: '2px 7px',
                                        borderRadius: 999,
                                        background: 'rgba(34, 197, 94, 0.14)',
                                        color: '#4ade80',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                    }}
                                    title={`Compatible with ${primaryBadge.rawTag}`}
                                >
                                    <CheckCircle2 size={10} />
                                    {compatMatch.requiresOlderVersion && compatMatch.recommendedVersion
                                        ? `Use ${compatMatch.recommendedVersion.displayVersion} for ${primaryBadge.mcVersion || primaryBadge.title}`
                                        : `${primaryBadge.title}${primaryBadge.mcVersion ? ` · ${primaryBadge.mcVersion}` : ''}`}
                                </span>
                            ) : (
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        fontSize: '0.66rem',
                                        fontWeight: 600,
                                        padding: '2px 7px',
                                        borderRadius: 999,
                                        background: 'rgba(255, 107, 0, 0.1)',
                                        color: 'var(--primary, #ff6b00)',
                                        border: '1px solid rgba(255, 107, 0, 0.25)',
                                    }}
                                    title={`Target release: ${primaryBadge.rawTag}`}
                                >
                                    <Layers size={10} />
                                    {primaryBadge.title}{primaryBadge.mcVersion ? ` · ${primaryBadge.mcVersion}` : ''}
                                </span>
                            )}
                        </div>
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
                        {(compatMatch?.recommendedVersion?.displayVersion || plugin.version) && (
                            <span className="pcv2-stat" style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.65rem' }}>
                                {compatMatch?.recommendedVersion?.displayVersion || `v${plugin.version.replace(/^v/i, '')}`}
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