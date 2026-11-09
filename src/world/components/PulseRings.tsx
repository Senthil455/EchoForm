import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Palette } from '../palettes';
import { signalRuntime } from '../../signals/runtime';
import { worldSignals } from '../types';

interface Props {
  palette: Palette;
}

const RING_COUNT = 3;

export function PulseRings({ palette }: Props) {
  const rings = useRef<Array<THREE.Mesh | null>>([]);
  const color = useMemo(() => new THREE.Color(palette.coreHot), [palette]);

  useFrame((_, delta) => {
    const s = worldSignals;
    const frame = signalRuntime.liveFrame;
    const dt = Math.min(delta, 0.1);
    const phase = frame.running ? frame.pulse.beatPhase : (s.t * 0.82) % 1;
    const presence = s.presence;
    const base = 0.08 + presence * 0.42;

    for (let i = 0; i < RING_COUNT; i++) {
      const ring = rings.current[i];
      if (!ring) continue;
      const local = (phase + i / RING_COUNT) % 1;
      ring.scale.setScalar(0.55 + local * 4.4);
      const material = ring.material as THREE.MeshBasicMaterial;
      const fade = Math.pow(1 - local, 2.6);
      material.opacity = THREE.MathUtils.damp(material.opacity, fade * base, 10, dt);
    }
  });

  return (
    <group position={[0, -0.38, 0]}>
      {Array.from({ length: RING_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(node) => {
            rings.current[i] = node;
          }}
          rotation={[-Math.PI / 2, 0, i * 0.4]}
        >
          <ringGeometry args={[0.94, 0.975, 128]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
