// ECHOFORM — preload
// Composes the official SmartSpectra preload bridge (window.__smartspectraBridge)
// with the app's narrow, typed settings bridge (window.echoform).
//
// The renderer never receives Node APIs, ipcRenderer, or the raw key file path.

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Must run before the renderer constructs its SmartSpectraSDK.
require('@smartspectra/node-sdk/preload');

contextBridge.exposeInMainWorld('echoform', {
  getBootstrap: () => ipcRenderer.invoke('echoform:get-bootstrap'),
  getApiKey: () => ipcRenderer.invoke('echoform:get-api-key'),
  setApiKey: (key, remember) =>
    ipcRenderer.invoke('echoform:set-api-key', { key: String(key ?? ''), remember: !!remember }),
  clearApiKey: () => ipcRenderer.invoke('echoform:clear-api-key'),
  saveArtwork: (dataUrl, filename) =>
    ipcRenderer.invoke('echoform:save-artwork', {
      dataUrl: String(dataUrl ?? ''),
      filename: String(filename ?? 'echoform.png'),
    }),
  openExternal: (url) => ipcRenderer.invoke('echoform:open-external', { url: String(url ?? '') }),
});
