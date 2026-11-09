import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Play,
  Trash2,
} from 'lucide-react';
import { paintEchoPrint } from '../artwork/EchoPrint';
import { formatDate, formatDuration } from '../lib/format';
import type { SessionSummary } from '../state/types';
import { ConfirmDialog } from './common';

interface Props {
  echoes: SessionSummary[];
  onOpen: (echo: SessionSummary) => void;
  onDownload: (echo: SessionSummary) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  onBack: () => void;
  onEnter: () => void;
}

function EchoThumb({ summary }: { summary: SessionSummary }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    let cancelled = false;
    const draw = () => {
      if (!cancelled) paintEchoPrint(node, summary, 420, 525, true);
    };
    draw();
    document.fonts?.ready.then(draw).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [summary]);

  return <canvas ref={canvas} className="echo-thumb" aria-hidden="true" />;
}

export function Archive({
  echoes,
  onOpen,
  onDownload,
  onDelete,
  onDeleteAll,
  onBack,
  onEnter,
}: Props) {
  const [deleteTarget, setDeleteTarget] = useState<SessionSummary | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);

  return (
    <section className="screen archive" aria-labelledby="archive-title">
      <header className="topbar">
        <button type="button" className="text-button back-button" onClick={onBack}>
          <ArrowLeft size={15} strokeWidth={1.4} aria-hidden="true" />
          Threshold
        </button>
        <button type="button" className="text-button" onClick={onEnter}>
          Enter the field
          <ArrowRight size={14} strokeWidth={1.4} aria-hidden="true" />
        </button>
      </header>

      <main className="archive-main">
        <div className="archive-heading">
          <div>
            <p className="eyebrow">The shelf</p>
            <h1 id="archive-title" className="scene-title archive-title">
              Echoes
            </h1>
          </div>
          <p className="archive-intro">
            Small worlds kept on this device. Each holds a seed, a handful of aggregate numbers, and
            the shape of a session — no video, no raw signals.
          </p>
        </div>

        {echoes.length === 0 ? (
          <div className="archive-empty">
            <div className="empty-orbit" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <h2>Nothing kept, yet.</h2>
            <p>A world exists waiting. Stay for a moment and keep an echo of it.</p>
            <button type="button" className="primary-button" onClick={onEnter}>
              Enter the field
              <ArrowRight size={15} strokeWidth={1.4} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <>
            <div className="archive-count">
              {String(echoes.length).padStart(2, '0')} {echoes.length === 1 ? 'world kept' : 'worlds kept'}
            </div>
            <div className="echo-grid">
              {echoes.map((echo) => (
                <article className="echo-card" key={echo.id}>
                  <button
                    type="button"
                    className="echo-thumb-button"
                    onClick={() => onOpen(echo)}
                    aria-label={`Open echo from ${formatDate(echo.createdAt)}`}
                  >
                    <EchoThumb summary={echo} />
                    <span className="echo-thumb-shade" aria-hidden="true" />
                    <span className="echo-thumb-play" aria-hidden="true">
                      <Play size={17} strokeWidth={1.4} />
                      Replay
                    </span>
                  </button>
                  <div className="echo-card-meta">
                    <div className="echo-card-text">
                      <p className="echo-card-date">{formatDate(echo.createdAt)}</p>
                      <p className="echo-card-stats">
                        {formatDuration(echo.durationSec)}
                        {echo.avgBreath != null && ` · ${echo.avgBreath.toFixed(1)} /min`}
                        {echo.avgPulse != null && ` · ${Math.round(echo.avgPulse)} bpm`}
                        {echo.source === 'synthetic' && ' · SYNTHETIC'}
                      </p>
                    </div>
                    <div className="echo-card-actions">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => onDownload(echo)}
                        aria-label="Download artwork"
                        title="Download artwork"
                      >
                        <Download size={15} strokeWidth={1.4} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setDeleteTarget(echo)}
                        aria-label="Delete echo"
                        title="Delete echo"
                      >
                        <Trash2 size={15} strokeWidth={1.4} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>

      {echoes.length > 0 && (
        <footer className="archive-foot">
          <span>Everything here lives on this device.</span>
          <button type="button" className="link-button danger-link" onClick={() => setDeleteAllOpen(true)}>
            Delete all local data
          </button>
        </footer>
      )}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete this echo?"
        body="The saved summary and its artwork preview will be removed from this device. This cannot be undone."
        confirmLabel="Delete echo"
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
      <ConfirmDialog
        open={deleteAllOpen}
        title="Delete everything?"
        body="This removes every saved echo, all preferences, and any stored Presage key from this device. It cannot be undone."
        confirmLabel="Delete everything"
        tone="danger"
        onCancel={() => setDeleteAllOpen(false)}
        onConfirm={() => {
          setDeleteAllOpen(false);
          onDeleteAll();
        }}
      />
    </section>
  );
}
