import type { BootstrapInfo } from '../state/types';

const bridge = typeof window !== 'undefined' ? window.echoform : undefined;

export const isElectron = Boolean(bridge);

export async function getBootstrap(): Promise<BootstrapInfo> {
  if (!bridge) {
    return {
      platform: 'browser',
      arch: 'unknown',
      appVersion: 'preview',
      sdkVersion: 'unavailable',
      packaged: false,
      safeStorage: false,
      hasKey: false,
      keySource: null,
    };
  }
  const info = await bridge.getBootstrap();
  return {
    platform: info.platform,
    arch: info.arch,
    appVersion: info.appVersion,
    sdkVersion: info.sdkVersion,
    packaged: info.packaged,
    safeStorage: info.safeStorage,
    hasKey: info.hasKey,
    keySource: info.keySource,
  };
}

export async function getApiKey(): Promise<string | null> {
  if (!bridge) return null;
  try {
    const result = await bridge.getApiKey();
    return result.ok ? result.key : null;
  } catch {
    return null;
  }
}

export async function setApiKey(
  key: string,
  remember: boolean,
): Promise<{ ok: boolean; remembered: boolean; reason?: string }> {
  if (!bridge) {
    return { ok: true, remembered: false, reason: 'browser-preview' };
  }
  try {
    const result = await bridge.setApiKey(key, remember);
    return {
      ok: result.ok,
      remembered: Boolean(result.remembered),
      reason: result.reason,
    };
  } catch {
    return { ok: false, remembered: false, reason: 'ipc-failed' };
  }
}

export async function clearApiKey(): Promise<void> {
  if (!bridge) return;
  try {
    await bridge.clearApiKey();
  } catch {
    /* ignore */
  }
}

export async function saveArtwork(
  dataUrl: string,
  filename: string,
): Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }> {
  if (bridge) {
    try {
      return await bridge.saveArtwork(dataUrl, filename);
    } catch {
      return { ok: false, error: 'ipc-failed' };
    }
  }

  // Browser preview fallback.
  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return { ok: true };
  } catch {
    return { ok: false, error: 'download-failed' };
  }
}

export async function openExternal(url: string): Promise<void> {
  if (bridge) {
    try {
      await bridge.openExternal(url);
      return;
    } catch {
      /* fall through */
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
