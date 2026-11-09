import { useState } from 'react';
import {
  ArrowUpRight,
  Camera,
  HardDrive,
  ShieldCheck,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { formatRate } from '../lib/format';
import type { BootstrapInfo, Mode, Preferences } from '../state/types';
import { Modal, Toggle } from './common';

const PRIVACY_POINTS = [
  {
    icon: Camera,
    title: 'On-device measurement',
    body: 'Video frames travel only from the camera to the Presage SmartSpectra SDK running inside this app. ECHOFORM does not record, store, or upload them.',
  },
  {
    icon: WifiOff,
    title: 'One narrow network use',
    body: 'Live sensing contacts Presage to validate your SDK key and gate the service. ECHOFORM has no backend, no analytics, and no third-party scripts.',
  },
  {
    icon: ShieldCheck,
    title: 'Telemetry is opt-in',
    body: 'The SDK telemetry switch is off by default. You can change it here or on the consent screen. It contains aggregate SDK quality data, not camera video or signal values.',
  },
  {
    icon: HardDrive,
    title: 'Echoes hold aggregates only',
    body: 'A saved echo contains a date, duration, average breath and pulse, simple variability figures, a palette index, and a seed. No frames, waveforms, landmarks, or confidence history.',
  },
  {
    icon: Trash2,
    title: 'Deletion is immediate',
    body: 'Remove individual echoes or every local trace at any time. A stored API key is encrypted by the operating system and is deleted with the rest.',
  },
];

export function PrivacyPanel({
  open,
  onClose,
  bootstrap,
  prefs,
  onTelemetry,
  onDeleteAll,
  onOpenPresage,
}: {
  open: boolean;
  onClose: () => void;
  bootstrap: BootstrapInfo | null;
  prefs: Preferences;
  onTelemetry: (enabled: boolean) => void;
  onDeleteAll: () => void;
  onOpenPresage: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <Modal
      open={open}
      onClose={() => {
        setConfirming(false);
        onClose();
      }}
      eyebrow="Data note · v1"
      title="Your camera, your data"
      className="modal-wide"
      footer={
        <div className="modal-footer-row">
          <span className="modal-version">
            {bootstrap ? `${bootstrap.platform} · SmartSpectra ${bootstrap.sdkVersion}` : 'Browser preview'}
          </span>
          <button type="button" className="quiet-button" onClick={onOpenPresage}>
            Presage privacy
            <ArrowUpRight size={13} strokeWidth={1.4} aria-hidden="true" />
          </button>
        </div>
      }
    >
      <p className="modal-lede">
        ECHOFORM is built to leave no trace by default. Here is the whole contract, in plain language.
      </p>

      <div className="privacy-points">
        {PRIVACY_POINTS.map(({ icon: Icon, title, body }) => (
          <div className="privacy-point" key={title}>
            <span className="privacy-icon">
              <Icon size={16} strokeWidth={1.35} aria-hidden="true" />
            </span>
            <div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="privacy-status">
        <div>
          <span className="status-label">SDK TELEMETRY</span>
          <span className="status-value">{prefs.telemetry ? 'Opted in' : 'Off'}</span>
        </div>
        <div>
          <span className="status-label">API KEY</span>
          <span className="status-value">
            {bootstrap?.hasKey
              ? bootstrap.keySource === 'environment'
                ? 'From environment'
                : 'Stored securely'
              : 'Not stored'}
          </span>
        </div>
        <div>
          <span className="status-label">RAW FRAMES</span>
          <span className="status-value">Never retained</span>
        </div>
      </div>

      <Toggle
        checked={prefs.telemetry}
        onChange={onTelemetry}
        label="Share anonymous SDK telemetry"
        description="Applies to the Presage SDK only. Off by default."
      />

      <div className="privacy-delete">
        {!confirming ? (
          <button type="button" className="link-button danger-link" onClick={() => setConfirming(true)}>
            Delete all local data
          </button>
        ) : (
          <div className="inline-confirm" role="alert">
            <p>
              Remove every echo, preference, and stored key? This cannot be undone.
            </p>
            <div className="inline-confirm-actions">
              <button type="button" className="quiet-button" onClick={() => setConfirming(false)}>
                Keep my data
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => {
                  setConfirming(false);
                  onDeleteAll();
                  onClose();
                }}
              >
                Delete everything
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function SettingsSheet({
  open,
  onClose,
  prefs,
  mode,
  replay,
  onChange,
  onToggleSound,
  onPrivacy,
  onEnd,
  onShowIntro,
}: {
  open: boolean;
  onClose: () => void;
  prefs: Preferences;
  mode: Mode;
  replay: boolean;
  onChange: (patch: Partial<Preferences>) => void;
  onToggleSound: () => void;
  onPrivacy: () => void;
  onEnd: () => void;
  onShowIntro: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={replay ? 'Echo settings' : 'In the field'}
      title="Session settings"
      className="modal-sheet"
    >
      <div className="settings-group">
        <div className="settings-heading">Sound</div>
        <Toggle
          checked={prefs.sound}
          onChange={onToggleSound}
          label="Ambient sound"
          description="Synthesized breath, pad, and pulse. No audio is recorded and no microphone is used."
        />
        <label className={`volume-row ${prefs.sound ? '' : 'is-muted'}`}>
          <span className="volume-label">
            Volume <span>{Math.round(prefs.volume * 100)}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={prefs.volume}
            onChange={(event) => onChange({ volume: Number(event.target.value) })}
            disabled={!prefs.sound}
            aria-label="Sound volume"
          />
        </label>
      </div>

      <div className="settings-group">
        <div className="settings-heading">Motion & atmosphere</div>
        <Toggle
          checked={prefs.reducedMotion}
          onChange={(reducedMotion) => onChange({ reducedMotion })}
          label="Reduce motion"
          description="Calms camera drift, particle turbulence, and bloom. The world still answers your signals."
        />
        <Toggle
          checked={prefs.expressionWeather}
          onChange={(expressionWeather) => onChange({ expressionWeather })}
          label="Expression weather"
          description={
            mode === 'live'
              ? 'Off by default. Adds an abstract, unlabeled color weather from the SDK face output. It is never shown as an emotion.'
              : 'Available in live sessions when a Presage key and face metrics are available.'
          }
          disabled={mode !== 'live'}
        />
      </div>

      <div className="settings-group">
        <div className="settings-heading">Signal & data</div>
        <div className="settings-status">
          <span>Session type</span>
          <span>{replay ? 'Replay · camera off' : mode === 'live' ? 'Live camera' : 'Synthetic · camera off'}</span>
        </div>
        <div className="settings-status">
          <span>Pulse / breath</span>
          <span>{formatRate(null, '') /* placeholder replaced below */}</span>
        </div>
        <Toggle
          checked={prefs.telemetry}
          onChange={(telemetry) => onChange({ telemetry })}
          label="Share SDK telemetry"
          description="Off by default. Aggregate SDK quality data only."
        />
        <button type="button" className="settings-link" onClick={onPrivacy}>
          <ShieldCheck size={15} strokeWidth={1.4} aria-hidden="true" />
          Read the full data note
        </button>
      </div>

      <div className="settings-group">
        <div className="settings-heading">Session</div>
        <button type="button" className="settings-link" onClick={onShowIntro}>
          Show the introduction again
        </button>
        <button
          type="button"
          className="settings-end"
          onClick={() => {
            onClose();
            onEnd();
          }}
        >
          {replay ? 'Leave this echo' : 'End session'}
        </button>
      </div>

      <p className="shortcuts">
        <span><kbd>Esc</kbd> Settings</span>
        <span><kbd>M</kbd> Sound</span>
        <span><kbd>P</kbd> Privacy</span>
        <span><kbd>E</kbd> End</span>
      </p>
    </Modal>
  );
}
