# ECHOFORM — Product Requirements Document (PRD)

> **Version:** 1.0 (challenge baseline)
> **Owner:** Senthil Raja R
> **Status:** Implementation-ready
> **Related:** [BRD](./BRD.md) · [TRD](./TRD.md) · [Architecture](./ARCHITECTURE.md) · [Privacy](./PRIVACY.md)

---

## 1. Product vision

**ECHOFORM is a world that exists only while you are present.**

You open the app and find darkness. You grant the camera permission — or choose not to. When live breath and pulse arrive, light gathers, wind begins, and a luminous organism grows around you. Nothing is clicked, dragged, or optimized. Your presence is the input.

When you leave, the world does not follow you. It offers a single artifact — an **Echo Print** — a visual memory of the signals that made that particular world. You may keep it, or let it go.

### 1.1 Experience promise

- **Immediate:** within seconds, the user understands that their breath changes the field.
- **Personal:** no two sessions produce the same world or the same artwork.
- **Quiet:** no scores, no streaks, no productivity language, no diagnosis.
- **Safe:** camera frames are processed on-device and never stored by ECHOFORM.
- **Complete:** onboarding → live world → artwork → optional replay is a finished loop.

### 1.2 Non-goals

ECHOFORM does **not**:

- measure, diagnose, treat, or advise on any health condition;
- claim to know whether the user is happy, sad, stressed, calm, or healthy;
- record, upload, or share camera video;
- require an account, email, or cloud service;
- use an LLM or external image generation service;
- gamify presence with scores, streaks, or competition.

---

## 2. Target users and jobs

### Persona A — The Judge

> "I have twenty submissions to review. Show me something I haven't seen, prove the SDK is real, and don't make me read a wall of text before I understand it."

Needs:
- a clear 15-second "aha" moment;
- visible live signal values and a visible response;
- a repository they can run;
- explicit consent/data handling.

### Persona B — The Quiet User

> "I spend all day in front of a screen. I want two minutes of something that isn't asking me to optimize myself."

Needs:
- a beautiful, low-demand experience;
- clear camera consent and an easy exit;
- no account, no subscription, no judgment;
- something to keep at the end.

### Persona C — The Curator

> "I want an installation that makes visitors stop and breathe together."

Needs:
- a strong visual identity;
- kiosk-friendly reset and privacy story (roadmap);
- reliable performance.

### Jobs to be done

1. When I open ECHOFORM, I want to understand what it will do with my camera before I grant access, so I can decide whether to trust it.
2. When the world begins, I want to feel my own breathing and pulse shaping it, so the experience feels alive rather than pre-rendered.
3. When I leave, I want a small artifact that captures the session, so the experience has a memory without keeping my body's data.
4. When I return, I want to replay a past echo without turning the camera on, so the archive is safe and optional.

---

## 3. Experience principles

| Principle | Product expression |
| --- | --- |
| **Presence over control** | No primary buttons inside the world. Breath and pulse are the controls. |
| **Signal, not conclusion** | We show measured rates and confidence; we never label emotion or health. |
| **Consent is a scene, not a checkbox** | The camera is introduced with context, a preview aperture, and explicit choices. |
| **Beauty earns attention** | The world is the reward; the UI stays quiet and peripheral. |
| **Leave no trace by default** | Video is never stored; summaries require an explicit save action. |
| **One bold moment** | The awakening sequence is the memorable event; everything else is restrained. |
| **Graceful failure** | Poor lighting or a missing key produces guidance, not a dead end. |

---

## 4. Experience flow

### 4.1 State machine

```
THRESHOLD → CONSENT → ATTUNING → ALIVE → ECHO → (REPLAY | THRESHOLD)
                │         │         │
                │         └── error ──→ ATTUNING (retry) / SYNTHETIC
                └── "explore without camera" ──→ ATTUNING (synthetic) → ALIVE → ECHO
```

| State | What the user sees | Exit |
| --- | --- | --- |
| **THRESHOLD** | Full-screen title, world dormant, "Enter" | Enter → CONSENT |
| **CONSENT** | Camera aperture preview, plain-language data card, choices | Grant → ATTUNING; explore without camera → synthetic ATTUNING; back → THRESHOLD |
| **ATTUNING** | Calibration ring, live validation hints, first signal traces | Stable signal → ALIVE; error → guidance/retry |
| **ALIVE** | The living world, minimal HUD, breath guide, end session | End → ECHO; pause → overlay; camera lost → guidance |
| **ECHO** | Echo Print, session facts, save/download/replay/discard | Save → archive; replay → REPLAY; discard → THRESHOLD |
| **REPLAY** | Abstract world regenerated from a saved summary | End → ECHO/archive |

