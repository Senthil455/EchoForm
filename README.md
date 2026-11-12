# ECHOFORM

**A world that exists only while you are present.** ECHOFORM turns live breathing and pulse measurements from the Presage SmartSpectra SDK into a generative 3D ecosystem. When you leave, the world contracts into an Echo Print.

![ECHOFORM synthetic world](docs/media/alive.jpg)

## What it does

- **Live sensing:** Presage SmartSpectra measures breathing and pulse from your camera on-device. No video is recorded. Live mode requires a Presage API key.
- **A living world:** breath drives a particle field and flowing ribbons; pulse drives a shader core and expanding echo rings; a seeded organism grows through the session.
- **Adaptive sound:** a Web Audio soundscape follows breath and pulse (off by default).
- **Echo Print:** when you leave, the world contracts into a locally generated 1600×2000 PNG you can download.
- **Synthetic mode:** explore the full experience without a camera or API key.

## Setup

```bash
git clone https://github.com/Senthil455/EchoForm.git
cd EchoForm
npm install
npm run dev
```

This starts the Vite dev server and opens the Electron app.

### Build and package

```bash
npm run typecheck
npm run build
npm run pack:win
```

The Windows installer is written to `dist/ECHOFORM Setup 0.1.0.exe`; the unpacked app is in `dist/win-unpacked/`. The packaged Windows app has been smoke-tested in synthetic mode and its live startup path was exercised with a valid key. The camera pipeline stayed active during that smoke test, but it did not produce a confirmed face signal or physiological readings in the test environment. macOS and Linux build scripts are included but have not been validated on those platforms.

### Live mode

1. Register for a Presage developer key at https://physiology.presagetech.com/.
2. Launch ECHOFORM and read the consent screen. It explains what is measured before the camera turns on.
3. Paste your key, choose **Use my camera**, and confirm the operating-system prompt.

You can store the key encrypted by your OS ("Remember on this device") or keep it session-only. Without a key, choose **Explore with synthetic signals** — the complete experience runs on generated signals, no camera required.

### Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Vite dev server + Electron |
| `npm run build` | Type-check (`tsc --noEmit`) + Vite production build |
| `npm run start` | Run the app (`electron .`) |
| `npm run typecheck` | Type-check only |
| `npm run pack:win` | Build a Windows installer with electron-builder |
| `npm run pack:mac` | Build a macOS package with electron-builder |
| `npm run pack:linux` | Build a Linux package with electron-builder |

Platform tested: Windows 11 x64. The SmartSpectra SDK also supports macOS arm64 and Linux x64.

## Demo and screenshots

The screenshots below use generated signals so the experience can be reviewed without a camera or API key.

| The threshold | Consent before camera |
| --- | --- |
| ![ECHOFORM threshold](docs/media/threshold.jpg) | ![Consent screen](docs/media/consent.jpg) |
| **The living world** | **Your echo** |
| ![A synthetic ECHOFORM world](docs/media/alive.jpg) | ![Echo Print ending](docs/media/echo.jpg) |

![The echo shelf](docs/media/archive.jpg)

The echo shelf keeps small aggregate worlds on this device — each holds a seed, a handful of numbers, and the shape of a session. No video, frames, or raw signals.

**Demo video:** not recorded yet. The final 2:45 cut will include one uninterrupted live Presage segment, with the HUD values and world response visible. The shot list, narration, recording settings, and privacy checks are in [docs/DEMO_VIDEO.md](docs/DEMO_VIDEO.md). Synthetic footage will remain labeled on screen; the finished video will never show the API key or a personal echo.

## Project docs

- [Product requirements (PRD)](docs/PRD.md)
- [Business requirements (BRD)](docs/BRD.md)
- [Technical design (TRD)](docs/TRD.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Feature map](docs/FEATURES.md)
- [Camera consent and privacy](docs/PRIVACY.md)
- [Demo video plan](docs/DEMO_VIDEO.md)
- [Challenge submission draft](docs/SUBMISSION.md)

## Consent & privacy

- The camera is only requested after you choose **Use my camera** and confirm the operating-system prompt.
- ECHOFORM never records, stores, or uploads video. No raw signals are saved.
- No ECHOFORM accounts, analytics, ads, crash reporter, or backend. Live use contacts Presage for SDK authentication and required resources. Optional SDK diagnostics are off by default; if enabled, they include device and session diagnostics, not video or measured vital values. Authenticated requests may be associated with your Presage account.
- Saved echoes hold only aggregate numbers, a date, and a random seed — no raw signals, video, or face data.
- Delete all local data from inside the app at any time.

See `docs/PRIVACY.md` for the full camera consent and data handling disclosure.

## Built with

Electron · React · TypeScript · Three.js · React Three Fiber · WebGL/GLSL · Web Audio API · Canvas 2D · Presage SmartSpectra SDK · Zustand · Vite.

## License

MIT

---

Built for the [Presage SmartSpectra SDK Challenge](https://dev.to/challenges/presage-smartspectra-sdk-challenge) — tag `#presagechallenge`.
