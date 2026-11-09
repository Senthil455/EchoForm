# ECHOFORM — Business Requirements Document (BRD)

> **Working title:** ECHOFORM
> **Tagline:** A world that exists only while you are present.
> **Challenge:** Presage SmartSpectra SDK Challenge (DEV Community), November 4–22, 2026.
> **Document owner:** Senthil Raja R
> **Status:** Build baseline — v0.1
> **Last updated:** November 9, 2026

---

## 1. Executive summary

ECHOFORM is a desktop experience in which a dark, empty world comes alive only when a person is present in front of their camera. Live breathing and pulse signals from the Presage SmartSpectra SDK are translated into light, wind, growth, and sound. There are no scores, no diagnoses, and no conventional controls. Presence is the interface.

The product is designed for the **Presage SmartSpectra SDK Challenge**, where it targets three opportunities:

1. **Best Overall Human-Sensing Experience** — a working, emotionally legible use of live human signals.
2. **Most Creative or Delightful Use** — a new interaction category rather than another vitals dashboard.
3. **Best Thoughtful Real-World Use** — a consent-first, data-minimal ritual for taking a genuine pause from screen work.

ECHOFORM is not a medical device, a diagnostic tool, or an emotion detector. It uses measured signals as **creative inputs**, never as conclusions about a person's health or inner state.

---

## 2. Problem and opportunity

### 2.1 The problem with human-sensing software

Camera-based sensing is usually presented in one of three ways:

- a **clinical dashboard** that reduces a person to numbers;
- a **surveillance feature** that infers attributes without a visible reason;
- a **gimmick** that uses a signal once, then loses the person's attention.

All three miss the same opportunity: human signals are **temporal, embodied, and expressive**. They are better suited to a living medium than to a table of metrics. When software responds to breath and pulse in real time, the screen can stop asking for attention and start reflecting the person in front of it.

### 2.2 The real-world need

Knowledge workers spend long, continuous periods in front of screens. The common advice — "take a break" — is easy to state and hard to practice. Most break experiences are either another notification, another productivity metric, or a guided session that makes medical claims it cannot support.

There is room for a **non-clinical, low-friction, consent-first pause** that:

- requires no account or wearable;
- works with the camera a person already owns;
- gives the person something beautiful to return to;
- leaves no video behind;
- does not tell them how they feel or what is wrong with them.

ECHOFORM treats a two-to-five-minute pause as a **creative ritual**, not a treatment. The world is the reward for being present.

### 2.3 Why Presage / why now

The SmartSpectra SDK performs on-device measurement of pulse, breathing, HRV, and face signals from ordinary camera frames. It provides confidence, stability, and validation cues that make a responsive experience feasible without building a signal-processing stack from scratch. The challenge brief explicitly asks for an experience that responds to **real-time human signals** — a generative world is a direct, legible expression of that capability.

The strategic opportunity for Presage is to show the SDK outside the clinic: as a material for artists, designers, and experience builders. ECHOFORM is a reference for that category.

---

## 3. Business objectives

| Objective | Measure of success | Target for the challenge |
| --- | --- | --- |
| Demonstrate a novel use of SmartSpectra | Judges can identify live signals driving the world without explanation | Clear within 15 seconds of the demo video |
| Prove the SDK works in an expressive desktop product | Live pulse + breathing visibly change the world | Both signals drive separate visual layers |
| Build trust through responsible design | Consent, storage, retention, telemetry, and deletion are explicit and implemented | 100% of required disclosures in product, README, and submission |
| Create a memorable, award-worthy demo | A judge can describe the experience in one sentence after watching | "The world only exists while you are there." |
| Ship a complete submission | Working repo, setup instructions, demo video, DEV post | All four present before Nov 22, 2026 |

### 3.1 Prize strategy

- **Primary:** Most Creative or Delightful Use — the concept is unusual and the demo is visually distinctive.
- **Secondary:** Best Thoughtful Real-World Use — consent-first design, data minimization, and a real need (a genuine pause) support this category.
- **Overall:** the same build is submitted for the overall prize; no separate version is required.

