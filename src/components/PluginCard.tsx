import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Download, Star } from 'lucide-react';
import { getPluginUrl } from '../lib/url';
import { extractYoutubeVideoId } from '../lib/youtube';
import '../styles/store.css';

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

const PluginCard = ({ plugin }: { plugin: any; hideDescription?: boolean }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const timerRef = useRef<any>(null);
    const cycleRef = useRef<any>(null);

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

    return (
        <Link to={getPluginUrl(plugin)} className="entry sf-entry" onMouseEnter={startHover} onMouseLeave={stopHover}>
            <div className="entry-cover">
                {isHovering && videoId ? (
                    <iframe
                        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=0&playsinline=1&rel=0&modestbranding=1&disablekb=1&fs=0&showinfo=0&iv_load_policy=3`}
                        title={plugin.name}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        tabIndex={-1}
                    />
                ) : slideshowImages.length > 0 ? (
                    <>
                        {slideshowImages.map((src: string, i: number) => (
                            <img
                                key={src}
                                src={src}
                                className="sf-slide"
                                data-active={i === currentIndex || undefined}
                                alt={plugin.name}
                                loading="lazy"
                            />
                        ))}
                        {isHovering && slideshowImages.length > 1 && (
                            <div className="sf-pips">
                                {slideshowImages.map((_: any, i: number) => (
                                    <span key={i} data-active={i === currentIndex || undefined} />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="placeholder">
                        <span className="avatar">{initial}</span>
                    </div>
                )}

                <div className="entry-flags">
                    {isSale && <span className="sticker sticker-sm">-{plugin.sale_discount_percent}%</span>}
                    {plugin.is_preorder && <span className="sticker sticker-sm sticker-fg">Pre-Order</span>}
                    {plugin.is_early_access && <span className="sticker sticker-sm sticker-warning">Early Access</span>}
                </div>
            </div>

            <div className="entry-body">
                <div className="entry-meta">
                    <span className="label">{plugin.category}</span>
                    {plugin.version && <span className="label mono">v{plugin.version}</span>}
                </div>
                <h3 className="entry-name">{plugin.name}</h3>
                <p className="entry-by">by <strong>{plugin.dev_name}</strong></p>

                <div className="entry-foot">
                    <span className="entry-stat"><Download />{(plugin.downloads ?? 0).toLocaleString()}</span>
                    {plugin.rating != null && (
                        <span className="entry-stat"><Star />{Number(plugin.rating).toFixed(1)}</span>
                    )}
                    {plugin.type === 'free' ? (
                        <span className="cost cost-free">Free</span>
                    ) : isSale ? (
                        <span className="cost cost-sale"><s>{priceInfo.originalDisplay}</s>{priceInfo.display}</span>
                    ) : (
                        <span className="cost">{priceInfo.display}</span>
                    )}
                </div>
            </div>
        </Link>
    );
};

export default PluginCard;
