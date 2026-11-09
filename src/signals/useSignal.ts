import { useEffect, useRef } from 'react';
import { SignalEngine } from './engine';
import { signalRuntime } from './runtime';

/**
 * Owns the engine's clock. One rAF loop, independent of React and R3F.
 * Returns a ref so callers can build summaries and inspect the engine.
 */
export function useSignalClock(engine: SignalEngine | null, active: boolean): void {
  const engineRef = useRef(engine);
  engineRef.current = engine;

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    let alive = true;

    const loop = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const current = engineRef.current;
      if (current) {
        const frame = current.tick(dt);
        signalRuntime.publish(frame);
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [active]);

  // If the engine instance changes while active, the loop reads the latest ref.
  useEffect(() => {
    if (engine) lastStable = engine;
  }, [engine]);
}

// Keep the most recent engine for components that need to build a summary
// without waiting for a render. (Not used to drive visuals.)
let lastStable: SignalEngine | null = null;
export function getLastEngine(): SignalEngine | null {
  return lastStable;
}
