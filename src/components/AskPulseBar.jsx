// AskPulseBar ("Ask PULSE" conversational bar, Task 14 / Requirements 5.3, 7.2)
// — a polished glass pill that lets a household member type a natural-language
// command ("Turn on the geyser") or question ("Why did the fan switch on?").
// Submitting delegates to the `onAsk` handler from usePulseController, which
// runs the mocked intent matcher and streams an explainable answer into the
// Reasoning Engine terminal that sits directly above this bar.
//
// On-brand: obsidian glass + cyan accent, real <form> semantics, an aria-label,
// a focus-visible ring, a rotating example placeholder, and a Send button that
// is disabled until there is something to ask.

import { useState, useEffect, useRef } from 'react';

// Rotating example prompts — hint at the three intent categories the matcher
// understands: commands, explainability ("why"), and presence questions.
const PLACEHOLDERS = [
  'Turn on the geyser before I wake',
  'Why did the fan switch on?',
  'Is anyone home?',
  'Start the kitchen exhaust',
  'Turn off the balcony lights',
];

/** SparkIcon — a small AI/spark glyph signalling the conversational assistant. */
function SparkIcon({ className = '' }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
      <path d="M18.5 14.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z" />
    </svg>
  );
}

/** SendIcon — paper-plane glyph for the submit button. */
function SendIcon({ className = '' }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </svg>
  );
}

export default function AskPulseBar({ onAsk }) {
  const [value, setValue] = useState('');
  const [phIndex, setPhIndex] = useState(0);
  const inputRef = useRef(null);

  // Rotate the placeholder while the field is empty, so the bar advertises the
  // kinds of things PULSE can answer. Pauses once the user starts typing.
  useEffect(() => {
    if (value) return undefined;
    const t = setInterval(() => {
      setPhIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(t);
  }, [value]);

  const trimmed = value.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!trimmed) return;
    onAsk?.(trimmed);
    setValue('');
    // Keep focus so the user can fire off another command immediately.
    inputRef.current?.focus();
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Ask PULSE command and query bar"
      className="mt-4 shrink-0"
    >
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-xl transition-colors duration-200 focus-within:border-accent-cyan/40 focus-within:bg-white/[0.07]">
        {/* AI/spark accent icon */}
        <span className="shrink-0 text-accent-cyan/80" aria-hidden="true">
          <SparkIcon />
        </span>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={PLACEHOLDERS[phIndex]}
          aria-label="Ask PULSE a question or give a command"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent font-sans text-sm text-white/90 placeholder-white/35 focus:outline-none"
        />

        <button
          type="submit"
          disabled={!trimmed}
          aria-label="Send to PULSE"
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-accent-cyan transition-colors duration-200 hover:bg-accent-cyan/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30"
        >
          <SendIcon />
          <span>Send</span>
        </button>
      </div>
    </form>
  );
}