### 4.2 First-run path (target: < 60 seconds)

1. **0–8s — Threshold.** The wordmark and a single line: "A world that exists only while you are present." Button: *Enter the field*.
2. **8–25s — Consent.** A circular camera aperture (off until permission). Copy explains:
   - "Your camera sees light. It does not record."
   - "Breath and pulse are measured on this device."
   - "Video never leaves this app."
   - "Only your API key validation contacts Presage."
   - Choices: *Use my camera*, *Explore with synthetic signals*, *Read the full data note*.
3. **25–50s — Attuning.** Camera permission prompt (OS). A ring fills as the SDK starts. Validation hints: "Sit comfortably in frame", "A little more light", "Face the camera". First pulse/breath values fade in.
4. **50s — Alive.** The world ignites. A single line: "Breathe naturally." The HUD appears after a beat.

### 4.3 Session loop

- The world responds continuously; the user does nothing.
- A subtle breath guide appears at the bottom after 20 seconds, adapting to the measured breathing rate.
- HUD values are deliberately secondary: small, low-contrast, tabular.
- The user can end at any time via a persistent "End session" control.
- Pause/menu opens a quiet sheet with sound, motion, privacy, and end.

### 4.4 Echo sequence

1. The world contracts into a single point.
2. The Echo Print assembles from the session's normalized signal signature.
3. Copy: "This world was made by your presence." + duration, average breath, average pulse (with "signals, not conclusions" note).
4. Actions: *Save this echo* (local), *Download artwork*, *Replay*, *Let it go*.
5. If saved, the echo appears in the *Echoes* shelf (accessible from the threshold).

---

## 5. Functional requirements

Priority: **P0** = required for submission; **P1** = strong differentiator; **P2** = roadmap.

### 5.1 Onboarding & consent

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| ONB-01 | A first-run threshold screen introduces the experience | P0 | Wordmark, tagline, and one primary action; no camera access before consent |
| ONB-02 | Consent screen explains camera use, on-device processing, network gating, storage, telemetry | P0 | All five topics visible without opening a modal; links to full privacy note |
| ONB-03 | User can choose camera mode or synthetic mode | P0 | Both paths reach a living world; synthetic mode is labeled in the HUD |
| ONB-04 | API key can be entered without editing source code | P0 | Key field with show/hide, "remember on this device" opt-in, validation feedback |
| ONB-05 | Camera permission is requested only after explicit user action | P0 | No `getUserMedia`/SDK start before the user activates camera mode |
| ONB-06 | Full privacy note is readable in-app | P0 | Includes telemetry, retention, deletion, third parties, contact |
| ONB-07 | Returning users can skip the threshold | P1 | "Continue" appears if a saved echo or remembered key exists |
| ONB-08 | Keyboard and screen-reader accessible | P1 | All controls reachable by Tab; focus visible; dialog semantics |

### 5.2 Live sensing

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| SNS-01 | Integrate `@smartspectra/node-sdk` renderer SDK | P0 | Code imports `SmartSpectraSDK` from `@smartspectra/node-sdk/renderer`; metrics decoded via `@smartspectra/node-sdk/messages` |
| SNS-02 | Request breathing + cardio metrics | P0 | `breathingMetrics` and `cardioMetrics` requested; pulse and breath readouts appear when stable |
| SNS-03 | Display validation hints | P0 | `validationStatus` codes mapped to human guidance; no raw codes in primary UI |
| SNS-04 | Handle lifecycle and errors | P0 | Start/stop/reset/destroy implemented; error banner with retry; camera release on end |
| SNS-05 | Show quality/confidence honestly | P0 | Values marked "listening" until confidence/stable; no fabricated readings |
| SNS-06 | Optional HRV layer | P2 | If HRV stable, a subtle orbital parameter changes; not shown as a medical metric |
| SNS-07 | Optional face-expression weather | P1 | Off by default; explicit opt-in; abstract color/particle change only; no emotion labels |
| SNS-08 | Camera loss/background recovery | P1 | On track ended or error, world pauses and offers resume/reset |
| SNS-09 | Synthetic mode | P0 | Deterministic, plausible signals; clearly labeled; no camera access |
| SNS-10 | API key auth failure guidance | P0 | Typed error → human message + "Open developer portal" link + key field |
| SNS-11 | Telemetry opt-in | P0 | `enableTelemetry: false` by default; user can enable; disclosed |
| SNS-12 | Metrics are never persisted raw | P0 | Code review confirms no frame/metric payload written to storage; only aggregates on save |

