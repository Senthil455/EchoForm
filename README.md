# ECHOFORM

A world that exists only while you are present. Live breath and pulse, measured by the Presage SmartSpectra SDK from your camera, become a generative 3D ecosystem on your desktop.

## What it does

- **Live sensing:** Presage SmartSpectra measures breathing and pulse from your camera on-device. No video is recorded.
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

### Live mode

1. Register for a Presage developer key at https://physiology.presagetech.com/.
2. Launch ECHOFORM, choose **Use my camera**, paste your key, and confirm the camera prompt.
3. The consent screen explains what is measured before the camera turns on.

You can store the key encrypted by your OS ("Remember on this device") or keep it session-only. Without a key, choose **Explore with synthetic signals** — the complete experience runs on generated signals, no camera required.

### Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Vite dev server + Electron |
| `npm run build` | Type-check (`tsc --noEmit`) + Vite production build |
| `npm run start` | Run the app (`electron .`) |
| `npm run typecheck` | Type-check only |
| `npm run pack:win` | Build a Windows distributor with electron-builder |
| `npm run pack:mac` | Build a macOS distributor with electron-builder |
| `npm run pack:linux` | Build a Linux distributor with electron-builder |

Platform tested: Windows 11 x64. The SmartSpectra SDK also supports macOS arm64 and Linux x64.

## Consent & privacy

- The camera is only used after you explicitly opt in, with a live preview visible so you know what it sees.
- ECHOFORM never records, stores, or uploads video. No raw signals are saved.
- No accounts, analytics, ads, crash reporter, or backend. The SDK contacts Presage only to validate your API key; optional aggregate SDK telemetry is off by default.
- Saved echoes hold only aggregate numbers, a date, and a random seed — no health data, no face data.
- Delete all local data from inside the app at any time.

See `docs/PRIVACY.md` for the full camera consent and data handling disclosure.

## Built with

Electron · React · TypeScript · Three.js · React Three Fiber · WebGL/GLSL · Web Audio API · Canvas 2D · Presage SmartSpectra SDK · Zustand · Vite.

## License

MIT

---

Built for the [Presage SmartSpectra SDK Challenge](https://dev.to/challenges/presage-smartspectra-sdk-challenge) — tag `#presagechallenge`.