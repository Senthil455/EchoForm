import { useEffect, useRef } from 'react';
import { ArrowRight, ChevronLeft, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { clamp } from '../lib/math';
import { formatRate } from '../lib/format';
import { useSignalFrame } from '../signals/runtime';
import type { AppError, Mode } from '../state/types';
import { CameraPreview, SourceBadge } from './common';

interface Props {
  mode: Mode;
  stream: MediaStream | null;
  error: AppError | null;
  liveStatus: string;
  onReady: () => void;
  onRetry: () => void;
  onSynthetic: () => void;
  onBack: () => void;
  onSkip: () => void;
  onPrivacy: () => void;
  onOpenPortal: () => void;
}

const RADIUS = 148;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function Attuning({
  mode,
  stream,
  error,
  liveStatus,
  onReady,
  onRetry,
  onSynthetic,
  onBack,
  onSkip,
  onPrivacy,
  onOpenPortal,
}: Props) {
  const frame = useSignalFrame();
  const present = !error && frame.quality === 'present';
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    if (!present) return;
    const timer = window.setTimeout(() => readyRef.current(), 1150);
    return () => window.clearTimeout(timer);
  }, [present]);

  const confidence = Math.max(frame.pulse.confidence, frame.breath.confidence) / 100;
  const progress = error
    ? 0
    : present
      ? 1
      : clamp(0.14 + frame.t / 16 + confidence * 0.38, 0.14, 0.88);

  const hint = error
    ? error.title
    : mode === 'live'
      ? frame.validation || liveStatus || 'Sit comfortably in frame'
      : 'Synthetic signal is settling into the field';

  const canSkip = !error && !present && frame.t > 7;

  return (
    <section className={`screen attuning${error ? ' has-error' : ''}`} aria-labelledby="attuning-title">
      <header className="topbar">
        <button type="button" className="text-button back-button" onClick={onBack}>
          <ChevronLeft size={15} strokeWidth={1.4} aria-hidden="true" />
          Leave
        </button>
        <div className="topbar-center">
          {mode === 'synthetic' ? (
            <SourceBadge tone="moss">SYNTHETIC SIGNAL</SourceBadge>
          ) : (
            <SourceBadge tone="ember">LIVE SENSING</SourceBadge>
          )}
        </div>
        <button type="button" className="text-button" onClick={onPrivacy}>
          <ShieldCheck size={14} strokeWidth={1.4} aria-hidden="true" />
          Data note
        </button>
      </header>

      <main className="attune-main">
        <div className="attune-heading">
          <p className="eyebrow">Attuning</p>
          <h1 id="attuning-title" className="scene-title attune-title">
            Finding your signal
          </h1>
          <p className="lede attune-lede">
            Sit comfortably. Let your face and shoulders fill the light. The field will open when a
            steady signal arrives.
          </p>
        </div>

        <div className={`attune-stage ${error ? 'has-error' : ''}`}>
          <div className="attune-orbit" aria-hidden="true">
            <svg className="attune-progress" viewBox="0 0 320 320">
              <circle className="attune-track" cx="160" cy="160" r={RADIUS} />
              <circle
                className="attune-fill"
                cx="160"
                cy="160"
                r={RADIUS}
                style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
              />
            </svg>
            <span className="attune-tick attune-tick-a" />
            <span className="attune-tick attune-tick-b" />
            <span className="attune-tick attune-tick-c" />
            <span className="attune-tick attune-tick-d" />
          </div>

          <div className="attune-aperture">
            {mode === 'live' ? (
              <CameraPreview stream={stream} />
            ) : (
              <div className="synthetic-orb" aria-hidden="true">
                <span className="synthetic-orb-core" />
                <span className="synthetic-orb-ring synthetic-orb-ring-a" />
                <span className="synthetic-orb-ring synthetic-orb-ring-b" />
              </div>
            )}
            <span className="attune-aperture-shade" aria-hidden="true" />
            <span className="attune-aperture-crosshair" aria-hidden="true" />
          </div>
        </div>

        {error ? (
          <div className="attune-error" role="alert">
            <p className="eyebrow">Signal interrupted</p>
            <h2 className="attune-error-title">{error.title}</h2>
            <p className="attune-error-copy">{error.message}</p>
            {error.detail && <p className="attune-error-detail">{error.detail}</p>}
            <div className="attune-error-actions">
              {error.retryable !== false && (
                <button type="button" className="primary-button" onClick={onRetry}>
                  <RotateCcw size={15} strokeWidth={1.5} aria-hidden="true" />
                  Try again
                </button>
              )}
              <button type="button" className="quiet-button" onClick={onSynthetic}>
                Explore with synthetic signals
              </button>
              {(error.code === 2 || error.code === 4) && (
                <button type="button" className="link-button" onClick={onOpenPortal}>
                  Open the Presage portal
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="attune-status" aria-live="polite">
              <span className={`status-pip ${present ? 'is-present' : ''}`} aria-hidden="true" />
              <span>{hint}</span>
            </div>

            <div className="attune-readouts">
              <div className="readout">
                <span className="readout-label">PULSE</span>
                <span className="readout-value">
                  {frame.pulse.bpm != null ? Math.round(frame.pulse.bpm) : '—'}
                  <small>bpm</small>
                </span>
                <span className={`readout-state ${frame.pulse.stable ? 'is-live' : ''}`}>
                  {frame.pulse.stable ? 'sensing' : 'listening'}
                </span>
              </div>
              <div className="readout-divider" aria-hidden="true" />
              <div className="readout">
                <span className="readout-label">BREATH</span>
                <span className="readout-value">
                  {frame.breath.rate != null ? formatRate(frame.breath.rate, '', 1) : '—'}
                  <small>/min</small>
                </span>
                <span className={`readout-state ${frame.breath.stable ? 'is-live' : ''}`}>
                  {frame.breath.stable ? 'sensing' : 'listening'}
                </span>
              </div>
              <div className="readout-divider" aria-hidden="true" />
              <div className="readout">
                <span className="readout-label">SIGNAL</span>
                <span className="readout-value readout-value-small">
                  {present ? 'Present' : mode === 'synthetic' ? 'Generated' : 'Settling'}
                </span>
                <span className="readout-state">{mode === 'synthetic' ? 'no camera' : 'on device'}</span>
              </div>
            </div>

            {canSkip && (
              <button type="button" className="link-button attune-skip" onClick={onSkip}>
                <Sparkles size={13} strokeWidth={1.4} aria-hidden="true" />
                Enter the field anyway
                <ArrowRight size={13} strokeWidth={1.4} aria-hidden="true" />
              </button>
            )}
          </>
        )}
      </main>

      <footer className="attune-footer">
        <span>{mode === 'live' ? 'Camera frames are analysed on this device and never stored.' : 'No camera is active in synthetic mode.'}</span>
        <span>Good light helps. So does stillness.</span>
      </footer>
    </section>
  );
}
