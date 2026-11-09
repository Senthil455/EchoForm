# ECHOFORM — Technical Requirements Document (TRD)

> **Version:** 1.0 (challenge baseline)
> **Owner:** Senthil Raja R
> **Status:** Implementation baseline
> **Related:** [PRD](./PRD.md) · [Architecture](./ARCHITECTURE.md) · [Privacy](./PRIVACY.md)

---

## 1. Technical summary

ECHOFORM is an Electron desktop application with a React/TypeScript renderer and a Three.js (React Three Fiber) generative world. Live human signals are measured by the Presage SmartSpectra Node/Electron SDK from a camera MediaStream. A signal translation engine smooths and normalizes the measurements, then drives GPU shader uniforms, procedural growth, and a Web Audio soundscape. Sessions produce a locally generated artwork and an optional local-only summary.

The architecture is deliberately local-first:

- **On-device measurement:** SmartSpectra computes metrics locally.
- **No backend:** no accounts, no analytics, no uploads.
- **Network only for SDK gating:** the SDK authenticates the API key with Presage.
- **Persistence only on request:** saved echoes contain aggregate numbers and a seed, not raw signals.

---

## 2. Goals and constraints

### 2.1 Technical goals

1. Integrate the real SmartSpectra SDK with a live camera and decode real metrics.
2. Translate noisy physiological signals into stable, expressive visual parameters at 60 Hz.
3. Maintain ≥ 30 fps on integrated graphics at 1280×800.
4. Make camera consent, data handling, and deletion explicit and technically enforced.
5. Keep the app runnable without an API key through a clearly labeled synthetic mode.
6. Produce a deterministic, locally generated artwork from a session.
7. Support optional replay of saved echoes without camera access.
8. Package the native SDK runtime correctly for Windows/macOS/Linux.

### 2.2 Constraints

- Node.js ≥ 20; development on Node 24.
- Electron ≥ 28; target Electron 45.
- `@smartspectra/node-sdk` 3.4.x (pinned range).
- Supported native platforms: `win32-x64`, `darwin-arm64`, `linux-x64`, `linux-arm64`.
- Windows x64 is the primary demo target.
- No server, database, or cloud storage.
- No microphone, no video recording, no external AI services.
- Network required for live mode authentication; synthetic mode works offline.

---

## 3. Technology stack

| Layer | Choice | Reason |
| --- | --- | --- |
| Desktop shell | Electron 45 | Official SmartSpectra Node/Electron path; native camera + safeStorage |
| Renderer | React 19 + TypeScript 5.9 | Component model, strict typing, mature ecosystem |
| Build | Vite 8 + esbuild | Fast dev server, ESM renderer bundle |
| 3D | Three.js 0.187 + React Three Fiber 9 | Declarative scene graph, shader access, useFrame loop |
| Helpers | `@react-three/drei` | Minimal helpers (no asset loaders needed) |
| Postprocessing | `@react-three/postprocessing` + `postprocessing` | Bloom for bioluminescent highlights |
| State | Zustand 5 | Small, fast external store; avoids context churn |
| Persistence | `localStorage` + Electron `safeStorage` | No backend; key encrypted by OS |
| Audio | Web Audio API | Synthesis only; no assets, no mic |
| Artwork | Canvas 2D | Deterministic local PNG generation |
| Fonts | Fontsource variable fonts | Offline, bundled; no remote font requests |
| Icons | lucide-react | Small tree-shaken SVG icons |

### 3.1 Explicitly excluded

- Next.js / SSR — not needed in Electron.
- Tailwind — the visual system is bespoke and small enough for hand-authored CSS.
- Framer Motion — CSS transitions and a tiny custom reveal are sufficient; avoids bundle cost.
- Chart.js / Recharts — the HUD is not a dashboard.
- protobufjs codegen — the SDK ships `@smartspectra/node-sdk/messages`.
- Any remote font, analytics, crash reporter, or LLM service.

---

## 4. Process architecture

