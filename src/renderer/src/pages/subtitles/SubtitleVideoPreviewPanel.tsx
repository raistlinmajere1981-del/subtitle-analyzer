import {
  Captions,
  Clapperboard,
  Gauge,
  Pause,
  Play,
  Scissors,
  SkipBack,
  SkipForward,
  TimerReset,
  Volume2,
  VolumeX
} from 'lucide-react';
import type { ReactElement } from 'react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { VideoRecord } from '../../../../shared/archive';
import { getThumbnailStyle } from '../../lib/thumbnail';
import {
  extractTimedSubtitleCues,
  type TimedSubtitleCue,
  type TranscriptExclusionRange
} from '../../lib/transcriptTransforms';

interface SubtitleVideoPreviewPanelProps {
  disabled: boolean;
  onRemoveRange: (range: TranscriptExclusionRange) => void;
  rawText: string;
  selectedVideo: VideoRecord;
}

type YouTubePlaybackQuality = 'default' | 'tiny' | 'small' | 'medium' | 'large' | 'hd720' | 'hd1080';

interface YouTubePlayerInstance {
  destroy: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaybackQuality: () => YouTubePlaybackQuality;
  getPlaybackRate: () => number;
  isMuted: () => boolean;
  mute: () => void;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setPlaybackQuality: (quality: YouTubePlaybackQuality) => void;
  setPlaybackRate: (rate: number) => void;
  unMute: () => void;
}

interface YouTubePlayerConstructor {
  new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: () => void;
        onError: () => void;
        onStateChange: (event: { data: number }) => void;
      };
    }
  ): YouTubePlayerInstance;
}

