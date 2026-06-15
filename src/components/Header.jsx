// Header — "PULSE" wordmark top-left + a subtle ambient listening indicator
// line, driven by the isListening flag (Requirements 2.1, 1.x). Extracted
// unchanged in the Task 9 refactor.

export default function Header({ isListening = true }) {
  return (
    <header className="shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="font-sans text-3xl md:text-4xl font-extrabold uppercase tracking-widest text-white">
          PULSE
        </h1>
        <span
          aria-hidden="true"
          className={
            'inline-block h-3.5 w-3.5 md:h-4 md:w-4 rounded-full ' +
            (isListening ? 'bg-accent-cyan animate-pulse' : 'bg-white/30')
          }
          style={
            isListening
              ? { boxShadow: '0 0 12px 2px #22d3ee, 0 0 22px 6px #22d3ee66' }
              : undefined
          }
        />
      </div>
      <div className="mt-1 font-sans text-xs md:text-sm tracking-wide text-white/50">
        {isListening ? 'Listening to Household Sounds...' : 'Listening Paused'}
      </div>
    </header>
  );
}
