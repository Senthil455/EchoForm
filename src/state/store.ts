import { create } from 'zustand';
import type {
  AppError,
  BootstrapInfo,
  Mode,
  Phase,
  Preferences,
  SessionSummary,
  ToastMessage,
} from './types';
import {
  clearAllStorage,
  defaultPreferences,
  loadEchoes,
  loadPreferences,
  saveEchoes,
  savePreferences,
} from './persistence';

function initialPhase(): Phase {
  try {
    const scene = new URLSearchParams(window.location.search).get('scene');
    if (
      scene === 'consent' ||
      scene === 'attuning' ||
      scene === 'alive' ||
      scene === 'echo' ||
      scene === 'archive'
    ) {
      return scene;
    }
  } catch {
    /* ignore */
  }
  return 'threshold';
}

function initialMode(): Mode {
  try {
    const mode = new URLSearchParams(window.location.search).get('mode');
    if (mode === 'synthetic' || mode === 'live') return mode;
  } catch {
    /* ignore */
  }
  return 'live';
}

interface AppState {
  phase: Phase;
  mode: Mode;
  prefs: Preferences;
  echoes: SessionSummary[];
  bootstrap: BootstrapInfo | null;
  hasKey: boolean;
  keySource: string | null;
  stream: MediaStream | null;
  liveStatus: string;
  validation: string;
  error: AppError | null;
  summary: SessionSummary | null;
  replayOf: SessionSummary | null;
  sessionStartedAt: number | null;
  toast: ToastMessage | null;
  settingsOpen: boolean;
  privacyOpen: boolean;

  setPhase: (phase: Phase) => void;
  setMode: (mode: Mode) => void;
  updatePrefs: (patch: Partial<Preferences>) => void;
  setBootstrap: (info: BootstrapInfo) => void;
  setKeyPresence: (hasKey: boolean, source?: string | null) => void;
  setStream: (stream: MediaStream | null) => void;
  setLiveStatus: (status: string) => void;
  setValidation: (validation: string) => void;
  setError: (error: AppError | null) => void;
  setSummary: (summary: SessionSummary | null) => void;
  setReplayOf: (summary: SessionSummary | null) => void;
  startSession: (at: number) => void;
  addEcho: (summary: SessionSummary) => void;
  removeEcho: (id: string) => void;
  setEchoes: (echoes: SessionSummary[]) => void;
  setToast: (toast: ToastMessage | null) => void;
  setSettingsOpen: (open: boolean) => void;
  setPrivacyOpen: (open: boolean) => void;
  deleteAllData: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  phase: initialPhase(),
  mode: initialMode(),
  prefs: loadPreferences(),
  echoes: loadEchoes(),
  bootstrap: null,
  hasKey: false,
  keySource: null,
  stream: null,
  liveStatus: 'Idle',
  validation: 'Waiting for your signal',
  error: null,
  summary: null,
  replayOf: null,
  sessionStartedAt: null,
  toast: null,
  settingsOpen: false,
  privacyOpen: false,

  setPhase: (phase) => set({ phase }),
  setMode: (mode) => set({ mode }),

  updatePrefs: (patch) => {
    const prefs = { ...get().prefs, ...patch };
    savePreferences(prefs);
    set({ prefs });
  },

  setBootstrap: (bootstrap) => set({ bootstrap }),
  setKeyPresence: (hasKey, keySource = null) => set({ hasKey, keySource }),
  setStream: (stream) => set({ stream }),
  setLiveStatus: (liveStatus) => set({ liveStatus }),
  setValidation: (validation) => set({ validation }),
  setError: (error) => set({ error }),
  setSummary: (summary) => set({ summary }),
  setReplayOf: (replayOf) => set({ replayOf }),
  startSession: (at) => set({ sessionStartedAt: at }),
  setToast: (toast) => set({ toast }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setPrivacyOpen: (privacyOpen) => set({ privacyOpen }),

  addEcho: (summary) => {
    const echoes = [summary, ...get().echoes.filter((e) => e.id !== summary.id)].slice(0, 24);
    saveEchoes(echoes);
    set({ echoes });
  },

  removeEcho: (id) => {
    const echoes = get().echoes.filter((e) => e.id !== id);
    saveEchoes(echoes);
    set({ echoes });
  },

  setEchoes: (echoes) => {
    saveEchoes(echoes);
    set({ echoes });
  },

  deleteAllData: () => {
    clearAllStorage();
    set({
      prefs: defaultPreferences(),
      echoes: [],
      summary: null,
      replayOf: null,
      sessionStartedAt: null,
      phase: 'threshold',
      mode: 'live',
      error: null,
      toast: null,
      hasKey: false,
      keySource: null,
      validation: 'Waiting for your signal',
      liveStatus: 'Idle',
    });
  },
}));
