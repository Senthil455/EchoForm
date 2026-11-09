export type SignalSource = 'live' | 'synthetic' | 'replay';
export type Quality = 'listening' | 'settling' | 'present';

export interface PulseState {
  /** Smoothed measured pulse, or null when there is no fresh stable value. */
  bpm: number | null;
  /** 0–100, as reported by the SDK. */
  confidence: number;
  stable: boolean;
  /** 0..1 within the current beat. */
  beatPhase: number;
  /** Increments on every beat. Used by audio and ring shaders. */
  beatCount: number;
  /** Seconds since the last beat. */
  sinceBeat: number;
}

export interface BreathState {
  /** Smoothed measured breathing rate, or null when there is no fresh stable value. */
  rate: number | null;
  confidence: number;
  stable: boolean;
  /** Normalized breathing waveform, -1 (exhale) .. +1 (inhale). */
  waveform: number;
  /** Normalized amplitude 0..1. */
  amplitude: number;
  /** 0..1 through the breathing cycle. */
  phase: number;
}

export interface SignalFrame {
  t: number;
  source: SignalSource;
  pulse: PulseState;
  breath: BreathState;
  hrv: { rmssd: number; stable: boolean } | null;
  /** Optional abstract weather input. Never rendered as an emotion label. */
  expression: { score: number; stable: boolean } | null;
  quality: Quality;
  /** Eased 0..1 presence, used to fade the world. */
  presence: number;
  validation: string;
  running: boolean;
}

export const emptyFrame = (source: SignalSource = 'live'): SignalFrame => ({
  t: 0,
  source,
  pulse: {
    bpm: null,
    confidence: 0,
    stable: false,
    beatPhase: 0,
    beatCount: 0,
    sinceBeat: 0,
  },
  breath: {
    rate: null,
    confidence: 0,
    stable: false,
    waveform: 0,
    amplitude: 0,
    phase: 0,
  },
  hrv: null,
  expression: null,
  quality: 'listening',
  presence: 0,
  validation: 'Waiting for your signal',
  running: false,
});