```
┌────────────────────────────────────────────────────────────────────┐
│ Electron main process (Node, CommonJS)                             │
│                                                                    │
│  main.cjs                                                          │
│   ├─ BrowserWindow (contextIsolation, sandbox, no nodeIntegration) │
│   ├─ bindSmartSpectraIpc(win)  ← SDK native pipeline owner          │
│   ├─ IPC: settings / safeStorage / save artwork / open external     │
│   ├─ permission handler: camera only, local page only               │
│   ├─ navigation + popup blocking                                    │
│   └─ native runtime path resolution for packaged builds             │
└─────────────────────────────┬──────────────────────────────────────┘
                              │ preload (isolated world)
                              │  • SDK preload bridge (MessagePort)
                              │  • echoform settings bridge (ipcRenderer)
┌─────────────────────────────▼──────────────────────────────────────┐
│ Renderer (Chromium, no Node)                                       │
│                                                                    │
│  React app                                                         │
│   ├─ SmartSpectra renderer SDK (camera + frame pump)                │
│   ├─ Signal translation engine                                      │
│   ├─ Three.js world (R3F)                                           │
│   ├─ Web Audio soundscape                                           │
│   ├─ UI overlays / consent / HUD / echo                             │
│   └─ local persistence                                             │
└────────────────────────────────────────────────────────────────────┘
```

### 4.1 Why the renderer SDK

The SDK's Electron integration is designed around the renderer capturing frames from a `MediaStreamTrack` and shipping them to the main process, where the native SmartSpectra pipeline runs. This gives:

- camera permission through Chromium/Electron;
- a native `MediaStream` for the preview;
- no direct native camera access from the renderer;
- automatic AE/AWB/focus locking once the graph is running.

The renderer SDK owns the frame pump (`MediaStreamTrackProcessor` → `OffscreenCanvas` → RGBA buffer → MessagePort). The app only calls `start()`, consumes events, and displays the stream.

### 4.2 Main process responsibilities

- Create the `BrowserWindow` with the SDK preload (or a composing preload).
- Call `bindSmartSpectraIpc(win)` exactly once per window.
- Grant camera permission only to the bundled/local page and only for video-only requests.
- Block popups and navigation away from the app.
- Provide secure settings storage via `safeStorage`.
- Save artwork through a native save dialog.
- Open external links only after allowlist validation.
- Resolve the packaged native runtime path (`SMARTSPECTRA_CAPI_PATH`) before requiring the SDK.
- Quit cleanly.

### 4.3 Renderer responsibilities

- Never access Node APIs directly.
- Only use the narrow `window.echoform` bridge and the SDK preload bridge.
- Manage the experience state machine.
- Never write raw frames or raw metric payloads to persistent storage.
- Never call `getUserMedia` for anything other than the SDK-owned camera flow.

---

## 5. SmartSpectra integration

### 5.1 Package surface used

```ts
import {
  SmartSpectraSDK,
  ProcessingStatus,
  ValidationCode,
  breathingMetrics,
  cardioMetrics,
  faceMetrics,
} from '@smartspectra/node-sdk/renderer';

import { decodeMetrics } from '@smartspectra/node-sdk/messages';
```

### 5.2 SDK construction

```ts
const sdk = new SmartSpectraSDK({
  apiKey,
  requestedMetrics: [
    ...breathingMetrics,
    ...cardioMetrics,
    ...(expressionWeather ? faceMetrics : []),
  ],
  enableAccumulatedOutput: false,
  enableTelemetry: telemetryOptIn, // false by default
  sendTimeoutMs: 30_000,
});
```

Metrics requested:

- **Breathing bundle:** chest, abdomen, rate, amplitude, apnea, respiratory line length, baseline, inhale/exhale ratio.
- **Cardio bundle:** pulse rate, arterial pressure trace, HRV.
- **Face bundle (optional):** landmarks, blinking, talking, expressions. Used only as an abstract visual input; never labeled as emotion.

The SDK's key may not be provisioned for cardio. The app must degrade gracefully: breathing-only worlds are valid.

### 5.3 Lifecycle

```
construct → subscribe → start() → (streamAvailable | metrics | validation | error)* → stop() → destroy()
```

Rules:

- Construct only after the user chooses camera mode and provides a key.
- Subscribe to all events before `start()`.
- `start()` is awaited and may reject (auth, camera, network).
- `stop()` is called on session end, pause-with-release, window close, and fatal errors.
- `destroy()` is called after `stop()`; only once.
- A new session constructs a new SDK instance because `requestedMetrics` is fixed per instance.
- `reset()` is used only after a `kError` state; otherwise `start()` after a clean `stop()`.
- Guard against React StrictMode double-invocation with an idempotent lifecycle controller, not by disabling StrictMode.

### 5.4 Event handling