Each participant may submit one entry. ECHOFORM is a solo submission.

---

## 4. Audience

### 4.1 Primary audience — the challenge judge

A developer or designer evaluating whether the SDK was used meaningfully. They need to see:

- live signals, not a pre-recorded mock;
- a clear mapping between signal and response;
- a product that feels finished, not a tech demo;
- responsible handling of camera data;
- setup that can be reproduced.

### 4.2 Secondary audience — the curious user

Someone who wants a quiet, beautiful break and is willing to grant camera access for a few minutes. They need:

- a reason to trust the app before the camera turns on;
- immediate feedback that the camera is working;
- no account, no subscription, no pressure;
- an easy way to stop, delete, and leave.

### 4.3 Tertiary audience — the experience curator

A museum, brand, or event producer looking for an installation that adapts to visitors. They need a kiosk-friendly story, but kiosk mode is a roadmap item, not an MVP requirement.

---

## 5. Value proposition

**For the person:** "A small, living world that answers to your breath and pulse — and disappears cleanly when you leave."

**For Presage:** "A demonstration that SmartSpectra can power a new category of human-responsive art, not only measurement."

**For the challenge:** "A complete, original, consent-first experience with a visual moment judges will remember."

---

## 6. Scope

### 6.1 In scope (challenge build)

- Cross-platform Electron desktop app (Windows primary; macOS/Linux supported by the SDK).
- Camera consent and onboarding.
- Live SmartSpectra integration for breathing and pulse; HRV and face metrics optional.
- Generative 3D world driven by live signals.
- Original adaptive audio soundscape (opt-in).
- Session artwork ("Echo Print") generated locally.
- Optional local archive of non-identifying session summaries and abstract replay.
- Synthetic signal mode for development, accessibility, and judge testing when no API key is available.
- Privacy controls: telemetry opt-in, save opt-in, delete-all.
- Setup instructions, architecture documentation, demo script, and DEV submission draft.

### 6.2 Out of scope

- Medical interpretation, diagnosis, treatment, or health advice.
- Emotion recognition claims or "mood detection."
- Cloud accounts, social features, leaderboards.
- Raw video recording, upload, or sharing.
- Mobile app, web deployment with a shared API key, or kiosk hardware.
- LLM insights. The SDK supports them; ECHOFORM does not use them.
- Multi-user or team sessions.
- Monetization inside the challenge build.

---

## 7. Competitive frame

| Category | Typical experience | ECHOFORM difference |
| --- | --- | --- |
| Vitals dashboards | Numbers, charts, trend lines | The world is the interface; numbers are quiet secondary telemetry |
| Breathing apps | Guided pacing with health claims | The measured breath shapes an environment; no therapeutic claim |
| Emotion detectors | Labels a face as happy/sad/stressed | Never labels emotion; expressions are optional abstract weather |
| Ambient art | Pre-rendered loops | The composition is generated by the person's live signals |
| Wellness trackers | Streaks, scores, productivity | No score, no streak, no quantification of the person's worth |

---

## 8. Success criteria

### 8.1 Product success (challenge demo)

- A new user can go from launch to a living world in **under 60 seconds** with a valid API key.
- Breathing rate changes are visible in the world within **2 seconds** of a stable measurement.
- Pulse changes are visible in the world within **2 seconds** of a stable measurement.
- The user can end a session and receive a unique artwork in **under 10 seconds**.
- A saved echo can be replayed without camera access.
- The app remains interactive at **≥ 30 fps** on a typical laptop with integrated graphics.

### 8.2 Trust success

- The consent screen explains what the camera is used for, what leaves the device, and what is stored **before** camera access is requested.
- Telemetry is **off by default** and clearly explained.
- No raw video or frame buffer is written to disk by ECHOFORM.
- Session data is saved only after an explicit action.
- "Delete all local data" removes saved echoes and the stored API key.
- The submission includes a Consent and Data Handling section.

### 8.3 Business success (post-challenge)

