import { useState } from 'react';
import { X, RotateCcw, Plus, Trash2, Pencil } from 'lucide-react';
import { useExperience, inks, forms } from '../../stores/experience';
import { useUniverse, type Quality } from '../../stores/universe';
import { useLive } from '../../stores/live';
import { IconButton } from '../Controls/IconButton';
type FlowSnapshot = Pick<
  ReturnType<typeof useExperience.getState>,
  | 'form'
  | 'ink'
  | 'evolve'
  | 'density'
  | 'spread'
  | 'movement'
  | 'impact'
  | 'brightness'
  | 'low'
  | 'body'
  | 'detail'
  | 'colorDrift'
>;
interface SavedLook {
  id: string;
  name: string;
  flow: FlowSnapshot;
}
const curated = [
  { name: 'Andromeda', ink: 0, form: 0 },
  { name: 'Blue hour', ink: 1, form: 1 },
  { name: 'Afterglow', ink: 2, form: 8 },
  { name: 'Chlorophyll', ink: 3, form: 0 },
  { name: 'Ultraviolet', ink: 4, form: 6 },
  { name: 'Silver lining', ink: 5, form: 1 },
  { name: 'Night drive', ink: 1, form: 9 },
  { name: 'Slow bloom', ink: 0, form: 2 },
];
export function FlowStudio({ onClose }: { onClose: () => void }) {
  const e = useExperience(),
    u = useUniverse(),
    live = useLive((s) => s.status === 'connected');
  const [tab, setTab] = useState('Tune'),
    [name, setName] = useState(''),
    [editing, setEditing] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedLook[]>(() => {
    try {
      const current = localStorage.getItem('music-galaxy-looks-v5');
      if (current) return JSON.parse(current);
      const previous = localStorage.getItem('music-galaxy-looks-v4');
      if (previous)
        return (JSON.parse(previous) as SavedLook[]).map((look) => ({
          ...look,
          flow: {
            ...look.flow,
            form: [2, 8, 5, 4, 2, 0][look.flow.form] ?? 0,
            movement: Math.max(0.1, look.flow.movement),
          },
        }));
      const older = JSON.parse(
        localStorage.getItem('music-galaxy-looks-v3') ?? '[]',
      ) as SavedLook[];
      return older.map((look) => ({
        ...look,
        flow: {
          ...look.flow,
          form: [2, 0, 2][look.flow.form] ?? 0,
          movement: Math.max(0.1, look.flow.movement),
        },
      }));
    } catch {
      return [];
    }
  });
  const save = (next: SavedLook[]) => {
    setSaved(next);
    try {
      localStorage.setItem('music-galaxy-looks-v5', JSON.stringify(next));
    } catch {
      useUniverse.setState({
        notice: 'Local storage is full. This look is available for this session only.',
      });
    }
  };
  const slider = (
    label: string,
    key: 'density' | 'spread' | 'movement' | 'impact' | 'brightness' | 'low' | 'body' | 'detail',
    min = 0,
    max = 1.5,
  ) => (
    <label className="flow-slider">
      <span>
        {label}
        <output>{e[key].toFixed(2)}</output>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={e[key]}
        onChange={(event) => e.change({ [key]: +event.target.value })}
      />
    </label>
  );
  return (
    <aside className="flow-studio" aria-label="Visual studio">
      <header>
        <div>
          <span className="overline">A FEW PERSONAL TOUCHES</span>
          <h2>Make it yours.</h2>
        </div>
        <IconButton label="Close settings" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </header>
      <div className="studio-tabs">
        {['Tune', 'Looks', 'Details'].map((t) => (
          <button key={t} className={tab === t ? 'selected' : ''} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="studio-scroll">
        {tab === 'Tune' ? (
          <>
            <div className="studio-section">
              <h3>
                Color story <span>{inks[e.ink].name}</span>
              </h3>
              <div className="ink-options">
                {inks.map((ink, i) => (
                  <button
                    key={ink.name}
                    title={ink.name}
                    aria-label={`${ink.name} colors`}
                    className={e.ink === i ? 'selected' : ''}
                    style={{
                      background: `linear-gradient(120deg,${ink.colors[0]},${ink.colors[1]})`,
                    }}
                    onClick={() => e.change({ ink: i })}
                  />
                ))}
              </div>
              <label className="flow-check">
                <input
                  type="checkbox"
                  checked={e.colorDrift}
                  onChange={(event) => e.change({ colorDrift: event.target.checked })}
                />
                <span>Let the music shift the colors</span>
              </label>
            </div>
            <div className="studio-section">
              <h3>Three layers. One sound.</h3>
              <p>Independent particle populations follow different parts of the spectrum.</p>
              <div className="layer-label">
                <i style={{ background: inks[e.ink].colors[0] }} />
                <span>
                  Low end <small>Weight & expansion</small>
                </span>
              </div>
              {slider('Low-end particles', 'low')}
              <div className="layer-label">
                <i style={{ background: inks[e.ink].colors[1] }} />
                <span>
                  Body & melody <small>Flow & curvature</small>
                </span>
              </div>
              {slider('Body particles', 'body')}
              <div className="layer-label">
                <i style={{ background: inks[e.ink].colors[2] }} />
                <span>
                  Percussive detail <small>Fine scatter & transients</small>
                </span>
              </div>
              {slider('Detail particles', 'detail')}
              <p className="studio-note">
                Frequency-driven layers, not isolated instrument stems. Sounds with overlapping
                frequencies can influence the same layer.
              </p>
            </div>
            <div className="studio-section">
              <h3>Movement</h3>
              {slider('Flow speed', 'movement', 0.1, 1.5)}
              {slider('Particle density', 'density', 0.5, 2.5)}
              {slider('Canvas fill', 'spread', 0.8, 1.8)}
              <label className="flow-check">
                <input
                  type="checkbox"
                  checked={e.evolve}
                  onChange={(event) => e.change({ evolve: event.target.checked })}
                />
                <span>Evolve between forms with the music</span>
              </label>
              <label className="flow-check">
                <input
                  type="checkbox"
                  checked={u.settings.relax}
                  onChange={(event) => u.set({ relax: event.target.checked })}
                />
                <span>Gentle motion</span>
              </label>
            </div>
            <div className="studio-section">
              <h3>Response</h3>
              {slider('Visual impact', 'impact', 0.5, 2.5)}
              {slider('Scene brightness', 'brightness', 0.25, 1.2)}
              <label className="flow-slider">
                <span>
                  Audio sensitivity<output>{u.settings.sensitivity.toFixed(1)}</output>
                </span>
                <input
                  aria-label="Audio sensitivity"
                  type="range"
                  min={0.2}
                  max={2}
                  step={0.1}
                  value={u.settings.sensitivity}
                  onChange={(event) => u.set({ sensitivity: +event.target.value })}
                />
              </label>
              <label className="flow-slider">
                <span>
                  Light bloom<output>{u.settings.bloom.toFixed(2)}</output>
                </span>
                <input
                  aria-label="Light bloom"
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={u.settings.bloom}
                  onChange={(event) => u.set({ bloom: +event.target.value })}
                />
              </label>
            </div>
          </>
        ) : tab === 'Looks' ? (
          <>
            <div className="look-list">
              {curated.map((look) => (
                <button
                  key={look.name}
                  onClick={() =>
                    e.change({
                      ink: look.ink,
                      form: look.form,
                      movement: look.name === 'Slow bloom' ? 0.25 : 0.45,
                    })
                  }
                >
                  <i
                    style={{
                      background: `linear-gradient(120deg,${inks[look.ink].colors[0]},${inks[look.ink].colors[1]})`,
                    }}
                  />
                  <span>{look.name}</span>
                  <small>{forms[look.form]}</small>
                </button>
              ))}
            </div>
            <h3 className="saved-heading">Your looks</h3>
            <form
              className="save-look"
              onSubmit={(event) => {
                event.preventDefault();
                if (!name.trim()) return;
                if (editing)
                  save(saved.map((s) => (s.id === editing ? { ...s, name: name.trim() } : s)));
                else {
                  const { change: _change, frozen: _frozen, ...flow } = e;
                  save([...saved, { id: crypto.randomUUID(), name: name.trim(), flow }].slice(-40));
                }
                setName('');
                setEditing(null);
              }}
            >
              <input
                aria-label="Look name"
                maxLength={40}
                placeholder="Name this feeling…"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <button aria-label={editing ? 'Rename look' : 'Save look'} type="submit">
                <Plus size={18} />
              </button>
            </form>
            {saved.map((look) => (
              <div className="saved-look" key={look.id}>
                <button onClick={() => e.change(look.flow)}>{look.name}</button>
                <IconButton
                  label={`Rename ${look.name}`}
                  onClick={() => {
                    setName(look.name);
                    setEditing(look.id);
                  }}
                >
                  <Pencil size={13} />
                </IconButton>
                <IconButton
                  label={`Delete ${look.name}`}
                  onClick={() => save(saved.filter((s) => s.id !== look.id))}
                >
                  <Trash2 size={13} />
                </IconButton>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="studio-section">
              <h3>Performance</h3>
              <label className="quality-row">
                Quality
                <select
                  aria-label="Graphics quality"
                  value={u.settings.quality}
                  onChange={(event) => u.set({ quality: event.target.value as Quality })}
                >
                  {['Low', 'Medium', 'High', 'Ultra'].map((q) => (
                    <option key={q}>{q}</option>
                  ))}
                </select>
              </label>
              {(
                [
                  { key: 'autoQuality', label: 'Adapt quality when needed' },
                  { key: 'showFps', label: 'Show frame rate' },
                  { key: 'reducedMotion', label: 'Reduce motion' },
                  { key: 'watermark', label: 'Watermark captures' },
                ] as const
              ).map((item) => (
                <label className="flow-check" key={item.key}>
                  <input
                    type="checkbox"
                    checked={u.settings[item.key]}
                    onChange={(event) => u.set({ [item.key]: event.target.checked })}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
            <div className="studio-section">
              <h3>Song fingerprint</h3>
              {live ? (
                <p>
                  Live audio is ephemeral. No song file is available to hash, and no recording is
                  made unless you press Record.
                </p>
              ) : u.dna ? (
                <dl className="flow-dna">
                  <div>
                    <dt>Universe</dt>
                    <dd>{u.dna.name}</dd>
                  </div>
                  <div>
                    <dt>Visual seed</dt>
                    <dd>{u.dna.seed}</dd>
                  </div>
                  <div>
                    <dt>Identity</dt>
                    <dd title={u.dna.hash}>{u.dna.hash.slice(0, 16)}…</dd>
                  </div>
                  <div>
                    <dt>Analysis</dt>
                    <dd>{u.dna.analyzed ? 'Representative windows' : 'Content hash'}</dd>
                  </div>
                  <div>
                    <dt>Tempo estimate</dt>
                    <dd>{u.dna.tempo ? `~${u.dna.tempo} BPM` : 'Not confident'}</dd>
                  </div>
                </dl>
              ) : (
                <p>
                  Local audio files generate a repeatable layout from their content hash. Live audio
                  follows the sound as it arrives.
                </p>
              )}
            </div>
            <div className="studio-section">
              <h3>Shortcuts</h3>
              <p>
                Space · Play / pause local audio
                <br />H · Hide interface
                <br />F · Fullscreen
                <br />R · Reset view
                <br />C · Cinematic camera
                <br />
                Escape · Return to controls
              </p>
            </div>
          </>
        )}
        <button
          className="studio-reset"
          onClick={() => {
            e.change({
              form: 0,
              ink: 0,
              evolve: false,
              density: 1.35,
              spread: 1.15,
              movement: 0.45,
              impact: 1.05,
              brightness: 0.65,
              low: 1,
              body: 1,
              detail: 1,
              colorDrift: true,
              frozen: false,
            });
            u.reset();
          }}
        >
          <RotateCcw size={13} /> Reset the canvas
        </button>
      </div>
    </aside>
  );
}