| Event | Handler |
| --- | --- |
| `streamAvailable(stream)` | Attach to preview `<video>`; store stream reference for cleanup |
| `processingStatus(status)` | Map to UI state: starting/running/stopping/error/idle |
| `validationStatus(code, ts, hint)` | Map code to human hint; update signal quality |
| `metrics(buf, ts)` | `decodeMetrics(buf)`; pass to engine; never persist buffer |
| `error(code, message, retryable)` | Typed error mapping; show guidance; stop or offer retry |
| `frameSentThrough` | Optional dev diagnostics only; not used in production UI |

### 5.5 Metric extraction

The event payload is a windowed slice; latest values are read from the end of each repeated field:

```ts
const latest = <T>(arr?: T[]): T | undefined => arr?.at(-1);

const pulse = latest(metrics.cardio?.pulseRate);
const breathRate = latest(metrics.breathing?.rate);
const chest = metrics.breathing?.upperTrace ?? [];
const abdomen = metrics.breathing?.lowerTrace ?? [];
const hrv = latest(metrics.cardio?.hrv);
const expression = latest(metrics.face?.expression);
```

Field-name note: the protobuf schema uses `pulse_rate`, but the generated JS uses camelCase (`pulseRate`). The app accesses camelCase through the generated `Metrics` class. The sample code confirms this shape.

### 5.6 Validation hints

| Code | Human hint |
| --- | --- |
| `kOk` | Measuring |
| `kNoFaceFound` | Sit in frame |
| `kMultipleFacesFound` | One person at a time |
| `kFaceNotCentered` | Center your face |
| `kFaceSizeOutOfRange` | Move a little closer or farther |
| `kTooDark` | Add a little light |
| `kTooBright` | Move away from harsh light |
| `kChestNotVisible` | Let your shoulders into frame |
| `kCameraTuning` | Settling the camera |
| `kFrameRateTooLow` | Camera is running slowly |
| `kExcessiveMotion` | Hold still for a moment |
| `kFaceTooClose` | Move back slightly |
| `kFaceTooFar` | Move closer |
| `kFaceTooHigh` / `kFaceTooLow` | Adjust your position |
| `kFaceNotForward` | Face the camera |

Hints are guidance for signal quality, never health advice.

### 5.7 Error mapping

| SDK code | UI message | Recovery |
| --- | --- | --- |
| `kAuthenticationFailed` | "The Presage key wasn't accepted." | Edit key, retry, or use synthetic |
| `kCreditExhausted` | "The Presage trial has no credits left." | Link to Presage; synthetic mode |
| `kNetworkError` | "Presage can't be reached to validate the key." | Retry; synthetic mode |
| `kServerError` | "Presage is having trouble right now." | Retry later |
| `kInputUnavailable` | "No camera is available, or another app is using it." | Choose another camera/close app; retry |
| `kInvalidState` | "The sensing session is in an unexpected state." | Reset |
| `kProcessingFailed` | "The sensing pipeline stopped." | Reset/retry |
| `kFrameConversionFailed` | "The camera stream couldn't be read." | Restart |
| `kNonMonotonicTimestamp` | "The camera stream restarted unexpectedly." | Rebuild session |
| `kTimestampGap` | "The camera paused." | Continue; quality recovers |

### 5.8 API key handling

- The key is never committed to the repository.
- Sources, in order:
  1. `SMARTSPECTRA_API_KEY` environment variable read in the main process;
  2. encrypted value stored with Electron `safeStorage` (opt-in "remember");
  3. session-only value entered by the user.
- The renderer obtains the key through a single `getApiKey()` IPC call.
- The key is never logged, never included in error messages, never written to `localStorage`.
- In a browser-only preview (no Electron), live mode is unavailable; synthetic mode remains.

### 5.9 Telemetry

- `enableTelemetry: false` by default.
- The consent/settings UI explains the SDK's aggregate telemetry and lets the user opt in.
- ECHOFORM itself has no analytics, crash reporting, or remote logging.
- The SDK's network gating is disclosed separately from telemetry.

### 5.10 Scheduling and performance

- Frame pump runs at camera rate (typically 30 fps).
- Metric events may arrive faster than UI needs; the signal engine consumes them into a mutable runtime, and React UI samples at ~4 Hz.
- No metric buffer is retained beyond the current session; arrays are bounded.
- `decodeMetrics` is called on every event; the generated protobuf decoder is fast enough. If profiling shows a bottleneck, decode at most every other event (not implemented initially).

