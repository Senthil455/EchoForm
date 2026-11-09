import { ArrowUpRight, Archive, Shield } from 'lucide-react';
import { Brand } from './common';

interface Props {
  echoCount: number;
  appVersion: string;
  onEnter: () => void;
  onArchive: () => void;
  onAbout: () => void;
}

export function Threshold({ echoCount, appVersion, onEnter, onArchive, onAbout }: Props) {
  return (
    <section className="screen threshold" aria-labelledby="threshold-title">
      <header className="topbar">
        <div className="brand-lockup">
          <Brand />
          <span className="brand-note">A PRESAGE STUDY · 2026</span>
        </div>
        <nav className="topnav" aria-label="Primary">
          {echoCount > 0 && (
            <button type="button" className="text-button" onClick={onArchive}>
              <Archive size={14} strokeWidth={1.4} aria-hidden="true" />
              Echoes
              <span className="nav-count">{String(echoCount).padStart(2, '0')}</span>
            </button>
          )}
          <button type="button" className="text-button" onClick={onAbout}>
            <Shield size={14} strokeWidth={1.4} aria-hidden="true" />
            About
          </button>
        </nav>
      </header>

      <main className="threshold-main">
        <p className="eyebrow reveal reveal-1">An instrument for the living</p>
        <h1 id="threshold-title" className="threshold-title reveal reveal-2">
          ECHO<span className="threshold-title-form">FORM</span>
        </h1>
        <p className="threshold-line reveal reveal-3">
          A world that exists only while you are present.
        </p>

        <div className="threshold-actions reveal reveal-4">
          <button type="button" className="enter-button" onClick={onEnter}>
            <span className="enter-orbit" aria-hidden="true">
              <span className="enter-orbit-core" />
            </span>
            <span className="enter-label">Enter the field</span>
            <ArrowUpRight size={16} strokeWidth={1.4} aria-hidden="true" />
          </button>
          <span className="threshold-duration">A SESSION IS YOURS TO END</span>
        </div>
      </main>

      <footer className="threshold-footer reveal reveal-5">
        <p>
          No account. No recording.
          <br />
          Your camera is a sense, not a recorder.
        </p>
        <div className="threshold-meta">
          <span>BREATH · PULSE · PRESENCE</span>
          <span>v{appVersion}</span>
        </div>
      </footer>
    </section>
  );
}
