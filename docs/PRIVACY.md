# ECHOFORM — Camera Consent & Data Handling

> This document is the full disclosure referenced by the in-app consent screen and the DEV challenge submission. It describes what ECHOFORM and the Presage SmartSpectra SDK actually do in this repository.
>
> **Last updated:** November 9, 2026

---

## 1. The short version

- ECHOFORM uses your camera **only after you explicitly choose to use it**.
- Breath, pulse, and optional face signals are measured **on your device** by the Presage SmartSpectra SDK.
- ECHOFORM **does not record, store, or upload video**.
- ECHOFORM has **no accounts, analytics, ads, or backend**.
- A network connection is used by the SDK **only to validate your API key** (and, if you opt in, to send aggregate SDK telemetry).
- SDK telemetry is **off by default** in ECHOFORM.
- A saved echo contains **only aggregate numbers, a date, and a random seed** — no raw signals, no video, no face data.
- You can delete all local data at any time.

---

## 2. Camera consent

### 2.1 When the camera turns on

The camera is not accessed until all of the following are true:

1. You open ECHOFORM and read the consent screen.
2. You provide a valid Presage API key.
3. You select **Use my camera**.
4. You confirm the operating-system camera prompt.

If you select **Explore with synthetic signals**, the camera is never requested.

### 2.2 What you see

- A live camera preview is shown in the app so you know exactly what the camera sees.
- The app shows a sensing status (`listening`, `settling`, `present`) and validation hints (for example, "add a little light").
- The camera is released when you end the session, close the window, or the app quits.
- On platforms with a hardware camera indicator, the indicator turns off when the camera is released.

### 2.3 What the camera is used for

Camera frames are used solely to compute physiological signals:

- breathing rate and breathing waveforms;
- pulse rate, a relative arterial-pressure waveform, and HRV;
- optionally, face landmarks, blinking, talking, and expression classifications.

These signals are used as **artistic inputs** to the generative world. ECHOFORM does not use them to diagnose, treat, or make health decisions, and does not label your emotional state.

### 2.4 What is not collected from the camera

ECHOFORM does not:

- record video or audio;
- take photos;
- save camera frames to disk;
- send camera frames to ECHOFORM servers (there are none);
- run face recognition or identify you;
- use the microphone (no microphone permission is requested).

---

## 3. How measurement works

ECHOFORM uses the **Presage SmartSpectra SDK** (`@smartspectra/node-sdk` 3.4.x) in an Electron app.

- The renderer captures frames from the camera `MediaStream`.
- Frames are sent over an in-process MessagePort to the Electron main process.
- The native SmartSpectra pipeline computes metrics **on your device**.
- Metric results are returned to the renderer, decoded, smoothed, and used to drive the world.
- The SDK requires a network connection to authenticate/validate your API key and subscription. This is **gating**, not remote measurement. The SDK documentation states that metric computation happens on-device.

The frame buffers are transient. ECHOFORM does not write them to disk, and the app's code does not retain them after they are handed to the SDK.

---

## 4. What is stored

### 4.1 Stored by default

| Data | Where | Purpose | Retention |
| --- | --- | --- | --- |
| Preferences (`sound`, `volume`, `reducedMotion`, `telemetry`, `expressionWeather`, `lastMode`, `hasOnboarded`) | Renderer `localStorage` | Remember your choices | Until you delete them |
| App state (current phase) | Memory only | Run the app | Session only |
| Raw camera frames | Memory only (transient) | SDK measurement | Discarded immediately after processing |
| Raw metrics | Memory only | Drive the world and compute aggregates | Discarded when the session ends |
| Session summary | Memory only until you save | Echo screen | Discarded if you choose "Let it go" |

### 4.2 Stored only when you choose

| Data | Where | Contents | Retention |
| --- | --- | --- | --- |
| Saved echo | Renderer `localStorage` (`echoform:v1:echoes`) | Date, duration, average pulse, average breathing rate, optional HRV, presence ratio, variability, a random seed, palette index, source label, schema version | Until you delete it |
| API key | Electron `safeStorage` file in the app's user data directory | Your Presage key, encrypted by the OS (DPAPI on Windows, Keychain on macOS, libsecret on Linux) | Until you delete it |
| Echo Print PNG | A location you choose via the native save dialog | The generated artwork | You control the file |

**Saved echoes contain no raw video, no raw signal arrays, no face landmarks, no expression data, no API key, and no identifier that links to you.** They are stored locally in the app's Chromium profile.

### 4.3 What is never stored

- Camera frames or video.
- Audio or microphone input.
- Raw metric payloads (breathing/pulse/HRV/face arrays).
- Face landmarks or expression classifications.
- Passwords, accounts, email addresses.
- Analytics events, advertising identifiers, or crash reports.

---

## 5. Network activity and third parties

### 5.1 ECHOFORM

ECHOFORM has no backend, no analytics SDK, no crash reporter, no remote fonts, and no ads. The app does not make network requests of its own.

### 5.2 Presage SmartSpectra SDK

The SDK contacts Presage to:

- validate your API key and subscription (required for live measurement);
- optionally, send aggregate SDK telemetry (see Section 6).

The SDK's documentation states that these requests use an authenticated, TLS-pinned channel. Your API key is sent to Presage for validation; it is not sent to any other party. Presage's privacy policy: <https://api.physiology.presagetech.com/privacypolicy>.

### 5.3 No AI services

ECHOFORM does **not** use the SDK's LLM Insights feature, any external image generation, any cloud speech service, or any AI API. The Echo Print is generated locally with Canvas 2D. No prompt, image, or signal is sent to an AI provider.