---

## 6. Signal translation engine

### 6.1 Types

```ts
export type SignalSource = 'live' | 'synthetic' | 'replay';

export interface PulseState {
  bpm: number | null;
  confidence: number;      // 0..100
  stable: boolean;
  beatPhase: number;       // 0..1
  beatCount: number;
  sinceBeat: number;       // seconds
}

export interface BreathState {
  rate: number | null;     // breaths/min
  confidence: number;      // 0..100
  stable: boolean;
  waveform: number;        // normalized -1..1 (inhale positive)
  amplitude: number;       // normalized 0..1
  phase: number;           // 0..1 cycle
}

export interface SignalFrame {
  t: number;
  source: SignalSource;
  pulse: PulseState;
  breath: BreathState;
  hrv: { rmssd: number; stable: boolean } | null;
  expression: { label: string; confidence: number } | null;
  quality: 'listening' | 'settling' | 'present';
  presence: number;        // 0..1, eased
  validation: string;
}
```

### 6.2 Update path

1. Raw metrics arrive at camera rate.
2. Extract latest values + confidence/stable flags.
3. Validate ranges:
   - pulse 35–200 BPM;
   - breath 4–40 br/min;
   - HRV RMSSD 0–300 ms (sanity only; not displayed as a medical value).
   - Out-of-range values are ignored for visuals and not displayed.
4. Smooth rates with an EMA: `value += alpha * (target - value)`, with alpha 0.12 for pulse and 0.08 for breath. If no new stable sample for 3s, hold last value but mark stale.
5. Normalize the breathing waveform with a rolling min/max over 8s, then clamp to [-1, 1]; smooth with alpha 0.25.
6. Derive breath phase from the sign/slope of the normalized waveform; fall back to a 4s/6s pace if no waveform.
7. Advance the pulse phase by `bpm / 60 * dt`; wrap at 1, increment `beatCount`, set `sinceBeat = 0`; decay `sinceBeat`.
8. Compute `presence`:
   - target 1 when quality is present and a stable signal exists;
   - target 0.35 when settling;
   - target 0 when listening.
   - ease with a 4s time constant; never jump.
9. Quality:
   - `present` if the SDK is running and at least one stable vital is fresh;
   - `settling` if running but no stable value yet;
   - `listening` otherwise.
10. Publish to the runtime and notify throttled subscribers at 4 Hz.

### 6.3 Visual mapping contract

Uniforms updated per frame from the runtime:

| Uniform | Source | Range |
| --- | --- | --- |
| `uTime` | clock | seconds |
| `uBreath` | `breath.waveform` | -1..1 |
| `uBreathRate` | normalized rate | 0..1 |
| `uBreathAmp` | `breath.amplitude` | 0..1 |
| `uPulse` | beat envelope / sinceBeat | 0..1 |
| `uPulseRate` | normalized bpm | 0..1 |
| `uPresence` | presence | 0..1 |
| `uGrowth` | session progress | 0..1 |
| `uAwake` | awakening animation | 0..1 |
| `uEcho` | echo contraction | 0..1 |
| `uHue` | slow palette drift | 0..1 |

Rate-limited: uniform changes are interpolated/damped; no parameter may jump more than 10% per frame.

### 6.4 Synthetic mode

- Deterministic PRNG seed (or random per session).
- Breath: target 13–16 br/min, sine-like waveform with slight asymmetry, amplitude varying on a 20s cycle.
- Pulse: target 58–72 BPM, beat envelope, confidence high, occasional 10s drift.
- HRV: stable simulated RMSSD 35–60 ms.
- Quality becomes `present` after 2.5s of "attunement".
- Labeled `SYNTHETIC` in the HUD and in the Echo Print.
- No camera access at all.

### 6.5 Replay mode

- Uses a saved summary (seed, averages, duration) to construct a synthetic runtime.
- Quality present; source `replay`.
- World runs in a quieter "echo" palette; HUD shows the original date and duration.
- No camera access; no new echo can be saved from a replay.

---

## 7. Generative world

### 7.1 Scene graph

```
<Canvas>
  <Scene>
    <Sky />
    <fog>
    <group ref=worldGroup>
      <BreathField />        // 30k–60k points, custom shader
      <Ribbons />            // 6–8 additive strips
      <Core />               // inner ember + outer membrane
      <PulseRings />         // 3 rings
      <PresenceOrganism />   // line-segment procedural growth
      <SporeDust />          // 600 larger points
      <GroundPool />         // radial shimmer plane
    </group>
    <CameraRig />
    <Bloom />
  </Scene>
</Canvas>
```