- A clear reference implementation for "generative experiences with SmartSpectra."
- Potential for gallery/kiosk adaptations or commissioned installations.
- A public case study that can be shown to future collaborators.

---

## 9. Constraints and assumptions

- **Timeline:** 13 days from November 9 to November 22, 2026.
- **Team:** solo builder; no team submissions permitted.
- **SDK access:** free trial credits; no extra credits provided by the challenge.
- **API key:** required for live mode; synthetic mode must keep the app testable without one.
- **Platform:** Windows x64 is the primary development and demo platform; macOS/Linux supported by the Node SDK.
- **Camera:** a standard webcam; no depth camera, wearable, or special hardware.
- **Connectivity:** required for SDK authentication/gating; metric computation is on-device.
- **Rules:** no diagnosis/treatment claims, no covert monitoring, one entry per participant.

---

## 10. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Judges cannot test live mode without an API key | High | High | Ship a clearly labeled synthetic mode; document key setup; include a demo video with live signals |
| Signal quality is poor in demo lighting | Medium | High | Validation hints, calibration stage, generous tolerances, graceful "listening" state |
| API key provisioning blocks cardio metrics | Medium | High | Request breathing first; treat cardio as optional; document key scopes |
| Perceived medical/emotion claims | Medium | High | Language audit; no diagnosis; "signals, not conclusions"; no emotion labels |
| Motion sickness or overstimulation | Medium | Medium | Reduced-motion mode; low camera drift; intensity control; pause/end always available |
| Performance on integrated GPUs | Medium | Medium | Particle budget, DPR cap, adaptive quality, postprocessing toggle |
| Privacy skepticism | High | High | Consent-first onboarding, local-only processing, telemetry off, delete-all |
| Packaging native SDK libraries | Medium | Medium | Follow official Electron packaging guidance; test packaged build early |
| Running out of time | High | High | Build the core loop first; archive/replay and face metrics are stretch; docs written alongside |

---

## 11. Stakeholders and responsibilities

| Role | Person | Responsibility |
| --- | --- | --- |
| Product / design / engineering | Senthil Raja R | Concept, UX, implementation, documentation, demo |
| SDK provider | Presage Technologies | SmartSpectra SDK, API key, docs, support |
| Challenge organizer | DEV Community | Rules, judging, submission platform |
| Users / judges | Challenge reviewers and public | Feedback, testing, evaluation |

---

## 12. Timeline

| Date | Milestone |
| --- | --- |
| Nov 9 | Concept lock, BRD/PRD/TRD/architecture, scaffold |
| Nov 10 | Signal pipeline, SmartSpectra integration, synthetic mode |
| Nov 11–12 | Generative world, shaders, breathing/pulse mappings |
| Nov 13–14 | Onboarding, consent, HUD, session state machine |
| Nov 15–16 | Echo Print artwork, audio, archive/replay |
| Nov 17–18 | Privacy controls, accessibility, performance pass |
| Nov 19 | Documentation, README, submission template |
| Nov 20 | Demo recording, screenshots, packaged build |
| Nov 21 | QA, bug fixes, final repo review |
| Nov 22 | Submit DEV post with `#presagechallenge` before 11:59 PM PST |

---

## 13. Decision log

| Decision | Rationale |
| --- | --- |
| Electron + React + Three.js | Official Node/Electron SDK path; rich WebGL world; fast iteration |
| Breathing + pulse as primary signals | Most legible, most stable, strongest visual metaphors |
| Face expressions optional and abstract | Creative possibility without emotion-detection claims |
| Synthetic mode | Protects the demo and lets judges explore without a key |
| Local-only session summaries | Trust and data minimization; no backend to build |
| No LLM insights | Keeps the experience deterministic, private, and fast |
| Artwork generated locally | No upload, no external AI service, no additional consent surface |

---

## 14. Approval

This BRD is the business baseline for the challenge build. Product and technical details are defined in `docs/PRD.md` and `docs/TRD.md`. Any change to scope must preserve the non-negotiable constraints in Section 6.2 and the trust commitments in Section 8.2.
