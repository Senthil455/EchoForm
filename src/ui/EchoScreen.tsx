import {
  ArrowLeft,
  Check,
  Download,
  Play,
  Save,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { formatDate, formatDuration, formatRate, shortCode } from '../lib/format';
import type { SessionSummary } from '../state/types';
import { Brand } from './common';

interface Props {
  summary: SessionSummary;
  artwork: string | null;
  saved: boolean;
  replay: boolean;
  onSave: () => void;
  onDownload: () => void;
  onReplay: () => void;
  onLetGo: () => void;
  onBackToArchive: () => void;
  onPrivacy: () => void;
}

export function EchoScreen({
  summary,
  artwork,
  saved,
  replay,
  onSave,
  onDownload,
  onReplay,
  onLetGo,
  onBackToArchive,
  onPrivacy,
}: Props) {
  const isSynthetic = summary.source === 'synthetic';

  return (
    <section className="screen echo-screen" aria-labelledby="echo-title">
      <header className="topbar">
        <div className="brand-lockup">
          <Brand compact />
          <span className="brand-note">ECHO · {shortCode(summary.seed)}</span>
        </div>
        <div className="echo-nav">
          {replay && (
            <button type="button" className="text-button" onClick={onBackToArchive}>
              <ArrowLeft size={14} strokeWidth={1.4} aria-hidden="true" />
              Echoes
            </button>
          )}
          <button type="button" className="text-button" onClick={onPrivacy}>
            <ShieldCheck size={14} strokeWidth={1.4} aria-hidden="true" />
            Data note
          </button>
        </div>
      </header>

      <main className="echo-layout">
        <div className="echo-art-column">
          <div className={`echo-art-frame ${artwork ? 'is-ready' : 'is-loading'}`}>
            {artwork ? (
              <img
                className="echo-art"
                src={artwork}
                alt={`Echo Print ${shortCode(summary.seed)}: an abstract composition of rings, branching filaments and a pulse waveform generated from this session's aggregate signals.`}
              />
            ) : (
              <div className="echo-art-placeholder" aria-label="Developing your Echo Print">
                <span className="placeholder-ring placeholder-ring-a" />
                <span className="placeholder-ring placeholder-ring-b" />
                <span className="placeholder-ring placeholder-ring-c" />
                <span className="placeholder-core" />
                <span className="placeholder-caption">DEVELOPING THE ECHO</span>
              </div>
            )}
            <span className="echo-art-corner echo-art-tl" aria-hidden="true" />
            <span className="echo-art-corner echo-art-tr" aria-hidden="true" />
            <span className="echo-art-corner echo-art-bl" aria-hidden="true" />
            <span className="echo-art-corner echo-art-br" aria-hidden="true" />
          </div>
          <div className="echo-art-caption">
            <span>{isSynthetic ? 'SYNTHETIC STUDY' : 'LIVE SESSION'}</span>
            <span>{formatDate(summary.createdAt)}</span>
            <span>ECHO {shortCode(summary.seed)}</span>
          </div>
        </div>

        <div className="echo-copy">
          <p className="eyebrow">{replay ? 'An echo returns' : 'The world remembers'}</p>
          <h1 id="echo-title" className="scene-title echo-title">
            {replay ? 'An echo returns' : 'Your echo'}
          </h1>
          <p className="lede">
            {replay
              ? 'This world is being regenerated from a saved summary. The camera is off; nothing new is measured.'
              : 'This world was made by your presence. It ended when you left, and left this behind.'}
          </p>

          <div className="echo-facts">
            <div className="echo-fact">
              <span className="fact-label">DURATION</span>
              <span className="fact-value">{formatDuration(summary.durationSec)}</span>
            </div>
            <div className="echo-fact">
              <span className="fact-label">BREATH</span>
              <span className="fact-value">
                {summary.avgBreath != null ? formatRate(summary.avgBreath, '', 1) : '—'}
                <small>{summary.avgBreath != null ? '/min' : 'not captured'}</small>
              </span>
            </div>
            <div className="echo-fact">
              <span className="fact-label">PULSE</span>
              <span className="fact-value">
                {summary.avgPulse != null ? Math.round(summary.avgPulse) : '—'}
                <small>{summary.avgPulse != null ? 'bpm' : 'not captured'}</small>
              </span>
            </div>
          </div>

          <p className="echo-note">
            These are signals, not conclusions. No video, frames, or raw signal history were stored.
            {isSynthetic && ' This study used generated signals — no camera was active.'}
          </p>

          <div className="echo-actions">
            {!replay ? (
              <>
                <button
                  type="button"
                  className="primary-button"
                  onClick={onSave}
                  disabled={saved}
                >
                  {saved ? (
                    <>
                      <Check size={15} strokeWidth={1.6} aria-hidden="true" />
                      Saved to your echoes
                    </>
                  ) : (
                    <>
                      <Save size={15} strokeWidth={1.4} aria-hidden="true" />
                      Save this echo
                    </>
                  )}
                </button>
                <button type="button" className="quiet-button" onClick={onDownload}>
                  <Download size={15} strokeWidth={1.4} aria-hidden="true" />
                  Download artwork
                </button>
                <button type="button" className="quiet-button" onClick={onReplay}>
                  <Play size={14} strokeWidth={1.4} aria-hidden="true" />
                  Replay this world
                </button>
                <button type="button" className="link-button" onClick={onLetGo}>
                  Let it go
                </button>
              </>
            ) : (
              <>
                <button type="button" className="primary-button" onClick={onDownload}>
                  <Download size={15} strokeWidth={1.4} aria-hidden="true" />
                  Download artwork
                </button>
                <button type="button" className="quiet-button" onClick={onBackToArchive}>
                  <ArrowLeft size={15} strokeWidth={1.4} aria-hidden="true" />
                  Back to echoes
                </button>
                <button type="button" className="link-button" onClick={onLetGo}>
                  Let it go
                </button>
              </>
            )}
          </div>

          <div className="echo-footer-line">
            <Sparkles size={13} strokeWidth={1.3} aria-hidden="true" />
            <span>
              {summary.avgBreath == null && summary.avgPulse == null
                ? 'No stable reading was captured. The echo still holds the shape of your presence.'
                : 'The artwork is generated on this device from the session summary.'}
            </span>
          </div>
        </div>
      </main>
    </section>
  );
}
