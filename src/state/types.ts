// Shared app-level types. Signal types live in src/signals/types.ts.

export type Phase = 'threshold' | 'consent' | 'attuning' | 'alive' | 'echo' | 'archive' | 'replay';
export type Mode = 'live' | 'synthetic';

export interface Preferences {
  sound: boolean;
  volume: number;
  reducedMotion: boolean;
  telemetry: boolean;
  expressionWeather: boolean;
  hasOnboarded: boolean;
  lastMode: Mode | null;
}

export interface SessionSummary {
  id: string;
  createdAt: string;
  durationSec: number;
  avgPulse: number | null;
  avgBreath: number | null;
  hrvRmssd: number | null;
  presenceRatio: number;
  breathVariability: number;
  pulseVariability: number;
  seed: number;
  palette: number;
  source: 'live' | 'synthetic';
  version: 1;
}

export interface BootstrapInfo {
  platform: string;
  arch: string;
  appVersion: string;
  sdkVersion: string;
  packaged: boolean;
  safeStorage: boolean;
  hasKey: boolean;
  keySource: string | null;
}

export interface AppError {
  title: string;
  message: string;
  detail?: string;
  code?: string | number;
  retryable?: boolean;
}

export interface ToastMessage {
  id: number;
  title: string;
  detail?: string;
  tone: 'neutral' | 'warning' | 'success';
}

export type KeySource = 'environment' | 'safeStorage' | 'session' | 'browser' | null;
