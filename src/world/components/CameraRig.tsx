import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { damp } from '../../lib/math';
import { worldSignals } from '../types';

const target = new THREE.Vector3();
const look = new THREE.Vector3();

export function CameraRig() {
  const camera = useThree((state) => state.camera);
  const pointer = useThree((state) => state.pointer);

  useFrame((state, delta) => {
    const s = worldSignals;
    const dt = Math.min(delta, 0.1);
    const t = state.clock.elapsedTime;
    const drift = 1 - s.reduced;
    const awake = s.awake;
    const echo = s.echo;

    target.set(
      Math.sin(t * 0.071) * 0.42 * drift + pointer.x * 0.4 * drift,
      1.02 + Math.sin(t * 0.043) * 0.15 * drift + s.breath * 0.1 * s.breathAmp,
      10.15 - awake * 1.55 + Math.sin(t * 0.029) * 0.2 * drift + echo * 2.1,
    );

    camera.position.x = damp(camera.position.x, target.x, 0.9, dt);
    camera.position.y = damp(camera.position.y, target.y, 0.9, dt);
    camera.position.z = damp(camera.position.z, target.z, 0.9, dt);

    look.set(
      Math.sin(t * 0.055) * 0.12 * drift,
      0.18 + s.breath * 0.12 * s.breathAmp - echo * 0.15,
      0,
    );
    camera.lookAt(look);
  });

  return null;
}
