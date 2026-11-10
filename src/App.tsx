import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EchoAudio } from './audio/EchoAudio';
import { generateEchoPrint } from './artwork/EchoPrint';
import {
  clearApiKey,
  getApiKey,
  getBootstrap,
  isElectron,
  openExternal,
  saveArtwork,
} from './lib/api';
import { newSeed } from './lib/math';
import { shortCode } from './lib/format';
import { SignalEngine } from './signals/engine';
import { signalRuntime } from './signals/runtime';
import { LiveSession } from './signals/smartspectra';
import { useSignalClock } from './signals/useSignal';
import { useAppStore } from './state/store';
import type { AppError, Mode, SessionSummary } from './state/types';
import { paletteFor } from './world/palettes';
import { WorldCanvas } from './world/WorldCanvas';
import { AlertTriangle, ArrowRight, RotateCcw, Sparkles, X } from 'lucide-react';
import { Alive } from './ui/Alive';
import { Archive } from './ui/Archive';
import { Attuning } from './ui/Attuning';
import { ConfirmDialog, Toast } from './ui/common';
import { Consent } from './ui/Consent';
import { EchoScreen } from './ui/EchoScreen';
import { PrivacyPanel, SettingsSheet } from './ui/Overlays';
import { Threshold } from './ui/Threshold';

function demoSummary(seed: number, palette?: number): SessionSummary {
  return {
    id: `demo-${seed.toString(36)}`,
    createdAt: new Date().toISOString(),
    durationSec: 257,
    avgPulse: 64.2,
    avgBreath: 14.1,
    hrvRmssd: 42.3,
    presenceRatio: 0.92,
    breathVariability: 0.13,
    pulseVariability: 0.21,
    seed,
    palette: palette != null && Number.isFinite(palette) ? Math.abs(Math.round(palette)) % 6 : seed % 6,
    source: 'synthetic',
    version: 1,
  };
}

function fallbackSummary(engine: SignalEngine, mode: Mode): SessionSummary {
  return {
    id: `${Date.now().toString(36)}-${engine.seed.toString(16)}`,
    createdAt: new Date().toISOString(),
    durationSec: Math.max(1, engine.getFrame().t),
    avgPulse: null,
    avgBreath: null,
    hrvRmssd: null,
    presenceRatio: 0,
    breathVariability: 0,
    pulseVariability: 0,
    seed: engine.seed,
    palette: engine.seed % 6,
    source: mode === 'live' ? 'live' : 'synthetic',
    version: 1,
  };
}

