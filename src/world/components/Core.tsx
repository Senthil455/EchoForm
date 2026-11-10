import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { damp } from '../../lib/math';
import type { Palette } from '../palettes';
import { coreFragment, coreVertex, haloFragment, haloVertex } from '../shaders';
import { worldSignals } from '../types';

interface Props {
  palette: Palette;
}

export function Core({ palette }: Props) {
  const group = useRef<THREE.Group>(null);
  const orbitA = useRef<THREE.Mesh>(null);
  const orbitB = useRef<THREE.Mesh>(null);
  const coreMaterial = useRef<THREE.ShaderMaterial>(null);
  const haloMaterial = useRef<THREE.ShaderMaterial>(null);

  const coreUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uPresence: { value: 0 },
      uCore: { value: new THREE.Color(palette.core) },
      uCoreHot: { value: new THREE.Color(palette.coreHot) },
      uField: { value: new THREE.Color(palette.field) },
    }),
    [palette],
  );

  const haloUniforms = useMemo(
    () => ({
      uCore: { value: new THREE.Color(palette.core) },
      uCoreHot: { value: new THREE.Color(palette.coreHot) },
      uPulse: { value: 0 },
      uPresence: { value: 0 },
    }),
    [palette],
  );

  useFrame((state, delta) => {
    const s = worldSignals;
    const dt = Math.min(delta, 0.1);
    const cu = coreMaterial.current?.uniforms;
    const hu = haloMaterial.current?.uniforms;
    if (cu) {
      cu.uTime.value = s.t;
      cu.uPulse.value = s.pulse;
      cu.uPresence.value = s.presence;
    }
    if (hu) {
      hu.uPulse.value = s.pulse;
      hu.uPresence.value = s.presence;
    }

    if (group.current) {
      const target = 1 + s.pulse * 0.075 + s.breath * 0.012;
      const scale = damp(group.current.scale.x, target, 8, dt);
      group.current.scale.setScalar(scale);
      group.current.rotation.y += dt * 0.06;
    }

    const slow = state.clock.elapsedTime * (1 - s.reduced * 0.85);
    if (orbitA.current) {
      orbitA.current.rotation.z = 0.42 + slow * 0.045;
      orbitA.current.rotation.x = 0.92 + Math.sin(slow * 0.07) * 0.14;
      const material = orbitA.current.material as THREE.MeshBasicMaterial;
      material.opacity = (0.1 + s.presence * 0.22) * (0.7 + s.pulse * 0.3);
    }
    if (orbitB.current) {
      orbitB.current.rotation.z = -0.52 - slow * 0.031;
      orbitB.current.rotation.x = 1.25 + Math.cos(slow * 0.05) * 0.16;
      const material = orbitB.current.material as THREE.MeshBasicMaterial;
      material.opacity = (0.06 + s.presence * 0.14) * (0.7 + s.pulse * 0.3);
    }
  });

  return (
    <group ref={group} position={[0, 0.22, 0]}>
      <mesh>
        <icosahedronGeometry args={[0.6, 7]} />
        <shaderMaterial
          ref={coreMaterial}
          uniforms={coreUniforms}
          vertexShader={coreVertex}
          fragmentShader={coreFragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      <Billboard>
        <mesh>
          <planeGeometry args={[8.4, 8.4]} />
          <shaderMaterial
            ref={haloMaterial}
            uniforms={haloUniforms}
            vertexShader={haloVertex}
            fragmentShader={haloFragment}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </Billboard>

      <mesh ref={orbitA} rotation={[0.92, 0, 0.42]}>
        <torusGeometry args={[1.06, 0.0045, 6, 160]} />
        <meshBasicMaterial
          color={palette.uiAccent}
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={orbitB} rotation={[1.25, 0, -0.52]}>
        <torusGeometry args={[1.42, 0.0035, 6, 160]} />
        <meshBasicMaterial
          color={palette.field}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