### 5.3 The living world

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| WLD-01 | Breathing drives a visible wind/particle field | P0 | Inhale/exhale direction changes within ~2s of a stable breath wave |
| WLD-02 | Pulse drives a visible light/rhythm layer | P0 | Core pulses at measured rate; visible at 50–120 BPM |
| WLD-03 | Session growth | P0 | A branching organism grows over the session; visible change after 30s |
| WLD-04 | Signal-reactive palette | P1 | Palette shifts slowly with breath depth/HRV; no abrupt flashing |
| WLD-05 | Awakening sequence | P0 | One orchestrated transition from dormant to alive; < 4s |
| WLD-06 | Echo contract | P0 | End sequence contracts the world and reveals artwork |
| WLD-07 | Reduced motion | P0 | Respects OS setting and in-app toggle; camera drift/particles reduced; no strobe |
| WLD-08 | Adaptive quality | P1 | DPR/particle count lowers if frame time is high; no visible pop |
| WLD-09 | Pause on blur | P1 | When window loses focus, world slows; camera can be released via pause |
| WLD-10 | 30 fps floor | P0 | Measured on integrated GPU at 1280×800; postprocessing can be disabled |

### 5.4 Audio

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| AUD-01 | Sound is off until user enables it | P0 | No AudioContext before a user gesture; toggle visible |
| AUD-02 | Breath drives ambient texture | P1 | Filtered noise/gain follows breath phase |
| AUD-03 | Pulse drives a soft heartbeat | P1 | Tempo follows measured pulse; can be muted |
| AUD-04 | No audio recording | P0 | App only synthesizes; microphone never requested |
| AUD-05 | Volume safety | P1 | Master gain capped; gentle fade in/out; no sudden transients |

### 5.5 Echo Print & archive

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| ART-01 | Generate a unique 2D artwork locally | P0 | Canvas 1600×2000 PNG; deterministic from session seed; no network |
| ART-02 | Artwork reflects session signals | P0 | Breath rings, pulse waveform, growth silhouette, palette; values from summary |
| ART-03 | Download artwork | P0 | Saves PNG via native dialog/Downloads; filename includes date |
| ART-04 | Save echo summary locally | P0 | Explicit action; stores aggregates + seed + timestamps only |
| ART-05 | Echo shelf | P1 | Lists saved echoes; open, replay, delete |
| ART-06 | Replay without camera | P1 | Reconstructs abstract world from saved summary; labeled "echo" |
| ART-07 | Delete all | P0 | Removes echoes, preferences, and stored key; confirmation required |
| ART-08 | No raw signal history | P0 | Saved record schema contains only aggregate values and derived parameters |

### 5.6 HUD & controls

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| HUD-01 | Pulse, breath, session time | P0 | Visible but secondary; values update smoothly; "—" until stable |
| HUD-02 | Signal quality indicator | P0 | Calm status: listening / settling / present; not a medical score |
| HUD-03 | End session | P0 | Always reachable; confirms before stopping if < 20s |
| HUD-04 | Privacy shortcut | P0 | Opens plain-language data panel from the world |
| HUD-05 | Sound/motion controls | P1 | Toggle without leaving the world |
| HUD-06 | Synthetic badge | P0 | Persistent label whenever synthetic mode is active |
| HUD-07 | No numbers as primary visual | P1 | Design review: world is dominant; numbers are tertiary |

### 5.7 Settings & persistence

| ID | Requirement | Priority | Acceptance criteria |
| --- | --- | --- | --- |
| SET-01 | Preferences persist | P1 | Sound, motion, telemetry, last mode |
| SET-02 | API key storage | P0 | Electron `safeStorage` when available; opt-in; never logged; session-only option |
| SET-03 | Version/platform info | P2 | About panel shows app and SDK version |
| SET-04 | Reset onboarding | P2 | "Show introduction again" |

