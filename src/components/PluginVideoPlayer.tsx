import React, { useEffect, useRef, useState, useCallback, useId } from 'react';
import { Volume2, VolumeX, Play, Pause, Maximize, Minimize } from 'lucide-react';
import './PluginVideoPlayer.css';

interface PluginVideoPlayerProps {
  url?: string;
  videoId?: string;
  className?: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const extractYoutubeVideoId = (url?: string): string | null => {
  if (!url) return null;
  try {
    if (url.includes('youtu.be/')) {
      return url.split('youtu.be/')[1].split(/[?#]/)[0];
    } else if (url.includes('youtube.com/embed/')) {
      return url.split('youtube.com/embed/')[1].split(/[?#]/)[0];
    } else if (url.includes('youtube.com/shorts/')) {
      return url.split('youtube.com/shorts/')[1].split(/[?#]/)[0];
    } else if (url.includes('v=')) {
      return url.split('v=')[1].split(/[&?#]/)[0];
    }
    return null;
  } catch {
    return null;
  }
};

const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const PluginVideoPlayer: React.FC<PluginVideoPlayerProps> = ({ url, videoId: propVideoId, className }) => {
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
      playerRef.current = new window.YT.Player(domId, {
        videoId: resolvedVideoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          loop: 1,
          playlist: resolvedVideoId,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          disablekb: 1,
          origin: window.location.origin,
        },
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
              // Loop smoothly
              if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
                playerRef.current.seekTo(0, true);
                playerRef.current.playVideo();
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
      className={`plugin-video-wrapper ${className || ''}`}
      onMouseMove={triggerUserActivity}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={togglePlay}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Video Player"
    >
      {/* Background Frame for YT */}
      <div className="plugin-video-frame-container">
        <div id={domId} />
      </div>

      {/* Transparent Click Surface */}
      <div className="plugin-video-click-layer" />

      {/* Center Action Indicator */}
      <div className={`plugin-video-center-btn ${!isPlaying || showControls ? 'visible' : ''}`}>
        {isPlaying ? (
          <Pause size={24} fill="currentColor" />
        ) : (
          <Play size={24} fill="currentColor" style={{ marginLeft: '3px' }} />
        )}
      </div>

      {/* Custom Marketplace HUD Overlay */}
      <div
        className={`plugin-video-hud ${showControls || !isPlaying ? 'visible' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Seekable Orange Timeline */}
        <div className="plugin-video-timeline" onClick={handleSeek} title="Seek">
          <div className="plugin-video-timeline-bg">
            <div className="plugin-video-timeline-fill" style={{ width: `${progressPercent}%` }}>
              <div className="plugin-video-timeline-thumb" />
            </div>
          </div>
        </div>

        {/* HUD Controls Row */}
        <div className="plugin-video-hud-bar">
          <div className="plugin-video-time">
            {formatTime(currentTime)} <span className="time-divider">/</span> {formatTime(duration)}
          </div>

          <div className="plugin-video-actions">
            <button
              type="button"
              className={`plugin-hud-btn ${isMuted ? 'muted' : ''}`}
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            <button
              type="button"
              className="plugin-hud-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PluginVideoPlayer;
