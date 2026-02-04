import { useAuthStore } from '../../store/authStore';

export function SaveButton() {
  const setIsSaveSketchOpen = useAuthStore((s) => s.setIsSaveSketchOpen);

  return (
    <button
      onClick={() => setIsSaveSketchOpen(true)}
      className="btn-icon text-text-muted/60 hover:text-info hover:bg-border/40"
      title="Save Sketch"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z"
        />
        <polyline
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          points="14 2 14 8 20 8"
        />
        <line
          strokeLinecap="round"
          strokeWidth={1.5}
          x1="12"
          y1="18"
          x2="12"
          y2="12"
        />
        <polyline
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          points="9 15 12 12 15 15"
        />
      </svg>
    </button>
  );
}
