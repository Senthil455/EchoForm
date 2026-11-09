import type { SessionSummary } from '../state/types';
import {
  clamp,
  damp,
  newSeed,
  standardDeviation,
} from '../lib/math';
import { emptyFrame, type BreathState, type PulseState, type Quality, type SignalFrame, type SignalSource } from './types';

// Structural mirrors of the SDK's generated protobuf message. We avoid importing
// the SDK runtime here so synthetic mode stays completely camera/SDK independent.
type Numeric = number | bigint | { toNumber(): number } | null | undefined;

interface Measurement {
  value?: number;
  stable?: boolean;
  timestamp?: Numeric;
}
interface MeasurementWithConfidence extends Measurement {
  confidence?: number;
}
interface HrvMessage {
  rmssd?: number;
  confidence?: number;
  stable?: boolean;
}
interface ExpressionMessage {
  stable?: boolean;
  scores?: Array<{ type?: number; confidence?: number }>;
}
export interface DecodedMetrics {
  breathing?: {
    rate?: MeasurementWithConfidence[];
    upperTrace?: Measurement[];
    lowerTrace?: Measurement[];
    amplitude?: Measurement[];
  };
  cardio?: {
    pulseRate?: MeasurementWithConfidence[];
    hrv?: HrvMessage[];
  };
  face?: {
    expression?: ExpressionMessage[];
  };
}

function toNumber(value: Numeric): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  return 0;
}

function latest<T>(items: T[] | undefined): T | undefined {
  return items && items.length > 0 ? items[items.length - 1] : undefined;
}

interface Sample {
  t: number;
  v: number;
}

export interface SessionAggregate {
  startedAt: number;
  endedAt: number;
  pulseSum: number;
  pulseCount: number;
  breathSum: number;
  breathCount: number;
  hrvSum: number;
  hrvCount: number;
  presenceSum: number;
  sampleCount: number;
  pulseSignature: number[];
  breathSignature: number[];
}

const PULSE_MIN = 35;
const PULSE_MAX = 220;
const BREATH_MIN = 4;
const BREATH_MAX = 40;
const FRESH_FOR_SEC = 3.5;
const WAVE_WINDOW_SEC = 12;

export class SignalEngine {
  readonly source: SignalSource;
  readonly seed: number;

  private now = 0;
  private running = false;
  private startedAt = 0;
  private syntheticStartedAt = 0;
  private syntheticTime = 0;
  private replaySummary: SessionSummary | null = null;

  private rawPulse: number | null = null;
  private rawPulseConfidence = 0;
  private rawPulseStable = false;
  private pulseSeenAt = -999;

  private rawBreath: number | null = null;
  private rawBreathConfidence = 0;
  private rawBreathStable = false;
  private breathSeenAt = -999;

  private rawWave: number | null = null;
  private waveSeenAt = -999;
  private waveBuffer: Sample[] = [];
  private waveSmooth = 0;
  private waveAmp = 0;
  private previousWave = 0;

  private rawHrv: number | null = null;
  private hrvSeenAt = -999;
  private hrvStable = false;

  private expressionScore = 0;
  private expressionSeenAt = -999;
  private expressionStable = false;

  private emaPulse: number | null = null;
  private emaBreath: number | null = null;

  private breathCycle = 0;
  private beatPhase = 0;
  private beatCount = 0;
  private sinceBeat = 0;

  private presence = 0;
  private validation = 'Waiting for your signal';
  private validationOk = true;
  private frame: SignalFrame;

  private lastAggregateAt = 0;
  private aggregateTimer = 0;
  private aggregate: SessionAggregate;

  constructor(source: SignalSource, seed = newSeed(), replaySummary?: SessionSummary) {
    this.source = source;
    this.seed = seed >>> 0;
    this.replaySummary = replaySummary ?? null;
    this.frame = emptyFrame(source);
    this.aggregate = {
      startedAt: 0,
      endedAt: 0,
      pulseSum: 0,
      pulseCount: 0,
      breathSum: 0,
      breathCount: 0,
      hrvSum: 0,
      hrvCount: 0,
      presenceSum: 0,
      sampleCount: 0,
      pulseSignature: [],
      breathSignature: [],
    };
  }

  getFrame(): SignalFrame {
    return this.frame;
  }

  getAggregate(): SessionAggregate {
    return this.aggregate;
  }

  start(): void {
    this.running = true;
    this.startedAt = this.now;
    this.syntheticStartedAt = this.now;
    this.aggregate.startedAt = this.now;
  }

  stop(): void {
    this.running = false;
    this.aggregate.endedAt = this.now;
  }

  setRunning(running: boolean): void {
    this.running = running;
    if (running && this.startedAt === 0) this.start();
    if (!running) this.aggregate.endedAt = this.now;
  }

