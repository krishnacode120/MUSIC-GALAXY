import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ReactiveSignal } from './ReactiveSignal';
import { useExperience, inks } from '../stores/experience';
import { useUniverse } from '../stores/universe';

/** Reused geometry/material and one draw call for each geometric form. */
export function GeometricModes({ form, signal }: { form: number; signal: ReactiveSignal }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = form === 3 ? 128 : form === 5 ? 400 : 247;
  const scratch = useMemo(
    () => ({
      object: new THREE.Object3D(),
      color: new THREE.Color(),
      low: new THREE.Color(),
      high: new THREE.Color(),
    }),
    [],
  );
  useFrame(() => {
    if (!mesh.current) return;
    const e = useExperience.getState(),
      s = useUniverse.getState().settings,
      { object: o, color, low, high } = scratch;
    low.set(inks[e.ink].colors[0]);
    high.set(inks[e.ink].colors[1]);
    const t = signal.time,
      spread = e.spread,
      strength = s.reducedMotion ? 0.2 : 1;
    for (let i = 0; i < count; i++) {
      const bin = 12 + Math.floor((i / count) * 51),
        value = signal.spectrum[bin];
      o.rotation.set(0, 0, 0);
      if (form === 3) {
        const height = 0.08 + value * 9 + signal.bass * Math.pow(1 - i / count, 3) * 1.3;
        const x = (i - 63.5) * 0.21;
        o.position.set(
          x * spread,
          (height * 0.5 - 2.5) * spread,
          Math.sin((i / count) * Math.PI) * -2,
        );
        o.scale.set(0.17 * spread, height * spread, 0.55);
      } else if (form === 5) {
        const x = i % 20,
          z = Math.floor(i / 20),
          r = Math.hypot(x - 9.5, z - 9.5);
        const local = signal.spectrum[12 + ((x * 3 + z * 2) % 52)];
        const height = 0.12 + local * 5 + signal.bass * Math.exp(-r * 0.12) * 1.8;
        o.position.set(
          (x - 9.5) * 0.8 * spread,
          (height * 0.5 - 1.8) * spread,
          (z - 9.5) * 0.8 * spread,
        );
        o.scale.set(0.7 * spread, height * spread, 0.7 * spread);
        o.rotation.y = Math.sin(r * 0.6 - t) * signal.mid * 0.16 * strength;
      } else {
        const x = i % 19,
          y = Math.floor(i / 19),
          local = signal.spectrum[12 + ((x * 3 + y * 5) % 52)];
        o.position.set(
          (x - 9) * 0.87 * spread,
          (y - 6) * 0.87 * spread,
          Math.sin(x * 0.4 + y * 0.4 - t) * signal.bass * 1.7,
        );
        o.scale.set(0.76 * spread, 0.76 * spread, 0.1 + local * 0.4);
        o.rotation.x = Math.sin(t * 0.32 + x * 0.38 + y * 0.52) * (0.08 + local * 0.72) * strength;
        o.rotation.y = Math.cos(t * 0.24 + x * 0.25) * signal.mid * 0.24 * strength;
      }
      o.updateMatrix();
      mesh.current.setMatrixAt(i, o.matrix);
      color.copy(low).lerp(high, Math.min(1, value * 0.65 + (i / count) * 0.6));
      color.multiplyScalar((0.5 + value * 0.55 + signal.hit * 0.1) * e.brightness);
      mesh.current.setColorAt(i, color);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh key={form} ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

const electroVertex = /* glsl */ `
uniform float uTime,uBass,uTreble,uSpectrum[64];varying float vPower;varying vec3 vNormal;
void main(){float bin=floor(uv.x*63.);float power=uSpectrum[int(bin)];vPower=power;
vec3 p=position*(1.+uBass*.08+power*.1)+normal*sin(position.y*6.+uTime*.5)*uTreble*.06;
vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const electroFragment = /* glsl */ `
uniform vec3 uColor;uniform float uEnergy,uBrightness;varying float vPower;varying vec3 vNormal;
void main(){float rim=pow(1.-abs(vNormal.z),2.);gl_FragColor=vec4(uColor*(.4+vPower*.65+uEnergy*.3)*uBrightness,.1+rim*.25+vPower*.1);}`;
export function ElectroSphere({ signal }: { signal: ReactiveSignal }) {
  const ref = useRef<THREE.ShaderMaterial>(null),
    mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uTreble: { value: 0 },
      uEnergy: { value: 0 },
      uBrightness: { value: 0.65 },
      uSpectrum: { value: signal.spectrum },
      uColor: { value: new THREE.Color() },
    }),
    [signal],
  );
  useFrame(() => {
    const u = ref.current?.uniforms,
      e = useExperience.getState();
    if (!u) return;
    u.uTime.value = signal.time;
    u.uBass.value = signal.bass;
    u.uTreble.value = signal.treble;
    u.uEnergy.value = signal.energy;
    u.uBrightness.value = e.brightness;
    u.uSpectrum.value = signal.spectrum;
    u.uColor.value.set(inks[e.ink].colors[0]);
    if (mesh.current) {
      mesh.current.rotation.y = signal.time * 0.09;
      mesh.current.scale.setScalar(e.spread);
    }
  });
  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[7.2, 80, 48]} />
      <shaderMaterial
        ref={ref}
        uniforms={uniforms}
        vertexShader={electroVertex}
        fragmentShader={electroFragment}
        wireframe
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
