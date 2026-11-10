import { Component, Suspense, useMemo, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { Phase } from '../state/types';
import { paletteFor } from './palettes';
import { Scene } from './Scene';
import type { WorldQuality } from './types';

interface Props {
  phase: Phase;
  paletteIndex: number;
  seed: number;
  reducedMotion: boolean;
  replayDuration?: number;
}

class SceneErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[echoform] world renderer failed; using the static fallback.', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function webGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    const lose = gl.getExtension('WEBGL_lose_context');
    lose?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function StaticFallback({ paletteIndex }: { paletteIndex: number }) {
  const palette = paletteFor(paletteIndex);
  return (
    <div
      className="world-fallback"
      style={{
        background: `radial-gradient(ellipse at 50% 58%, ${palette.ground}55 0%, ${palette.background} 48%, #020504 100%)`,
      }}
    />
  );
}

export function WorldCanvas({ phase, paletteIndex, seed, reducedMotion, replayDuration }: Props) {
  const supported = useMemo(webGLAvailable, []);
  const [quality, setQuality] = useState<WorldQuality>(() =>
    typeof window !== 'undefined' && window.innerWidth < 980 ? 'medium' : 'high',
  );
  const palette = paletteFor(paletteIndex);

  if (!supported) return <StaticFallback paletteIndex={paletteIndex} />;

  return (
    <div className="world-canvas" data-quality={quality} aria-hidden="true">
      <SceneErrorBoundary fallback={<StaticFallback paletteIndex={paletteIndex} />}>
        <Canvas
          dpr={[1, 1.75]}
          gl={{
            antialias: true,
            alpha: false,
            stencil: false,
            powerPreference: 'high-performance',
          }}
          camera={{ fov: 50, near: 0.1, far: 130, position: [0, 1.02, 10.15] }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.08;
            gl.outputColorSpace = THREE.SRGBColorSpace;
          }}
        >
          <Suspense fallback={null}>
            <Scene
              phase={phase}
              palette={palette}
              seed={seed}
              quality={quality}
              reducedMotion={reducedMotion}
              replayDuration={replayDuration}
            />
            <EffectComposer multisampling={0}>
              <Bloom
                mipmapBlur
                intensity={quality === 'low' ? 1.0 : 1.18}
                luminanceThreshold={quality === 'low' ? 0.08 : 0.1}
                luminanceSmoothing={0.32}
                radius={quality === 'low' ? 0.62 : 0.72}
              />
            </EffectComposer>
            <AdaptiveDpr />
            <PerformanceMonitor
              flipflops={2}
              onDecline={() =>
                setQuality((current) => (current === 'high' ? 'medium' : 'low'))
              }
            />
          </Suspense>
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
}
