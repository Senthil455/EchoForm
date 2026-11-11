// Local visual-QA harness driven through the Chrome DevTools Protocol.
// Usage: node scripts/qa-cdp.mjs
// Requires the Vite dev server at http://127.0.0.1:5173.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME =
  process.env.QA_CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.QA_BASE || 'http://127.0.0.1:5173/';
const OUT = path.resolve(process.env.QA_OUT || '.qa');
const PORT = Number(process.env.QA_CDP_PORT || 9333);
const WIDTH = Number(process.env.QA_WIDTH || 1440);
const HEIGHT = Number(process.env.QA_HEIGHT || 900);

const SCENES = [
  { name: 'threshold', query: 'scene=threshold', wait: 3200 },
  { name: 'consent', query: 'scene=consent', wait: 2500 },
  { name: 'attuning-synthetic', query: 'scene=attuning&mode=synthetic&seed=28475924', wait: 4200 },
  { name: 'alive-synthetic', query: 'scene=alive&mode=synthetic&seed=28475924', wait: 12000 },
  { name: 'echo', query: 'scene=echo&seed=28475923&palette=2', wait: 4000 },
  { name: 'archive', query: 'scene=archive', wait: 2500 },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDevtools() {
  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return response.json();
    } catch {
      /* not ready */
    }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint never became ready');
}

class Cdp {
  constructor(wsUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.ws = new WebSocket(wsUrl);
    this.open = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      }
    });
  }

  async send(method, params = {}) {
    await this.open;
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(path.join(OUT, 'chrome-profile'), { recursive: true });

  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${path.join(OUT, 'chrome-profile')}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      `--window-size=${WIDTH},${HEIGHT}`,
      '--force-device-scale-factor=1',
      '--enable-unsafe-swiftshader',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-features=CalculateNativeWinOcclusion',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );

  const chromeErrors = [];
  chrome.stderr.on('data', (chunk) => {
    const text = String(chunk);
    if (/ERROR/.test(text)) chromeErrors.push(text.trim());
  });

  let cdp;
  try {
    await waitForDevtools();
    const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    const page = targets.find((target) => target.type === 'page');
    if (!page) throw new Error('No page target found');

    cdp = new Cdp(page.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: WIDTH,
      height: HEIGHT,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const errors = [];
    cdp.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.method === 'Runtime.exceptionThrown') {
        errors.push(message.params.exceptionDetails?.text ?? 'exception');
      }
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
        errors.push(message.params.entry.text);
      }
    });
    await cdp.send('Log.enable');

    const report = [];
    const only = (process.env.QA_ONLY || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    const customQuery = process.env.QA_SCENE;
    const scenes = customQuery
      ? [
          {
            name: process.env.QA_NAME || 'custom',
            query: customQuery,
            wait: Number(process.env.QA_WAIT || 12000),
          },
        ]
      : only.length
        ? SCENES.filter((scene) => only.includes(scene.name))
        : SCENES;
    for (const scene of scenes) {
      const url = `${BASE}?${scene.query}`;
      console.log(`[qa] ${scene.name}`);
      await cdp.send('Page.navigate', { url });
      await sleep(1200);
      await sleep(scene.wait);
      const state = await cdp.send('Runtime.evaluate', {
        expression: `(() => ({
          title: document.title,
          phase: document.querySelector('.app')?.getAttribute('data-phase'),
          hudTime: document.querySelector('.hud-time')?.textContent ?? null,
          hudPulse: document.querySelector('.hud-value')?.textContent ?? null,
          error: document.querySelector('.session-error h2')?.textContent ?? null,
          layout: (() => {
            const node = document.querySelector('.consent') || document.querySelector('.screen');
            if (!node) return null;
            const rect = node.getBoundingClientRect();
            const footnote = document.querySelector('.consent-footnote')?.getBoundingClientRect();
            const actions = document.querySelector('.consent-actions')?.getBoundingClientRect();
            return {
              selector: node.className,
              scrollHeight: node.scrollHeight,
              clientHeight: node.clientHeight,
              rect: { top: rect.top, bottom: rect.bottom, height: rect.height },
              footnote: footnote ? { top: footnote.top, bottom: footnote.bottom } : null,
              actions: actions ? { top: actions.top, bottom: actions.bottom } : null,
            };
          })(),
          body: document.body.innerText.slice(0, 220)
        }))()`,
        returnByValue: true,
      });
      let extra = null;
      if (process.env.QA_EVAL) {
        const result = await cdp.send('Runtime.evaluate', {
          expression: process.env.QA_EVAL,
          returnByValue: true,
          awaitPromise: true,
        });
        extra = result.result.value;
      }
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
      const file = path.join(OUT, `cdp-${scene.name}.png`);
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      report.push({ scene: scene.name, url, file, state: state.result.value, extra });
      console.log(`[qa]   hud=${state.result.value.hudTime} phase=${state.result.value.phase}`);
      if (state.result.value.layout?.scrollHeight != null) {
        console.log(
          `[qa]   layout=${state.result.value.layout.scrollHeight}/${state.result.value.layout.clientHeight}`,
        );
      }
      if (extra != null) console.log(`[qa]   extra=${JSON.stringify(extra)}`);
    }

    fs.writeFileSync(path.join(OUT, 'cdp-report.json'), JSON.stringify(report, null, 2));
    const pageErrors = errors.filter((error) => !/favicon/i.test(error));
    if (pageErrors.length) {
      console.log('[qa] runtime errors:');
      for (const error of pageErrors) console.log(`  - ${error}`);
    }
    console.log(`[qa] report -> ${path.join(OUT, 'cdp-report.json')}`);
    if (chromeErrors.length) {
      console.log('[qa] chrome errors:');
      for (const error of chromeErrors.slice(0, 6)) console.log(`  - ${error}`);
    }
  } finally {
    cdp?.close();
    chrome.kill();
  }
}

main().catch((error) => {
  console.error('[qa] failed:', error);
  process.exitCode = 1;
});
