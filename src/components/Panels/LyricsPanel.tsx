import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Captions, X, Square, Download, LoaderCircle } from 'lucide-react';
import { LiveTranscriber, type CaptionOptions } from '../../audio/LiveTranscriber';
import { IconButton } from '../Controls/IconButton';
import { usePlayer } from '../../stores/player';
import { useLive } from '../../stores/live';

export function LyricsPanel({ onClose }: { onClose: () => void }) {
  const isDemo = usePlayer((s) => s.tracks[s.index]?.artist === 'Music Galaxy Originals');
  const isLive = useLive((s) => s.status === 'connected');
  const [options, setOptions] = useState<CaptionOptions>({
    language: 'tamil',
    model: 'tiny',
    translate: false,
    acceleration: false,
  });
  const [active, setActive] = useState(false),
    [line, setLine] = useState(''),
    [draft, setDraft] = useState(''),
    [onScene, setOnScene] = useState(true),
    [previous, setPrevious] = useState(''),
    [status, setStatus] = useState(''),
    [error, setError] = useState('');
  const engine = useRef<LiveTranscriber | null>(null),
    last = useRef('');
  useEffect(() => () => engine.current?.stop(), []);
  function start() {
    if (isDemo && !isLive) {
      setError(
        'The built-in sample is instrumental. Connect a song with vocals to generate lyrics.',
      );
      return;
    }
    engine.current?.stop();
    setError('');
    setLine('');
    setDraft('');
    setPrevious('');
    last.current = '';
    setActive(true);
    const transcriber = new LiveTranscriber(options, (event) => {
      if (event.type === 'status') setStatus(event.text);
      else if (event.type === 'error') {
        setError(event.text);
        setActive(false);
        setStatus('');
      } else if (event.type === 'draft') {
        setDraft(event.text);
      } else {
        if (event.text && last.current) setPrevious(last.current);
        if (!event.text) setPrevious('');
        last.current = event.text;
        setLine(event.text);
      }
    });
    engine.current = transcriber;
    void transcriber.start();
  }
  function stop() {
    engine.current?.stop();
    engine.current = null;
    setActive(false);
    setStatus('Lyrics stopped');
    setLine('');
    setDraft('');
    setPrevious('');
    last.current = '';
  }
  const display = draft || line;
  const words = display.split(/\s+/);
  const subtitle = words.length > 24 ? `… ${words.slice(-24).join(' ')}` : display;
  const tamil = /[\u0B80-\u0BFF]/.test(display);
  return (
    <>
      <section
        className={`lyrics-panel live-lyrics ${active ? 'is-transcribing' : ''}`}
        aria-label="Lyrics panel"
      >
        <header>
          <span>
            <Captions size={15} /> Live lyrics{' '}
            <small>{active ? 'on device' : 'Tamil / English'}</small>
          </span>
          <IconButton label="Close lyrics" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </header>
        {!active && (
          <div className="caption-options">
            <label>
              Song language
              <select
                aria-label="Song language"
                value={options.language}
                disabled={active}
                onChange={(e) =>
                  setOptions({ ...options, language: e.target.value as CaptionOptions['language'] })
                }
              >
                <option value="tamil">தமிழ் · Tamil</option>
                <option value="english">English</option>
              </select>
            </label>
            <label>
              Voice model
              <select
                aria-label="Voice model"
                value={options.model}
                disabled={active}
                onChange={(e) =>
                  setOptions({ ...options, model: e.target.value as CaptionOptions['model'] })
                }
              >
                <option value="base">Base · clearer words</option>
                <option value="tiny">Tiny · lighter & faster</option>
              </select>
            </label>
            <label className="caption-translation">
              <input
                type="checkbox"
                disabled={active}
                checked={options.translate}
                onChange={(e) => setOptions({ ...options, translate: e.target.checked })}
              />{' '}
              Translate to English
            </label>
            <label className="caption-translation">
              <input
                type="checkbox"
                disabled={active}
                checked={options.acceleration}
                onChange={(e) => setOptions({ ...options, acceleration: e.target.checked })}
              />{' '}
              Use GPU acceleration (optional)
            </label>
            <label className="caption-translation">
              <input
                type="checkbox"
                checked={onScene}
                onChange={(e) => setOnScene(e.target.checked)}
              />{' '}
              Show words over the visualization
            </label>
          </div>
        )}
        {active ? (
          <div className="caption-stage">
            {previous && !onScene && (
              <p className="lyric-neighbor" aria-hidden="true">
                {previous}
              </p>
            )}
            {!onScene && (
              <p
                className={`lyric-current ${display ? '' : 'caption-waiting'}`}
                lang={tamil ? 'ta' : 'en'}
                aria-live="polite"
              >
                {display || 'Listening for the words…'}
              </p>
            )}
            <p className="caption-status" role="status">
              <LoaderCircle size={12} />
              {status}
            </p>
            <button className="caption-stop" onClick={stop}>
              <Square size={12} /> Stop lyrics
            </button>
          </div>
        ) : (
          <div className="lyrics-empty">
            <Captions size={26} />
            <h2>Hear it. See the words.</h2>
            <p>
              Live transcription of your connected song. Words appear progressively as they’re
              decoded.
            </p>
            <button className="lyric-upload" onClick={start}>
              <Download size={14} />{' '}
              {error ? 'Retry live transcription' : 'Start live transcription'}
            </button>
            <small>
              Tiny loads from the app’s local assets. Base needs a one-time model download. Both run
              on this device; no music is uploaded.
            </small>
            {!error && status && <p className="caption-status">{status}</p>}
          </div>
        )}
        {error && (
          <p role="alert" className="lyric-error">
            {error}
          </p>
        )}
        <p className="caption-note">
          Experimental transcription, not verified song lyrics. Singing and loud instruments can
          cause wrong or missing words. Audio is buffered briefly, then text streams while decoding;
          captions still have processing delay.
        </p>
      </section>
      {active &&
        onScene &&
        display &&
        createPortal(
          <div className={`live-transcription-overlay ${draft ? 'is-draft' : ''}`}>
            <span>
              {options.translate ? 'ENGLISH TRANSLATION' : 'LIVE TRANSCRIPTION'}
              {draft ? ' · UPDATING' : ''}
            </span>
            <p lang={tamil ? 'ta' : 'en'} aria-live="polite" aria-atomic="true">
              {subtitle}
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