### 7.2 Components

**BreathField**
- `BufferGeometry` with `position`, `aSeed`, `aRadius`, `aAngle`, `aHeight`, `aSize`.
- Vertex shader: slow orbital drift, breath-driven radial contraction/expansion, vertical lift on inhale, curl turbulence.
- Fragment shader: soft circular sprite, additive, color mixed between lumen and moss.
- Point count: high 48k, medium 32k, low 18k; DPR cap 1.75.

**Ribbons**
- 7 strips, each a `PlaneGeometry`-derived grid (2 × 80 segments) arranged radially.
- Vertex shader waves vertices with breath and time; higher amplitude at the tip.
- Additive, low opacity, no depth write.

**Core**
- Icosahedron/sphere with custom fresnel shader; inner sphere with ember color; outer membrane with translucent lumen rim.
- Scale and brightness follow beat envelope.
- A sprite halo behind the core using a radial gradient shader (always faces camera).

**PulseRings**
- Three `RingGeometry` meshes with additive shader.
- Each ring starts at `beatCount + offset`; scale grows from 0.6 to 3.2 and fades over 0.9s.
- If no pulse, rings breathe with a 60 BPM default at lower opacity.

**PresenceOrganism**
- Generated once per session with `mulberry32(seed)`.
- ~220 branches, each a quadratic Bézier sampled into 8 segments; parent/child hierarchy.
- `LineSegments` geometry with `aProgress` (branch order/height) and `aTip`.
- Vertex shader sways with breath; fragment shader reveals with `uGrowth` and tips glow ember.
- `uGrowth` rises with session time and signal presence; max 1 at ~4 minutes. In replay, uses the saved duration to set a static growth.

**SporeDust**
- 600 points, larger, slower, parallax depth; subtle pulse synchronization.

**GroundPool**
- A 40×40 plane at y = -2.4 with radial gradient shader and faint noise waves; additive/soft.

**Sky**
- Large inverted sphere with vertical gradient from `#020706` to `#0a1b18`; subtle animated aurora noise (very low intensity).
- Fog color matches abyss.

**Postprocessing**
- Bloom only: `intensity ≈ 1.1`, `luminanceThreshold ≈ 0.12`, `mipmapBlur`.
- CSS overlay supplies vignette and film grain (cheaper than GPU effects).
- Disabled when reduced motion is on or when the frame-time monitor reports low performance.

### 7.3 Palette

World colors are derived from six named palettes, selected by session seed:

| Name | Core | Field | Accent | Background |
| --- | --- | --- | --- | --- |
| Ember Garden | `#e39a72` | `#8fe3cf` | `#9fbe8b` | `#06100e` |
| Deep Kelp | `#d8b46a` | `#7fd1b9` | `#7a9e8a` | `#05100f` |
| Night Orchard | `#e7a58b` | `#b7d8a0` | `#c9a7d8` | `#0a0d10` |
| Copper Bloom | `#e08a5f` | `#e3c78f` | `#a8c98a` | `#100b08` |
| Tide Memory | `#d99a8a` | `#86c7d8` | `#b5a7d8` | `#061012` |
| Ash & Moss | `#cfa27a` | `#a9c99a` | `#d8c8a8` | `#0b0f0c` |

Palettes are applied through uniforms; UI accent remains CSS-driven (ember/copper).

### 7.4 Performance budget

| Item | Budget |
| --- | --- |
| Draw calls | < 30 |
| Triangles | < 250k |
| Particles (high) | 48k breath + 600 dust |
| Texture memory | < 64 MB (no external textures) |
| Renderer heap | < 500 MB steady state |
| Frame time p95 | < 33 ms at 1280×800 |
| DPR | min(devicePixelRatio, 1.75) |

Adaptive quality: monitor a 120-frame rolling average. If average frame time > 26 ms for 3s, step down particle count and disable bloom. If < 14 ms for 10s, step up (max once). No visible pop: scale opacity over 0.5s.

### 7.5 Reduced motion

- Camera drift = 0.
- Particle turbulence and ribbon waves reduced by 80%.
- No parallax, no rapid palette changes.
- Awakening duration reduced to 0.8s or crossfade only.
- Signal response remains (opacity/scale), so the experience still works.
- Sound unaffected.

