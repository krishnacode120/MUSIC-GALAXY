import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useUniverse } from '../stores/universe';
import { useExperience, inks } from '../stores/experience';
import { seeded } from '../utils/random';
import { ReactiveSignal } from './ReactiveSignal';
import { GeometricModes, ElectroSphere } from './GeometricModes';
import { WaveOcean } from './WaveOcean';
import { SceneArtwork } from './SceneArtwork';
import {
  particleVertex,
  particleFragment,
  cloudVertex,
  cloudFragment,
  starsVertex,
  starsFragment,
} from '../shaders/reactiveParticles';

const counts = { Low: 24000, Medium: 52000, High: 96000, Ultra: 160000 };
const matrixCounts = { Low: 2400, Medium: 3800, High: 5800, Ultra: 8600 };
function glyphAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d')!;
  context.font = '23px monospace';
  context.fillStyle = '#fff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const glyphs =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZアイウエオカキクケコサシスセソタチツテトナニヌネノ';
  for (let i = 0; i < 64; i++)
    context.fillText(glyphs[i % glyphs.length], (i % 8) * 32 + 16, Math.floor(i / 8) * 32 + 16);
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}
export function CosmicExperience() {
  const quality = useUniverse((s) => s.settings.quality),
    seed = useUniverse((s) => s.dna?.seed ?? 52841),
    density = useExperience((s) => s.density),
    form = useExperience((s) => s.form);
  const count = [3, 5, 7].includes(form)
      ? 0
      : Math.floor((form === 9 ? matrixCounts[quality] : counts[quality]) * density),
    material = useRef<THREE.ShaderMaterial>(null),
    cloud = useRef<THREE.ShaderMaterial>(null),
    signal = useMemo(() => new ReactiveSignal(), []),
    texture = useMemo(glyphAtlas, []),
    gl = useThree((s) => s.gl);
  useEffect(() => () => texture.dispose(), [texture]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMode: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uEnergy: { value: 0 },
      uHit: { value: 0 },
      uTravel: { value: 0 },
      uRatio: { value: 1 },
      uSpread: { value: 1 },
      uBrightness: { value: 0.65 },
      uSpectrum: { value: signal.spectrum },
      uWaveform: { value: signal.waveform },
      uGlyphs: { value: texture },
      uLowColor: { value: new THREE.Color() },
      uBodyColor: { value: new THREE.Color() },
      uDetailColor: { value: new THREE.Color() },
      uLayers: { value: new THREE.Vector3(1, 1, 1) },
    }),
    [signal, texture],
  );
  const clouds = useMemo(
    () => ({
      uTime: { value: 0 },
      uMid: { value: 0 },
      uEnergy: { value: 0 },
      uBass: { value: 0 },
      uHit: { value: 0 },
      uStyle: { value: 1 },
      uTint: { value: new THREE.Color() },
      uBrightness: { value: 0.65 },
      uTint2: { value: new THREE.Color() },
    }),
    [],
  );
  const data = useMemo(() => {
    const rand = seeded(seed),
      p = new Float32Array(count * 3),
      phase = new Float32Array(count),
      lane = new Float32Array(count),
      band = new Float32Array(count),
      size = new Float32Array(count);
    const normal = () =>
      Math.sqrt(-2 * Math.log(Math.max(0.0001, rand()))) * Math.cos(rand() * Math.PI * 2);
    for (let i = 0; i < count; i++) {
      p.set([normal(), normal(), normal()], i * 3);
      phase[i] = rand();
      lane[i] = rand();
      band[i] = i % 3;
      size[i] = 0.2 + Math.pow(rand(), 4) * 0.65;
    }
    return { p, phase, lane, band, size };
  }, [count, seed]);
  useFrame((_, delta) => {
    const e = useExperience.getState();
    signal.update(delta);
    const u = material.current?.uniforms,
      palette = inks[e.ink] ?? inks[0];
    if (u) {
      u.uTime.value = signal.time;
      u.uTravel.value = signal.travel;
      u.uMode.value = e.form;
      u.uBass.value = signal.bass;
      u.uMid.value = signal.mid;
      u.uTreble.value = signal.treble;
      u.uEnergy.value = signal.energy;
      u.uHit.value = signal.hit;
      u.uRatio.value = gl.getPixelRatio();
      u.uSpread.value = e.spread;
      u.uBrightness.value = e.brightness;
      u.uSpectrum.value = signal.spectrum;
      u.uWaveform.value = signal.waveform;
      u.uLowColor.value.set(palette.colors[0]);
      u.uBodyColor.value.set(palette.colors[1]);
      u.uDetailColor.value.set(palette.colors[2]);
      if (e.colorDrift)
        u.uBodyColor.value.lerp(u.uDetailColor.value, Math.min(0.45, signal.mid * 0.3));
      u.uLayers.value.set(e.low, e.body, e.detail);
    }
    if (cloud.current) {
      const c = cloud.current.uniforms;
      c.uTime.value = signal.time;
      c.uMid.value = signal.mid;
      c.uEnergy.value = signal.energy;
      c.uBass.value = signal.bass;
      c.uHit.value = signal.hit;
      c.uBrightness.value = e.brightness;
      c.uStyle.value = e.form === 0 ? 0 : e.form === 6 ? 2 : 1;
      const blending = e.form === 6 ? THREE.NormalBlending : THREE.AdditiveBlending;
      if (cloud.current.blending !== blending) {
        cloud.current.blending = blending;
        cloud.current.needsUpdate = true;
      }
      c.uTint.value.set(palette.colors[1]);
      c.uTint2.value.set(palette.colors[0]);
    }
    gl.domElement.dataset.experience = String(e.form);
  });
  return (
    <>
      <DistantStars signal={signal} />
      <SceneArtwork form={form} signal={signal} />
      {![3, 5, 7].includes(form) && (
        <points frustumCulled={false}>
          <bufferGeometry key={`${count}-${seed}`}>
            <bufferAttribute attach="attributes-position" args={[data.p, 3]} />
            <bufferAttribute attach="attributes-aPhase" args={[data.phase, 1]} />
            <bufferAttribute attach="attributes-aLane" args={[data.lane, 1]} />
            <bufferAttribute attach="attributes-aBand" args={[data.band, 1]} />
            <bufferAttribute attach="attributes-aSize" args={[data.size, 1]} />
          </bufferGeometry>
          <shaderMaterial
            ref={material}
            uniforms={uniforms}
            vertexShader={particleVertex}
            fragmentShader={particleFragment}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}
      {form === 2 && (
        <mesh position={[0, 0, -6]}>
          <planeGeometry args={form === 6 ? [30, 30] : [38, 29]} />
          <shaderMaterial
            ref={cloud}
            uniforms={clouds}
            vertexShader={cloudVertex}
            fragmentShader={cloudFragment}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
      {[3, 5, 7].includes(form) && <GeometricModes key={form} form={form} signal={signal} />}
      {form === 4 && <WaveOcean signal={signal} />}
      {form === 8 && <ElectroSphere signal={signal} />}
    </>
  );
}
function DistantStars({ signal }: { signal: ReactiveSignal }) {
  const ref = useRef<THREE.ShaderMaterial>(null),
    quality = useUniverse((s) => s.settings.quality),
    count = quality === 'Low' ? 2800 : 6400,
    gl = useThree((s) => s.gl);
  const data = useMemo(() => {
    const rand = seeded(7391),
      p = new Float32Array(count * 3),
      size = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const y = rand() * 2 - 1,
        a = rand() * Math.PI * 2,
        r = 45 + rand() * 60,
        flat = Math.sqrt(1 - y * y);
      p.set([Math.cos(a) * flat * r, y * r, Math.sin(a) * flat * r], i * 3);
      size[i] = 0.2 + rand() * 0.32;
    }
    return { p, size };
  }, [count]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTreble: { value: 0 },
      uRatio: { value: 1 },
      uBrightness: { value: 0.65 },
    }),
    [],
  );
  useFrame(() => {
    const u = ref.current?.uniforms;
    if (u) {
      u.uTime.value = signal.time;
      u.uTreble.value = signal.treble;
      u.uRatio.value = gl.getPixelRatio();
      u.uBrightness.value = useExperience.getState().brightness;
    }
  });
  return (
    <points>
      <bufferGeometry key={count}>
        <bufferAttribute attach="attributes-position" args={[data.p, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[data.size, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={ref}
        uniforms={uniforms}
        vertexShader={starsVertex}
        fragmentShader={starsFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
