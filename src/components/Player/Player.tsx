import { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ListMusic,
  Plus,
  AudioLines,
  Trash2,
  X,
} from 'lucide-react';
import { usePlayer } from '../../stores/player';
import { audioEngine } from '../../audio/AudioEngine';
import { clock } from '../../utils/random';
import { IconButton } from '../Controls/IconButton';
export function Spectrum() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let frame = 0;
    const paint = () => {
      const node = canvas.current,
        ctx = node?.getContext('2d');
      if (node && ctx) {
        ctx.clearRect(0, 0, node.width, node.height);
        const f = audioEngine.features;
        for (let i = 0; i < 64; i++) {
          const value = f.spectrum[i];
          const h = 2 + value * 27;
          ctx.fillStyle = `rgba(${145 + i},${130 + i},255,${0.25 + value * 0.65})`;
          ctx.fillRect(i * 4, node.height / 2 - h / 2, 2, h);
        }
      }
      frame = requestAnimationFrame(paint);
    };
    paint();
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <canvas
      ref={canvas}
      width={256}
      height={32}
      className="spectrum"
      aria-label="Live frequency spectrum"
    />
  );
}
export function Player({
  onUpload,
  onPlaylist,
  playlistOpen,
}: {
  onUpload: () => void;
  onPlaylist: () => void;
  playlistOpen: boolean;
}) {
  const p = usePlayer(),
    track = p.tracks[p.index];
  return (
    <div className="player-wrap">
      <div className="player glass">
        <div className="track-info">
          <div className={`album-art ${p.playing ? 'playing' : ''}`}>
            <AudioLines size={24} />
          </div>
          <div>
            <strong>{track?.title ?? 'Your next universe awaits'}</strong>
            <span>{track?.artist ?? 'Drop a song. Discover a galaxy.'}</span>
          </div>
          <IconButton label="Add audio files" onClick={onUpload} className="add-track">
            <Plus size={17} />
          </IconButton>
        </div>
        <div className="transport">
          <div className="transport-buttons">
            <IconButton
              label="Shuffle"
              active={p.shuffle}
              aria-pressed={p.shuffle}
              onClick={() => usePlayer.setState({ shuffle: !p.shuffle })}
            >
              <Shuffle size={16} />
            </IconButton>
            <IconButton label="Previous track" onClick={() => void p.next(-1)}>
              <SkipBack size={18} fill="currentColor" />
            </IconButton>
            <button
              className="play-button"
              aria-label={p.playing ? 'Pause' : 'Play'}
              onClick={() => void p.toggle()}
            >
              {p.playing ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" />
              )}
            </button>
            <IconButton label="Next track" onClick={() => void p.next()}>
              <SkipForward size={18} fill="currentColor" />
            </IconButton>
            <IconButton
              label={`Repeat: ${p.repeat}`}
              active={p.repeat !== 'off'}
              onClick={() =>
                usePlayer.setState({
                  repeat: p.repeat === 'off' ? 'all' : p.repeat === 'all' ? 'one' : 'off',
                })
              }
            >
              {p.repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </IconButton>
          </div>
          <div className="seek">
            <time>{clock(p.current)}</time>
            <input
              aria-label="Seek"
              type="range"
              min={0}
              max={p.duration || 1}
              step={0.1}
              value={p.current}
              onChange={(e) => p.seek(+e.target.value)}
              disabled={!p.duration}
              style={
                { '--progress': `${(p.current / (p.duration || 1)) * 100}%` } as React.CSSProperties
              }
            />
            <time>{clock(p.duration)}</time>
          </div>
        </div>
        <div className="player-right">
          <Spectrum />
          <div className="volume">
            <IconButton label={p.muted ? 'Unmute' : 'Mute'} onClick={p.toggleMute}>
              {p.muted || p.volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </IconButton>
            <input
              aria-label="Volume"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={p.volume}
              onChange={(e) => p.setVolume(+e.target.value)}
            />
          </div>
          <div className="player-divider" />
          <IconButton label="Playlist" active={playlistOpen} onClick={onPlaylist}>
            <ListMusic size={20} />
          </IconButton>
        </div>
      </div>
      <div className="player-caption">
        <span>
          <i /> ALL PROCESSING HAPPENS ON YOUR DEVICE
        </span>
        <span>
          <kbd>SPACE</kbd> play / pause <b>·</b> <kbd>H</kbd> hide UI
        </span>
      </div>
    </div>
  );
}
export function Playlist({ onClose, onUpload }: { onClose: () => void; onUpload: () => void }) {
  const p = usePlayer();
  return (
    <section className="playlist glass" aria-label="Playlist panel">
      <header>
        <div>
          <span className="eyebrow">YOUR SOUNDTRACK</span>
          <h2>
            Play queue <small>{p.tracks.length}</small>
          </h2>
        </div>
        <IconButton label="Close playlist" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </header>
      {!p.tracks.length ? (
        <p className="empty-note">Add a few songs and let your universe unfold.</p>
      ) : (
        <ol>
          {p.tracks.map((track, i) => (
            <li key={track.id} className={i === p.index ? 'current' : ''}>
              <button onClick={() => void p.select(i)}>
                <span className="track-number">
                  {i === p.index && p.playing ? (
                    <AudioLines size={16} />
                  ) : (
                    String(i + 1).padStart(2, '0')
                  )}
                </span>
                <span>
                  <strong>{track.title}</strong>
                  <small>{track.artist}</small>
                </span>
              </button>
              <IconButton label={`Remove ${track.title}`} onClick={() => p.remove(track.id)}>
                <Trash2 size={15} />
              </IconButton>
            </li>
          ))}
        </ol>
      )}
      <button className="secondary wide" onClick={onUpload}>
        <Plus size={16} /> Add music
      </button>
    </section>
  );
}
