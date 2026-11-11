import type { AppError } from '../state/types';
import type { DecodedMetrics, SignalEngine } from './engine';

type Listener = (...args: any[]) => void;

interface SdkLike {
  start(): Promise<void>;
  stop(): Promise<void>;
  destroy(): void;
  on(event: string, callback: Listener): unknown;
}

export interface LiveSessionOptions {
  apiKey: string;
  telemetry: boolean;
  expressions: boolean;
  onStream: (stream: MediaStream | null) => void;
  onStatus: (status: string) => void;
  onValidation: (hint: string, ok: boolean) => void;
  onError: (error: AppError) => void;
  onRunningChange: (running: boolean) => void;
}

const VALIDATION_COPY: Record<number, { hint: string; ok: boolean }> = {
  0: { hint: 'Measuring', ok: true },
  1: { hint: 'Sit in frame', ok: false },
  2: { hint: 'One person at a time', ok: false },
  3: { hint: 'Center your face', ok: false },
  4: { hint: 'Move a little closer or farther', ok: false },
  5: { hint: 'Add a little light', ok: false },
  6: { hint: 'Move away from harsh light', ok: false },
  7: { hint: 'Let your shoulders into frame', ok: false },
  10: { hint: 'Settling the camera', ok: false },
  11: { hint: 'The camera is running slowly', ok: false },
  12: { hint: 'Hold still for a moment', ok: false },
  13: { hint: 'Move back slightly', ok: false },
  14: { hint: 'Move closer', ok: false },
  15: { hint: 'Lower your face into frame', ok: false },
  16: { hint: 'Raise your face into frame', ok: false },
  17: { hint: 'Face the camera', ok: false },
};

function errorFromCode(code: unknown, message: unknown, retryable: unknown): AppError {
  const numeric = typeof code === 'number' ? code : Number(code);
  const detail = typeof message === 'string' ? message : undefined;
  const retry = Boolean(retryable);
  switch (numeric) {
    case 2:
      return {
        title: 'That key was not accepted',
        message:
          'Presage could not validate this API key. Check it, or explore the world with synthetic signals.',
        detail,
        code: numeric,
        retryable: retry,
      };
    case 3:
      return {
        title: 'The sensing pipeline could not start',
        message: 'The camera or signal configuration is unavailable. Try again or use synthetic signals.',
        detail,
        code: numeric,
        retryable: retry,
      };
    case 4:
      return {
        title: 'The Presage trial has no credits left',
        message: 'Live sensing needs available trial credits. You can still explore with synthetic signals.',
        detail,
        code: numeric,
        retryable: false,
      };
    case 5:
      return {
        title: 'Presage cannot be reached',
        message:
          'Live sensing needs a connection to validate the SDK key. Check your connection, or explore with synthetic signals.',
        detail,
        code: numeric,
        retryable: true,
      };
    case 6:
      return {
        title: 'Presage is having trouble',
        message: 'The sensing service returned an error. Wait a moment and try again.',
        detail,
        code: numeric,
        retryable: true,
      };
    case 7:
      return {
        title: 'No camera is available',
        message:
          'The camera may be in use by another app, or none is connected. Close other camera apps and try again.',
        detail,
        code: numeric,
        retryable: true,
      };
    case 8:
      return {
        title: 'The sensing pipeline stopped',
        message: 'The signal pipeline reported a failure. Reset the session and try again.',
        detail,
        code: numeric,
        retryable: true,
      };
    case 9:
      return {
        title: 'The camera stream could not be read',
        message: 'Try restarting the camera, or use synthetic signals.',
        detail,
        code: numeric,
        retryable: true,
      };
    case 10:
      return {
        title: 'The camera stream restarted',
        message: 'The stream timestamps jumped. Start a fresh session to recover.',
        detail,
        code: numeric,
        retryable: true,
      };
    case 11:
      return {
        title: 'The camera paused',
        message: 'The signal may recover on its own. If it does not, start a fresh session.',
        detail,
        code: numeric,
        retryable: true,
      };
    default:
      return {
        title: 'Live sensing stopped',
        message: 'Something interrupted the camera session. You can retry or use synthetic signals.',
        detail,
        code: Number.isFinite(numeric) ? numeric : undefined,
        retryable: retry,
      };
  }
}

export class LiveSession {
  private sdk: SdkLike | null = null;
  private engine: SignalEngine;
  private options: LiveSessionOptions;
  private disposed = false;
  private stream: MediaStream | null = null;
  private status = 'starting';

