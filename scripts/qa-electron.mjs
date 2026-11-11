// Attach to the running ECHOFORM Electron app and inspect its live state.
// Usage: node scripts/qa-electron.mjs inspect
import fs from 'node:fs';

const PORT = Number(process.env.QA_CDP_PORT || 9222);
const PAGE_HINT = process.env.QA_PAGE_HINT || '127.0.0.1:5173';
const PAGE_TITLE = process.env.QA_PAGE_TITLE || 'ECHOFORM';
const PHASE_LABEL = process.argv[2] || 'inspect';

class Cdp {
  constructor(wsUrl) {
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
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
      } else if (message.method) {
        this.events.push(message);
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

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result.value;
  }

  close() {
    this.ws.close();
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = targets.find(
    (target) =>
      target.type === 'page' &&
      (target.url.includes(PAGE_HINT) || target.title === PAGE_TITLE),
  );
  if (!page) throw new Error('ECHOFORM page not found. Is Electron running with remote debugging?');

  const cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Page.enable');
  await cdp.send('Page.bringToFront').catch(() => undefined);

  if (process.env.QA_RELOAD) {
    await cdp.send('Page.reload', { ignoreCache: true });
    await sleep(1400);
  }

  const clickSelector = process.env.QA_SELECTOR;
  if (clickSelector) {
    const clicked = await cdp.evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(clickSelector)});
      if (!element) return false;
      element.click();
      return true;
    })()`);
    console.log(`[click] ${clickSelector} -> ${clicked}`);
    await sleep(Number(process.env.QA_WAIT || 900));
  }

  const clickText = process.env.QA_CLICK;
  if (clickText) {
    const clicked = await cdp.evaluate(`(() => {
      const wanted = ${JSON.stringify(clickText)};
      const buttons = Array.from(document.querySelectorAll('button'));
      const button = buttons.find((b) => b.innerText.replace(/\\s+/g, ' ').trim().toUpperCase() === wanted.toUpperCase());
      if (!button) return false;
      button.click();
      return true;
    })()`);
    console.log(`[click] ${JSON.stringify(clickText)} -> ${clicked}`);
    await sleep(Number(process.env.QA_WAIT || 900));
  }

  if (process.env.QA_EVAL) {
    const value = await cdp.evaluate(process.env.QA_EVAL);
    console.log(`[eval] ${JSON.stringify(value, null, 2)}`);
    await sleep(Number(process.env.QA_AFTER || 500));
  }

  const state = await cdp.evaluate(`(() => ({
    url: location.href,
    title: document.title,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    scroll: (() => {
      const screen = document.querySelector('.screen');
      return {
        body: document.body.scrollHeight,
        screen: screen?.scrollHeight ?? null,
        screenClient: screen?.clientHeight ?? null,
        panel: screen ? getComputedStyle(screen).overflowY : null
      };
    })(),
    storage: Object.keys(localStorage),
    phase: document.querySelector('.app')?.getAttribute('data-phase'),
    mode: document.querySelector('.app')?.getAttribute('data-mode'),
    bridge: window.echoform ? Object.keys(window.echoform) : null,
    bridgeType: typeof window.echoform,
    body: document.body.innerText,
    buttons: Array.from(document.querySelectorAll('button')).map((b) => ({
      text: b.innerText.trim().replace(/\\s+/g, ' '),
      aria: b.getAttribute('aria-label'),
      disabled: b.disabled,
      className: b.className
    })),
    inputs: Array.from(document.querySelectorAll('input')).map((i) => ({
      type: i.type,
      placeholder: i.placeholder,
      value: i.value,
      aria: i.getAttribute('aria-label')
    }))
  }))()`);

  if (process.env.QA_QUIET) {
    console.log(`[state] phase=${state.phase} mode=${state.mode}`);
  } else {
    console.log(JSON.stringify(state, null, 2));
  }

  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  fs.mkdirSync('.qa/electron', { recursive: true });
  const file = `.qa/electron/${PHASE_LABEL}.png`;
  fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
  console.log(`\nscreenshot -> ${file}`);

  const errors = cdp.events
    .filter(
      (event) =>
        event.method === 'Runtime.exceptionThrown' ||
        (event.method === 'Log.entryAdded' && event.params.entry.level === 'error'),
    )
    .map((event) => event.params.exceptionDetails?.text ?? event.params.entry?.text)
    .filter((text) => text && !/favicon/i.test(text));
  if (errors.length) {
    console.log('\nerrors:');
    for (const error of errors) console.log(`- ${error}`);
  }

  await sleep(200);
  cdp.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
