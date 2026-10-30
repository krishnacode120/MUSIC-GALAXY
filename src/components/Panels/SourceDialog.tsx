import { Monitor, AppWindow, Mic, ArrowUpRight, X, Music2, Play } from 'lucide-react';
import { useLive, type LiveKind } from '../../stores/live';
import { IconButton } from '../Controls/IconButton';
import { useEffect, useRef } from 'react';

export function SourceDialog({
  onClose,
  onFile,
  onDemo,
}: {
  onClose: () => void;
  onFile: () => void;
  onDemo: () => void;
}) {
  const live = useLive(),
    dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const connect = async (kind: LiveKind) => {
    if (await live.connect(kind)) onClose();
  };
  return (
    <dialog
      className="source-dialog"
      ref={dialog}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      <div className="dialog-content">
        <header>
          <span className="overline">THE SOUND COMES FROM YOU</span>
          <IconButton label="Close audio sources" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </header>
        <h2>What are you listening to?</h2>
        <p>
          Keep playing in your favorite app.
          <br />
          We’ll turn the sound into motion.
        </p>
        <button
          className="source-option"
          onClick={() => void connect('tab')}
          disabled={live.status === 'connecting'}
        >
          <AppWindow size={25} strokeWidth={1.4} />
          <span>
            <strong>
              A browser tab <small>RECOMMENDED</small>
            </strong>
            <span>YouTube, Spotify web, SoundCloud & more</span>
          </span>
          <ArrowUpRight size={20} />
        </button>
        <div className="source-instruction">
          <span>01</span> Choose the tab playing music.
          <br />
          <span>02</span> Turn on <strong>Share tab audio</strong>, then Share.
        </div>
        <button
          className="source-option"
          onClick={() => void connect('system')}
          disabled={live.status === 'connecting'}
        >
          <Monitor size={25} strokeWidth={1.4} />
          <span>
            <strong>Your computer</strong>
            <span>Desktop Spotify, media players, other apps</span>
          </span>
          <ArrowUpRight size={20} />
        </button>
        <p className="source-hint">
          Choose <strong>Entire Screen</strong> and enable <strong>Share system audio</strong>.
          Offered only on supported browser / OS combinations. If audio is missing, use a music tab
          in desktop Chrome or Edge.
        </p>
        <details className="other-sources">
          <summary>
            Other ways to listen <span>+</span>
          </summary>
          <div>
            <button
              onClick={() => void connect('microphone')}
              disabled={live.status === 'connecting'}
            >
              <Mic size={16} />
              Microphone <small>Asks permission</small>
            </button>
            <button
              onClick={() => {
                onFile();
                onClose();
              }}
            >
              <Music2 size={16} />
              Local audio files
            </button>
            <button
              onClick={() => {
                onDemo();
                onClose();
              }}
            >
              <Play size={16} />
              Try the original demo
            </button>
          </div>
        </details>
        {live.status === 'connecting' && (
          <div className="source-progress" role="status">
            Choose your source in the browser’s sharing dialog…
          </div>
        )}
        {live.error && (
          <p className="source-error" role="alert">
            {live.error}
          </p>
        )}
        <footer>
          Audio is analyzed on your device. Screen video is never viewed, saved, or uploaded. Stop
          sharing whenever you like.
        </footer>
      </div>
    </dialog>
  );
}
