// ECHOFORM — Electron main process
// CommonJS on purpose: @smartspectra/node-sdk is a CommonJS native binding.
//
// Responsibilities:
//   • own the native SmartSpectra pipeline through bindSmartSpectraIpc
//   • create a hardened, local-only BrowserWindow
//   • grant camera permission only to our own page, video-only
//   • store the Presage key with OS encryption (safeStorage), never plaintext
//   • save generated artwork through a native dialog
//   • open only allowlisted HTTPS links in the system browser

'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { app, BrowserWindow, session, ipcMain, safeStorage, dialog, shell } = require('electron');

const DEV_URL = process.env.ECHOFORM_DEV_URL || '';
const DIAGNOSTICS = process.env.ECHOFORM_DIAGNOSTICS === '1';
const APP_NAME = 'ECHOFORM';
const KEY_FILE = 'credentials.enc';

// One instance only: two processes fighting over a webcam is a bad first impression.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let sessionKey = null;
let envKeyDisabled = false;

// ── Native runtime path (packaged builds) ────────────────────────────────────
// The SDK's native closure is shipped outside app.asar via electron-builder
// extraResources. Point the binding at the unpacked library BEFORE requiring it.
if (app.isPackaged && !process.env.SMARTSPECTRA_CAPI_PATH) {
  const LIB = {
    darwin: 'libsmartspectra_capi.dylib',
    win32: 'smartspectra_capi.dll',
    linux: 'libsmartspectra_capi.so',
  }[process.platform];

  if (LIB) {
    process.env.SMARTSPECTRA_CAPI_PATH = path.join(process.resourcesPath, 'smartspectra', LIB);
  } else {
    console.error(
      `[echoform] packaged build on unsupported platform "${process.platform}" — ` +
        'no native SmartSpectra runtime is bundled for it.',
    );
  }
}

const { bindSmartSpectraIpc } = require('@smartspectra/node-sdk/main');

// ── Trusted origins ───────────────────────────────────────────────────────────
function isTrustedPage(rawUrl) {
  if (!rawUrl) return false;
  if (rawUrl.startsWith('file://')) return true;
  try {
    const u = new URL(rawUrl);
    return (
      (u.hostname === '127.0.0.1' || u.hostname === 'localhost') &&
      (u.protocol === 'http:' || u.protocol === 'https:') &&
      (!DEV_URL || rawUrl.startsWith(DEV_URL))
    );
  } catch {
    return false;
  }
}

// ── Key storage ───────────────────────────────────────────────────────────────
function keyPath() {
  return path.join(app.getPath('userData'), KEY_FILE);
}

