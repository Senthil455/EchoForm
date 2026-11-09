export {};

export interface EchoformBridge {
  getBootstrap(): Promise<{
    ok: boolean;
    platform: string;
    arch: string;
    appVersion: string;
    sdkVersion: string;
    packaged: boolean;
    safeStorage: boolean;
    hasKey: boolean;
    keySource: string | null;
  }>;
  getApiKey(): Promise<{ ok: boolean; key: string | null; source: string | null }>;
  setApiKey(
    key: string,
    remember: boolean,
  ): Promise<{
    ok: boolean;
    remembered?: boolean;
    reason?: string;
    keySource?: string;
    error?: string;
  }>;
  clearApiKey(): Promise<{ ok: boolean }>;
  saveArtwork(
    dataUrl: string,
    filename: string,
  ): Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>;
  openExternal(url: string): Promise<{ ok: boolean; error?: string }>;
}

declare global {
  interface Window {
    echoform?: EchoformBridge;
    __smartspectraBridge?: {
      diagnostics: boolean;
      attach(): void;
      postMessage(message: unknown): void;
      onMessage(callback: (message: unknown) => void): void;
      close(): void;
    };
  }
}
