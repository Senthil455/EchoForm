import { useSyncExternalStore } from 'react';
import { emptyFrame, type SignalFrame } from './types';

/**
 * The world reads `liveFrame` every animation frame. React UI reads
 * `uiFrame` through a 4Hz external store. This keeps 60Hz signal data out of
 * React's render path.
 */
class SignalRuntime {
  liveFrame: SignalFrame = emptyFrame('live');
  uiFrame: SignalFrame = this.liveFrame;

  private listeners = new Set<() => void>();
  private lastNotify = 0;
  private started = false;

  publish(frame: SignalFrame, force = false): void {
    this.liveFrame = frame;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (force || !this.started || now - this.lastNotify >= 250) {
      this.started = true;
      this.lastNotify = now;
      this.uiFrame = frame;
      for (const listener of this.listeners) listener();
    }
  }

  reset(source: SignalFrame['source'] = 'live'): void {
    const frame = emptyFrame(source);
    this.liveFrame = frame;
    this.uiFrame = frame;
    this.started = false;
    for (const listener of this.listeners) listener();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): SignalFrame => this.uiFrame;
}

export const signalRuntime = new SignalRuntime();

export function useSignalFrame(): SignalFrame {
  return useSyncExternalStore(signalRuntime.subscribe, signalRuntime.getSnapshot, signalRuntime.getSnapshot);
}