  constructor(engine: SignalEngine, options: LiveSessionOptions) {
    this.engine = engine;
    this.options = options;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  getStatus(): string {
    return this.status;
  }

  /**
   * Stop the SDK immediately after a terminal error. The native pipeline can
   * otherwise keep draining camera frames in an invalid state, which floods
   * the terminal with warnings and keeps the camera light on. destroy() is
   * synchronous and idempotent, so it is safe to call from an SDK callback.
   */
  private abort(): void {
    if (this.disposed) return;
    this.disposed = true;
    const sdk = this.sdk;
    this.sdk = null;
    if (this.stream) {
      this.stream = null;
      this.options.onStream(null);
    }
    if (!sdk) return;
    try {
      sdk.destroy();
    } catch {
      /* the SDK is already gone */
    }
  }

  private fail(error: AppError): void {
    this.engine.setErrorHint(error.title);
    this.options.onError(error);
    this.engine.setRunning(false);
    this.options.onRunningChange(false);
    this.status = 'Idle';
    this.options.onStatus('Idle');
    this.abort();
  }

  async start(): Promise<void> {
    if (this.disposed) return;
    const {
      SmartSpectraSDK,
      ProcessingStatus,
      breathingMetrics,
      cardioMetrics,
      faceMetrics,
    } = await import('@smartspectra/node-sdk/renderer');
    if (this.disposed) return;
    const { decodeMetrics } = await import('@smartspectra/node-sdk/messages');
    if (this.disposed) return;

    const requestedMetrics = [
      ...breathingMetrics,
      ...cardioMetrics,
      ...(this.options.expressions ? faceMetrics : []),
    ];

    const sdk = new SmartSpectraSDK({
      apiKey: this.options.apiKey,
      requestedMetrics,
      enableAccumulatedOutput: false,
      enableTelemetry: this.options.telemetry,
      sendTimeoutMs: 30_000,
    });
    this.sdk = sdk as unknown as SdkLike;

    sdk.on('streamAvailable', (stream: MediaStream) => {
      if (this.disposed) return;
      this.stream = stream;
      this.options.onStream(stream);
    });

    sdk.on('processingStatus', (status: number) => {
      if (this.disposed) return;
      const statusName =
        status === ProcessingStatus.kRunning
          ? 'Sensing'
          : status === ProcessingStatus.kStarting
            ? 'Starting'
            : status === ProcessingStatus.kStopping
              ? 'Stopping'
              : status === ProcessingStatus.kError
                ? 'Error'
                : status === ProcessingStatus.kIdle
                  ? 'Idle'
                  : 'Preparing';
      this.status = statusName;
      this.options.onStatus(statusName);
      const running = status === ProcessingStatus.kRunning;
      this.engine.setRunning(running);
      this.options.onRunningChange(running);
    });

    sdk.on('validationStatus', (code: number, _timestampUs: number, hint: string) => {
      if (this.disposed) return;
      const copy = VALIDATION_COPY[code] ?? { hint: hint || 'Adjusting', ok: false };
      this.engine.setValidation(copy.hint, copy.ok);
      this.options.onValidation(copy.hint, copy.ok);
    });

    sdk.on('metrics', (buf: Uint8Array) => {
      if (this.disposed) return;
      try {
        const decoded = decodeMetrics(buf) as unknown as DecodedMetrics;
        this.engine.ingestMetrics(decoded);
      } catch {
        // A malformed packet should not kill the session. The next packet will
        // arrive in a few milliseconds; the world keeps its last stable state.
      }
    });

    sdk.on('error', (code: number, message: string, retryable: boolean) => {
      if (this.disposed) return;
      this.fail(errorFromCode(code, message, retryable));
    });

    try {
      await sdk.start();
      // The SDK may have emitted a terminal error while start() was awaiting
      // an ack. In that case fail() already tore it down; do not resurrect
      // the running state.
      if (!this.disposed && this.sdk === (sdk as unknown as SdkLike)) {
        this.engine.setRunning(true);
      }
    } catch (err) {
      if (this.disposed) return;
      const maybe = err as { code?: number; message?: string; retryable?: boolean };
      const error = errorFromCode(maybe.code, maybe.message, maybe.retryable);
      this.fail(error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    const sdk = this.sdk;
    this.sdk = null;
    if (this.stream) {
      this.stream = null;
      this.options.onStream(null);
    }
    if (!sdk) return;
    try {
      await sdk.stop();
    } catch {
      /* already stopped */
    }
    try {
      sdk.destroy();
    } catch {
      /* already destroyed */
    }
  }
}
