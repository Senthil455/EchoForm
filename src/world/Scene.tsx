import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clamp, damp } from '../lib/math';
import { signalRuntime } from '../signals/runtime';
import type { Phase } from '../state/types';
import type { Palette } from './palettes';
import { worldSignals, type WorldQuality } from './types';
import { BreathField } from './components/BreathField';
import { CameraRig } from './components/CameraRig';
import { Core } from './components/Core';
import { GroundPool } from './components/GroundPool';
import { PresenceOrganism } from './components/PresenceOrganism';
import { PulseRings } from './components/PulseRings';
import { Ribbons } from './components/Ribbons';
import { Sky } from './components/Sky';
import { SporeDust } from './components/SporeDust';

interface Props {
  phase: Phase;
  palette: Palette;
  seed: number;
  quality: WorldQuality;
  reducedMotion: boolean;
  replayDuration?: number;
}

const GROWTH_SECONDS = 240;

/**
 * Converts the UI phase + the latest signal frame into the mutable uniform
 * contract every world component reads. Runs before the visual layers so the
 * whole scene shares one coherent state each frame.
 */
function WorldState({ phase, reducedMotion, replayDuration }: Omit<Props, 'palette' | 'seed' | 'quality'>) {
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const t = state.clock.elapsedTime;
    const frame = signalRuntime.liveFrame;
    const running = frame.running;

    const worldActive = phase === 'attuning' || phase === 'alive' || phase === 'replay';
    const presenceFloor =
      phase === 'threshold' || phase === 'consent' ? 0.1 : phase === 'archive' ? 0.02 : 0;
    let presenceTarget = Math.max(frame.presence, presenceFloor);
    if (phase === 'echo') presenceTarget = 0.14;
    if (phase === 'archive') presenceTarget = 0.02;

    const awakeTarget =
      phase === 'alive' || phase === 'replay'
        ? 1
        : phase === 'attuning'
          ? 0.56
          : phase === 'echo'
            ? 0.52
            : 0.14;

    const fallbackBreath = Math.sin(t * 0.26) * 0.28;
    const breath = running ? frame.breath.waveform : fallbackBreath;
    const breathAmp = running ? Math.max(0.35, frame.breath.amplitude) : 0.34;

    const phase01 = running && phase !== 'echo' ? frame.pulse.beatPhase : (t * 0.94) % 1;
    const pulse = Math.exp(-phase01 * 4.3) * (running && phase !== 'echo' ? 1 : 0.42);

    let growthTarget = 0.18;
    if (phase === 'attuning') growthTarget = 0.24;
    if (phase === 'alive' || phase === 'echo') {
      growthTarget = 0.24 + 0.76 * (1 - Math.exp(-frame.t / 95));
    }
    if (phase === 'replay') {
      const elapsed = replayDuration ?? 0;
      growthTarget = 0.24 + 0.76 * (1 - Math.exp(-elapsed / 95));
    }

    const s = worldSignals;
    s.t = t;
    s.presence = damp(s.presence, presenceTarget, worldActive ? 0.9 : 1.3, dt);
    s.awake = damp(s.awake, awakeTarget, 0.7, dt);
    s.breath = damp(s.breath, breath, 5.5, dt);
    s.breathAmp = damp(s.breathAmp, breathAmp, 1.1, dt);
    s.breathRate = running && frame.breath.rate != null ? clamp(frame.breath.rate / 30, 0, 1) : 0.45;
    s.pulse = pulse;
    s.pulseRate = running && frame.pulse.bpm != null ? clamp(frame.pulse.bpm / 140, 0, 1) : 0.44;
    s.growth = damp(s.growth, growthTarget, 0.22, dt);
    s.echo = damp(s.echo, phase === 'echo' ? 1 : 0, phase === 'echo' ? 1.4 : 3.2, dt);
    s.hue = (Math.sin(t * 0.041) + 1) * 0.5;
    s.expression = frame.expression ? frame.expression.score : 0;
    s.reduced = reducedMotion ? 1 : 0;
  });

  return null;
}

function WorldGroup({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.1);
    const s = worldSignals;
    const scaleTarget = 1 - s.echo * 0.32;
    const scale = damp(group.current.scale.x, scaleTarget, 1.6, dt);
    group.current.scale.setScalar(scale);
    group.current.position.y = damp(group.current.position.y, s.echo * 0.4, 1.6, dt);
    group.current.rotation.y += dt * (0.005 + s.awake * 0.0035) * (1 - s.reduced * 0.8);
  });

  return <group ref={group}>{children}</group>;
}

export function Scene({ phase, palette, seed, quality, reducedMotion, replayDuration }: Props) {
  return (
    <>
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.fog, 10, 34]} />
      <WorldState phase={phase} reducedMotion={reducedMotion} replayDuration={replayDuration} />
      <CameraRig />
      <Sky palette={palette} />
      <WorldGroup>
        <GroundPool palette={palette} />
        <BreathField palette={palette} quality={quality} seed={seed} />
        <Ribbons palette={palette} seed={seed} />
        <PresenceOrganism palette={palette} seed={seed} />
        <SporeDust palette={palette} seed={seed} quality={quality} />
        <Core palette={palette} />
        <PulseRings palette={palette} />
      </WorldGroup>
    </>
  );
}
