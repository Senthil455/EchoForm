import { formatDate, formatDuration, shortCode } from '../lib/format';
import { clamp, mulberry32 } from '../lib/math';
import type { SessionSummary } from '../state/types';
import { paletteFor } from '../world/palettes';
import { generateOrganism } from '../world/organism';

const W = 1600;
const H = 2000;

type Ctx = CanvasRenderingContext2D;

function setLetterSpacing(ctx: Ctx, value: string): void {
  (ctx as unknown as { letterSpacing?: string }).letterSpacing = value;
}

function rgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Draws the Echo Print into any canvas. The layout is authored at 1600×2000
 * and scaled, so thumbnails and the full artwork share one deterministic
 * composition. Same summary in → same artwork out.
 */
export function paintEchoPrint(
  canvas: HTMLCanvasElement,
  summary: SessionSummary,
  width = W,
  height = H,
  compact = false,
): void {
  const scale = width / W;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.save();
  ctx.scale(scale, height / H);
  ctx.clearRect(0, 0, W, H);

  const palette = paletteFor(summary.palette);
  const rand = mulberry32((summary.seed ^ 0x27d4eb2f) >>> 0);
  const presence = clamp(summary.presenceRatio, 0, 1);

  // ── Ground and atmosphere ─────────────────────────────────────────────────
  const backdrop = ctx.createLinearGradient(0, 0, 0, H);
  backdrop.addColorStop(0, palette.skyTop);
  backdrop.addColorStop(0.46, palette.background);
  backdrop.addColorStop(1, '#020504');
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, W, H);

  const bloom = ctx.createRadialGradient(800, 820, 20, 800, 820, 780);
  bloom.addColorStop(0, rgba(palette.ground, 0.5));
  bloom.addColorStop(0.42, rgba(palette.ground, 0.16));
  bloom.addColorStop(1, rgba(palette.background, 0));
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, W, H);

  // ── Presence constellation ────────────────────────────────────────────────
  const dotCount = 34 + Math.round(presence * 70);
  for (let i = 0; i < dotCount; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 140 + Math.pow(rand(), 0.6) * 660;
    const x = 800 + Math.cos(angle) * radius;
    const y = 840 + Math.sin(angle) * radius * 0.82;
    if (x < 80 || x > W - 80 || y < 100 || y > 1330) continue;
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + rand() * 1.9, 0, Math.PI * 2);
    ctx.fillStyle = rgba(palette.field, 0.08 + rand() * 0.24);
    ctx.fill();
  }

  // ── Organism ──────────────────────────────────────────────────────────────
  const organism = generateOrganism(summary.seed);
  const positions = organism.positions;
  const progress = organism.progress;
  const tips = organism.tips;
  ctx.lineCap = 'round';

  for (let v = 0; v < progress.length - 1; v += 2) {
    const ax = 800 + positions[v * 3] * 92 + positions[v * 3 + 2] * 22;
    const ay = 1150 - (positions[v * 3 + 1] + 2.35) * 92;
    const bx = 800 + positions[(v + 1) * 3] * 92 + positions[(v + 1) * 3 + 2] * 22;
    const by = 1150 - (positions[(v + 1) * 3 + 1] + 2.35) * 92;
    const p = Math.max(progress[v], progress[v + 1]);
    const tip = tips[v + 1] > 0.5;

    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.strokeStyle = tip
      ? rgba(palette.coreHot, 0.32)
      : rgba(palette.field, 0.09 + p * 0.15);
    ctx.lineWidth = tip ? 1.65 : 1.05;
    ctx.stroke();
  }

  for (let v = 0; v < tips.length; v++) {
    if (tips[v] < 0.5) continue;
    const x = 800 + positions[v * 3] * 92 + positions[v * 3 + 2] * 22;
    const y = 1150 - (positions[v * 3 + 1] + 2.35) * 92;
    ctx.beginPath();
    ctx.arc(x, y, 1.6 + rand() * 1.7, 0, Math.PI * 2);
    ctx.fillStyle = rgba(palette.coreHot, 0.25 + rand() * 0.25);
    ctx.fill();
  }

  // ── Breath / pulse rings ──────────────────────────────────────────────────
  const breathNorm = summary.avgBreath != null ? clamp((summary.avgBreath - 6) / 18, 0, 1) : 0.42;
  const pulseNorm = summary.avgPulse != null ? clamp((summary.avgPulse - 45) / 70, 0, 1) : 0.35;
  const ringCount = compact ? 42 : 68;
  const ringBase = 70 + pulseNorm * 34;
  const ringSpan = 440 + breathNorm * 110;

  for (let i = 0; i < ringCount; i++) {
    const t = i / (ringCount - 1);
    const radius = ringBase + Math.pow(t, 1.28) * ringSpan;
    const wobble = 3 + rand() * 8;
    const phase = rand() * Math.PI * 2;
    const accent = i % 9 === 0;
    ctx.beginPath();
    const segments = 120;
    for (let k = 0; k <= segments; k++) {
      const angle = (k / segments) * Math.PI * 2;
      const r =
        radius +
        Math.sin(angle * (2 + (i % 4)) + phase) * wobble +
        Math.cos(angle * 3 - phase) * (wobble * 0.35);
      const x = 800 + Math.cos(angle) * r;
      const y = 835 + Math.sin(angle) * r * 0.92;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = accent
      ? rgba(palette.core, 0.1 + (1 - t) * 0.2)
      : rgba(palette.field, 0.06 + (1 - t) * 0.15);
    ctx.lineWidth = accent ? 1.6 : 0.9;
    ctx.stroke();
  }

  // Warm core.
  const core = ctx.createRadialGradient(800, 835, 0, 800, 835, 130);
  core.addColorStop(0, rgba(palette.coreHot, 0.7));
  core.addColorStop(0.18, rgba(palette.core, 0.36));
  core.addColorStop(0.55, rgba(palette.core, 0.08));
  core.addColorStop(1, rgba(palette.core, 0));
  ctx.fillStyle = core;
  ctx.fillRect(620, 655, 360, 360);

  // ── Pulse waveform ────────────────────────────────────────────────────────
  const waveY = 1450;
  const pulseRate = summary.avgPulse ?? 62;
  const amplitude = 22 + clamp(summary.pulseVariability, 0, 1) * 90 + pulseNorm * 26;
  const waveRand = mulberry32((summary.seed ^ 0x165667b1) >>> 0);
  const phases = [waveRand() * 6.28, waveRand() * 6.28, waveRand() * 6.28];

  ctx.save();
  ctx.beginPath();
  for (let x = 130; x <= W - 130; x += 2) {
    const u = (x - 130) / (W - 260);
    const carrier = Math.sin(u * Math.PI * 2 * (7 + pulseRate * 0.06) + phases[0]);
    const harmonic = Math.sin(u * Math.PI * 2 * 17 + phases[1]) * 0.34;
    const swell = Math.sin(u * Math.PI * 2 * 2.2 + phases[2]) * 0.4;
    const y = waveY + (carrier + harmonic) * amplitude * (0.55 + swell * 0.45);
    if (x === 130) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = rgba(palette.core, 0.18);
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = rgba(palette.coreHot, 0.62);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();

  // ── Typography ────────────────────────────────────────────────────────────
  ctx.fillStyle = rgba('#e9e2d0', 0.94);
  ctx.font = '300 82px "Fraunces Variable", Georgia, serif';
  setLetterSpacing(ctx, '14px');
  ctx.fillText('ECHOFORM', 110, 174);

  ctx.textAlign = 'right';
  ctx.font = '500 25px "Instrument Sans Variable", system-ui, sans-serif';
  ctx.fillStyle = rgba('#e9e2d0', 0.6);
  setLetterSpacing(ctx, '5px');
  ctx.fillText(formatDate(summary.createdAt).toUpperCase(), W - 110, 146);

  ctx.font = '500 20px "Instrument Sans Variable", system-ui, sans-serif';
  ctx.fillStyle = rgba(summary.source === 'synthetic' ? palette.accent : palette.field, 0.66);
  ctx.fillText(summary.source === 'synthetic' ? 'SYNTHETIC STUDY' : 'LIVE SESSION', W - 110, 186);

  if (!compact) {
    ctx.textAlign = 'left';
    setLetterSpacing(ctx, '6px');
    ctx.font = '500 20px "Instrument Sans Variable", system-ui, sans-serif';
    ctx.fillStyle = rgba('#e9e2d0', 0.38);
    ctx.fillText('TIME IN THE FIELD', 110, 1698);

    ctx.font = '300 46px "Fraunces Variable", Georgia, serif';
    setLetterSpacing(ctx, '1px');
    ctx.fillStyle = rgba('#e9e2d0', 0.9);
    ctx.fillText(formatDuration(summary.durationSec), 110, 1752);

    ctx.font = '500 22px "Instrument Sans Variable", system-ui, sans-serif';
    setLetterSpacing(ctx, '3px');
    ctx.fillStyle = rgba('#e9e2d0', 0.56);
    const breath = summary.avgBreath != null ? `${summary.avgBreath.toFixed(1)} / MIN` : 'SIGNAL WITHHELD';
    const pulse = summary.avgPulse != null ? `${summary.avgPulse.toFixed(0)} BPM` : 'SIGNAL WITHHELD';
    ctx.fillText(`BREATH  ${breath}`, 110, 1812);
    ctx.fillText(`PULSE  ${pulse}`, 110, 1850);

    ctx.textAlign = 'right';
    ctx.font = 'italic 300 30px "Fraunces Variable", Georgia, serif';
    setLetterSpacing(ctx, '0px');
    ctx.fillStyle = rgba('#e9e2d0', 0.55);
    ctx.fillText('A record of signals,', W - 110, 1788);
    ctx.fillText('not a diagnosis.', W - 110, 1824);

    ctx.font = '500 20px "Instrument Sans Variable", system-ui, sans-serif';
    setLetterSpacing(ctx, '6px');
    ctx.fillStyle = rgba(palette.core, 0.64);
    ctx.fillText(`ECHO ${shortCode(summary.seed)}`, W - 110, 1888);
  } else {
    ctx.textAlign = 'right';
    ctx.font = '500 22px "Instrument Sans Variable", system-ui, sans-serif';
    setLetterSpacing(ctx, '5px');
    ctx.fillStyle = rgba(palette.core, 0.58);
    ctx.fillText(`ECHO ${shortCode(summary.seed)}`, W - 110, 1880);
  }

  // ── Vignette and grain ────────────────────────────────────────────────────
  const vignette = ctx.createRadialGradient(800, 960, 320, 800, 960, 1250);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.72, 'rgba(0,0,0,0.18)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  const grainCount = compact ? 9000 : 24000;
  for (let i = 0; i < grainCount; i++) {
    const x = rand() * W;
    const y = rand() * H;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(x, y, 1, 1);
  }

  ctx.restore();
}

export async function generateEchoPrint(summary: SessionSummary): Promise<string> {
  try {
    await document.fonts.ready;
  } catch {
    /* fallback fonts are acceptable */
  }
  const canvas = document.createElement('canvas');
  paintEchoPrint(canvas, summary, W, H, false);
  return canvas.toDataURL('image/png');
}