---

## 6. Signal → world mapping

These mappings are **artistic design decisions**, not claims about the SDK's internal meaning. All values are normalized and smoothed before use.

| Live signal | World layer | Visual behavior | Audio behavior | Guardrail |
| --- | --- | --- | --- | --- |
| Breathing waveform / rate | **The Field** — 60k–90k particles + ribbons | Inhale draws particles inward and lifts them; exhale sends a slow wave outward; wind direction curls | Filtered noise swell and pad filter open on inhale | If no stable breath: slow ambient drift |
| Pulse rate | **The Core** — central shader orb + concentric rings | Core blooms once per beat; rings expand with each beat; intensity follows confidence | Soft low thump at measured BPM | If no stable pulse: core breathes with a default 60 BPM |
| Pulse confidence / stability | **Clarity** — glow sharpness and ring definition | High confidence = crisp core; low = diffuse, dim | High-pass opens gently | Never shown as "health score" |
| HRV (optional) | **Orbit** — slow satellite paths | Orbital eccentricity/tilt drifts with RMSSD | A second, slower harmonic | Abstract only; not labeled as stress |
| Session duration | **The Organism** — procedural branching structure | New branches/buds appear over time; final silhouette becomes artwork | Low drone gains a new voice every ~45s | Growth is time-based, not "performance" |
| Breath variability | **Weather** — ribbon turbulence and palette | Gentle shifts in hue/temperature | Detune and reverb width | No abrupt changes; rate-limited |
| Expression (optional) | **Fauna/weather accents** | A brief bloom or scatter; abstract colors | A chime cluster | Off by default; never labels an emotion |
| Presence (valid signal time) | **World opacity** | World fades toward dormant when signal is lost | Audio fades | Graceful, not punitive |

### 6.1 Smoothing and rate limits

- All rates: exponential moving average with α ≈ 0.08–0.15 at 30–60 Hz.
- Values outside physiological-plausible ranges are ignored for visual mapping (not clamped and displayed as fact).
- World transitions use spring/damping; no parameter jumps > 10% per frame.
- Palette shifts are limited to a slow LFO; no flashing above 3 Hz.

---

## 7. UI and content specification

### 7.1 Design direction

**Working name:** *Bioluminescent herbarium*.

A dark, mineral, botanical atmosphere — closer to a night garden or a deep-sea organism than to a cyberpunk dashboard. The world is made of soft membranes, drifting spores, mycelial threads, and a warm ember core. Typography is editorial: a soft serif for the world's voice, a quiet grotesk for interface and data. Controls are hairlines and text, not pills and cards.

**Palette**

| Token | Hex | Use |
| --- | --- | --- |
| `--abyss` | `#06100e` | App background, dormant world |
| `--ink` | `#0b1a17` | Panels, sheets |
| `--bone` | `#e9e2d0` | Primary text |
| `--moss` | `#9fbe8b` | Secondary text, quiet accents |
| `--lumen` | `#8fe3cf` | Breath field, live signal |
| `--ember` | `#e39a72` | Pulse core, primary action |
| `--copper` | `#b86f52` | Hairlines, active states |
| `--mist` | `rgba(233,226,208,0.08)` | Dividers, scrims |

**Type**

- Display: **Fraunces Variable** — soft, optical-size-aware serif; used for the wordmark, scene titles, artwork captions.
- UI/data: **Instrument Sans Variable** — clean grotesk with tabular numerals; used for body, labels, and measurements.
- No third typeface. Numerals use `font-variant-numeric: tabular-nums`.

**Layout concept**

```
┌──────────────────────────────────────────────────────────┐
│ ECHOFORM                                  sound  privacy │
│                                                          │
│                                                          │
│                    [ the living world ]                  │
│                                                          │
│                                                          │
│  PULSE   62          ╭ breathing guide ╮      end session│
│  BREATH  14          ╰                 ╯                  │
│  present 04:12                                           │
└──────────────────────────────────────────────────────────┘
```

- World fills the viewport; UI is anchored to edges with generous negative space.
- Vitals sit bottom-left in a vertical instrument stack, separated by hairlines.
- Breath guide sits bottom-center; a pair of arcs with a moving point.
- End session is bottom-right, text + a thin ring, never a loud button.
- Top-right: sound and privacy as icon+label hairlines.
- No boxes around the world; no glassmorphism; no gradient SaaS cards.

