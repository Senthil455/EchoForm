import type { Preferences, SessionSummary } from './types';

const PREFS_KEY = 'echoform:v1:prefs';
const ECHOES_KEY = 'echoform:v1:echoes';

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export const defaultPreferences = (): Preferences => ({
  sound: false,
  volume: 0.18,
  reducedMotion: prefersReducedMotion(),
  telemetry: false,
  expressionWeather: false,
  hasOnboarded: false,
  lastMode: null,
});

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function loadPreferences(): Preferences {
  const defaults = defaultPreferences();
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : defaults.sound,
      volume: isFiniteNumber(parsed.volume) ? Math.min(1, Math.max(0, parsed.volume)) : defaults.volume,
      reducedMotion:
        typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : defaults.reducedMotion,
      telemetry: typeof parsed.telemetry === 'boolean' ? parsed.telemetry : defaults.telemetry,
      expressionWeather:
        typeof parsed.expressionWeather === 'boolean'
          ? parsed.expressionWeather
          : defaults.expressionWeather,
      hasOnboarded:
        typeof parsed.hasOnboarded === 'boolean' ? parsed.hasOnboarded : defaults.hasOnboarded,
      lastMode: parsed.lastMode === 'live' || parsed.lastMode === 'synthetic' ? parsed.lastMode : null,
    };
  } catch {
    return defaults;
  }
}

export function savePreferences(prefs: Preferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* storage may be unavailable; the app still works in-memory */
  }
}

export function clearPreferences(): void {
  try {
    localStorage.removeItem(PREFS_KEY);
  } catch {
    /* ignore */
  }
}

function isValidSummary(value: unknown): value is SessionSummary {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.createdAt === 'string' &&
    typeof v.durationSec === 'number' &&
    typeof v.seed === 'number' &&
    typeof v.palette === 'number' &&
    (v.source === 'live' || v.source === 'synthetic') &&
    v.version === 1
  );
}

export function loadEchoes(): SessionSummary[] {
  try {
    const raw = localStorage.getItem(ECHOES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValidSummary)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 24);
  } catch {
    return [];
  }
}

export function saveEchoes(echoes: SessionSummary[]): void {
  try {
    localStorage.setItem(ECHOES_KEY, JSON.stringify(echoes.slice(0, 24)));
  } catch {
    /* ignore */
  }
}

export function clearEchoes(): void {
  try {
    localStorage.removeItem(ECHOES_KEY);
  } catch {
    /* ignore */
  }
}

export function clearAllStorage(): void {
  clearPreferences();
  clearEchoes();
}
