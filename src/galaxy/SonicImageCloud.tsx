import { Suspense, useMemo } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useExperience, inks } from '../stores/experience';
import { useUniverse } from '../stores/universe';
import type { ReactiveSignal } from './ReactiveSignal';
import { seeded } from '../utils/random';

const artworkByForm: Record<number, string> = {
  0: '/galaxy-reference/planetary-nebula.webp',
  1: '/galaxy-reference/dust-galaxy.webp',
  2: '/galaxy-reference/blue-nebula.webp',
  4: '/galaxy-reference/spiral-vortex.webp',
  6: '/galaxy-reference/black-hole-flow.webp',
  8: '/galaxy-reference/event-horizon.webp',
};
const particleVertex = /* glsl */ `
attribute vec3 aColor;
attribute float aSeed,aBand,aLight,aSize;
uniform float uTime,uBass,uMid,uTreble,uEnergy,uHit,uRatio,uBrightness;
uniform vec3 uLayers;
uniform vec3 uMidColor,uHighColor;
varying vec3 vColor;
varying float vAlpha,vSoftness;
void main(){
  vec3 p=position;
  float radius=length(p.xy)+.001;
  float angle=atan(p.y,p.x);
  float phase=angle*2.4-radius*.52+aSeed*6.28318+uTime*.24;
  float currentBand=aBand<.5?uBass:aBand<1.5?uMid:uTreble;
  float curl=sin(phase)+.36*sin(phase*2.-uTime*.11);
  vec2 radial=normalize(p.xy);
  vec2 tangent=vec2(-radial.y,radial.x);
  p.xy*=1.+uBass*(.1+aBand*.03)+uHit*.022;
  p.xy+=radial*(curl*(.035+uBass*.12));
  p.xy+=tangent*(curl*(.075+uMid*.28));
  p.xy+=vec2(sin(p.y*.42+uTime*.18+aSeed*4.),cos(p.x*.38-uTime*.14+aSeed*5.))*(.055+uMid*.2);
  p.z+=sin(phase*1.7+uTime*.17)*(.1+uTreble*.26+uEnergy*.1);
  vec4 mv=modelViewMatrix*vec4(p,1.);
  gl_Position=projectionMatrix*mv;
  gl_PointSize=clamp(aSize*uRatio*48./max(2.,-mv.z)*(1.+currentBand*.34),.7,5.5);
  vec3 tint=aBand<.5?vec3(1.,.4,.16):aBand<1.5?uMidColor:uHighColor;
  float blend=.14+currentBand*.48+uEnergy*.08;
  vColor=mix(aColor,tint,blend)*(uBrightness*(.48+aLight*.7+currentBand*.22+uEnergy*.14));
  float layer=aBand<.5?uLayers.x:aBand<1.5?uLayers.y:uLayers.z;
  vAlpha=smoothstep(.025,.34,aLight)*layer*(.56+aBand*.08+currentBand*.28+uEnergy*.12);
  vSoftness=aSeed;
}`;
const particleFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha,vSoftness;
void main(){
  vec2 p=gl_PointCoord-.5;
  float d=dot(p,p);
  if(d>.25)discard;
  float halo=exp(-d*22.);
  float core=exp(-d*105.);
  float shimmer=.9+.1*sin(vSoftness*35.);
  gl_FragColor=vec4(vColor*(halo*.78+core*.5),halo*vAlpha*shimmer);
}`;

function sampleArtwork(image: HTMLImageElement, count: number, seed: number) {
  const aspect = 16 / 9,
    width = Math.max(1, Math.round(Math.sqrt(count * aspect))),
    height = Math.max(1, Math.ceil(count / width)),
    canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('This browser could not prepare the galaxy particle field.');

  const cover = Math.max(width / image.width, height / image.height),
    drawWidth = image.width * cover,
    drawHeight = image.height * cover;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  const pixels = context.getImageData(0, 0, width, height).data,
    positions = new Float32Array(count * 3),
    colors = new Float32Array(count * 3),
    seeds = new Float32Array(count),
    bands = new Float32Array(count),
    light = new Float32Array(count),
    sizes = new Float32Array(count),
    random = seeded(seed);

  for (let i = 0; i < count; i++) {
    const x = Math.floor(random() * width),
      y = Math.floor(random() * height),
      offset = (y * width + x) * 4,
      red = pixels[offset] / 255,
      green = pixels[offset + 1] / 255,
      blue = pixels[offset + 2] / 255,
      luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722,
      index = i * 3;
    positions[index] = ((x + random()) / width - 0.5) * 27;
    positions[index + 1] = (0.5 - (y + random()) / height) * 15.2;
    positions[index + 2] = (random() - 0.5) * (0.8 + luminance * 0.9);
    colors[index] = red;
    colors[index + 1] = green;
    colors[index + 2] = blue;
    seeds[i] = random();
    bands[i] = red > green * 1.12 && red > blue * 1.1 ? 0 : luminance > 0.72 ? 2 : 1;
    light[i] = luminance;
    sizes[i] = 0.55 + random() * 0.7;
  }
  return { positions, colors, seeds, bands, light, sizes };
}

function ImageParticles({
  source,
  form,
  signal,
  count,
}: {
  source: string;
  form: number;
  signal: ReactiveSignal;
  count: number;
}) {
  const image = useLoader(THREE.TextureLoader, source),
    seed = useUniverse((state) => state.dna?.seed ?? 52841),
    renderer = useThree((state) => state.gl);
  const data = useMemo(
    () => sampleArtwork(image.image as HTMLImageElement, count, seed + form * 7919),
    [image, count, seed, form],
  );
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBass: { value: 0 },
      uMid: { value: 0 },
      uTreble: { value: 0 },
      uEnergy: { value: 0 },
      uHit: { value: 0 },
      uRatio: { value: 1 },
      uBrightness: { value: 0.65 },
      uLayers: { value: new THREE.Vector3(1, 1, 1) },
      uMidColor: { value: new THREE.Color() },
      uHighColor: { value: new THREE.Color() },
    }),
    [],
  );
  useFrame(() => {
    const experience = useExperience.getState(),
      u = uniforms;
    u.uTime.value = signal.time * 3.2;
    u.uBass.value = signal.bass;
    u.uMid.value = signal.mid;
    u.uTreble.value = signal.treble;
    u.uEnergy.value = signal.energy;
    u.uHit.value = signal.hit;
    u.uRatio.value = renderer.getPixelRatio();
    u.uBrightness.value = experience.brightness;
    u.uLayers.value.set(experience.low, experience.body, experience.detail);
    u.uMidColor.value.set(inks[experience.ink].colors[1]);
    u.uHighColor.value.set(inks[experience.ink].colors[2]);
  });
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[data.colors, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[data.seeds, 1]} />
        <bufferAttribute attach="attributes-aBand" args={[data.bands, 1]} />
        <bufferAttribute attach="attributes-aLight" args={[data.light, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[data.sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={particleVertex}
        fragmentShader={particleFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

export function SonicImageCloud({ form, signal }: { form: number; signal: ReactiveSignal }) {
  const source = artworkByForm[form];
  const quality = useUniverse((state) => state.settings.quality);
  const density = useExperience((state) => state.density);
  if (!source) return null;
  const baseCount = { Low: 24000, Medium: 52000, High: 96000, Ultra: 160000 }[quality];
  return (
    <Suspense fallback={null}>
      <ImageParticles
        key={`${form}-${quality}-${density}`}
        source={source}
        form={form}
        signal={signal}
        count={Math.floor(baseCount * density)}
      />
    </Suspense>
  );
}