  setValidation(hint: string, ok = true): void {
    this.validation = hint;
    this.validationOk = ok;
  }

  setErrorHint(hint: string): void {
    this.validation = hint;
    this.validationOk = false;
  }

  ingestMetrics(metrics: DecodedMetrics): void {
    const timestamp = this.now;

    const pulse = latest(metrics.cardio?.pulseRate);
    if (pulse) {
      const value = Number(pulse.value);
      const confidence = clamp(Number(pulse.confidence ?? 0), 0, 100);
      const stable = Boolean(pulse.stable) || confidence >= 40;
      if (Number.isFinite(value) && value >= PULSE_MIN && value <= PULSE_MAX) {
        this.rawPulse = value;
        this.rawPulseConfidence = confidence;
        this.rawPulseStable = stable;
        this.pulseSeenAt = timestamp;
      }
    }

    const breath = latest(metrics.breathing?.rate);
    if (breath) {
      const value = Number(breath.value);
      const confidence = clamp(Number(breath.confidence ?? 0), 0, 100);
      const stable = Boolean(breath.stable) || confidence >= 45;
      if (Number.isFinite(value) && value >= BREATH_MIN && value <= BREATH_MAX) {
        this.rawBreath = value;
        this.rawBreathConfidence = confidence;
        this.rawBreathStable = stable;
        this.breathSeenAt = timestamp;
      }
    }

    const wave =
      latest(metrics.breathing?.upperTrace) ?? latest(metrics.breathing?.lowerTrace);
    if (wave) {
      const value = Number(wave.value);
      if (Number.isFinite(value)) {
        this.rawWave = value;
        this.waveSeenAt = timestamp;
        this.waveBuffer.push({ t: timestamp, v: value });
        const cutoff = timestamp - WAVE_WINDOW_SEC;
        while (this.waveBuffer.length > 0 && this.waveBuffer[0].t < cutoff) {
          this.waveBuffer.shift();
        }
        if (this.waveBuffer.length > 360) this.waveBuffer.splice(0, this.waveBuffer.length - 360);
        const values = this.waveBuffer.map((s) => s.v);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        if (range > 1e-5) {
          const normalized = ((value - min) / range) * 2 - 1;
          this.rawWave = clamp(normalized, -1, 1);
          this.waveAmp = clamp((range / Math.max(1e-5, Math.abs(max + min) / 2 + range)) * 4, 0, 1);
        }
      }
    }

    const amplitude = latest(metrics.breathing?.amplitude);
    if (amplitude) {
      const value = Number(amplitude.value);
      if (Number.isFinite(value)) {
        this.waveAmp = clamp(Math.max(this.waveAmp, value * 0.5 + 0.25), 0, 1);
      }
    }

    const hrv = latest(metrics.cardio?.hrv);
    if (hrv) {
      const value = Number(hrv.rmssd);
      if (Number.isFinite(value) && value >= 0 && value <= 300) {
        this.rawHrv = value;
        this.hrvSeenAt = timestamp;
        this.hrvStable = Boolean(hrv.stable) || Number(hrv.confidence ?? 0) >= 50;
      }
    }

    const expression = latest(metrics.face?.expression);
    if (expression?.scores?.length) {
      const top = expression.scores.reduce(
        (best, item) => ((item.confidence ?? 0) > (best.confidence ?? 0) ? item : best),
        expression.scores[0],
      );
      this.expressionScore = clamp(Number(top.confidence ?? 0) / 100, 0, 1);
      this.expressionSeenAt = timestamp;
      this.expressionStable = Boolean(expression.stable);
    }
  }