---

## 8. Audio design

### 8.1 Graph

```
Master gain ── destination
  ├─ Ambient pad: osc A + osc B → lowpass → gain → reverb-ish delay
  ├─ Breath noise: looping noise buffer → bandpass → gain
  └─ Heartbeat: osc (55 Hz) → gain envelope → master
       + click (sine 520 Hz, 20 ms) → highpass → very low gain
```

### 8.2 Behavior

- Created only on user gesture (sound toggle or "enable sound").
- Master gain capped at 0.22; gentle 1.5s fade in/out.
- Heartbeat tempo follows `pulse.bpm`, clamped 45–120 for audio (to avoid extremes).
- Breath noise gain/filter follows `breath.waveform` and `amplitude`; low-pass opens on inhale.
- Ambient pad root note changes every 45s within a pentatonic set; slow detune.
- On pause/blur, suspend the context; on resume, resume gently.
- On echo, fade out over 2s.
- No audio recording, no microphone.

### 8.3 Safety

- No sudden gain spikes; envelope smoothing.
- Volume persists in prefs, default 0.18.
- Audio is off by default.
- Reduced motion does not mute audio.

---

## 9. Echo Print generation

### 9.1 Inputs

```ts
interface SessionSummary {
  id: string;
  createdAt: string;       // ISO
  durationSec: number;
  avgPulse: number | null;
  avgBreath: number | null;
  hrvRmssd: number | null;
  presenceRatio: number;   // 0..1
  breathVariability: number;
  pulseVariability: number;
  seed: number;            // uint32
  palette: number;         // index
  source: 'live' | 'synthetic';
  version: 1;
}
```

No raw waveform, landmarks, frames, or per-sample arrays are stored.

### 9.2 Algorithm

1. `await document.fonts.ready`.
2. Create a 1600×2000 canvas.
3. Fill background with a vertical gradient from the palette's background to a darker variant.
4. Draw a fine grain field using seeded PRNG (2% opacity).
5. Draw 40–80 concentric rings centered slightly above middle; radii follow a power curve based on breath/pulse; alternate ring opacity; clipped to a soft radial mask.
6. Draw a horizontal pulse waveform across the lower third; amplitude and frequency derived from pulse and variability; use a seeded noise.
7. Draw the branch organism (same generator as the world, smaller) with 2D projection; tips as small circles.
8. Draw a small constellation of dots representing presence ratio.
9. Typography:
   - "ECHOFORM" at top left in Fraunces 300, letterspaced;
   - date at top right in Instrument Sans, small;
   - session facts bottom left: duration, breath, pulse (or "signal withheld" if null);
   - caption bottom right: "A record of signals, not a diagnosis.";
   - unique short code derived from the seed.
10. Composite a subtle vignette and film grain.
11. Return `canvas.toDataURL('image/png')`.

Determinism: same summary → same artwork. No network, no external assets.

### 9.3 Download

- Electron: `window.echoform.saveArtwork(dataUrl, filename)` → main shows a native save dialog, writes PNG, returns the path or cancel.
- Browser fallback: create an `<a download>` with the data URL.

---

## 10. Persistence and data model

### 10.1 Local storage keys (renderer)

- `echoform:v1:prefs`
- `echoform:v1:echoes`

Preferences:

```ts
interface Preferences {
  sound: boolean;
  volume: number;          // 0..1
  reducedMotion: boolean;
  telemetry: boolean;      // default false
  expressionWeather: boolean; // default false
  rememberedKey: boolean;  // UI state only, key is not here
  hasOnboarded: boolean;
  lastMode: 'live' | 'synthetic' | null;
}
```

Echoes: array of `SessionSummary`, max 24, newest first.

### 10.2 API key storage (main)

- Path: `app.getPath('userData')/echoform-key.bin`.
- If `safeStorage.isEncryptionAvailable()`:
  - `safeStorage.encryptString(key)` → buffer;
  - write atomically (temp + rename);
  - on read, decrypt; on failure, delete and return null.
- If not available: do not persist; return `{ remembered: false, reason: 'unavailable' }`.
- Session key lives in a main-process variable until quit.
- `delete-all` removes the file and clears memory.
- Never write the key to logs, renderer storage, or artwork metadata.

### 10.3 Retention

- Raw frames: never stored.
- Raw metrics: in memory only; discarded on session end.
- Session summary: stored only on explicit save.
- Deletion: per echo or all; confirmation for all.
- No automatic backups.

