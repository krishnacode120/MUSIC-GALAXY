import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ReactiveSignal } from './ReactiveSignal';
import { useExperience } from '../stores/experience';

const surfaceVertex = /* glsl */ `
varying vec2 vUv;varying vec3 vNormal;
void main(){vUv=uv;vNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;
const surfaceFragment = /* glsl */ `
varying vec2 vUv;varying vec3 vNormal;uniform vec3 uOcean,uLand,uAir;uniform float uTime,uEnergy,uBrightness;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=noise(p)*a;p=p*2.02+13.1;a*=.5;}return n;}
void main(){
 float clouds=fbm(vec2(vUv.x*10.+uTime*.008,vUv.y*17.));
 float bands=smoothstep(.44,.58,clouds+sin(vUv.y*52.+clouds*5.)*.13);
 vec3 ground=mix(uOcean,uLand,bands);float light=.26+.74*max(dot(normalize(vNormal),normalize(vec3(-.45,.55,.72))),0.);
 float rim=pow(1.-abs(normalize(vNormal).z),3.);
 vec3 color=ground*light+uAir*rim*(.13+uEnergy*.05);
 gl_FragColor=vec4(color*uBrightness,1.);
}`;
const ringVertex = /* glsl */ `
varying float vRadius;
void main(){vRadius=length(position.xy);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;
const ringFragment = /* glsl */ `
varying float vRadius;uniform vec3 uColor;uniform float uBrightness;
void main(){float bands=.72+.16*sin(vRadius*92.)+.08*sin(vRadius*215.);gl_FragColor=vec4(uColor*bands*uBrightness,.44+.26*bands);}
`;
const starFragment = /* glsl */ `
varying vec3 vNormal;uniform vec3 uColor;uniform float uTime,uEnergy,uBrightness;
void main(){vec3 n=normalize(vNormal);float veins=sin(n.x*17.+n.y*9.+uTime*.03)*sin(n.z*13.-n.y*11.);float glow=.68+veins*.08+uEnergy*.1;
gl_FragColor=vec4(uColor*glow*uBrightness,1.);}
`;

function Planet({
  signal,
  position,
  radius,
  ocean,
  land,
  air,
  ring = false,
}: {
  signal: ReactiveSignal;
  position: [number, number, number];
  radius: number;
  ocean: string;
  land: string;
  air: string;
  ring?: boolean;
}) {
  const body = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      uOcean: { value: new THREE.Color(ocean) },
      uLand: { value: new THREE.Color(land) },
      uAir: { value: new THREE.Color(air) },
      uTime: { value: 0 },
      uEnergy: { value: 0 },
      uBrightness: { value: 0.65 },
    }),
    [ocean, land, air],
  );
  useFrame(() => {
    const experience = useExperience.getState();
    uniforms.uTime.value = signal.time;
    uniforms.uEnergy.value = signal.energy;
    uniforms.uBrightness.value = experience.brightness;
    if (body.current) {
      body.current.rotation.y = signal.time * 0.018;
      body.current.scale.setScalar(experience.spread * (1 + signal.bass * 0.012));
    }
  });
  return (
    <group position={position}>
      {ring && (
        <mesh rotation={[1.19, 0.12, -0.16]} scale={[1, 0.72, 1]}>
          <ringGeometry args={[radius * 1.28, radius * 1.85, 192]} />
          <shaderMaterial
            vertexShader={ringVertex}
            fragmentShader={ringFragment}
            uniforms={{
              uColor: { value: new THREE.Color('#d39a69') },
              uBrightness: { value: 0.68 },
            }}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      <mesh ref={body}>
        <sphereGeometry args={[radius, 72, 56]} />
        <shaderMaterial
          vertexShader={surfaceVertex}
          fragmentShader={surfaceFragment}
          uniforms={uniforms}
        />
      </mesh>
    </group>
  );
}

function WarmStar({ signal }: { signal: ReactiveSignal }) {
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#ffad58') },
      uTime: { value: 0 },
      uEnergy: { value: 0 },
      uBrightness: { value: 0.65 },
    }),
    [],
  );
  useFrame(() => {
    const experience = useExperience.getState();
    uniforms.uTime.value = signal.time;
    uniforms.uEnergy.value = signal.energy;
    uniforms.uBrightness.value = experience.brightness;
    if (mesh.current) mesh.current.scale.setScalar(1 + signal.energy * 0.025);
  });
  return (
    <mesh ref={mesh} position={[8.1, 1.1, -2.5]}>
      <sphereGeometry args={[0.75, 48, 32]} />
      <shaderMaterial
        vertexShader={surfaceVertex.replace('vUv=uv;', '')}
        fragmentShader={starFragment}
        uniforms={uniforms}
        toneMapped={false}
      />
    </mesh>
  );
}

export function CelestialBodies({ signal }: { signal: ReactiveSignal }) {
  return (
    <group>
      <Planet
        signal={signal}
        position={[-4.9, -2.65, 1.2]}
        radius={2.45}
        ocean="#074c50"
        land="#51847c"
        air="#66e7ce"
        ring
      />
      <Planet
        signal={signal}
        position={[-8.1, 4.25, -0.5]}
        radius={0.82}
        ocean="#5f2c35"
        land="#cf7954"
        air="#ffbd78"
      />
      <Planet
        signal={signal}
        position={[8.15, -3.55, 0.4]}
        radius={1.05}
        ocean="#034b5c"
        land="#24a4a5"
        air="#66e7ff"
      />
      <Planet
        signal={signal}
        position={[8.8, 5.5, -0.7]}
        radius={0.26}
        ocean="#075e62"
        land="#12a3a0"
        air="#53f4df"
      />
      <WarmStar signal={signal} />
    </group>
  );
}
