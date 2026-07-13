import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { takeScreenshot, startRecording, stopRecording } from './P5Preview';
import { downloadDataUrl } from '../../utils/download';

function sanitizeFilename(title: string): string {
  return title.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').slice(0, 60) || 'sketch';
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PreviewControls() {
  const isRunning = useEditorStore((s) => s.isRunning);
  const runTrigger = useEditorStore((s) => s.runTrigger);
  const sketchTitle = useEditorStore((s) => s.sketchTitle);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  // Reset recording state when sketch restarts or stops
  useEffect(() => {
    if (recordingRef.current) {
      recordingRef.current = false;
      setIsRecording(false);
      setElapsed(0);
      clearTimer();
    }
  }, [runTrigger, isRunning, clearTimer]);

  const handleScreenshot = async () => {
    if (busy || isRecording) return;
    setBusy(true);
    try {
      const dataUrl = await takeScreenshot();
      if (dataUrl) {
        const name = sanitizeFilename(sketchTitle);
        downloadDataUrl(dataUrl, `${name}.png`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleToggleRecording = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!isRecording) {
        const ok = await startRecording();
        if (ok) {
          recordingRef.current = true;
          setIsRecording(true);
          setElapsed(0);
          timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
        }
      } else {
        clearTimer();
        const dataUrl = await stopRecording();
        recordingRef.current = false;
        setIsRecording(false);
        setElapsed(0);
        if (dataUrl) {
          const name = sanitizeFilename(sketchTitle);
          downloadDataUrl(dataUrl, `${name}.webm`);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  if (!isRunning) return null;

  return (
    <div className="flex items-center gap-1">
      {isRecording && (
        <div
          className="flex items-center gap-1 text-[10px] font-mono text-error/90 mr-0.5"
          style={{ animation: 'generating-pulse 1.5s ease-in-out infinite' }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-error" />
          <span>{formatTime(elapsed)}</span>
        </div>
      )}

      {/* Screenshot */}
      <button
        onClick={handleScreenshot}
        disabled={busy || isRecording}
        className="p-1 rounded hover:bg-border/40 text-text-muted/60 hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Screenshot"
        aria-label="Take screenshot"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
        </svg>
      </button>

      {/* Record / Stop */}
      <button
        onClick={handleToggleRecording}
        disabled={busy}
        className={`p-1 rounded hover:bg-border/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
          isRecording ? 'text-error hover:text-error/80' : 'text-error/70 hover:text-error'
        }`}
        title={isRecording ? 'Stop recording' : 'Record video'}
        aria-label={isRecording ? 'Stop recording' : 'Record video'}
      >
        {isRecording ? (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="7" />
          </svg>
        )}
      </button>
    </div>
  );
}