---

## 11. Security

### 11.1 Electron hardening

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true` (if the composing preload supports it; otherwise `sandbox: false` with documented rationale)
- `webSecurity: true`
- `allowRunningInsecureContent: false`
- Popups denied; navigation prevented; only the bundled page loads.
- Permission handler grants only `media` + video-only + local/bundled origin.
- External links open through `shell.openExternal` after an HTTPS allowlist check.
- No remote content, no `<webview>`, no `eval`.
- CSP:
  ```
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  media-src 'self' blob:;
  worker-src 'self' blob:;
  connect-src 'self' https://*.presagetech.com;
  font-src 'self';
  ```
  Dev server requires `'unsafe-inline'`/`ws:` exceptions; production CSP is stricter.
- `will-attach-webview` prevented.

### 11.2 IPC surface

Channels:

| Channel | Direction | Payload | Validation |
| --- | --- | --- | --- |
| `smartspectra:attach` | renderer→main | MessagePort | SDK internal |
| SDK control channel | renderer→main | SDK protocol | SDK internal |
| `echoform:get-bootstrap` | invoke | none | returns prefs/key presence/app info |
| `echoform:get-api-key` | invoke | none | returns key or null |
| `echoform:set-api-key` | invoke | `{ key, remember }` | key is string, length 8–512; no logging |
| `echoform:clear-api-key` | invoke | none | idempotent |
| `echoform:save-artwork` | invoke | `{ dataUrl, filename }` | data URL must start `data:image/png;base64,`; size cap 20 MB; filename sanitized |
| `echoform:open-external` | invoke | `{ url }` | HTTPS + allowlist (presagetech.com) |
| `echoform:set-camera-active` | invoke | `{ active }` | used for OS-level indicator bookkeeping (optional) |

Every handler validates types and returns a structured result; failures are caught and returned as `{ ok: false, error: 'code' }` without leaking secrets.

### 11.3 API key

- Never bundled.
- Never logged.
- Never sent anywhere by ECHOFORM; passed in-memory to the SDK.
- Environment variable support for local development.
- UI warns that the key is personal and should not be shared.

### 11.4 Supply chain

- Dependencies pinned with lockfile.
- `@smartspectra/node-sdk` is proprietary; see its license/notices.
- Only well-known packages; audit before submission.
- No postinstall scripts from untrusted sources (Electron/electron-builder have standard scripts).

---

## 12. Accessibility and motion

- All controls are semantic `<button>` / `<input>` with labels.
- Focus visible: 2px bone outline with 2px offset.
- Overlays use `role="dialog"`, `aria-modal="true"`, focus trap and restore.
- `aria-live="polite"` for sensing status; `aria-live="assertive"` for errors.
- World canvas is `aria-hidden="true"`; all meaning is in text.
- Reduced motion respected at boot and adjustable in-session.
- No content flashes; palette LFO < 0.1 Hz; beat ring max 1.2 Hz.
- Keyboard shortcuts documented in the pause sheet.
- Audio off by default; volume capped.
- Color contrast: body bone on abyss ≈ 13:1; moss on abyss ≈ 7:1; copper on abyss ≈ 4.8:1; focus ring bone.
- Motion-sensitive users can disable postprocessing, camera drift, and turbulence.

---

## 13. Testing strategy

### 13.1 Unit tests

- Signal engine: EMA, range rejection, beat phase, presence easing, stale values.
- Synthetic source determinism.
- Artwork determinism: same summary → same pixel hash (at least same canvas data URL).
- Summary schema: no raw arrays; values bounded.
- Storage: save/load/delete, max 24, corrupt JSON recovery.

### 13.2 Integration tests

- Browser preview with synthetic mode: full loop threshold → alive → echo → save → archive → replay.
- Electron: preload bridge available; SDK constructs; camera stream attaches; events flow.
- Error paths: invalid key, no camera, network offline, permission denied.
- Key storage: remember on/off, restart, delete-all.
- Artwork save dialog cancel path.

### 13.3 Manual QA

- 30-minute session stability.
- Camera unplugged mid-session.
- Window minimized/restored.
- Reduced motion OS setting.
- Keyboard-only navigation.
- Screen reader announcements (NVDA/VoiceOver spot check).
- Packaged Windows build.
- Performance on integrated GPU.

### 13.4 Live SDK test protocol

1. Set a valid key.
2. Attune in good lighting, face and shoulders in frame.
3. Confirm `streamAvailable` preview.
4. Confirm `validationStatus` reaches OK.
5. Confirm pulse and breath values in HUD with stable flags.
6. Breathe slowly; confirm field response.
7. Move out of frame; confirm world fades to listening and recovers.
8. End; confirm camera LED off and `stop()`/`destroy()` called.

---

## 14. Build and packaging

### 14.1 Development

```bash
npm install
npm run dev
```

- Vite dev server at `http://127.0.0.1:5173`.
- Electron loads the dev URL when `ECHOFORM_DEV_URL` is set.
- `npm run build` typechecks and builds the renderer to `dist/`.
- `npm start` launches Electron against the built renderer.

