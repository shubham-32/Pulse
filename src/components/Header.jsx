// Header — "PULSE" wordmark top-left + a subtle ambient listening indicator
// line, driven by the isListening flag (Requirements 2.1, 1.x). Extracted
// unchanged in the Task 9 refactor.

export default function Header({ isListening = true }) {
  return (
    <header className="shrink-0">
      <h1 className="font-sans text-3xl md:text-4xl font-extrabold uppercase tracking-widest text-white">
        PULSE
      </h1>
      <div className="mt-1 flex items-center gap-2 text-xs md:text-sm text-white/50">
        <span
          className={
            'inline-block h-2 w-2 rounded-full ' +
            (isListening ? 'bg-accent-cyan animate-pulse' : 'bg-white/30')
          }
        />
        <span className="font-sans tracking-wide">
          {isListening ? 'Listening to Household Sounds...' : 'Listening Paused'}
        </span>
      </div>
    </header>
  );
}
