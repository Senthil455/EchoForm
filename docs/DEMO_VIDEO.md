# ECHOFORM — Demo Video Plan

> Target length: **2:45–3:00** · 16:9 · 1920×1080 · public on YouTube or Vimeo.
>
> The video is not recorded yet. This is the shot list and recording checklist for the final submission. Do not publish a synthetic-only cut as a live demonstration: the challenge requires at least one confirmed live Presage signal.

---

## 1. What the video must prove

1. ECHOFORM is a real, runnable desktop app — not a mockup.
2. The Presage SmartSpectra SDK is running in live mode, with visible breathing and pulse values changing.
3. Those values visibly drive the world: breath moves the particle field/ribbons, pulse drives the core and echo rings.
4. Consent happens before camera access, and synthetic mode is clearly labeled.
5. The session ends in a locally generated Echo Print, and an echo can be saved and replayed without the camera.
6. No video is recorded, no raw signals are stored, and there is no diagnosis or emotion label.

---

## 2. Pre-record checklist

### Build and signal

- [ ] Use the Windows build (`npm run pack:win`) or `npm run dev` at 1440×900.
- [ ] Confirm a valid Presage API key with available credits.
- [ ] Run one complete live session before recording. Confirm the camera preview appears and the HUD shows plausible breath and pulse values.
- [ ] Sit in even front light, with a plain background. Keep your face and shoulders in frame.
- [ ] Close other camera apps. Disable notifications and OS update popups.
- [ ] Use a session-only key. Do **not** enable "Remember on this device" while recording.
- [ ] Clear old echoes or use a fresh app data state so no personal session appears in the archive.
- [ ] Test **Download artwork** and note the save destination.
- [ ] Check that the camera indicator turns off after **End session**.

### Capture

- [ ] OBS Studio, 1920×1080 canvas, 30 or 60 fps, hardware encoder (NVENC or QuickSync).
- [ ] Capture the app window, not the whole desktop. Hide the taskbar and any personal files.
- [ ] Record narration on a separate microphone track if possible.
- [ ] Keep the app at 100% display scaling so the typography stays crisp.
- [ ] Record a 5–10 second clean plate of the threshold and the alive world for cutaways.

### Privacy

- [ ] Never show the API key. Enter it before recording, or cut/blur the paste.
- [ ] Blur or crop the camera preview in post if you do not want your face in the final video.
- [ ] Do not show saved echoes from previous personal sessions.
- [ ] Do not show account names, browser tabs, notification banners, or file paths with your name.

---

## 3. Storyboard

| Time | Shot | Action | Narration beat |
| --- | --- | --- | --- |
| 0:00–0:10 | Threshold | Hold on the dormant world and wordmark. | "What if your presence was the only control a computer needed?" |
| 0:10–0:28 | Consent | Move slowly across the data note. Hover **Explore with synthetic signals** and **Use my camera**. | "Before the camera opens, ECHOFORM explains what it senses, what it never records, and how to leave." |
| 0:28–0:42 | Synthetic attunement → world | Choose synthetic signals. Let the world awaken for a few seconds. Keep the SYNTHETIC label visible. | "Synthetic mode lets anyone see the complete experience without a camera or a key. The world is clearly labeled." |
| 0:42–0:55 | Live consent → camera | Cut to the consent screen with the key already entered. Choose **Use my camera**; confirm the OS prompt. | "Now the real thing. One camera, one key, and nothing starts until I choose." |
| 0:55–1:12 | Attuning | Show the preview and the filling ring. Let a validation hint appear if it is useful. Wait for the first breath and pulse values. | "The SDK needs a few seconds to find a clean signal. Breath first, then pulse." |
| 1:12–1:42 | Alive — breath | Breathe normally. Hold the wide shot so the particle field contracts on inhale and releases on exhale. Keep the breath HUD visible. | "Every inhale pulls the field inward. Every exhale lets it go. The ribbons follow the same wave." |
| 1:42–2:10 | Alive — pulse | Let the core bloom and the rings expand. Keep the pulse HUD visible. Optionally turn sound on for five seconds. | "Pulse is the second layer. The core blooms once per beat, and the rings carry the rhythm outward. The soundscape follows the same signals." |
| 2:10–2:24 | Growth | Hold a wider shot showing the organism has grown. | "The world also remembers time. The longer you stay, the more the organism unfolds." |
| 2:24–2:38 | End → Echo Print | Choose **End session**, confirm, and let the world contract into the artwork. | "When I leave, the world contracts into an Echo Print — made from the shape of this session, not from video." |
| 2:38–2:52 | Save → replay → archive | Save the echo, open it, replay it without the camera, then show the archive. | "I can keep a small aggregate memory and replay the world later. No frames, no raw signals, no face data." |
| 2:52–3:00 | Close | Return to the threshold or hold on the Echo Print. | "No score. No diagnosis. Just a world that exists only while you are present." |

---

## 4. Narration script (readable take)

> What if your presence was the only control a computer needed?
>
> ECHOFORM is a small world built with the Presage SmartSpectra SDK. Before the camera opens, it explains what it senses, what it never records, and how to leave.
>
> Synthetic mode lets anyone see the complete experience without a camera or a key. The world is clearly labeled as synthetic.
>
> Now the real thing. One camera, one key, and nothing starts until I choose.
>
> The SDK needs a few seconds to find a clean signal. Breath first, then pulse.
>
> Every inhale pulls the field inward. Every exhale lets it go. The ribbons follow the same wave.
>
> Pulse is the second layer. The core blooms once per beat, and the rings carry the rhythm outward. The soundscape follows the same signals.
>
> The world also remembers time. The longer you stay, the more the organism unfolds.
>
> When I leave, the world contracts into an Echo Print — made from the shape of this session, not from video.
>
> I can keep a small aggregate memory and replay the world later. No frames, no raw signals, no face data.
>
> No score. No diagnosis. Just a world that exists only while you are present.

---

## 5. Post-production

1. Trim setup waits and dead air. Keep one uninterrupted 20–30 second live segment so the signal response is believable.
2. Add a lower-third when synthetic mode is on: **SYNTHETIC STUDY · generated signals**. Remove it when live mode begins.
3. Add a second lower-third in live mode: **LIVE · Presage SmartSpectra · breath + pulse**.
4. Blur the camera preview if you prefer not to appear. Keep the HUD values readable.
5. Add captions for the narration. Keep them away from the HUD and the Echo Print.
6. Do not add music that implies a medical or emotional claim. The app's own generated soundscape is enough.
7. Export H.264 MP4, 1080p, AAC audio, under 3 minutes.
8. Make a thumbnail from `docs/media/alive.jpg` or a clean Echo Print frame.

---

## 6. Publishing checklist

- [ ] Watch the full export once with sound and once muted.
- [ ] Confirm no API key, face, personal file, or saved personal echo appears.
- [ ] Confirm synthetic footage is labeled and live footage is labeled.
- [ ] Upload as unlisted; test the link in an incognito window and on a phone.
- [ ] Replace `[ADD PUBLIC DEMO VIDEO LINK]` in `docs/SUBMISSION.md` and `DEV_SUBMISSION_DRAFT.md`.
- [ ] Add the link to the DEV post and the repository README if desired.
- [ ] Set the video public only after the final live take is confirmed.
