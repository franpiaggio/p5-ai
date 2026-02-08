export function TypingIndicator() {
  return (
    <div className="bg-surface-raised text-text-muted mr-6 border border-border/20 px-3 py-2 rounded-lg text-xs">
      <div className="flex gap-1 py-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-[5px] h-[5px] rounded-full inline-block"
            style={{
              background: 'var(--color-text-muted)',
              animation: 'typing-bounce 1s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