### 14.2 Packaging

- electron-builder, `asar: true`.
- Native SDK closure copied to `resources/smartspectra/` via per-OS `extraResources`.
- `SMARTSPECTRA_CAPI_PATH` set to the bundled DLL/dylib/so before requiring the SDK in packaged builds.
- `node_modules/@smartspectra/node-sdk-*` excluded from asar.
- macOS: entitlements for camera and unsigned dylib validation.
- Windows: sign DLLs alongside the app for distribution (documented; not required for challenge).
- Linux: AppImage; glibc 2.35+.

### 14.3 CI (recommended)

Matrix build on macOS, Windows, Ubuntu runners; each builds natively. Upload artifacts. Run typecheck and build on every push.

---

## 15. Observability

- Local console logs only in development (`ECHOFORM_DIAGNOSTICS=1`).
- No remote logging or crash reporting.
- Dev HUD (optional) shows FPS, particle count, signal quality, event counts.
- Errors shown in UI with codes and recovery paths; no stack traces in production.
- Session summary includes `version` for forward compatibility.

---

## 16. Risks and mitigations (technical)

| Risk | Mitigation |
| --- | --- |
| Vite bundling of SDK CommonJS + worker blob | Test early; exclude from optimizeDeps if needed; CSP allows blob workers |
| Custom preload + sandbox require restrictions | Compose preload or fall back to SDK preload + localStorage key; test both |
| Cardio metrics not enabled on key | Breathing-first world; pulse optional; clear UI state |
| Protobuf field name drift | Use SDK's generated `messages` decoder; type via `Metrics`; no hand-rolled schema |
| Native runtime packaging | Follow official extraResources + `SMARTSPECTRA_CAPI_PATH`; test packaged build early |
| Frame pump cost at 720p | SDK handles cloning; avoid extra copies; decode at event rate |
| GPU performance | Particle budget, DPR cap, bloom toggle, adaptive quality |
| React StrictMode double-start | Idempotent lifecycle controller; explicit refs; no duplicate SDK instances |
| Audio autoplay policy | Create/resume AudioContext only on user gesture |
| Data leak via logs | Never log key or metrics payload; redact error messages; code review |
| Motion sickness | Reduced motion, no camera drift, no strobing |
| Time | P0 first; face/HRV/replay are stretch; docs written alongside |

---

## 17. Open technical questions

1. Does `@smartspectra/node-sdk-3.4.0` cardio require a specific key entitlement? Test when a key is available.
2. Is `sandbox: true` compatible with a composing preload that requires the SDK preload? Test; fall back if needed.
3. Does the packaged Windows build resolve `smartspectra_capi.dll` from `resources/smartspectra/` with the current binding? Verify with a packaged smoke test.
4. What is the actual latency from breath change to stable `breathing.rate` update? Tune visual smoothing after live test.
5. Does `document.fonts.ready` include Fontsource variable fonts in Electron? Verify artwork typography.

---

## 18. Acceptance checklist

- [ ] Live SDK integration compiles and runs.
- [ ] `decodeMetrics` returns breathing/cardio fields.
- [ ] Values are smoothed and range-gated.
- [ ] World reacts to breath and pulse independently.
- [ ] Synthetic mode works without camera or key.
- [ ] Consent/data panel matches implementation.
- [ ] Telemetry off by default.
- [ ] Key stored only via safeStorage and only on opt-in.
- [ ] Echo artwork deterministic and downloadable.
- [ ] Saved echoes contain only aggregates + seed.
- [ ] Delete-all works.
- [ ] Reduced motion works.
- [ ] Performance target met.
- [ ] Typecheck/build pass.
- [ ] Packaged app launches.