function encryptionAvailable() {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

function readStoredKey() {
  try {
    const file = keyPath();
    if (!fs.existsSync(file)) return null;
    if (!encryptionAvailable()) return null;
    const encrypted = fs.readFileSync(file);
    return safeStorage.decryptString(encrypted);
  } catch {
    // A corrupt/unreadable key should never brick the app. Remove it silently.
    try {
      fs.rmSync(keyPath(), { force: true });
    } catch {
      /* ignore */
    }
    return null;
  }
}

function writeStoredKey(key) {
  if (!encryptionAvailable()) return false;
  try {
    const encrypted = safeStorage.encryptString(key);
    const file = keyPath();
    const temp = `${file}.tmp`;
    fs.writeFileSync(temp, encrypted, { mode: 0o600 });
    fs.renameSync(temp, file);
    return true;
  } catch {
    return false;
  }
}

function clearStoredKey() {
  try {
    fs.rmSync(keyPath(), { force: true });
  } catch {
    /* ignore */
  }
}

function resolveKey() {
  if (!envKeyDisabled) {
    const fromEnv = (process.env.SMARTSPECTRA_API_KEY || '').trim();
    if (fromEnv) return { key: fromEnv, source: 'environment' };
  }
  if (sessionKey) return { key: sessionKey, source: 'session' };
  const stored = readStoredKey();
  if (stored) return { key: stored, source: 'safeStorage' };
  return { key: null, source: null };
}

// ── IPC ───────────────────────────────────────────────────────────────────────
function registerIpc() {
  ipcMain.handle('echoform:get-bootstrap', () => {
    const resolved = resolveKey();
    let sdkVersion = 'unknown';
    try {
      sdkVersion = require('@smartspectra/node-sdk/package.json').version;
    } catch {
      /* ignore */
    }
    return {
      ok: true,
      platform: process.platform,
      arch: process.arch,
      appVersion: app.getVersion(),
      sdkVersion,
      packaged: app.isPackaged,
      safeStorage: encryptionAvailable(),
      hasKey: Boolean(resolved.key),
      keySource: resolved.source,
    };
  });

  ipcMain.handle('echoform:get-api-key', () => {
    const resolved = resolveKey();
    return { ok: true, key: resolved.key, source: resolved.source };
  });

  ipcMain.handle('echoform:set-api-key', (_event, payload) => {
    const key = typeof payload?.key === 'string' ? payload.key.trim() : '';
    const remember = payload?.remember === true;

    if (key.length < 8 || key.length > 512) {
      return { ok: false, error: 'invalid-key' };
    }

    sessionKey = key;

    if (remember) {
      const stored = writeStoredKey(key);
      if (!stored) {
        return {
          ok: true,
          remembered: false,
          reason: 'encryption-unavailable',
          keySource: 'session',
        };
      }
    } else {
      clearStoredKey();
    }

    return { ok: true, remembered: remember, keySource: remember ? 'safeStorage' : 'session' };
  });

  ipcMain.handle('echoform:clear-api-key', () => {
    sessionKey = null;
    envKeyDisabled = true;
    clearStoredKey();
    return { ok: true };
  });

  ipcMain.handle('echoform:save-artwork', async (event, payload) => {
    const dataUrl = typeof payload?.dataUrl === 'string' ? payload.dataUrl : '';
    const suggested = typeof payload?.filename === 'string' ? payload.filename : 'echoform.png';

    if (!dataUrl.startsWith('data:image/png;base64,')) {
      return { ok: false, error: 'invalid-image' };
    }
    if (dataUrl.length > 25 * 1024 * 1024) {
      return { ok: false, error: 'image-too-large' };
    }

    const safeName =
      suggested
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80)
        .replace(/^-|-$/g, '') || 'echoform.png';
    const filename = safeName.toLowerCase().endsWith('.png') ? safeName : `${safeName}.png`;

    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    const result = await dialog.showSaveDialog(win, {
      title: 'Save your Echo Print',
      defaultPath: path.join(app.getPath('pictures'), filename),
      filters: [{ name: 'PNG image', extensions: ['png'] }],
    });

    if (result.canceled || !result.filePath) return { ok: false, canceled: true };

    try {
      const base64 = dataUrl.slice('data:image/png;base64,'.length);
      fs.writeFileSync(result.filePath, Buffer.from(base64, 'base64'));
      return { ok: true, path: result.filePath };
    } catch {
      return { ok: false, error: 'write-failed' };
    }
  });

  ipcMain.handle('echoform:open-external', async (_event, payload) => {
    const url = typeof payload?.url === 'string' ? payload.url : '';
    try {
      const parsed = new URL(url);
      const allowedHosts = new Set([
        'presagetech.com',
        'www.presagetech.com',
        'smartspectra.presagetech.com',
        'physiology.presagetech.com',
        'api.physiology.presagetech.com',
      ]);
      if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname)) {
        return { ok: false, error: 'blocked-url' };
      }
      await shell.openExternal(parsed.toString());
      return { ok: true };
    } catch {
      return { ok: false, error: 'invalid-url' };
    }
  });
}

// ── Window ────────────────────────────────────────────────────────────────────
function installPermissionPolicy() {
  // Camera only, video only, our page only. Do not grant microphone.
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const url = details?.requestingUrl || webContents?.getURL() || '';
    const mediaTypes = details?.mediaTypes || [];
    const cameraOnly = mediaTypes.length === 1 && mediaTypes[0] === 'video';
    callback(permission === 'media' && cameraOnly && isTrustedPage(url));
  });

  session.defaultSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin, details) => {
    return (
      permission === 'media' &&
      details?.mediaType === 'video' &&
      isTrustedPage(details.securityOrigin || requestingOrigin)
    );
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#06100e',
    show: false,
    title: APP_NAME,
    autoHideMenuBar: true,
    webPreferences: {
      // Our preload composes the official SmartSpectra bridge with the app's
      // narrow settings bridge. sandbox is off because the composing preload
      // needs to require the SDK's preload module; contextIsolation, no node
      // integration, a strict CSP, and local-only content remain in force.
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  bindSmartSpectraIpc(mainWindow);

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow?.webContents.getURL() || '';
    if (url !== current && !isTrustedPage(url)) event.preventDefault();
  });
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  if (DEV_URL) {
    mainWindow.loadURL(DEV_URL);
    if (DIAGNOSTICS) mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    if (DIAGNOSTICS) mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  installPermissionPolicy();
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