### 5.4 Links

The consent and settings screens may link to Presage's developer portal and documentation. Clicking an external link opens your default browser; ECHOFORM does not track the click.

---

## 6. SDK telemetry

The SmartSpectra SDK can send **one aggregate diagnostic summary per measurement session**. Per Presage's documentation, it contains:

- SDK build/version and package origin;
- runtime: platform, OS version, device model, CPU architecture, SDK binding;
- session shape: input source kind, outcome, number of metrics requested;
- performance: frame throughput, input frame-rate statistics, startup latency, flow-limiter throughput, produced-metric counts;
- quality: counts of on-device validation states and a coarse error code for failed sessions;
- a session timestamp.

It **does not** contain raw video, measured values (pulse, breathing, HRV, pressure waveform), file paths, prompts, free-text errors, user identifiers, or stable device identifiers.

### 6.1 ECHOFORM's default

ECHOFORM constructs the SDK with:

```ts
enableTelemetry: false
```

unless you explicitly enable **Share anonymous SDK telemetry** in the consent/settings screen. The default is off. If you enable it, the SDK may send the aggregate summary described above over its authenticated channel. You can turn it off at any time; the next session will not start a telemetry session.

### 6.2 ECHOFORM's own telemetry

None. ECHOFORM does not collect or transmit any analytics, usage events, or diagnostics.

---

## 7. API key handling

- The key is provided by you from the Presage developer portal.
- In Electron, if you choose **Remember on this device**, the key is encrypted with Electron `safeStorage` and written to the app's user data directory. On Windows this uses DPAPI; on macOS Keychain; on Linux libsecret when available.
- If `safeStorage` is unavailable, ECHOFORM keeps the key in memory for the session and tells you it cannot remember it. It does **not** fall back to plaintext storage.
- If you do not choose remember, the key is kept in the main process memory only for the session and is lost on quit.
- The key is never written to `localStorage`, logs, the artwork, the echo archive, or the repository.
- A development-only environment variable (`SMARTSPECTRA_API_KEY`) can provide the key at launch; it is read in the main process and not exposed to the renderer except through the SDK construction path.

---

## 8. Retention and deletion

### 8.1 You control retention

- **Raw frames and metrics:** discarded automatically after processing / at session end.
- **Unsaved echo:** discarded when you choose "Let it go" or close the echo screen.
- **Saved echoes:** retained until you delete them individually or use **Delete all local data**.
- **API key:** retained until you choose "Forget key" or **Delete all local data**.
- **Downloaded artwork:** retained by you, wherever you saved it. ECHOFORM does not manage or re-read the file.

### 8.2 Delete all local data

Available in the privacy panel and the archive. It:

1. asks for confirmation;
2. deletes all saved echoes;
3. clears preferences and renderer local storage for ECHOFORM;
4. removes the encrypted key file and clears the in-memory key;
5. returns you to the threshold.

It cannot delete an artwork file you already exported — that is yours to manage. It cannot delete data Presage may have received for API key validation or telemetry (if you opted in); contact Presage for those requests.

### 8.3 Uninstall

Uninstalling the app removes the application and, depending on the uninstaller/OS, its user data directory. To be certain, use **Delete all local data** before uninstalling, then remove the app.

---

## 9. Security measures

- Electron `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false` because the composed SmartSpectra preload must load the SDK preload module; the renderer remains isolated and has no Node integration.
- A narrow preload bridge; no Node access in the renderer.
- Camera permission granted only to the bundled/local page and only for video-only checks and requests; microphone requests are denied.
- Popups and navigation to remote content blocked.
- CSP restricts scripts, styles, media, workers, and connections.
- External links use an HTTPS allowlist.
- API key encrypted at rest by the OS when remembered.
- No secrets in the repository, logs, or demo video.
- Saved artwork writes are restricted to `data:image/png` and a size cap.

---

## 10. Children and eligibility

ECHOFORM is intended for adults 18 and over, consistent with the challenge rules. It is not directed to children. It does not knowingly collect data from anyone; there is no account or server-side profile.

---

## 11. Medical and emotional claims

ECHOFORM is **not a medical device** and does not provide diagnosis, treatment, or medical advice. It does not claim to detect, predict, or interpret emotion, stress, anxiety, or any health condition.

- Breath and pulse are used as **creative inputs**, not conclusions.
- The app may say "signals, not conclusions" in the interface.
- If a measurement is unstable or unavailable, the app says so rather than inventing a value.
- The artwork is a decorative record of session parameters, not a health report.

If you have a medical concern, consult a qualified professional. Do not use ECHOFORM to make health decisions.

---

## 12. Contact

For questions about this build, open an issue in the project repository. For Presage SDK privacy questions, see Presage's privacy policy and contact Presage support.

---

## 13. Summary table for the challenge submission

| Category | ECHOFORM behavior |
| --- | --- |
| Camera consent | Explicit, before access; preview visible; can use synthetic mode with no camera |
| Video storage | None |
| Video sharing | None |
| Raw metric storage | None |
| Derived data storage | Only saved echo summaries, on explicit action |
| Retention | User-controlled; per-echo delete and delete-all |
| Deletion | In-app delete-all; exported artwork is user-managed |
| SDK telemetry | Disabled by default; opt-in; aggregate only; disclosed |
| Network | SDK key validation only; no ECHOFORM backend |
| Optional AI services | None |
| Third parties | Presage (SDK auth/telemetry); no analytics/ads |
| Accounts | None |
| Medical claims | None |
| Emotion claims | None |
