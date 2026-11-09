import { useEffect, useRef } from 'react';
import { SignalEngine } from './engine';
import { signalRuntime } from './runtime';

/**
 * Owns the engine's clock. One rAF loop, independent of React and R3F.
 * The loop always reads the latest engine through a ref, so swapping sessions
 * does not require tearing down the animation loop.
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
        signalRuntime.publish(current.tick(dt));
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [active]);
}