**Motion**

- One orchestrated awakening: a 2.8s dissolve from black, camera pull-back, particle ignition, core first beat.
- UI fades in after 1.2s, staggered by 120ms.
- Hover/focus transitions 180–240ms; no bounce.
- Reduced motion: no camera drift, no particle turbulence, no parallax; world still responds to signals via slow opacity/scale.

### 7.2 Screen copy (source of truth)

**Threshold**

> ECHOFORM
> A world that exists only while you are present.
>
> [ Enter the field ]
>
> No account. No recording. Your camera is a sense, not a recorder.
> [ Echoes ] [ About ]

**Consent**

> Before we begin
>
> ECHOFORM uses your camera to sense breath and pulse. The measurement happens on this device, inside the Presage SmartSpectra SDK. Your video is never recorded, uploaded, or shared by ECHOFORM. A network connection is used only to validate the SDK key. You can leave at any time and the camera turns off.
>
> [ Use my camera ] [ Explore with synthetic signals ]
>
> What is stored?
> Nothing by default. If you save an echo, we keep a small summary of the session — no video, no raw signals. You can delete it at any time.
>
> Telemetry: off by default. [ details ]
> Full data note →

**Attuning**

> Finding your signal
>
> Sit comfortably. Let your face and shoulders fill the light.
> [ validation hint ]
>
> Pulse · listening      Breath · listening

**Alive**

> Breathe naturally.
> (fades after 6s)

**End confirmation (short sessions)**

> Leave the field?
> This world will end when you do. You can keep an echo of it.

**Echo**

> Your echo
>
> This world was made by your presence.
> 4 min 12 s · breath 14 /min · pulse 62 bpm
>
> These are signals, not conclusions.
>
> [ Save this echo ] [ Download artwork ] [ Replay ] [ Let it go ]

**Privacy panel**

> Your camera, your data
>
> - Video frames are processed on this device by the SmartSpectra SDK.
> - ECHOFORM does not record, store, or upload video.
> - The SDK contacts Presage only to validate your API key.
> - SDK telemetry is off by default. You can opt in.
> - Saved echoes contain only aggregate numbers, a seed, and a date.
> - Delete all local data at any time.
>
> [ Delete all local data ]

### 7.3 Accessibility

- All interactive elements are real buttons/inputs with visible focus rings (`2px` bone outline, 2px offset).
- Focus order follows visual order; overlays trap focus and restore it on close.
- `prefers-reduced-motion` is honored; the in-app toggle overrides.
- Text contrast ≥ 4.5:1 for body; large display text ≥ 3:1.
- The world is decorative (`aria-hidden`); all meaning is duplicated in text.
- No rapid flashing; no audio autoplay; sound is opt-in.
- Keyboard: `Esc` opens the pause sheet; `M` toggles sound; `P` opens privacy; `E` ends session (with confirmation).
- Screen-reader announcements for state changes (attuning, live, signal lost, echo ready).

---

## 8. Data and privacy requirements

See [PRIVACY.md](./PRIVACY.md) for the full disclosure. Product requirements:

1. **No camera access before consent.** The SDK is not constructed and `getUserMedia` is not called until the user activates camera mode.
2. **No recording.** No `MediaRecorder`, no frame capture to disk, no canvas snapshot of the camera.
3. **No raw metrics persistence.** The metrics event may be used in memory for the session; only aggregate summaries may be saved, and only on request.
4. **Telemetry off by default.** `enableTelemetry: false`.
5. **API key handling.** Stored via Electron `safeStorage` when available; never logged; never included in crash reports; session-only option.
6. **Deletion.** "Delete all local data" removes saved echoes, preferences, and the stored key; confirms before acting.
7. **Network disclosure.** Only SDK authentication/gating calls Presage; ECHOFORM has no backend, analytics, or third-party scripts.
8. **No AI services.** No LLM insights, no external image generation, no cloud TTS.

---

## 9. Non-functional requirements

