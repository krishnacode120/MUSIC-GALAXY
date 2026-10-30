import { Component, useEffect, useState, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useUniverse } from '../stores/universe';
import { FlowCamera } from './FlowCamera';
import { CosmicExperience } from './CosmicExperience';
import { useExperience } from '../stores/experience';
export let sceneCanvas: HTMLCanvasElement | null = null;
export class SceneBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="webgl-error">
        <h2>Your universe needs WebGL 2</h2>
        <p>
          Enable hardware acceleration or try a recent Chrome, Edge, or Firefox. Your music player
          is still available.
        </p>
        <button onClick={() => location.reload()}>Try again</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Runtime() {
  const { gl, setFrameloop } = useThree();
  const frames = useRef(0),
    elapsed = useRef(0),
    slow = useRef(0),
    warmup = useRef(0);
  useEffect(() => {
    sceneCanvas = gl.domElement;
    const visibility = () => setFrameloop(document.hidden ? 'never' : 'always');
    const lost = (e: Event) => {
      e.preventDefault();
      useUniverse.setState({
        notice:
          'Graphics context was interrupted. Reload to restore the universe; audio can continue.',
      });
    };
    document.addEventListener('visibilitychange', visibility);
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      sceneCanvas = null;
      document.removeEventListener('visibilitychange', visibility);
      gl.domElement.removeEventListener('webglcontextlost', lost);
    };
  }, [gl, setFrameloop]);
  useFrame((_, delta) => {
    if (document.hidden) return;
    frames.current++;
    elapsed.current += delta;
    warmup.current += delta;
    if (elapsed.current > 2) {
      const fps = Math.round(frames.current / elapsed.current);
      useUniverse.setState({ fps });
      const s = useUniverse.getState().settings;
      if (fps < 28 && warmup.current > 10) slow.current++;
      else slow.current = 0;
      if (slow.current >= 4 && s.autoQuality && s.quality !== 'Low') {
        const lower = s.quality === 'Ultra' ? 'High' : s.quality === 'High' ? 'Medium' : 'Low';
        useUniverse.getState().set({ quality: lower });
        useUniverse.setState({
          notice: `Switched to ${lower} quality to keep your universe smooth. You can disable automatic quality in settings.`,
        });
        slow.current = 0;
      }
      frames.current = 0;
      elapsed.current = 0;
    }
  });
  return null;
}
export default function GalaxyScene() {
  const s = useUniverse((x) => x.settings);
  const form = useExperience((x) => x.form);
  const [ready, setReady] = useState(false);
  return (
    <div className={`scene ${ready ? 'ready' : ''}`} data-testid="galaxy-scene">
      <SceneBoundary>
        <Canvas
          camera={{ position: [0, 0, 15], fov: 52, near: 0.1, far: 200 }}
          dpr={[
            1,
            s.quality === 'Low'
              ? 1
              : s.quality === 'Medium'
                ? 1.25
                : s.quality === 'High'
                  ? 1.5
                  : 2,
          ]}
          gl={{
            antialias: false,
            alpha: false,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
          }}
          onCreated={({ gl }) => {
            gl.setClearColor('#030510');
            setReady(true);
          }}
        >
          <color attach="background" args={['#030510']} />
          <Runtime />
          <FlowCamera />
          <CosmicExperience />
          {s.quality !== 'Low' && (
            <EffectComposer multisampling={0}>
              <Bloom luminanceThreshold={0.75} intensity={s.bloom} mipmapBlur />
            </EffectComposer>
          )}
        </Canvas>
      </SceneBoundary>
      <div className="vignette" />
      {ready && <div key={form} className="scene-reveal" aria-hidden="true" />}
      {!ready && (
        <div className="loading">
          <div className="loading-orbit" />
          <span>FORMING YOUR UNIVERSE</span>
        </div>
      )}
    </div>
  );
}