declare global {
  interface Window {
    YT?: {
      Player: YouTubePlayerConstructor;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiReadyPromise: Promise<void> | null = null;

const youtubePlayerState = {
  ended: 0,
  playing: 1,
  paused: 2,
  buffering: 3
} as const;

const playbackQualityOptions: Array<[YouTubePlaybackQuality, string]> = [
  ['tiny', '144p'],
  ['small', '240p'],
  ['medium', '360p'],
  ['large', '480p'],
  ['hd720', '720p'],
  ['hd1080', '1080p'],
  ['default', 'Otomatik']
];

const playbackRateOptions: Array<[number, string]> = [
  [0.5, '0.5x'],
  [0.75, '0.75x'],
  [1, '1x'],
  [1.25, '1.25x'],
  [1.5, '1.5x'],
  [2, '2x']
];

export const SubtitleVideoPreviewPanel = memo(function SubtitleVideoPreviewPanel({
  disabled,
  onRemoveRange,
  rawText,
  selectedVideo
}: SubtitleVideoPreviewPanelProps): ReactElement {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const autoPlayOnReadyRef = useRef(false);
  const qualityRef = useRef<YouTubePlaybackQuality>('tiny');
  const playbackRateRef = useRef(1);
  const youtubeVideoId = useMemo(() => getYoutubeVideoId(selectedVideo), [selectedVideo]);
  const fallbackDurationMs = useMemo(() => getVideoDurationMs(selectedVideo), [selectedVideo]);
  const subtitleCues = useMemo(() => extractTimedSubtitleCues(rawText), [rawText]);
  const [requestedVideoId, setRequestedVideoId] = useState<string | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playerError, setPlayerError] = useState('');
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(fallbackDurationMs);
  const [startMs, setStartMs] = useState<number | null>(null);
  const [endMs, setEndMs] = useState<number | null>(null);
  const [quality, setQuality] = useState<YouTubePlaybackQuality>('tiny');
  const [playbackRate, setPlaybackRate] = useState(1);
  const isPlayerRequested = requestedVideoId === selectedVideo.id;
  const activeCue = useMemo(() => findActiveCue(subtitleCues, currentMs), [currentMs, subtitleCues]);
  const orderedRange = startMs !== null && endMs !== null ? normalizeRange({ startMs, endMs }) : null;
  const canRemoveRange = orderedRange !== null && orderedRange.endMs - orderedRange.startMs >= 500;
  const scrubberMaxSeconds = Math.max(1, Math.ceil((durationMs || currentMs || 0) / 1000));
  const scrubberValueSeconds = Math.min(scrubberMaxSeconds, Math.max(0, currentMs / 1000));

  useEffect(() => {
    setStartMs(null);
    setEndMs(null);
    setCurrentMs(0);
    setDurationMs(fallbackDurationMs);
    qualityRef.current = 'tiny';
    playbackRateRef.current = 1;
    autoPlayOnReadyRef.current = false;
    setQuality('tiny');
    setPlaybackRate(1);
    setPlayerError('');
    setIsPlayerReady(false);
    setIsPlaying(false);
    setIsMuted(false);
    setRequestedVideoId(null);
  }, [fallbackDurationMs, selectedVideo.id]);

  useEffect(() => {
    if (!youtubeVideoId || !isPlayerRequested || !mountRef.current) {
      return;
    }

    let cancelled = false;
    setIsPlayerReady(false);
    setPlayerError('');

    void loadYouTubeIframeApi()
      .then(() => {
        if (cancelled || !mountRef.current || !window.YT) {
          return;
        }

        playerRef.current?.destroy();
        mountRef.current.innerHTML = '';
        playerRef.current = new window.YT.Player(mountRef.current, {
          videoId: youtubeVideoId,
          playerVars: {
            cc_load_policy: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            origin: window.location.origin,
            playsinline: 1,
            rel: 0
          },
          events: {
            onReady: () => {
              if (cancelled) {
                return;
              }

              const player = playerRef.current;
              player?.setPlaybackQuality(qualityRef.current);
              player?.setPlaybackRate(playbackRateRef.current);
              syncPlayerSnapshot(player, fallbackDurationMs, setCurrentMs, setDurationMs, setIsMuted);
              setIsPlayerReady(true);

              if (autoPlayOnReadyRef.current) {
                player?.playVideo();
                autoPlayOnReadyRef.current = false;
              }
            },
            onError: () => {
              if (!cancelled) {
                setPlayerError('YouTube onizleme yuklenemedi. Video embed izni vermiyor olabilir.');
              }
            },
            onStateChange: (event) => {
              if (cancelled) {
                return;
              }

              setIsPlaying(event.data === youtubePlayerState.playing || event.data === youtubePlayerState.buffering);
              syncPlayerSnapshot(playerRef.current, fallbackDurationMs, setCurrentMs, setDurationMs, setIsMuted);

              if (event.data === youtubePlayerState.ended) {
                setIsPlaying(false);
              }
            }
          }
        });
      })
      .catch(() => {
        if (!cancelled) {
          setPlayerError('YouTube player API yuklenemedi. Internet baglantisini kontrol et.');
        }
      });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      setIsPlayerReady(false);
      setIsPlaying(false);
    };
  }, [fallbackDurationMs, isPlayerRequested, youtubeVideoId]);

  useEffect(() => {
    if (!isPlayerReady) {
      return;
    }

    const timer = window.setInterval(
      () => syncPlayerSnapshot(playerRef.current, fallbackDurationMs, setCurrentMs, setDurationMs, setIsMuted),
      isPlaying ? 500 : 1000
    );

    return () => window.clearInterval(timer);
  }, [fallbackDurationMs, isPlayerReady, isPlaying]);

  function requestPlayer(shouldAutoPlay: boolean): void {
    if (disabled || !youtubeVideoId) {
      return;
    }

    setPlayerError('');
    autoPlayOnReadyRef.current = shouldAutoPlay;

    if (!isPlayerRequested) {
      setRequestedVideoId(selectedVideo.id);
      return;
    }

    if (shouldAutoPlay && isPlayerReady) {
      playerRef.current?.playVideo();
    }
  }

  function handleTogglePlayback(): void {
    if (!isPlayerRequested || !isPlayerReady) {
      requestPlayer(true);
      return;
    }

    if (isPlaying) {
      playerRef.current?.pauseVideo();
      setIsPlaying(false);
      return;
    }

    playerRef.current?.playVideo();
    setIsPlaying(true);
  }

  function seekBy(deltaSeconds: number): void {
    if (!isPlayerReady) {
      return;
    }

    seekToMs(Math.max(0, currentMs + deltaSeconds * 1000));
  }

  function seekToMs(nextMs: number): void {
    const clampedMs = clampMs(nextMs, durationMs);
    playerRef.current?.seekTo(clampedMs / 1000, true);
    setCurrentMs(clampedMs);
  }

  if (!youtubeVideoId) {
    return (
      <div className="subtitle-preview-panel empty">
        <div className="subtitle-preview-heading">
          <Clapperboard size={16} />
          <span>Video onizleme</span>
        </div>
        <p className="workshop-message">
          Bu kayit icin YouTube video kimligi bulunamadi. Manuel arsivlerde zaman araligi onizlemesi kullanilamaz.
        </p>
      </div>
    );
  }

  return (
    <div className="subtitle-preview-panel">
      <div className="subtitle-preview-grid">
        <div className="youtube-preview-frame">
          {isPlayerRequested ? (
            <div className="youtube-player-crop">
              <div ref={mountRef} />
            </div>
          ) : (
            <div className="youtube-preview-poster" style={getThumbnailStyle(selectedVideo, 0)}>
              <span>Player kapali</span>
            </div>
          )}
          {isPlayerRequested && activeCue && (
            <div className="youtube-caption-overlay" aria-live="polite">
              {activeCue.text}
            </div>
          )}
          {playerError && <div className="youtube-preview-error">{playerError}</div>}
        </div>

        <div className="subtitle-preview-controls">
          <div className="preview-transport-row">
            <button
              className="primary-button compact"
              disabled={disabled || (isPlayerRequested && !isPlayerReady)}
              onClick={handleTogglePlayback}
              type="button"
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} />}
              {isPlayerRequested ? (isPlaying ? 'Duraklat' : 'Oynat') : 'Yukle ve oynat'}
            </button>
            <button
              className="secondary-button compact"
              disabled={!isPlayerReady || disabled}
              onClick={() => seekBy(-10)}
              type="button"
            >
              <SkipBack size={15} />
              10 sn
            </button>
            <button
              className="secondary-button compact"
              disabled={!isPlayerReady || disabled}
              onClick={() => seekBy(10)}
              type="button"
            >
              <SkipForward size={15} />
              10 sn
            </button>
            <button
              className="secondary-button compact icon-label"
              disabled={!isPlayerReady || disabled}
              onClick={() => {
                if (isMuted) {
                  playerRef.current?.unMute();
                  setIsMuted(false);
                } else {
                  playerRef.current?.mute();
                  setIsMuted(true);
                }
              }}
              type="button"
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              {isMuted ? 'Ses ac' : 'Sessiz'}
            </button>
          </div>

          <label className="preview-time-scrubber">
            <span>
              <Captions size={14} />
              {activeCue ? `${formatTime(activeCue.startMs)} - ${formatTime(activeCue.endMs)}` : 'Aktif altyazi yok'}
            </span>
            <input
              disabled={!isPlayerReady || disabled || durationMs <= 0}
              max={scrubberMaxSeconds}
              min="0"
              onChange={(event) => seekToMs(Math.round(Number.parseFloat(event.target.value) * 1000))}
              step="0.1"
              type="range"
              value={scrubberValueSeconds}
            />
          </label>

          <div className="preview-range-readout">
            <span>
              <strong>Baslangic</strong>
              {startMs === null ? '--:--' : formatTime(startMs)}
            </span>
            <span>
              <strong>Bitis</strong>
              {endMs === null ? '--:--' : formatTime(endMs)}
            </span>
            <span>
              <strong>Secim</strong>
              {orderedRange ? formatDurationMs(orderedRange.endMs - orderedRange.startMs) : '--'}
            </span>
          </div>

          <div className="preview-button-grid">
            <button
              className="secondary-button compact"
              disabled={!isPlayerReady || disabled}
              onClick={() => setStartMs(getPlayerTimeMs(playerRef.current, currentMs))}
              type="button"
            >
              Baslat
            </button>
            <button
              className="secondary-button compact"
              disabled={!isPlayerReady || disabled}
              onClick={() => setEndMs(getPlayerTimeMs(playerRef.current, currentMs))}
              type="button"
            >
              Bitir
            </button>
            <button
              className="secondary-button compact"
              disabled={disabled || startMs === null || !isPlayerReady}
              onClick={() => {
                if (startMs !== null) {
                  seekToMs(startMs);
                }
              }}
              type="button"
            >
              Basa git
            </button>
            <button
              className="secondary-button compact"
              disabled={disabled || endMs === null || !isPlayerReady}
              onClick={() => {
                if (endMs !== null) {
                  seekToMs(endMs);
                }
              }}
              type="button"
            >
              Bitise git
            </button>
          </div>

          <div className="preview-input-grid">
            <label>
              Baslangic sn
              <input
                disabled={disabled}
                min="0"
                onChange={(event) => setStartMs(secondsInputToMs(event.target.value))}
                step="0.1"
                type="number"
                value={startMs === null ? '' : String(Math.round(startMs / 100) / 10)}
              />
            </label>
            <label>
              Bitis sn
              <input
                disabled={disabled}
                min="0"
                onChange={(event) => setEndMs(secondsInputToMs(event.target.value))}
                step="0.1"
                type="number"
                value={endMs === null ? '' : String(Math.round(endMs / 100) / 10)}
              />
            </label>
            <label>
              Hiz
              <select
                disabled={!isPlayerReady || disabled}
                onChange={(event) => {
                  const nextRate = Number.parseFloat(event.target.value);
                  playbackRateRef.current = nextRate;
                  setPlaybackRate(nextRate);
                  playerRef.current?.setPlaybackRate(nextRate);
                }}
                value={playbackRate}
              >
                {playbackRateOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cozunurluk
              <select
                disabled={!isPlayerReady || disabled}
                onChange={(event) => {
                  const nextQuality = event.target.value as YouTubePlaybackQuality;
                  qualityRef.current = nextQuality;
                  setQuality(nextQuality);
                  playerRef.current?.setPlaybackQuality(nextQuality);
                }}
                value={quality}
              >
                {playbackQualityOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="preview-action-row">
            <span className="preview-player-state">
              <Gauge size={14} />
              {isPlayerRequested ? (isPlayerReady ? 'Hazir' : 'Yukleniyor') : 'Beklemede'} · {formatTime(currentMs)} /{' '}
              {durationMs > 0 ? formatTime(durationMs) : '--:--'}
            </span>
            <button
              className="primary-button compact"
              disabled={disabled || !canRemoveRange}
              onClick={() => {
                if (orderedRange) {
                  onRemoveRange(orderedRange);
                }
              }}
              type="button"
            >
              <Scissors size={15} />
              Secili alani cikar
            </button>
            <button
              className="secondary-button compact"
              disabled={disabled || (startMs === null && endMs === null)}
              onClick={() => {
                setStartMs(null);
                setEndMs(null);
              }}
              type="button"
            >
              <TimerReset size={15} />
              Secimi temizle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

function loadYouTubeIframeApi(): Promise<void> {
  if (window.YT?.Player) {
    return Promise.resolve();
  }

  youtubeApiReadyPromise ??= new Promise((resolve, reject) => {
    const existingCallback = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => reject(new Error('YouTube API timeout')), 12000);

    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeout);
      existingCallback?.();
      resolve();
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('YouTube API load failed'));
      };
      document.head.appendChild(script);
    }
  });

  return youtubeApiReadyPromise.catch((error: unknown) => {
    youtubeApiReadyPromise = null;
    throw error;
  });
}

