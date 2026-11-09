import { clamp } from '../lib/math';
import type { SignalFrame } from '../signals/types';

const PENTATONIC = [110, 130.81, 146.83, 164.81, 196];
const ROOT_SECONDS = 45;

/**
 * ECHOFORM's entire soundscape is synthesized at runtime. There are no audio
 * assets, no microphone use, and no recording. The graph is created only from
 * a user gesture and is muted until the user asks for sound.
 */
export class EchoAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  private padFilter: BiquadFilterNode | null = null;
  private padGain: GainNode | null = null;
  private padA: OscillatorNode | null = null;
  private padB: OscillatorNode | null = null;

  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;

  private enabled = false;
  private sceneActive = true;
  private volume = 0.18;
  private lastBeat = -1;
  private lastRootAt = -Infinity;
  private resumeTimer = 0;

  get isEnabled(): boolean {
    return this.enabled;
  }

  async enable(volume = this.volume): Promise<void> {
    this.volume = clamp(volume, 0, 1);
    if (typeof window === 'undefined') return;

    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;

      const ctx = new Ctor();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = 0.0001;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 22;
      compressor.ratio.value = 5;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.3;
      master.connect(compressor);
      compressor.connect(ctx.destination);
      this.master = master;
      this.compressor = compressor;

      // ── Ambient pad ──────────────────────────────────────────────────────
      const padFilter = ctx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.value = 420;
      padFilter.Q.value = 0.55;

      const padGain = ctx.createGain();
      padGain.gain.value = 0.0001;
      padFilter.connect(padGain);
      padGain.connect(master);

      const delay = ctx.createDelay(1.2);
      delay.delayTime.value = 0.47;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.27;
      const wet = ctx.createGain();
      wet.gain.value = 0.28;
      padGain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(wet);
      wet.connect(master);

      const padLevelA = ctx.createGain();
      padLevelA.gain.value = 0.5;
      const padLevelB = ctx.createGain();
      padLevelB.gain.value = 0.2;

      const padA = ctx.createOscillator();
      padA.type = 'sine';
      padA.frequency.value = 110;
      padA.detune.value = -4;
      const padB = ctx.createOscillator();
      padB.type = 'triangle';
      padB.frequency.value = 164.81;
      padB.detune.value = 5;

      padA.connect(padLevelA);
      padB.connect(padLevelB);
      padLevelA.connect(padFilter);
      padLevelB.connect(padFilter);
      padA.start();
      padB.start();

      this.padFilter = padFilter;
      this.padGain = padGain;
      this.padA = padA;
      this.padB = padB;

      // ── Breath noise ─────────────────────────────────────────────────────
      const length = Math.floor(ctx.sampleRate * 4);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.86 + white * 0.14;
        data[i] = last * 1.8;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 620;
      noiseFilter.Q.value = 0.72;

      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.0001;
      source.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(master);
      source.start();

      this.noiseFilter = noiseFilter;
      this.noiseGain = noiseGain;
    }

    try {
      await this.ctx.resume();
    } catch {
      /* autoplay policy may still hold; the next gesture retries */
    }

    window.clearTimeout(this.resumeTimer);
    this.enabled = true;
    this.applySceneGain(1.4);
  }

  disable(): void {
    this.enabled = false;
    this.applySceneGain(0.7);
    window.clearTimeout(this.resumeTimer);
    this.resumeTimer = window.setTimeout(() => {
      if (!this.enabled) this.ctx?.suspend().catch(() => undefined);
    }, 1100);
  }

  setVolume(volume: number): void {
    this.volume = clamp(volume, 0, 1);
    if (this.enabled && this.sceneActive) this.applySceneGain(0.25);
  }

  setSceneActive(active: boolean): void {
    this.sceneActive = active;
    if (!this.enabled) return;
    this.applySceneGain(active ? 1.2 : 1.8);
    if (active) this.ctx?.resume().catch(() => undefined);
  }

  update(frame: SignalFrame): void {
    if (!this.ctx || !this.enabled || !this.sceneActive) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const presence = clamp(frame.presence, 0, 1);
    const waveform = clamp(frame.breath.waveform, -1, 1);
    const inhale = Math.max(0, waveform);

    if (this.padFilter) {
      this.padFilter.frequency.setTargetAtTime(
        360 + (waveform + 1) * 170 + presence * 190,
        now,
        0.35,
      );
    }
    if (this.padGain) {
      this.padGain.gain.setTargetAtTime(0.05 + presence * 0.06, now, 0.5);
    }
    if (this.noiseGain) {
      this.noiseGain.gain.setTargetAtTime(
        (0.012 + inhale * 0.036) * (0.4 + presence * 0.6),
        now,
        0.18,
      );
    }
    if (this.noiseFilter) {
      this.noiseFilter.frequency.setTargetAtTime(430 + inhale * 640 + presence * 120, now, 0.2);
    }

    // A slow root-note walk keeps a long session from becoming static.
    if (now - this.lastRootAt > ROOT_SECONDS) {
      this.lastRootAt = now;
      const index = Math.floor(now / ROOT_SECONDS) % PENTATONIC.length;
      const root = PENTATONIC[index];
      this.padA?.frequency.setTargetAtTime(root, now, 3.2);
      this.padB?.frequency.setTargetAtTime(root * 1.5, now, 3.8);
    }

    const beat = frame.pulse.beatCount;
    if (this.lastBeat < 0) {
      this.lastBeat = beat;
    } else if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      if (presence > 0.12) this.thump(presence);
    }
  }

  private thump(presence: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    const level = (0.08 + presence * 0.24) * 0.9;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(76, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.46);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  private applySceneGain(seconds: number): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    const target =
      this.enabled && this.sceneActive ? Math.max(0.0001, this.volume * 0.8) : 0.0001;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(target, now, seconds / 3);
  }

  async dispose(): Promise<void> {
    this.enabled = false;
    window.clearTimeout(this.resumeTimer);
    try {
      this.padA?.stop();
      this.padB?.stop();
    } catch {
      /* already stopped */
    }
    this.padA = null;
    this.padB = null;
    try {
      await this.ctx?.close();
    } catch {
      /* already closed */
    }
    this.ctx = null;
    this.master = null;
    this.compressor = null;
  }
}