  tick(dt: number): SignalFrame {
    const step = clamp(dt, 0, 0.1);
    this.now += step;
    this.syntheticTime += step;

    if (this.source === 'synthetic' || this.source === 'replay') {
      this.stepSynthetic(step);
    }

    const pulseFresh = this.now - this.pulseSeenAt <= FRESH_FOR_SEC;
    const breathFresh = this.now - this.breathSeenAt <= FRESH_FOR_SEC;
    const waveFresh = this.now - this.waveSeenAt <= FRESH_FOR_SEC;
    const hrvFresh = this.now - this.hrvSeenAt <= 8;
    const expressionFresh = this.now - this.expressionSeenAt <= 4;

    // Slow enough to be legible, fast enough to feel immediate.
    if (pulseFresh && this.rawPulse != null) {
      this.emaPulse =
        this.emaPulse == null ? this.rawPulse : damp(this.emaPulse, this.rawPulse, 1.1, step);
    }
    if (breathFresh && this.rawBreath != null) {
      this.emaBreath =
        this.emaBreath == null ? this.rawBreath : damp(this.emaBreath, this.rawBreath, 0.7, step);
    }

    const pulseStable = pulseFresh && this.rawPulseStable;
    const breathStable = breathFresh && this.rawBreathStable;

    const displayPulse = pulseStable ? this.emaPulse : null;
    const displayBreath = breathStable ? this.emaBreath : null;

    // Breath waveform: use the measured shape when fresh, otherwise a gentle
    // synthetic sine so the world never freezes in a dead pose.
    let targetWave: number;
    if (this.source === 'synthetic' || this.source === 'replay') {
      targetWave = this.syntheticWave;
    } else if (waveFresh && this.rawWave != null) {
      targetWave = this.rawWave;
    } else {
      targetWave = 0;
    }
    this.waveSmooth = damp(this.waveSmooth, targetWave, 6, step);

    const bpmForMotion = displayPulse ?? this.replaySummary?.avgPulse ?? (this.running ? 60 : 52);
    const brForMotion = displayBreath ?? this.replaySummary?.avgBreath ?? (this.running ? 14 : 12);

    const previousCycle = this.breathCycle;
    this.breathCycle = (this.breathCycle + (brForMotion / 60) * step) % 1;
    const inhaleStart =
      this.previousWave <= 0 && this.waveSmooth > 0 && (waveFresh || this.source !== 'live');
    if (inhaleStart) this.breathCycle = 0.04;
    if (this.breathCycle < previousCycle && !inhaleStart && this.source !== 'live') {
      // keep the cycle continuous; only the waveform crossing resets phase
    }
    this.previousWave = this.waveSmooth;

    const breathWave =
      this.source === 'live' && !waveFresh
        ? Math.sin(this.breathCycle * Math.PI * 2) * (this.running ? 0.35 : 0.15)
        : this.waveSmooth;

    this.beatPhase += (bpmForMotion / 60) * step;
    if (this.beatPhase >= 1) {
      this.beatPhase %= 1;
      this.beatCount += 1;
    }
    this.sinceBeat = (this.beatPhase / Math.max(1, bpmForMotion / 60)) % 60;

    const quality: Quality = !this.running
      ? 'listening'
      : this.source === 'live'
        ? displayPulse != null || displayBreath != null
          ? 'present'
          : 'settling'
        : this.now - this.syntheticStartedAt > 1.2
          ? 'present'
          : 'settling';

    const presenceTarget =
      quality === 'present' ? 1 : quality === 'settling' ? 0.42 : this.running ? 0.2 : 0.08;
    this.presence = damp(this.presence, presenceTarget, 0.35, step);

    const hrv =
      hrvFresh && this.rawHrv != null
        ? { rmssd: this.rawHrv, stable: this.hrvStable }
        : this.source !== 'live' && this.replaySummary?.hrvRmssd != null
          ? { rmssd: this.replaySummary.hrvRmssd, stable: true }
          : null;

    const expression =
      expressionFresh && this.expressionScore > 0
        ? { score: this.expressionScore, stable: this.expressionStable }
        : null;

    const beatEnvelope = Math.exp(-this.beatPhase * 4.2);

    const pulse: PulseState = {
      bpm: displayPulse != null ? Math.round(displayPulse * 10) / 10 : null,
      confidence: this.rawPulseConfidence,
      stable: pulseStable,
      beatPhase: this.beatPhase,
      beatCount: this.beatCount,
      sinceBeat: this.sinceBeat,
    };

    const breath: BreathState = {
      rate: displayBreath != null ? Math.round(displayBreath * 10) / 10 : null,
      confidence: this.rawBreathConfidence,
      stable: breathStable,
      waveform: breathWave,
      amplitude:
        this.source === 'live'
          ? clamp(Math.max(this.waveAmp, displayBreath != null ? 0.55 : 0.2), 0, 1)
          : this.syntheticAmplitude,
      phase: this.breathCycle,
    };

    this.frame = {
      t: this.now,
      source: this.source,
      pulse,
      breath,
      hrv,
      expression,
      quality,
      presence: this.presence,
      validation: this.validation,
      running: this.running,
    };

    // Aggregate only meaningful, present signal time. This is what an Echo
    // Print is made from, and it never includes raw waveform arrays.
    this.aggregateTimer += step;
    if (this.aggregateTimer >= 0.5) {
      this.aggregateTimer = 0;
      if (quality === 'present' && this.source !== 'replay') {
        if (pulse.bpm != null) {
          this.aggregate.pulseSum += pulse.bpm;
          this.aggregate.pulseCount += 1;
          this.aggregate.pulseSignature.push(beatEnvelope);
        }
        if (breath.rate != null) {
          this.aggregate.breathSum += breath.rate;
          this.aggregate.breathCount += 1;
          this.aggregate.breathSignature.push(breathWave);
        }
        if (hrv?.stable) {
          this.aggregate.hrvSum += hrv.rmssd;
          this.aggregate.hrvCount += 1;
        }
        this.aggregate.presenceSum += this.presence;
        this.aggregate.sampleCount += 1;
      }
      if (this.aggregate.breathSignature.length > 64) {
        this.aggregate.breathSignature.splice(0, this.aggregate.breathSignature.length - 64);
      }
      if (this.aggregate.pulseSignature.length > 64) {
        this.aggregate.pulseSignature.splice(0, this.aggregate.pulseSignature.length - 64);
      }
    }

    return this.frame;
  }

