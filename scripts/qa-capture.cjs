// Local visual-QA harness. Not part of the shipped app.
// Usage: npx electron scripts/qa-capture.cjs
// Requires the Vite dev server at http://127.0.0.1:5173.
'use strict';

const { app, BrowserWindow, ipcMain, safeStorage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { bindSmartSpectraIpc } = require('@smartspectra/node-sdk/main');

const BASE = process.env.QA_BASE || 'http://127.0.0.1:5173/';
const OUT = path.resolve(process.env.QA_OUT || '.qa');
const WIDTH = Number(process.env.QA_WIDTH || 1440);
const HEIGHT = Number(process.env.QA_HEIGHT || 900);

const SCENES = [
  { name: 'threshold', query: 'scene=threshold' },
  { name: 'consent', query: 'scene=consent' },
  { name: 'attuning-synthetic', query: 'scene=attuning&mode=synthetic' },
  { name: 'alive-synthetic', query: 'scene=alive&mode=synthetic' },
  { name: 'echo', query: 'scene=echo&seed=28475923&palette=2' },
  { name: 'archive', query: 'scene=archive' },
];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slug(value) {
  return value.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
}

process.on('unhandledRejection', (error) => {
  console.error('[qa] unhandled rejection:', error);
});
process.on('uncaughtException', (error) => {
  console.error('[qa] uncaught exception:', error);
});

app.on('window-all-closed', (event) => {
  // Keep the harness alive between captures.
  event.preventDefault?.();
});

app.whenReady().then(async () => {
  ipcMain.handle('echoform:get-bootstrap', () => ({
    ok: true,
    platform: process.platform,
    arch: process.arch,
    appVersion: app.getVersion(),
    sdkVersion: require('@smartspectra/node-sdk/package.json').version,
    packaged: app.isPackaged,
    safeStorage: safeStorage.isEncryptionAvailable(),
    hasKey: false,
    keySource: null,
  }));
  ipcMain.handle('echoform:get-api-key', () => ({ ok: true, key: null, source: null }));
  ipcMain.handle('echoform:clear-api-key', () => ({ ok: true }));

  fs.mkdirSync(OUT, { recursive: true });

  const only = (process.env.QA_ONLY || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const scenes = only.length ? SCENES.filter((scene) => only.includes(scene.name)) : SCENES;
  const report = [];

  const win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    show: true,
    backgroundColor: '#06100e',
    title: 'ECHOFORM QA',
    webPreferences: {
      preload: path.join(__dirname, '..', 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });
  bindSmartSpectraIpc(win);

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('[qa] renderer gone:', details);
  });

  for (const scene of scenes) {
    const logs = [];
    const failures = [];
    const consoleListener = (event) => {
      const text = typeof event === 'object' && event.message ? event.message : String(event);
      logs.push(text);
      if (/error|failed|uncaught/i.test(text)) failures.push(text);
    };
    win.webContents.on('console-message', consoleListener);

    const url = `${BASE}?${scene.query}`;
    try {
      console.log(`[qa] loading ${url}`);
      await win.loadURL(url);
      await wait(scene.name === 'attuning-synthetic' ? 4200 : 2600);
      const image = await win.webContents.capturePage();
      const file = path.join(OUT, `${slug(scene.name)}.png`);
      fs.writeFileSync(file, image.toPNG());
      report.push({ scene: scene.name, url, file, failures, console: logs.slice(-16) });
      console.log(`[qa] captured ${scene.name} -> ${file}`);
    } catch (error) {
      failures.push(String(error));
      report.push({ scene: scene.name, url, failures, console: logs.slice(-16) });
      console.error(`[qa] error in ${scene.name}`, error);
    } finally {
      win.webContents.removeListener('console-message', consoleListener);
    }
  }

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[qa] report -> ${path.join(OUT, 'report.json')}`);
  win.destroy();
  app.exit(0);
});
