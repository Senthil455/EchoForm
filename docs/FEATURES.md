# ECHOFORM — Feature Specification & Build Status

> A single map of what ECHOFORM does, why it matters to the challenge, and where it lives in the codebase.
>
> Status legend: **Built** · **In progress** · **Planned (roadmap)**

---

## 1. Core loop

| # | Feature | User value | Challenge value | Status | Code |
| --- | --- | --- | --- | --- | --- |
| 1 | Threshold / title scene | Sets tone before asking for anything | First impression in demo | Built | `src/ui/Threshold.tsx` |
| 2 | Consent scene | Explains camera + data before access | Required disclosure, trust | Built | `src/ui/Consent.tsx` |
| 3 | API key setup | Lets judges/users run live mode without editing code | Reproducibility | Built | `src/ui/Consent.tsx`, `electron/main.cjs` |
| 4 | Attunement / calibration | Guides the user to a usable signal | Reduces failed demos | Built | `src/ui/Attuning.tsx` |
| 5 | Living world | The core experience | Proof of live SDK use | Built | `src/world/*` |
| 6 | Session end / Echo Print | Gives the session a memory | Memorable demo ending | Built | `src/artwork/EchoPrint.ts` |
| 7 | Echo archive | Keeps sessions without keeping raw data | Thoughtful real-world use | Built | `src/ui/Archive.tsx` |
| 8 | Replay | Revisit an echo without camera | Data minimization + delight | Built | `src/signals/engine.ts`, `App.tsx` |

---

## 2. Human-sensing features

| # | Feature | Live signal | World response | Status |
| --- | --- | --- | --- | --- |
| 2.1 | Breath wind | Breathing waveform / rate | 1.9k–5.2k additive particles contract on inhale and release on exhale; ribbons wave | Built |
| 2.2 | Pulse core | Pulse rate + confidence | Central membrane blooms per beat; three echo rings expand; soft heartbeat | Built |
| 2.3 | Presence fade | Stable signal freshness | World dims when the signal is lost; recovers gently | Built |
| 2.4 | Session growth | Time + presence | Procedural organism branches extend as the session continues | Built |
| 2.5 | Breathing guide | Breathing rate | A pair of arcs paces with the measured rate, not a prescription | Built |
| 2.6 | HRV orbit | HRV RMSSD | Slow satellite/organism tilt changes with HRV when stable | Planned (stretch) |
| 2.7 | Expression weather | Face expression | Optional abstract palette/particle accent; no emotion labels | Planned (stretch) |
| 2.8 | Validation hints | SDK validation codes | Human guidance during attunement and live session | Built |
| 2.9 | Synthetic signals | None (generated) | Same world, clearly labeled; no camera | Built |

---

## 3. World features

| # | Feature | Description | Status |
| --- | --- | --- | --- |
| 3.1 | Breath field | 1,900 / 3,300 / 5,200 additive particles by quality tier, procedural shader, breath-driven radial + curl motion | Built |
| 3.2 | Ribbons | 8 additive strips × 80 segments waving with breath | Built |
| 3.3 | Pulse core | View-space Lambert/specular membrane with a broad halo, beat scale + bloom | Built |
| 3.4 | Echo rings | Three expanding rings per beat, fade by ring age | Built |
| 3.5 | Presence organism | Seeded branching line structure revealed over session | Built |
| 3.6 | Spore dust | 80 / 150 / 220 slow parallax points by quality tier | Built |
| 3.7 | Ground pool | Radial shimmer plane under the core | Built |
| 3.8 | Sky | Inverted gradient sphere with subtle aurora | Built |
| 3.9 | Bloom | Always-on GPU bloom for luminous highlights | Built |
| 3.10 | CSS grain/vignette | Cheap film texture over the canvas | Built |
| 3.11 | Reduced motion | Disables drift/turbulence; preserves signal response and bloom | Built |
| 3.12 | Adaptive quality | Steps particle counts and bloom intensity/radius when frame time rises | Built |
| 3.13 | Palettes | Six seeded palettes | Built |
| 3.14 | Awakening | 2.8s orchestrated reveal | Built |
| 3.15 | Echo contraction | World contracts into the artwork | Built |

---

## 4. Audio features

| # | Feature | Description | Status |
| --- | --- | --- | --- |
| 4.1 | Ambient pad | Two detuned oscillators through a low-pass filter | Built |
| 4.2 | Breath texture | Looping filtered noise follows breath phase/amplitude | Built |
| 4.3 | Heartbeat | Soft 55 Hz thump at measured pulse rate | Built |
| 4.4 | Sound opt-in | Off until user gesture; toggle + volume | Built |
| 4.5 | Clean fade | 1.5s fades, suspend on blur | Built |

---

## 5. Echo Print & data features