  buildSummary(): SessionSummary | null {
    this.aggregate.endedAt = this.now;
    const durationSec = Math.max(1, this.aggregate.endedAt - this.aggregate.startedAt);
    const avgPulse =
      this.aggregate.pulseCount > 0
        ? this.aggregate.pulseSum / this.aggregate.pulseCount
        : null;
    const avgBreath =
      this.aggregate.breathCount > 0
        ? this.aggregate.breathSum / this.aggregate.breathCount
        : null;
    const hrvRmssd =
      this.aggregate.hrvCount > 0 ? this.aggregate.hrvSum / this.aggregate.hrvCount : null;
    const presenceRatio =
      this.aggregate.sampleCount > 0
        ? this.aggregate.presenceSum / this.aggregate.sampleCount
        : 0;

    if (avgPulse == null && avgBreath == null && this.source === 'replay') return null;

    const createdAt = new Date().toISOString();
    return {
      id: `${Date.now().toString(36)}-${this.seed.toString(16)}`,
      createdAt,
      durationSec,
      avgPulse: avgPulse != null ? Math.round(avgPulse * 10) / 10 : null,
      avgBreath: avgBreath != null ? Math.round(avgBreath * 10) / 10 : null,
      hrvRmssd: hrvRmssd != null ? Math.round(hrvRmssd * 10) / 10 : null,
      presenceRatio: Math.round(presenceRatio * 1000) / 1000,
      breathVariability: Math.round(standardDeviation(this.aggregate.breathSignature) * 1000) / 1000,
      pulseVariability: Math.round(standardDeviation(this.aggregate.pulseSignature) * 1000) / 1000,
      seed: this.seed,
      palette: this.seed % 6,
      source: this.source === 'live' ? 'live' : 'synthetic',
      version: 1,
    };
  }

  // ── Synthetic model ────────────────────────────────────────────────────────
  private syntheticWave = 0;
  private syntheticAmplitude = 0.6;

  private stepSynthetic(step: number): void {
    const t = this.syntheticTime;
    const replay = this.source === 'replay';

    const basePulse = replay ? this.replaySummary?.avgPulse ?? 64 : 64;
    const baseBreath = replay ? this.replaySummary?.avgBreath ?? 14 : 14;
    const pulse =
      basePulse +
      Math.sin(t * 0.071) * (replay ? 1.4 : 3.2) +
      Math.sin(t * 0.023 + 1.7) * (replay ? 0.8 : 1.4);
    const breath =
      baseBreath +
      Math.sin(t * 0.11) * (replay ? 0.6 : 1.6) +
      Math.sin(t * 0.037 + 0.6) * (replay ? 0.4 : 0.9);

    this.rawPulse = clamp(pulse, PULSE_MIN, PULSE_MAX);
    this.rawPulseConfidence = 82 + Math.sin(t * 0.17) * 6;
    this.rawPulseStable = t > (replay ? 0 : 2);
    this.pulseSeenAt = this.now;

    this.rawBreath = clamp(breath, BREATH_MIN, BREATH_MAX);
    this.rawBreathConfidence = 78 + Math.sin(t * 0.13 + 1) * 8;
    this.rawBreathStable = t > (replay ? 0 : 2);
    this.breathSeenAt = this.now;

    const rate = this.rawBreath;
    const phase = (this.syntheticTime * (rate / 60)) % 1;
    const asymmetry = 1 + Math.sin(t * 0.05) * 0.08;
    this.syntheticWave = Math.sin(phase * Math.PI * 2) * asymmetry;
    this.syntheticAmplitude = clamp(0.55 + Math.sin(t * 0.06) * 0.16, 0, 1);
    this.rawWave = this.syntheticWave;
    this.waveSeenAt = this.now;

    this.rawHrv = replay
      ? this.replaySummary?.hrvRmssd ?? 42
      : 44 + Math.sin(t * 0.031 + 0.4) * 7;
    this.hrvSeenAt = this.now;
    this.hrvStable = t > (replay ? 0 : 18);

    this.expressionScore = 0;
    this.expressionStable = false;
  }
}
