import { useMemo } from 'react';
import {
  Circle,
  Settings2,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatClock, formatRate } from '../lib/format';
import { clamp } from '../lib/math';
import { useSignalFrame } from '../signals/runtime';
import type { Mode, Preferences, SessionSummary } from '../state/types';
import { Brand, SourceBadge } from './common';

interface Props {
  mode: Mode;
  prefs: Preferences;
  replayOf: SessionSummary | null;
  onToggleSound: () => void;
  onOpenSettings: () => void;
  onOpenPrivacy: () => void;
  onEnd: () => void;
}

function BreathGuide({ waveform, label }: { waveform: number; label: string }) {
  const wave = clamp(waveform, -1, 1);
  return (
    <div className="breath-guide" aria-hidden="true">
      <svg viewBox="0 0 260 58" className="breath-svg">
        <path className="breath-arc" d="M12 44 Q130 -6 248 44" />
        <path className="breath-arc breath-arc-faint" d="M12 44 Q130 76 248 44" />
        <line className="breath-line" x1="12" y1="44" x2="248" y2="44" />
        <circle className="breath-dot-halo" cx={130 + wave * 104} cy="44" r="10" />
        <circle className="breath-dot" cx={130 + wave * 104} cy="44" r="2.8" />
      </svg>
      <div className="breath-caption">{label}</div>
    </div>
  );
}

export function Alive({
  mode,
  prefs,
  replayOf,
  onToggleSound,
  onOpenSettings,
  onOpenPrivacy,
  onEnd,
}: Props) {
  const frame = useSignalFrame();
  const replay = frame.source === 'replay';
  const sourceLabel = replay ? 'ECHO' : mode === 'synthetic' ? 'SYNTHETIC' : 'LIVE';
  const qualityLabel = replay
    ? 'replaying a saved echo'
    : frame.quality === 'present'
      ? 'signal present'
      : frame.quality === 'settling'
        ? 'signal settling'
        : 'listening';

  const guideLabel = useMemo(() => {
    if (frame.breath.waveform > 0.12) return 'inhale';
    if (frame.breath.waveform < -0.12) return 'exhale';
    return 'let it rest';
  }, [frame.breath.waveform]);

  const time = replay && replayOf ? replayOf.durationSec : frame.t;
  const timeLabel = replay ? 'LENGTH' : 'SESSION';
  const nudge = replay ? 'Let the echo breathe.' : mode === 'synthetic' ? 'Breathe with the generated signal.' : 'Breathe naturally.';

  return (
    <section className="screen alive" aria-label="The living world">
      <header className="topbar alive-topbar">
        <div className="brand-lockup">
          <Brand compact />
          <SourceBadge tone={replay ? 'moss' : mode === 'synthetic' ? 'moss' : 'ember'}>
            {sourceLabel}
          </SourceBadge>
        </div>
        <div className="alive-controls">
          <button
            type="button"
            className="icon-button text-icon-button"
            onClick={onToggleSound}
            aria-label={prefs.sound ? 'Turn sound off' : 'Turn sound on'}
            title={prefs.sound ? 'Sound off (M)' : 'Sound on (M)'}
          >
            {prefs.sound ? (
              <Volume2 size={17} strokeWidth={1.4} />
            ) : (
              <VolumeX size={17} strokeWidth={1.4} />
            )}
            <span>{prefs.sound ? 'Sound' : 'Silent'}</span>
          </button>
          <button
            type="button"
            className="icon-button text-icon-button"
            onClick={onOpenSettings}
            aria-label="Session settings"
            title="Session settings (Esc)"
          >
            <Settings2 size={17} strokeWidth={1.4} />
          </button>
          <button
            type="button"
            className="icon-button text-icon-button"
            onClick={onOpenPrivacy}
            aria-label="Privacy and data"
            title="Privacy (P)"
          >
            <ShieldCheck size={17} strokeWidth={1.4} />
          </button>
        </div>
      </header>

      <div className={`alive-nudge ${frame.t < 6.5 ? 'is-visible' : ''}`} aria-hidden="true">
        {nudge}
      </div>

      <div className="hud" aria-label="Live signal readout">
        <div className="hud-row">
          <span className="hud-label">PULSE</span>
          <span className="hud-value">
            {frame.pulse.bpm != null ? Math.round(frame.pulse.bpm) : '—'}
            <small>bpm</small>
          </span>
          <span className={`hud-state ${frame.pulse.stable ? 'is-live' : ''}`}>
            <Circle size={5} fill="currentColor" strokeWidth={0} aria-hidden="true" />
            {frame.pulse.stable ? 'sensing' : 'listening'}
          </span>
        </div>
        <div className="hud-row">
          <span className="hud-label">BREATH</span>
          <span className="hud-value">
            {frame.breath.rate != null ? formatRate(frame.breath.rate, '', 1) : '—'}
            <small>/min</small>
          </span>
          <span className={`hud-state ${frame.breath.stable ? 'is-live' : ''}`}>
            <Circle size={5} fill="currentColor" strokeWidth={0} aria-hidden="true" />
            {frame.breath.stable ? 'sensing' : 'listening'}
          </span>
        </div>
        <div className="hud-row hud-row-meta">
          <span className="hud-label">{timeLabel}</span>
          <span className="hud-time">{formatClock(time)}</span>
          <span className="hud-quality" aria-live="polite">
            {qualityLabel}
          </span>
        </div>
      </div>

      <BreathGuide waveform={frame.breath.waveform} label={guideLabel} />

      <div className="alive-end">
        <button type="button" className="end-button" onClick={onEnd}>
          <span className="end-ring" aria-hidden="true">
            <span />
          </span>
          <span>{replay ? 'Leave this echo' : 'End session'}</span>
        </button>
      </div>

      {!replay && mode === 'live' && frame.quality !== 'present' && (
        <div className="signal-notice" role="status">
          <span className="status-pip" aria-hidden="true" />
          {frame.validation || 'Finding a steady signal — adjust your position.'}
        </div>
      )}
    </section>
  );
}