| # | Feature | Description | Status |
| --- | --- | --- | --- |
| 5.1 | Deterministic artwork | 1600×2000 PNG generated locally from summary + seed | Built |
| 5.2 | Artwork composition | Rings, waveform, organism, typography, grain | Built |
| 5.3 | Native download | Electron save dialog; browser fallback | Built |
| 5.4 | Save echo | Aggregate summary only, explicit action | Built |
| 5.5 | Echo shelf | Up to 24 saved echoes, thumbnails | Built |
| 5.6 | Replay | Abstract no-camera replay of a saved echo | Built |
| 5.7 | Delete one | Per-echo delete with confirmation | Built |
| 5.8 | Delete all | Echoes + prefs + key, confirmation | Built |
| 5.9 | No raw data | Schema excludes raw arrays; code review | Built |
| 5.10 | Export/import archive | JSON export for backup | Planned |

---

## 6. Trust & privacy features

| # | Feature | Description | Status |
| --- | --- | --- | --- |
| 6.1 | Consent before camera | No SDK construction before explicit action | Built |
| 6.2 | Camera preview | Visible live preview during live sessions | Built |
| 6.3 | Synthetic mode | Full experience with no camera | Built |
| 6.4 | Telemetry off | `enableTelemetry: false` by default | Built |
| 6.5 | Telemetry opt-in | Settings toggle with explanation | Built |
| 6.6 | safeStorage key | OS-encrypted, opt-in remember | Built |
| 6.7 | No plaintext key fallback | Session-only if encryption unavailable | Built |
| 6.8 | Privacy panel | In-app full disclosure | Built |
| 6.9 | Delete all | Removes local data + key | Built |
| 6.10 | No recording | No MediaRecorder, no snapshots | Built |
| 6.11 | No AI services | No LLM/external image generation | Built |
| 6.12 | External link allowlist | Only HTTPS Presage links | Built |

---

## 7. UX, accessibility, and platform

| # | Feature | Status |
| --- | --- | --- |
| 7.1 | Responsive desktop layout (1280×800 → 1920×1080) | Built |
| 7.2 | Keyboard navigation + visible focus | Built |
| 7.3 | Dialog focus trap / restore | Built |
| 7.4 | `prefers-reduced-motion` + in-app toggle | Built |
| 7.5 | Screen-reader live regions | Built |
| 7.6 | Error boundary | Built |
| 7.7 | Dev scene jump (`?scene=...`) for QA | Built |
| 7.8 | Windows x64 packaging config | Built |
| 7.9 | macOS/Linux packaging config | Built |
| 7.10 | Kiosk mode / auto-reset | Planned (roadmap) |
| 7.11 | Multi-language UI | Planned (roadmap) |
| 7.12 | Mobile/web deployment | Out of scope |

---

## 8. Challenge requirement traceability

| Requirement | Where implemented | Evidence for judges |
| --- | --- | --- |
| SmartSpectra SDK integration | `src/signals/smartspectra.ts` | Imports from `@smartspectra/node-sdk/renderer` + `messages`; SDK lifecycle |
| At least one live signal | Breathing + pulse | HUD values, world response, demo video |
| Functional app | Electron + React + Three.js | Runnable repo, setup instructions |
| Code repository | GitHub | Public repo URL in submission |
| Setup instructions | `README.md` | Clean install steps, key setup, packaging |
| Demo video | Recorded walkthrough | Shows live signals and world response |
| Consent & data handling | Consent screen + `docs/PRIVACY.md` | Camera consent, storage, retention, deletion, telemetry |
| No medical claims | Copy + design | "Signals, not conclusions"; no diagnosis |
| No covert monitoring | Consent + camera indicator | Explicit start/stop; camera released |
| Prize category | Creative + real-world | Noted in DEV submission |

---

## 9. Roadmap beyond the challenge

These are intentionally **not** required for submission, but show where the concept can go:

1. **Kiosk mode** — attract loop, automatic session reset, admin privacy controls, larger typography.
2. **Generative gallery** — a local collection of Echo Forms, arranged as a garden; optional export as a zine.
3. **Collaborative installation** — multiple participants create a shared world; each person's presence contributes a layer, no raw data stored.
4. **Seasonal ecologies** — new organisms and palettes unlocked by time of day/season, not by performance.
5. **Accessible sensing alternatives** — support for keyboard/rhythm input and non-camera signal sources for people who cannot or do not want to use a camera.
6. **Exportable motion piece** — record the generative world (not the camera) as a short video, with explicit user action.
7. **Localization** — UI copy in multiple languages.

---

## 10. Build status summary

| Area | Status |
| --- | --- |
| Documentation (BRD/PRD/TRD/architecture/privacy) | Complete |
| Renderer app shell + state machine | Complete |
| Live SmartSpectra integration | Complete (live key test pending) |
| Synthetic mode | Complete |
| Generative world | Complete |
| Audio | Complete |
| Echo Print + archive + replay | Complete |
| Consent/privacy UI | Complete |
| Windows packaging | Complete (packaged synthetic smoke test passed) |
| Demo video | Pending |
| DEV submission | Draft complete; publish pending |