| Area | Requirement |
| --- | --- |
| Performance | 30 fps minimum at 1280×800 on integrated graphics; world remains responsive during metric decode |
| Startup | Cold start to threshold < 4s; to first signal < 60s with valid key and good lighting |
| Reliability | Camera start failure produces a clear retry path; app never hangs on SDK stop |
| Memory | Steady-state renderer < 500 MB; no unbounded metric arrays |
| Bundle | Renderer JS < 3.5 MB gzipped excluding native SDK; fonts subset |
| Security | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false` for the composed SDK preload, strict IPC surface, video-only camera grant to bundled/local page |
| Privacy | No telemetry, analytics, or remote fonts by default |
| Accessibility | WCAG 2.1 AA for UI; reduced motion; keyboard operable |
| Portability | Windows x64 primary; macOS arm64 and Linux x64 build paths documented |
| Offline | App opens and synthetic mode works offline; live mode requires network for SDK gating |

---

## 10. Success metrics

### 10.1 Demo/judging metrics

- 100% of required submission elements present.
- Live pulse and breathing visible in the demo video and driving distinct layers.
- Consent/data handling section complete.
- Repository runs from a clean install with documented steps.
- A judge can test synthetic mode without an API key; live mode with their own key.

### 10.2 Product quality metrics (local, not collected)

- Time to first living world.
- Validation hint resolution rate in a 60-second attunement.
- Session completion rate (reaches Echo).
- Artwork save/download rate.
- Frame time p95 and long-task count.
- Crash-free sessions during QA.

No user analytics are sent anywhere. These are measured manually in QA or shown locally in a development HUD.

---

## 11. Release criteria

- [ ] All P0 requirements implemented and verified.
- [ ] `npm run typecheck` and `npm run build` pass.
- [ ] Live mode tested with a valid API key and good lighting.
- [ ] Synthetic mode tested on a clean install without a key.
- [ ] Camera permission denied path tested.
- [ ] API key invalid path tested.
- [ ] Network offline path tested (clear error, no hang).
- [ ] End session → artwork → download tested.
- [ ] Save echo → replay → delete-all tested.
- [ ] Reduced motion toggled and verified.
- [ ] Packaged Windows build launches and loads native SDK.
- [ ] README, privacy note, and submission post complete.
- [ ] Demo video recorded vertically? No — 16:9, 1080p, under 3 minutes.
- [ ] No secrets in repo or transcript.

---

## 12. Demo script (3 minutes)

| Time | Action | What the viewer sees |
| --- | --- | --- |
| 0:00–0:20 | Launch app, threshold | Dormant world, wordmark, tagline |
| 0:20–0:45 | Consent screen | Camera aperture, plain-language data note, synthetic option |
| 0:45–1:10 | Attuning | Ring fills, validation hints, first pulse/breath values |
| 1:10–1:45 | Alive — breath | Particles draw inward on inhale, release on exhale; breath guide |
| 1:45–2:10 | Alive — pulse | Core blooms per beat; heartbeat audio; HUD pulse |
| 2:10–2:30 | Growth + optional expression | Organism has visibly grown; palette shifts |
| 2:30–2:45 | End session | World contracts; Echo Print assembles |
| 2:45–3:00 | Privacy + save | Privacy panel, save echo, replay without camera |

---

## 13. Open questions

1. Does the user's Presage key include cardio/HRV metrics? If not, pulse may be unavailable; the world must still work with breathing alone.
2. Which platform will judges use? Windows demo is primary; macOS packaging needs signing notes.
3. Is a public demo video URL acceptable, or must it be embedded? The challenge allows public hosting; we will provide both a file and a link.
4. Should the synthetic mode be visible in the submission? Yes — it demonstrates graceful handling and lets judges explore without a key, but live mode is clearly the primary proof.

---

## 14. Appendix — requirement traceability

| Challenge requirement | ECHOFORM implementation |
| --- | --- |
| Integrate SmartSpectra SDK | `src/signals/smartspectra.ts` using renderer SDK + messages decoder |
| Use at least one live signal | Breathing + pulse (cardio), optional HRV/face |
| Functional app | Electron desktop app with full session loop |
| DEV post | `docs/SUBMISSION.md` + published post |
| Public code repo | GitHub repository |
| Setup instructions | `README.md` |
| Demo video | Recorded 3-minute walkthrough |
| Consent and data handling | Consent screen + `docs/PRIVACY.md` + submission section |
| No diagnosis/treatment claims | Copy audit; signals-as-input framing |
| No covert monitoring | Explicit consent, visible camera indicator, no background capture |
| Testing credentials | Not applicable — no login; API key instructions provided |
