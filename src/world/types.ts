export interface WorldSignals {
  t: number;
  breath: number;
  breathRate: number;
  breathAmp: number;
  pulse: number;
  pulseRate: number;
  presence: number;
  growth: number;
  awake: number;
  echo: number;
  hue: number;
  expression: number;
  reduced: number;
}

export const worldSignals: WorldSignals = {
  t: 0,
  breath: 0,
  breathRate: 0.5,
  breathAmp: 0.5,
  pulse: 0,
  pulseRate: 0.5,
  presence: 0,
  growth: 0.18,
  awake: 0,
  echo: 0,
  hue: 0,
  expression: 0,
  reduced: 0,
};

export type WorldQuality = 'low' | 'medium' | 'high';

export function particleCount(quality: WorldQuality): number {
  return quality === 'high' ? 7200 : quality === 'medium' ? 4400 : 2400;
}
