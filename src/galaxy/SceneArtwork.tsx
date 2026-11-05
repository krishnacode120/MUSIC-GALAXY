import { Suspense, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import type { ReactiveSignal } from './ReactiveSignal';
import { useExperience, inks } from '../stores/experience';

const artworkByForm: Record<number, string> = {
  0: '/galaxy-reference/planetary-nebula.webp',
  1: '/galaxy-reference/dust-galaxy.webp',
  2: '/galaxy-reference/blue-nebula.webp',
  4: '/galaxy-reference/spiral-vortex.webp',
  6: '/galaxy-reference/black-hole-flow.webp',
  8: '/galaxy-reference/event-horizon.webp',
};

const vertex = /* glsl */ `
varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;
const fragment = /* glsl */ `
varying vec2 vUv;
uniform sampler2D uArtwork;
uniform vec2 uImageSize;
uniform vec3 uAccent;
uniform float uTime,uBass,uMid,uEnergy,uBrightness;
void main(){
  vec2 uv=vUv;
  float planeAspect=38./29.;
  float imageAspect=uImageSize.x/uImageSize.y;
  if(imageAspect>planeAspect) uv.x=(uv.x-.5)*(planeAspect/imageAspect)+.5;
  else uv.y=(uv.y-.5)*(imageAspect/planeAspect)+.5;
  vec2 centered=uv-.5;
  float radius=length(centered);
  float flow=sin(centered.y*18.+uTime*.055)*cos(centered.x*15.-uTime*.04);
  float warp=.0015+uMid*.003+uBass*.002;
  uv+=vec2(-centered.y,centered.x)*(flow*warp);
  uv+=centered*(uBass*.0015*sin(uTime*.11+radius*13.));
  vec3 color=texture2D(uArtwork,uv).rgb;
  float tone=clamp(uMid*.1+uEnergy*.04,0.,.14);
  color=mix(color,color*uAccent,tone);
  color*=uBrightness*(.9+uEnergy*.11+uBass*.06);
  gl_FragColor=vec4(color,1.);
}
`;

function ArtworkPlane({ source, signal }: { source: string; signal: ReactiveSignal }) {
  const texture = useLoader(THREE.TextureLoader, source);
  texture.colorSpace = THREE.SRGBColorSpace;
  const uniforms = useMemo(
    () => ({
      uArtwork: { value: texture },
      uImageSize: { value: new THREE.Vector2(texture.image.width, texture.image.height) },
      uAccent: { value: new THREE.Color() },
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uEnergy: { value: 0 },
      uBrightness: { value: 0.65 },
    }),
    [texture],
  );
  useFrame(() => {
    const experience = useExperience.getState();
    uniforms.uTime.value = signal.time;
    uniforms.uBass.value = signal.bass;
    uniforms.uMid.value = signal.mid;
    uniforms.uEnergy.value = signal.energy;
    uniforms.uBrightness.value = experience.brightness;
    uniforms.uAccent.value.set(inks[experience.ink].colors[1]);
  });
  return (
    <mesh position={[0, 0, -7]}>
      <planeGeometry args={[38, 29]} />
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        toneMapped={false}
      />
    </mesh>
  );
}

export function SceneArtwork({ form, signal }: { form: number; signal: ReactiveSignal }) {
  const source = artworkByForm[form];
  if (!source) return null;
  return (
    <Suspense fallback={null}>
      <ArtworkPlane source={source} signal={signal} />
    </Suspense>
  );
}
