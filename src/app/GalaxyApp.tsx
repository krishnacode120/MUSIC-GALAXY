import { useEffect, useRef, useState } from 'react';
import {
  Orbit,
  Waves,
  Cloud,
  BarChart3,
  Box,
  Scan,
  Repeat2,
  Binary,
  Captions,
  Camera,
  Maximize2,
  Settings2,
  RotateCcw,
  Clapperboard,
  X,
  Upload,
  Check,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import GalaxyScene from '../galaxy/GalaxyScene';
import { useUniverse } from '../stores/universe';
import { useExperience, forms } from '../stores/experience';
import { usePlayer } from '../stores/player';
import { useLive } from '../stores/live';
import { audioEngine } from '../audio/AudioEngine';
import { CompactPlayer, AudioStatus } from '../components/Player/CompactPlayer';
import { Player, Playlist } from '../components/Player/Player';
import { SourceDialog } from '../components/Panels/SourceDialog';
import { FlowStudio } from '../components/Panels/FlowStudio';
import { LyricsPanel } from '../components/Panels/LyricsPanel';
import { IconButton } from '../components/Controls/IconButton';
import { screenshot } from '../utils/capture';
const icons = [Orbit, Waves, Cloud, BarChart3, Waves, Box, Scan, Repeat2, Orbit, Binary];

export default function GalaxyApp() {
  const [source, setSource] = useState(false),
    [studio, setStudio] = useState(false),
    [lyrics, setLyrics] = useState(false),
    [expanded, setExpanded] = useState(false),
    [queue, setQueue] = useState(false),
    [hidden, setHidden] = useState(false),
    [fullscreen, setFullscreen] = useState(false),
    [drag, setDrag] = useState(false),
    [toast, setToast] = useState<string | null>(null);
  const modeNav = useRef<HTMLElement>(null);
  const input = useRef<HTMLInputElement>(null),
    depth = useRef(0),
    u = useUniverse(),
    e = useExperience(),
    p = usePlayer(),
    live = useLive();
  const connected = live.status === 'connected';
  useEffect(() => {
    modeNav.current
      ?.querySelector('.selected')
      ?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [e.form]);
  const pick = () => input.current?.click();
  async function capture() {
    try {
      await screenshot();
      setToast('Your galaxy has been saved as a PNG.');
    } catch (error) {
      setToast((error as Error).message);
    }
  }
  async function toggleFull() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setToast('Fullscreen is unavailable in this browser window.');
    }
  }
  function cinematic() {
    setHidden(true);
    useUniverse.setState({ cinematic: true });
  }
  useEffect(() => {
    const update = () => setFullscreen(!!document.fullscreenElement);
    update();
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (connected) {
      setExpanded(false);
      setQueue(false);
    }
  }, [connected]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHidden(false);
        setStudio(false);
        setSource(false);
        setExpanded(false);
        setQueue(false);
        useUniverse.setState({ cinematic: false });
        return;
      }
      if ((event.target as HTMLElement).closest('input,select,textarea,button,dialog')) return;
      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (!audioEngine.isLive) void usePlayer.getState().toggle();
          break;
        case 'KeyH':
          setHidden((x) => !x);
          break;
        case 'KeyC':
          cinematic();
          break;
        case 'KeyF':
          void toggleFull();
          break;
        case 'KeyL':
          setLyrics((x) => !x);
          break;
        case 'KeyR':
          useUniverse.setState((state) => ({
            resetCamera: state.resetCamera + 1,
            cinematic: false,
          }));
          break;
        case 'ArrowRight':
          if (!audioEngine.isLive) usePlayer.getState().seek(usePlayer.getState().current + 5);
          break;
        case 'ArrowLeft':
          if (!audioEngine.isLive) usePlayer.getState().seek(usePlayer.getState().current - 5);
          break;
        case 'KeyM':
          if (!audioEngine.isLive) usePlayer.getState().toggleMute();
          break;
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  return (
    <main
      className={`galaxy-app ${hidden ? 'immersed' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (event.dataTransfer.types.includes('Files')) {
          depth.current++;
          setDrag(true);
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        if (--depth.current <= 0) setDrag(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setDrag(false);
        void p.addFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <GalaxyScene />
      <input
        ref={input}
        type="file"
        hidden
        multiple
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
        aria-label="Choose audio files"
        onChange={(event) => {
          void p.addFiles(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
      <div className="galaxy-interface">
        <header className="galaxy-header">
          <a href="#" className="galaxy-brand" aria-label="Music Galaxy home">
            <span>
              <Orbit size={24} strokeWidth={1.25} />
            </span>
            <div>
              Music Galaxy<small>{forms[e.form]}</small>
            </div>
          </a>
          <div className="galaxy-actions">
            <button
              className={`live-connect ${connected ? 'connected' : ''}`}
              onClick={() => setSource(true)}
            >
              <i />
              {connected ? 'Audio connected' : 'Connect audio'}
            </button>
            <button
              className={`live-lyrics-toggle ${lyrics ? 'active' : ''}`}
              aria-label="Toggle live lyrics"
              aria-pressed={lyrics}
              onClick={() => setLyrics(!lyrics)}
            >
              <Captions size={19} />
              <span>Live lyrics</span>
            </button>
            <IconButton label="Capture screenshot" onClick={() => void capture()}>
              <Camera size={17} />
            </IconButton>
            {!fullscreen && (
              <IconButton label="Enter fullscreen" onClick={() => void toggleFull()}>
                <Maximize2 size={17} />
              </IconButton>
            )}
            <IconButton label="Visual settings" active={studio} onClick={() => setStudio(!studio)}>
              <Settings2 size={17} />
            </IconButton>
          </div>
        </header>
        <CompactPlayer
          onSource={() => setSource(true)}
          onDemo={() => void p.loadDemo()}
          onUpload={pick}
          onPlaylist={() => setQueue(!queue)}
          onExpand={() => setExpanded(!expanded)}
        />
        <div className="galaxy-mode-dock">
          <nav ref={modeNav} aria-label="Visual forms">
            {forms.map((form, index) => {
              const Icon = icons[index];
              return (
                <button
                  key={form}
                  aria-pressed={e.form === index}
                  className={e.form === index ? 'selected' : ''}
                  onClick={() => e.change({ form: index })}
                >
                  <Icon size={16} strokeWidth={1.3} />
                  <span>{form}</span>
                </button>
              );
            })}
          </nav>
          <div className="galaxy-dock-caption">
            <span>
              Drag to orbit <i>·</i> Scroll to explore
            </span>
            <AudioStatus />
          </div>
        </div>
        <div className="galaxy-view-tools">
          <IconButton
            label="Reset camera"
            onClick={() =>
              useUniverse.setState((state) => ({
                resetCamera: state.resetCamera + 1,
                cinematic: false,
              }))
            }
          >
            <RotateCcw size={15} />
          </IconButton>
          <IconButton label="Cinematic" onClick={cinematic}>
            <Clapperboard size={16} />
          </IconButton>
          {u.settings.showFps && <span>{u.fps} FPS</span>}
        </div>
        {lyrics && (
          <div className="lyric-layer">
            <LyricsPanel onClose={() => setLyrics(false)} />
          </div>
        )}
        {expanded && !connected && (
          <section className="expanded-player">
            <header>
              <span>YOUR MUSIC</span>
              <IconButton label="Close full player" onClick={() => setExpanded(false)}>
                <X size={15} />
              </IconButton>
            </header>
            <Player onUpload={pick} onPlaylist={() => setQueue(!queue)} playlistOpen={queue} />
          </section>
        )}
        {expanded && connected && (
          <div className="live-source-note">
            <p>Playback and volume are controlled in the source app.</p>
            <button onClick={live.disconnect}>Stop sharing audio</button>
          </div>
        )}
        {queue && !connected && <Playlist onUpload={pick} onClose={() => setQueue(false)} />}
        <AnimatePresence>
          {studio && (
            <motion.div
              className="galaxy-studio-position"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
            >
              <FlowStudio onClose={() => setStudio(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {hidden && !fullscreen && (
        <button
          className="galaxy-return"
          onClick={() => {
            setHidden(false);
            useUniverse.setState({ cinematic: false });
          }}
        >
          <X size={14} /> Return to controls <kbd>ESC</kbd>
        </button>
      )}
      {source && (
        <SourceDialog
          onClose={() => setSource(false)}
          onFile={pick}
          onDemo={() => void p.loadDemo()}
        />
      )}
      {(toast || p.error || u.notice) && (
        <div role={p.error ? 'alert' : 'status'} className="galaxy-toast">
          <Check size={15} />
          <span>{p.error ?? toast ?? u.notice}</span>
          <IconButton
            label="Dismiss notification"
            onClick={() => {
              setToast(null);
              usePlayer.setState({ error: null });
              useUniverse.setState({ notice: null });
            }}
          >
            <X size={14} />
          </IconButton>
        </div>
      )}
      {drag && (
        <div className="galaxy-drop">
          <Upload size={32} />
          <h2>A new song. A new universe.</h2>
          <p>Drop local audio here.</p>
        </div>
      )}
    </main>
  );
}
