import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ReactiveSignal } from './ReactiveSignal';
import { useExperience, inks } from '../stores/experience';
const vertex = /* glsl */ `
uniform float uTime;uniform float uBass;uniform float uMid;uniform float uSpectrum[64];varying vec2 vUv;varying float vHeight;varying float vDistance;
void main(){vUv=uv;vec3 p=position;float x=p.x,z=-p.y-8.;float bin=floor(12.+uv.x*51.);float spectral=uSpectrum[int(bin)];float height=sin(x*.22+uTime)*cos(z*.18+uTime*.55)*(.28+uBass*2.8)+sin(z*.55-uTime*1.3)*(.12+uMid)+spectral*2.;p.z=height;vHeight=height;vec4 mv=modelViewMatrix*vec4(p,1.);vDistance=-mv.z;gl_Position=projectionMatrix*mv;}
`;
const fragment = /* glsl */ `
varying vec2 vUv;varying float vHeight;varying float vDistance;uniform vec3 uLowColor,uHighColor;uniform float uBrightness;
void main(){vec2 grid=abs(fract(vUv*vec2(96.,140.))-.5);vec2 aa=fwidth(vUv*vec2(96.,140.));float line=1.-min(smoothstep(.015,.015+aa.x,grid.x),smoothstep(.015,.015+aa.y,grid.y));float fade=1.-smoothstep(30.,70.,vDistance);vec3 color=mix(uLowColor,uHighColor,smoothstep(-2.,3.,vHeight));gl_FragColor=vec4(color*.8*uBrightness,line*.28*fade);}
`;
export function WaveOcean({ signal }: { signal: ReactiveSignal }) {
  const ref = useRef<THREE.ShaderMaterial>(null),
    mesh = useRef<THREE.Mesh>(null),
    uniforms = useMemo(
      () => ({
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uSpectrum: { value: new Float32Array(64) },
        uBrightness: { value: 0.65 },
        uLowColor: { value: new THREE.Color() },
        uHighColor: { value: new THREE.Color() },
      }),
      [],
    );
  useFrame(() => {
    const e = useExperience.getState();
    if (!ref.current) return;
    const u = ref.current.uniforms,
      f = signal;
    u.uTime.value = f.time;
    u.uBass.value = f.bass;
    u.uMid.value = f.mid;
    u.uSpectrum.value = f.spectrum;
    u.uBrightness.value = e.brightness;
    u.uLowColor.value.set(inks[e.ink].colors[0]);
    u.uHighColor.value.set(inks[e.ink].colors[1]);
    if (mesh.current) {
      mesh.current.scale.setScalar(e.spread);
      mesh.current.position.set(0, -0.08 * e.spread, -8 * e.spread);
    }
  });
  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, -8]}>
      <planeGeometry args={[48, 60, 160, 180]} />
      <shaderMaterial
        ref={ref}
        uniforms={uniforms}
        vertexShader={vertex}
        fragmentShader={fragment}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