function getYoutubeVideoId(video: VideoRecord): string | null {
  if (/^[a-zA-Z0-9_-]{11}$/.test(video.id)) {
    return video.id;
  }

  const url = video.webpageUrl;
  if (!url) {
    return null;
  }

  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? null;
}

function getVideoDurationMs(video: VideoRecord): number {
  return video.durationMinutes === null ? 0 : Math.max(0, Math.round(video.durationMinutes * 60 * 1000));
}

function getPlayerTimeMs(player: YouTubePlayerInstance | null, fallbackMs: number): number {
  return Math.max(0, Math.round((player?.getCurrentTime() ?? fallbackMs / 1000) * 1000));
}

function syncPlayerSnapshot(
  player: YouTubePlayerInstance | null,
  fallbackDurationMs: number,
  setCurrentMs: (value: number) => void,
  setDurationMs: (value: number) => void,
  setIsMuted: (value: boolean) => void
): void {
  if (!player) {
    return;
  }

  const nextCurrentMs = Math.max(0, Math.round(player.getCurrentTime() * 1000));
  const nextDurationMs = Math.max(fallbackDurationMs, Math.round(player.getDuration() * 1000));
  setCurrentMs(nextCurrentMs);
  setDurationMs(nextDurationMs);
  setIsMuted(player.isMuted());
}

function secondsInputToMs(value: string): number | null {
  if (!value.trim()) {
    return null;
  }

  const seconds = Number.parseFloat(value);
  return Number.isFinite(seconds) ? Math.max(0, Math.round(seconds * 1000)) : null;
}

function clampMs(ms: number, durationMs: number): number {
  if (durationMs <= 0) {
    return Math.max(0, ms);
  }

  return Math.max(0, Math.min(ms, durationMs));
}

function normalizeRange(range: TranscriptExclusionRange): TranscriptExclusionRange {
  return {
    startMs: Math.min(range.startMs, range.endMs),
    endMs: Math.max(range.startMs, range.endMs)
  };
}

function findActiveCue(cues: TimedSubtitleCue[], currentMs: number): TimedSubtitleCue | null {
  for (const cue of cues) {
    if (currentMs >= cue.startMs && currentMs <= cue.endMs) {
      return cue;
    }
  }

  return null;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor((ms % 1000) / 100);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${millis}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}.${millis}`;
}

function formatDurationMs(ms: number): string {
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return minutes > 0 ? `${minutes} dk ${remainingSeconds} sn` : `${remainingSeconds} sn`;
}
