import { useState } from 'react';
import {
  ArrowRight,
  Camera,
  ChevronLeft,
  Eye,
  EyeOff,
  HardDrive,
  KeyRound,
  ShieldCheck,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { setApiKey } from '../lib/api';
import type { BootstrapInfo } from '../state/types';
import { Toggle } from './common';

interface Props {
  bootstrap: BootstrapInfo | null;
  isElectron: boolean;
  hasKey: boolean;
  keySource: string | null;
  telemetry: boolean;
  onTelemetry: (enabled: boolean) => void;
  onKeyPresence: (hasKey: boolean, source?: string | null) => void;
  onLive: () => void;
  onSynthetic: () => void;
  onBack: () => void;
  onPrivacy: () => void;
  onToast: (title: string, detail?: string) => void;
}

const FACTS = [
  {
    icon: Camera,
    text: 'Your camera sees light. Frames are processed on this device by the Presage SmartSpectra SDK.',
  },
  {
    icon: ShieldCheck,
    text: 'ECHOFORM never records, stores, or uploads video. There is no MediaRecorder and no frame capture.',
  },
  {
    icon: WifiOff,
    text: 'The network is contacted only to validate your SDK key with Presage. There is no ECHOFORM backend.',
  },
  {
    icon: HardDrive,
    text: 'Nothing is saved by default. A saved echo holds only aggregate numbers, a seed, and a date.',
  },
  {
    icon: Trash2,
    text: 'Telemetry is off by default. Every local trace can be deleted from inside the app at any time.',
  },
];

export function Consent({
  bootstrap,
  isElectron,
  hasKey,
  keySource,
  telemetry,
  onTelemetry,
  onKeyPresence,
  onLive,
  onSynthetic,
  onBack,
  onPrivacy,
  onToast,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [remember, setRemember] = useState(Boolean(bootstrap?.safeStorage));
  const [busy, setBusy] = useState(false);
  const [keyHint, setKeyHint] = useState('');

  const showForm = isElectron && (!hasKey || editing);
  const sourceLabel =
    keySource === 'environment'
      ? 'Environment key'
      : keySource === 'safeStorage'
        ? 'Stored with OS encryption'
        : keySource === 'session'
          ? 'This session only'
          : 'Key ready';

  async function useCamera() {
    setKeyHint('');
    if (!isElectron) {
      setKeyHint('Live sensing runs in the ECHOFORM desktop app. You can explore the full world with synthetic signals here.');
      return;
    }
    if (hasKey && !editing) {
      onLive();
      return;
    }
    const trimmed = key.trim();
    if (trimmed.length < 8) {
      setKeyHint('Enter your Presage API key first. The key is validated by the SDK, not by ECHOFORM.');
      return;
    }

    setBusy(true);
    const result = await setApiKey(trimmed, remember);
    setBusy(false);
    if (!result.ok) {
      setKeyHint('That key could not be stored. Check it and try again, or explore with synthetic signals.');
      return;
    }
    const stored = result.remembered ? 'safeStorage' : 'session';
    onKeyPresence(true, stored);
    onToast(
      result.remembered ? 'Key stored securely' : 'Key ready for this session',
      result.remembered
        ? 'Presage will validate it when sensing begins.'
        : 'It will not be saved after ECHOFORM closes.',
    );
    onLive();
  }

  return (
    <section className="screen consent" aria-labelledby="consent-title">
      <header className="topbar">
        <button type="button" className="text-button back-button" onClick={onBack}>
          <ChevronLeft size={15} strokeWidth={1.4} aria-hidden="true" />
          Threshold
        </button>
        <button type="button" className="text-button" onClick={onPrivacy}>
          <ShieldCheck size={14} strokeWidth={1.4} aria-hidden="true" />
          Data note
        </button>
      </header>

      <main className="consent-grid">
        <section className="consent-copy">
          <p className="eyebrow">Before we begin</p>
          <h1 id="consent-title" className="scene-title">
            Your camera is a sense,
            <br />
            <em>not a recorder.</em>
          </h1>
          <p className="lede">
            ECHOFORM uses your camera to sense breath and pulse. What you see in the field is a living
            translation of those measurements — never a score, a diagnosis, or a judgement.
          </p>

          <ul className="data-facts">
            {FACTS.map(({ icon: Icon, text }) => (
              <li key={text}>
                <Icon size={17} strokeWidth={1.3} aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <div className="consent-options">
            <div className="telemetry-row">
              <Toggle
                checked={telemetry}
                onChange={onTelemetry}
                label="Share anonymous SDK telemetry"
                description="Off by default. This is the Presage SDK's aggregate quality telemetry, not video or signal values."
              />
            </div>

            {isElectron && (
              <div className="key-panel">
                <div className="key-panel-head">
                  <span className="key-icon">
                    <KeyRound size={15} strokeWidth={1.4} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="key-title">Presage SmartSpectra key</p>
                    {hasKey && !editing ? (
                      <p className="key-status">
                        {sourceLabel}
                        {keySource === 'environment' ? ' · set outside the app' : ''}
                      </p>
                    ) : (
                      <p className="key-status">
                        Required for live sensing. Never logged, never sent anywhere by ECHOFORM.
                      </p>
                    )}
                  </div>
                  {hasKey && !editing && (
                    <button type="button" className="link-button" onClick={() => setEditing(true)}>
                      Replace
                    </button>
                  )}
                </div>

                {showForm && (
                  <div className="key-form">
                    <div className="key-input-wrap">
                      <input
                        className="key-input"
                        type={showKey ? 'text' : 'password'}
                        value={key}
                        onChange={(event) => setKey(event.target.value)}
                        placeholder="Paste your SmartSpectra API key"
                        autoComplete="off"
                        spellCheck={false}
                        aria-label="Presage SmartSpectra API key"
                      />
                      <button
                        type="button"
                        className="icon-button key-reveal"
                        onClick={() => setShowKey((value) => !value)}
                        aria-label={showKey ? 'Hide API key' : 'Show API key'}
                      >
                        {showKey ? (
                          <EyeOff size={15} strokeWidth={1.4} />
                        ) : (
                          <Eye size={15} strokeWidth={1.4} />
                        )}
                      </button>
                    </div>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={remember && Boolean(bootstrap?.safeStorage)}
                        onChange={(event) => setRemember(event.target.checked)}
                        disabled={!bootstrap?.safeStorage}
                      />
                      <span>
                        Remember on this device
                        <small>
                          {bootstrap?.safeStorage
                            ? 'Encrypted by the operating system. Never written to app storage.'
                            : 'Secure storage is unavailable here. The key will last for this session only.'}
                        </small>
                      </span>
                    </label>
                  </div>
                )}

                {keyHint && (
                  <p className="field-hint" role="status">
                    {keyHint}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="consent-actions">
            <button
              type="button"
              className="primary-button"
              onClick={useCamera}
              disabled={busy}
            >
              <span>{busy ? 'Preparing…' : 'Use my camera'}</span>
              <ArrowRight size={16} strokeWidth={1.4} aria-hidden="true" />
            </button>
            <button type="button" className="quiet-button" onClick={onSynthetic}>
              Explore with synthetic signals
            </button>
          </div>

          <p className="consent-footnote">
            Synthetic mode uses a plausible generated signal, never your camera. It is labeled
            throughout the experience and lets you test every part of the world without a key.
          </p>
        </section>

        <aside className="consent-aperture" aria-hidden="true">
          <div className="aperture">
            <span className="aperture-ring aperture-ring-outer" />
            <span className="aperture-ring aperture-ring-mid" />
            <span className="aperture-ring aperture-ring-inner" />
            <span className="aperture-cross aperture-cross-h" />
            <span className="aperture-cross aperture-cross-v" />
            <span className="aperture-lens" />
            <span className="aperture-sliver" />
            <span className="aperture-mark">CAMERA OFF</span>
          </div>
          <p className="aperture-caption">The aperture opens only when you choose.</p>
          <div className="aperture-meta">
            <span>ON-DEVICE MEASUREMENT</span>
            <span>{bootstrap?.sdkVersion ? `SMARTSPECTRA ${bootstrap.sdkVersion}` : 'SMARTSPECTRA SDK'}</span>
          </div>
        </aside>
      </main>
    </section>
  );
}
