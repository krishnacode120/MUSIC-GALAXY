import { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic,
  MoreHorizontal,
  Radio,
  Square,
  Plus,
} from 'lucide-react';
import { usePlayer } from '../../stores/player';
import { useLive } from '../../stores/live';
import { audioEngine } from '../../audio/AudioEngine';
import { clock } from '../../utils/random';
import { IconButton } from '../Controls/IconButton';
import { Spectrum } from './Player';

export function AudioStatus() {
  const [active, setActive] = useState(false),
    connected = useLive((s) => s.status === 'connected');
  useEffect(() => {
    const timer = setInterval(() => setActive(audioEngine.features.rms > 0.002), 150);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className={`audio-status ${active ? 'receiving' : ''}`}>
      <i />
      {active
        ? 'Following your sound'
        : connected
          ? 'Connected · waiting for sound'
          : 'Ambient · no audio input'}
    </span>
  );
}
export function CompactPlayer({
  onSource,
  onDemo,
  onUpload,
  onPlaylist,
  onExpand,
}: {
  onSource: () => void;
  onDemo: () => void;
  onUpload: () => void;
  onPlaylist: () => void;
  onExpand: () => void;
}) {
  const p = usePlayer(),
    live = useLive(),
    track = p.tracks[p.index],
    connected = live.status === 'connected';
  return (
    <section className="compact-player" aria-label="Music player">
      <div className="compact-track">
        <span className="compact-art">{connected ? <Radio size={19} /> : <span>♫</span>}</span>
        <div>
          <strong>
            {connected
              ? live.kind === 'tab'
                ? 'Live browser audio'
                : live.kind === 'system'
                  ? 'Live computer audio'
                  : 'Live microphone'
              : (track?.title ?? 'A universe waiting for your song')}
          </strong>
          <button onClick={onSource}>
            {connected
              ? 'Change audio source'
              : track
                ? 'Local audio · change source'
                : 'Choose a song or connect live audio'}
          </button>
        </div>
        <IconButton label="More player controls" onClick={onExpand}>
          <MoreHorizontal size={17} />
        </IconButton>
      </div>
      {track && !connected ? (
        <>
          <div className="compact-seek">
            <time>{clock(p.current)}</time>
            <input
              aria-label="Seek"
              type="range"
              min={0}
              max={p.duration || 1}
              step={0.1}
              value={p.current}
              disabled={!p.duration}
              onChange={(event) => p.seek(+event.target.value)}
            />
            <time>{clock(p.duration)}</time>
          </div>
          <div className="compact-controls">
            <IconButton label="Previous track" onClick={() => void p.next(-1)}>
              <SkipBack size={14} />
            </IconButton>
            <IconButton label={p.playing ? 'Pause' : 'Play'} onClick={() => void p.toggle()}>
              {p.playing ? <Pause size={17} /> : <Play size={17} />}
            </IconButton>
            <IconButton label="Next track" onClick={() => void p.next()}>
              <SkipForward size={14} />
            </IconButton>
            <span className="compact-spacer" />
            <IconButton label={p.muted ? 'Unmute' : 'Mute'} onClick={p.toggleMute}>
              {p.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </IconButton>
            <input
              aria-label="Volume"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={p.volume}
              onChange={(event) => p.setVolume(+event.target.value)}
            />
            <IconButton label="Playlist" onClick={onPlaylist}>
              <ListMusic size={15} />
            </IconButton>
            <IconButton label="Add audio files" onClick={onUpload}>
              <Plus size={14} />
            </IconButton>
          </div>
        </>
      ) : connected ? (
        <div className="compact-live">
          <Spectrum />
          <AudioStatus />
          <IconButton label="Disconnect live audio" onClick={live.disconnect}>
            <Square size={12} />
          </IconButton>
        </div>
      ) : (
        <div className="compact-start">
          <button onClick={onSource}>
            <Radio size={13} /> Connect live audio
          </button>
          <button onClick={onDemo}>
            <Play size={11} /> Try a sample
          </button>
        </div>
      )}
    </section>
  );
}