export default function App() {
  const phase = useAppStore((state) => state.phase);
  const mode = useAppStore((state) => state.mode);
  const prefs = useAppStore((state) => state.prefs);
  const echoes = useAppStore((state) => state.echoes);
  const bootstrap = useAppStore((state) => state.bootstrap);
  const hasKey = useAppStore((state) => state.hasKey);
  const keySource = useAppStore((state) => state.keySource);
  const stream = useAppStore((state) => state.stream);
  const liveStatus = useAppStore((state) => state.liveStatus);
  const error = useAppStore((state) => state.error);
  const summary = useAppStore((state) => state.summary);
  const replayOf = useAppStore((state) => state.replayOf);
  const settingsOpen = useAppStore((state) => state.settingsOpen);
  const privacyOpen = useAppStore((state) => state.privacyOpen);
  const toast = useAppStore((state) => state.toast);

  const setPhase = useAppStore((state) => state.setPhase);
  const setMode = useAppStore((state) => state.setMode);
  const updatePrefs = useAppStore((state) => state.updatePrefs);
  const setBootstrap = useAppStore((state) => state.setBootstrap);
  const setKeyPresence = useAppStore((state) => state.setKeyPresence);
  const setStream = useAppStore((state) => state.setStream);
  const setLiveStatus = useAppStore((state) => state.setLiveStatus);
  const setValidation = useAppStore((state) => state.setValidation);
  const setError = useAppStore((state) => state.setError);
  const setSummary = useAppStore((state) => state.setSummary);
  const setReplayOf = useAppStore((state) => state.setReplayOf);
  const startSession = useAppStore((state) => state.startSession);
  const addEcho = useAppStore((state) => state.addEcho);
  const removeEcho = useAppStore((state) => state.removeEcho);
  const setToast = useAppStore((state) => state.setToast);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
  const setPrivacyOpen = useAppStore((state) => state.setPrivacyOpen);
  const deleteAllData = useAppStore((state) => state.deleteAllData);

  const [engine, setEngine] = useState<SignalEngine | null>(null);
  const [liveAttempt, setLiveAttempt] = useState(0);
  const [artwork, setArtwork] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  const engineRef = useRef<SignalEngine | null>(null);
  const liveRef = useRef<LiveSession | null>(null);
  const qaBoot = useRef(false);
  const audio = useMemo(() => new EchoAudio(), []);

  const pushToast = useCallback(
    (title: string, detail?: string, tone: 'neutral' | 'warning' | 'success' = 'neutral') => {
      setToast({ id: Date.now() + Math.random(), title, detail, tone });
    },
    [setToast],
  );

  const refreshBootstrap = useCallback(async () => {
    try {
      const info = await getBootstrap();
      setBootstrap(info);
      setKeyPresence(info.hasKey, info.keySource);
    } catch {
      /* the preview still works without bootstrap details */
    }
  }, [setBootstrap, setKeyPresence]);

  useEffect(() => {
    void refreshBootstrap();
  }, [refreshBootstrap]);

  const clockActive =
    phase === 'attuning' || phase === 'alive' || phase === 'echo' || phase === 'replay';
  useSignalClock(engine, clockActive);

  // ── Session construction ───────────────────────────────────────────────────
  const startNewEngine = useCallback(
    (source: SignalEngine['source'], seed: number, replaySummary?: SessionSummary) => {
      liveRef.current?.stop().catch(() => undefined);
      liveRef.current = null;
      engineRef.current?.stop();
      const next = new SignalEngine(source, seed, replaySummary);
      next.start();
      engineRef.current = next;
      setEngine(next);
      signalRuntime.reset(source);
      return next;
    },
    [],
  );

  const beginLive = useCallback(() => {
    startNewEngine('live', newSeed());
    setMode('live');
    setSummary(null);
    setReplayOf(null);
    setArtwork(null);
    setSaved(false);
    setError(null);
    setStream(null);
    setValidation('Waiting for your signal');
    setLiveStatus('Starting');
    updatePrefs({ lastMode: 'live' });
    setPhase('attuning');
  }, [
    startNewEngine,
    setMode,
    setSummary,
    setReplayOf,
    setError,
    setStream,
    setValidation,
    setLiveStatus,
    updatePrefs,
    setPhase,
  ]);

  const beginSynthetic = useCallback(() => {
    startNewEngine('synthetic', newSeed());
    setMode('synthetic');
    setSummary(null);
    setReplayOf(null);
    setArtwork(null);
    setSaved(false);
    setError(null);
    setStream(null);
    setValidation('Synthetic signal settling');
    setLiveStatus('Idle');
    updatePrefs({ lastMode: 'synthetic' });
    setPhase('attuning');
  }, [
    startNewEngine,
    setMode,
    setSummary,
    setReplayOf,
    setError,
    setStream,
    setValidation,
    setLiveStatus,
    updatePrefs,
    setPhase,
  ]);

  const beginReplay = useCallback(
    (echo: SessionSummary) => {
      startNewEngine('replay', echo.seed, echo);
      setReplayOf(echo);
      setSummary(echo);
      setArtwork(null);
      setSaved(false);
      setError(null);
      setStream(null);
      setSettingsOpen(false);
      setPhase('replay');
    },
    [startNewEngine, setReplayOf, setSummary, setError, setStream, setSettingsOpen, setPhase],
  );

  const openField = useCallback(() => {
    updatePrefs({ hasOnboarded: true, lastMode: mode });
    setError(null);
    if (useAppStore.getState().phase !== 'alive') {
      startSession(performance.now());
      setPhase('alive');
    }
  }, [updatePrefs, setError, startSession, setPhase, mode]);

  // ── Live SDK session ──────────────────────────────────────────────────────
  const liveActive = mode === 'live' && engine != null && (phase === 'attuning' || phase === 'alive');

  useEffect(() => {
    if (!liveActive || !engine) return;
    let cancelled = false;
    let session: LiveSession | null = null;
    setLiveStatus('Starting');
    setValidation('Waiting for your signal');
    setError(null);

    const run = async () => {
      const key = await getApiKey();
      if (cancelled) return;
      if (!key) {
        setError(
          isElectron
            ? {
                title: 'A Presage key is needed',
                message:
                  'Add your SmartSpectra API key in the previous step, or explore the world with synthetic signals.',
                retryable: false,
              }
            : {
                title: 'Live sensing needs the desktop app',
                message:
                  'This browser preview can explore the entire world with synthetic signals. Open ECHOFORM in Electron for camera sensing.',
                retryable: false,
              },
        );
        setLiveStatus('Idle');
        return;
      }

      session = new LiveSession(engine, {
        apiKey: key,
        telemetry: useAppStore.getState().prefs.telemetry,
        expressions: useAppStore.getState().prefs.expressionWeather,
        onStream: (next) => setStream(next),
        onStatus: (status) => setLiveStatus(status),
        onValidation: (hint) => setValidation(hint),
        onError: (nextError) => setError(nextError),
        onRunningChange: (running) => {
          if (!running) setLiveStatus('Idle');
        },
      });
      liveRef.current = session;
      try {
        await session.start();
      } catch {
        // LiveSession reports the typed error through onError.
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (liveRef.current === session) liveRef.current = null;
      void session?.stop();
      setStream(null);
    };
  }, [liveActive, engine, liveAttempt, setLiveStatus, setValidation, setError, setStream]);

  // ── Ending / leaving ──────────────────────────────────────────────────────
  const finishSession = useCallback(() => {
    const state = useAppStore.getState();
    const current = engineRef.current;
    let final: SessionSummary | null = null;
    if (state.phase === 'replay') {
      final = state.replayOf;
    } else if (current) {
      final = current.buildSummary() ?? fallbackSummary(current, state.mode);
    }
    current?.setRunning(false);
    setSummary(final);
    setReplayOf(state.phase === 'replay' ? state.replayOf : null);
    setSaved(false);
    setArtwork(null);
    setError(null);
    setConfirmEndOpen(false);
    setSettingsOpen(false);
    updatePrefs({ hasOnboarded: true });
    setPhase('echo');
  }, [setSummary, setReplayOf, setSaved, setError, setSettingsOpen, updatePrefs, setPhase]);

  const requestEnd = useCallback(() => {
    const state = useAppStore.getState();
    if (state.phase === 'replay') {
      finishSession();
      return;
    }
    const frame = engineRef.current?.getFrame();
    if (state.phase === 'alive' && frame && frame.t < 20) {
      setConfirmEndOpen(true);
      return;
    }
    finishSession();
  }, [finishSession]);

  const goThreshold = useCallback(() => {
    liveRef.current?.stop().catch(() => undefined);
    liveRef.current = null;
    engineRef.current?.stop();
    engineRef.current = null;
    setEngine(null);
    signalRuntime.reset('live');
    setStream(null);
    setLiveStatus('Idle');
    setValidation('Waiting for your signal');
    setError(null);
    setSummary(null);
    setReplayOf(null);
    setArtwork(null);
    setSaved(false);
    setConfirmEndOpen(false);
    setSettingsOpen(false);
    setPhase('threshold');
  }, [
    setEngine,
    setStream,
    setLiveStatus,
    setValidation,
    setError,
    setSummary,
    setReplayOf,
    setSettingsOpen,
    setPhase,
  ]);

  const goArchive = useCallback(() => {
    liveRef.current?.stop().catch(() => undefined);
    liveRef.current = null;
    engineRef.current?.stop();
    engineRef.current = null;
    setEngine(null);
    signalRuntime.reset('live');
    setStream(null);
    setError(null);
    setSummary(null);
    setReplayOf(null);
    setArtwork(null);
    setSaved(false);
    setSettingsOpen(false);
    setPhase('archive');
  }, [
    setEngine,
    setStream,
    setError,
    setSummary,
    setReplayOf,
    setSettingsOpen,
    setPhase,
  ]);

  const letGo = useCallback(() => {
    if (useAppStore.getState().phase === 'replay') {
      goArchive();
    } else {
      goThreshold();
    }
  }, [goArchive, goThreshold]);

  // ── Echo artwork ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'echo' || !summary) return;
    let cancelled = false;
    setArtwork(null);
    generateEchoPrint(summary)
      .then((url) => {
        if (!cancelled) setArtwork(url);
      })
      .catch(() => {
        if (!cancelled) {
          pushToast('The Echo Print could not be drawn', 'Try downloading it again.', 'warning');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [phase, summary, pushToast]);

  const saveEcho = useCallback(() => {
    if (!summary || saved) return;
    addEcho(summary);
    setSaved(true);
    pushToast(
      'Echo kept',
      'It now lives in your echo shelf. You can delete it at any time.',
      'success',
    );
  }, [summary, saved, addEcho, pushToast]);

  const downloadArtwork = useCallback(
    async (target?: SessionSummary) => {
      const state = useAppStore.getState();
      const item = target ?? state.summary;
      if (!item) return;
      try {
        const dataUrl =
          state.summary?.id === item.id && artwork
            ? artwork
            : await generateEchoPrint(item);
        const filename = `echoform-${item.createdAt.slice(0, 10)}-${shortCode(item.seed)}.png`;
        const result = await saveArtwork(dataUrl, filename);
        if (result.ok) {
          pushToast('Artwork saved', result.path ?? 'Saved to your downloads.', 'success');
        } else if (!result.canceled) {
          pushToast('The artwork could not be saved', result.error ?? 'Try again.', 'warning');
        }
      } catch {
        pushToast('The artwork could not be generated', 'The Echo Print is drawn locally. Try again.', 'warning');
      }
    },
    [artwork, pushToast],
  );

  // ── Sound ─────────────────────────────────────────────────────────────────
  const toggleSound = useCallback(() => {
    const current = useAppStore.getState().prefs;
    const next = !current.sound;
    updatePrefs({ sound: next });
    if (next) {
      void audio.enable(current.volume);
      const currentPhase = useAppStore.getState().phase;
      audio.setSceneActive(
        currentPhase === 'attuning' || currentPhase === 'alive' || currentPhase === 'replay',
      );
    } else {
      audio.disable();
    }
  }, [audio, updatePrefs]);

  useEffect(() => {
    audio.setVolume(prefs.volume);
  }, [audio, prefs.volume]);

  useEffect(() => {
    if (!prefs.sound) {
      audio.disable();
      return;
    }
    const active = phase === 'attuning' || phase === 'alive' || phase === 'replay';
    audio.setSceneActive(active);
    const timer = window.setInterval(() => audio.update(signalRuntime.liveFrame), 100);
    return () => window.clearInterval(timer);
  }, [audio, prefs.sound, phase]);

  useEffect(() => {
    if (!prefs.sound) return;
    const activate = () => {
      void audio.enable(useAppStore.getState().prefs.volume);
    };
    window.addEventListener('pointerdown', activate, { once: true, capture: true });
    window.addEventListener('keydown', activate, { once: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', activate, { capture: true });
      window.removeEventListener('keydown', activate, { capture: true });
    };
  }, [audio, prefs.sound]);

  useEffect(() => () => {
    void audio.dispose();
  }, [audio]);

  // ── Data deletion ─────────────────────────────────────────────────────────
  const removeEverything = useCallback(() => {
    audio.disable();
    void clearApiKey();
    liveRef.current?.stop().catch(() => undefined);
    liveRef.current = null;
    engineRef.current?.stop();
    engineRef.current = null;
    setEngine(null);
    signalRuntime.reset('live');
    setStream(null);
    setError(null);
    setSummary(null);
    setReplayOf(null);
    setArtwork(null);
    setSaved(false);
    setConfirmEndOpen(false);
    setSettingsOpen(false);
    setPrivacyOpen(false);
    deleteAllData();
    void refreshBootstrap();
    pushToast('Local data deleted', 'Echoes, preferences, and stored keys are gone.', 'success');
  }, [
    audio,
    setEngine,
    setStream,
    setError,
    setSummary,
    setReplayOf,
    setSettingsOpen,
    setPrivacyOpen,
    deleteAllData,
    refreshBootstrap,
    pushToast,
  ]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const state = useAppStore.getState();
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (state.settingsOpen || state.privacyOpen) return;
      if (state.phase !== 'alive' && state.phase !== 'replay') return;

      switch (event.key.toLowerCase()) {
        case 'escape':
          event.preventDefault();
          setSettingsOpen(true);
          break;
        case 'm':
          event.preventDefault();
          toggleSound();
          break;
        case 'p':
          event.preventDefault();
          setPrivacyOpen(true);
          break;
        case 'e':
          event.preventDefault();
          requestEnd();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [requestEnd, setPrivacyOpen, setSettingsOpen, toggleSound]);

  // ── Query-param scene jump (QA / screenshots) ─────────────────────────────
  useEffect(() => {
    if (qaBoot.current) return;
    qaBoot.current = true;
    const params = new URLSearchParams(window.location.search);
    const scene = params.get('scene');
    if (!scene) return;
    const seedParam = Number(params.get('seed'));
    const seed = Number.isFinite(seedParam) && seedParam > 0 ? seedParam >>> 0 : newSeed();

    if (scene === 'echo') {
      const paletteParam = Number(params.get('palette'));
      setSummary(demoSummary(seed, Number.isFinite(paletteParam) ? paletteParam : undefined));
      setReplayOf(null);
      setPhase('echo');
      return;
    }
    if (scene === 'attuning' || scene === 'alive') {
      const next = new SignalEngine('synthetic', seed);
      next.start();
      engineRef.current = next;
      setEngine(next);
      signalRuntime.reset('synthetic');
      setMode('synthetic');
      updatePrefs({ lastMode: 'synthetic' });
      setPhase(scene);
    }
  }, [setSummary, setReplayOf, setPhase, setMode, updatePrefs]);

  // ── Render values ─────────────────────────────────────────────────────────
  // Echo and replay screens no longer hold an engine, so their saved seed and
  // palette must drive the world that sits behind the artwork.
  const echoLook =
    phase === 'echo' ? summary : phase === 'replay' ? (replayOf ?? summary) : null;
  const paletteIndex = echoLook?.palette ?? (engine ? engine.seed % 6 : 0);
  const worldSeed = echoLook?.seed ?? engine?.seed ?? 0x9e3779b9;
  const worldReplayDuration =
    phase === 'replay' ? (replayOf ?? summary)?.durationSec : undefined;
  const palette = paletteFor(paletteIndex);
  const showWorld = phase !== 'archive';
  const isReplayEcho = phase === 'echo' && replayOf != null;

  const retryLive = useCallback(() => {
    setError(null);
    if (useAppStore.getState().mode === 'live') {
      setLiveAttempt((value) => value + 1);
    } else {
      beginSynthetic();
    }
  }, [setError, beginSynthetic]);

  const errorToSynthetic = useCallback(() => {
    setError(null);
    beginSynthetic();
  }, [setError, beginSynthetic]);

  return (
    <div
      className={`app${prefs.reducedMotion ? ' reduced-motion' : ''}`}
      data-phase={phase}
      data-mode={mode}
      data-seed={worldSeed}
      data-palette={paletteIndex}
    >
      {showWorld && (
        <WorldCanvas
          phase={phase}
          paletteIndex={paletteIndex}
          seed={worldSeed}
          reducedMotion={prefs.reducedMotion}
          replayDuration={worldReplayDuration}
        />
      )}
      <div
        className="world-tint"
        style={{ background: `radial-gradient(ellipse at 50% 58%, transparent 30%, ${palette.background}99 100%)` }}
        aria-hidden="true"
      />
      <div className="scene-ui">
        {phase === 'threshold' && (
          <Threshold
            echoCount={echoes.length}
            appVersion={bootstrap?.appVersion ?? '0.1.0'}
            onEnter={() => setPhase('consent')}
            onArchive={() => setPhase('archive')}
            onAbout={() => setPrivacyOpen(true)}
          />
        )}

        {phase === 'consent' && (
          <Consent
            bootstrap={bootstrap}
            isElectron={isElectron}
            hasKey={hasKey}
            keySource={keySource}
            telemetry={prefs.telemetry}
            onTelemetry={(telemetry) => updatePrefs({ telemetry })}
            onKeyPresence={(present, source) => {
              setKeyPresence(present, source ?? null);
              void refreshBootstrap();
            }}
            onLive={beginLive}
            onSynthetic={beginSynthetic}
            onBack={goThreshold}
            onPrivacy={() => setPrivacyOpen(true)}
            onToast={pushToast}
          />
        )}

        {phase === 'attuning' && (
          <Attuning
            mode={mode}
            stream={stream}
            error={error}
            liveStatus={liveStatus}
            onReady={openField}
            onRetry={retryLive}
            onSynthetic={errorToSynthetic}
            onBack={goThreshold}
            onSkip={openField}
            onPrivacy={() => setPrivacyOpen(true)}
            onOpenPortal={() => void openExternal('https://smartspectra.presagetech.com/')}
          />
        )}

        {(phase === 'alive' || phase === 'replay') && (
          <Alive
            mode={mode}
            prefs={prefs}
            replayOf={replayOf}
            onToggleSound={toggleSound}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenPrivacy={() => setPrivacyOpen(true)}
            onEnd={requestEnd}
          />
        )}

        {phase === 'echo' && summary && (
          <EchoScreen
            summary={summary}
            artwork={artwork}
            saved={saved}
            replay={isReplayEcho}
            onSave={saveEcho}
            onDownload={() => void downloadArtwork()}
            onReplay={() => beginReplay(summary)}
            onLetGo={letGo}
            onBackToArchive={goArchive}
            onPrivacy={() => setPrivacyOpen(true)}
          />
        )}

        {phase === 'archive' && (
          <Archive
            echoes={echoes}
            onOpen={beginReplay}
            onDownload={(echo) => void downloadArtwork(echo)}
            onDelete={removeEcho}
            onDeleteAll={removeEverything}
            onBack={goThreshold}
            onEnter={() => setPhase('consent')}
          />
        )}
      </div>

      {error && phase === 'alive' && (
        <div className="session-error" role="alert">
          <div className="session-error-head">
            <AlertTriangle size={16} strokeWidth={1.4} aria-hidden="true" />
            <span className="eyebrow">Signal interrupted</span>
            <button
              type="button"
              className="icon-button"
              onClick={() => setError(null)}
              aria-label="Dismiss"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
          <h2>{error.title}</h2>
          <p>{error.message}</p>
          <div className="session-error-actions">
            {error.retryable !== false && (
              <button type="button" className="primary-button" onClick={retryLive}>
                <RotateCcw size={14} strokeWidth={1.4} aria-hidden="true" />
                Reconnect
              </button>
            )}
            <button type="button" className="quiet-button" onClick={errorToSynthetic}>
              <Sparkles size={14} strokeWidth={1.4} aria-hidden="true" />
              Use synthetic signals
            </button>
            <button type="button" className="link-button" onClick={() => setError(null)}>
              Keep the field
              <ArrowRight size={12} strokeWidth={1.4} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />

      <ConfirmDialog
        open={confirmEndOpen}
        title="Leave the field?"
        body="This world will end when you do. You can keep an echo of it, and return to the field whenever you like."
        confirmLabel="End session"
        cancelLabel="Stay a little longer"
        onCancel={() => setConfirmEndOpen(false)}
        onConfirm={finishSession}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={prefs}
        mode={mode}
        replay={phase === 'replay'}
        onChange={updatePrefs}
        onToggleSound={toggleSound}
        onPrivacy={() => {
          setSettingsOpen(false);
          setPrivacyOpen(true);
        }}
        onEnd={requestEnd}
        onShowIntro={() => {
          updatePrefs({ hasOnboarded: false });
          goThreshold();
        }}
      />

      <PrivacyPanel
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        bootstrap={bootstrap}
        prefs={prefs}
        onTelemetry={(telemetry) => updatePrefs({ telemetry })}
        onDeleteAll={removeEverything}
        onOpenPresage={() => void openExternal('https://smartspectra.presagetech.com/')}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />

      <p className="sr-only" aria-live="polite">
        {phase === 'attuning'
          ? 'Attuning to your signal.'
          : phase === 'alive'
            ? 'The field is alive.'
            : phase === 'echo'
              ? 'Your echo is ready.'
              : ''}
      </p>
    </div>
  );
}
