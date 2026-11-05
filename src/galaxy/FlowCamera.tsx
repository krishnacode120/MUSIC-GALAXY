import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useUniverse } from '../stores/universe';
import { useExperience } from '../stores/experience';
import * as THREE from 'three';
export function FlowCamera() {
  const ref = useRef<OrbitControlsImpl>(null),
    camera = useThree((s) => s.camera);
  const reset = useUniverse((s) => s.resetCamera),
    form = useExperience((s) => s.form);
  const transition = useRef(0),
    destination = useMemoDestination(form);
  useEffect(() => {
    transition.current = 1;
    ref.current?.target.set(0, 0, 0);
    ref.current?.update();
  }, [camera, reset, form]);
  useFrame((_, delta) => {
    if (!ref.current) return;
    const u = useUniverse.getState();
    if (transition.current > 0) {
      camera.position.lerp(destination, Math.min(1, delta * 3));
      transition.current = Math.max(0, transition.current - delta * 0.5);
    }
    ref.current.autoRotate = u.cinematic && !u.settings.reducedMotion;
    ref.current.autoRotateSpeed = u.settings.gentle ? 0.12 : 0.3;
  });
  return (
    <OrbitControls
      ref={ref}
      enableDamping
      dampingFactor={0.06}
      enablePan={false}
      minPolarAngle={0.08}
      maxPolarAngle={Math.PI - 0.08}
      minDistance={3}
      maxDistance={85}
      onStart={() => {
        transition.current = 0;
        useUniverse.setState({ cinematic: false });
      }}
    />
  );
}
function useMemoDestination(form: number) {
  const ref = useRef(new THREE.Vector3());
  const views = [
    [0, 0, 13],
    [0, 2, 17],
    [0, 0, 17],
    [0, 3, 18],
    [0, 5, 15],
    [0, 10, 16],
    [0, 0, 17],
    [0, 2, 17],
    [0, 0, 18],
    [0, 0, 21],
  ];
  ref.current.set(...((views[form] ?? views[0]) as [number, number, number]));
  return ref.current;
}
