import React, { useEffect, useRef, useState, useCallback, useId } from 'react';
import { Volume2, VolumeX, Play, Pause, Maximize, Minimize } from 'lucide-react';
import '../../styles/plugin.css';
import { extractYoutubeVideoId } from '../../lib/youtube';

interface PluginVideoPlayerProps {
  url?: string;
  videoId?: string;
  className?: string;
  loop?: boolean;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const PluginVideoPlayer: React.FC<PluginVideoPlayerProps> = ({ url, videoId: propVideoId, className, loop = false }) => {
  const autoId = useId().replace(/[:]/g, '_');
  const domId = `plugin-yt-${autoId}`;

  const resolvedVideoId = propVideoId || extractYoutubeVideoId(url);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isApiReady, setIsApiReady] = useState(Boolean(window.YT && window.YT.Player));

  // ── 1. Load YouTube IFrame API Script ──────────────────────────────────────
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevReady) prevReady();
      setIsApiReady(true);
    };

    if (!document.getElementById('youtube-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  }, []);

  // ── 2. Initialize Player on Ready ──────────────────────────────────────────
  useEffect(() => {
    if (!isApiReady || !resolvedVideoId) return;

    let progressTimer: ReturnType<typeof setInterval>;

    try {
      const playerVars: any = {
        autoplay: 1,
        mute: 1,
        controls: 0,
        loop: loop ? 1 : 0,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        disablekb: 1,
        origin: window.location.origin,
      };
      if (loop) {
        playerVars.playlist = resolvedVideoId;
      }

      playerRef.current = new window.YT.Player(domId, {
        videoId: resolvedVideoId,
        playerVars,
        events: {
          onReady: (e: any) => {
            try {
              e.target.mute();
              e.target.playVideo();
              setIsPlaying(true);
              setIsMuted(true);
              const dur = e.target.getDuration();
              if (dur) setDuration(dur);
            } catch (err) {
              console.error('Failed to start video playback:', err);
            }
          },
          onStateChange: (e: any) => {
            // 1 = Playing, 2 = Paused, 0 = Ended
            if (e.data === 1) {
              setIsPlaying(true);
              if (playerRef.current && typeof playerRef.current.getDuration === 'function') {
                const dur = playerRef.current.getDuration();
                if (dur) setDuration(dur);
              }
            } else if (e.data === 2) {
              setIsPlaying(false);
              setShowControls(true);
            } else if (e.data === 0) {
              if (loop) {
                // Loop smoothly
                if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
                  playerRef.current.seekTo(0, true);
                  playerRef.current.playVideo();
                }
              } else {
                setIsPlaying(false);
                setShowControls(true);
              }
            }
          },
        },
      });
    } catch (err) {
      console.error('Error creating YT.Player:', err);
    }

    progressTimer = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const time = playerRef.current.getCurrentTime();
        if (typeof time === 'number' && !isNaN(time)) {
          setCurrentTime(time);
        }
        const dur = playerRef.current.getDuration?.();
        if (typeof dur === 'number' && dur > 0 && dur !== duration) {
          setDuration(dur);
        }
      }
    }, 250);

    return () => {
      clearInterval(progressTimer);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [isApiReady, resolvedVideoId, domId]);

  // ── 3. Handle Fullscreen Change ────────────────────────────────────────────
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // ── 3.1 Pause Video When Scrolled Out of View ──────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting && playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
          try {
            playerRef.current.pauseVideo();
            setIsPlaying(false);
          } catch {
            // ignore
          }
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // ── 4. Auto-Hide HUD On Inactivity ────────────────────────────────────────
  const triggerUserActivity = useCallback(() => {
    setShowControls(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2400);
    }
  }, [isPlaying]);

  // ── Controls Actions ───────────────────────────────────────────────────────
  const togglePlay = () => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
        setShowControls(true);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
        triggerUserActivity();
      }
    } catch (err) {
      console.error('Failed to toggle play/pause:', err);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerRef.current) return;
    try {
      if (isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } catch (err) {
      console.error('Failed to toggle mute:', err);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!playerRef.current || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const seekTime = clickPos * duration;
    try {
      playerRef.current.seekTo(seekTime, true);
      setCurrentTime(seekTime);
    } catch (err) {
      console.error('Failed to seek video:', err);
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'm') {
      e.preventDefault();
      toggleMute(e as any);
    } else if (e.key === 'f') {
      e.preventDefault();
      toggleFullscreen(e as any);
    }
  };

  if (!resolvedVideoId) {
    return null;
  }

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`pd-video${className ? ` ${className}` : ''}`}
      onMouseMove={triggerUserActivity}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={togglePlay}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Video Player"
    >
      <div className="pd-video-frame">
        <div id={domId} />
      </div>

      <div className="pd-video-layer" />

      <div className={`pd-video-center${!isPlaying || showControls ? ' pd-on' : ''}`}>
        {isPlaying ? <Pause /> : <Play />}
      </div>

      <div
        className={`pd-video-hud${showControls || !isPlaying ? ' pd-on' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pd-video-track" onClick={handleSeek} title="Seek">
          <div className="pd-video-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="pd-video-bar">
          <span className="pd-video-time">
            {formatTime(currentTime)} <span className="muted">/</span> {formatTime(duration)}
          </span>
          <span className="spacer" />
          <button
            type="button"
            className="pd-video-btn"
            aria-pressed={!isMuted}
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX /> : <Volume2 />}
          </button>
          <button
            type="button"
            className="pd-video-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize /> : <Maximize />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PluginVideoPlayer;
