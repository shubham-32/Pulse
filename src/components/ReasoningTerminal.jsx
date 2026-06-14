// ReasoningTerminal (Requirement 5) — a macOS-style terminal window streaming
// the AI's reasoning log, with classifyLogLine driving per-line accent styling.
// Extracted unchanged in the Task 9 refactor.

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AGENT_STYLE } from '../data/constants.js';

/**
 * classifyLogLine — derive accent styling for a reasoning entry by inspecting
 * its text prefix. Keeps the streaming console readable: action lines pop,
 * trigger lines are telemetry-cyan, context lines are dimmer, conversational
 * "Ask PULSE" lines (Task 14) use the AGENT_STYLE tokens, and anything else
 * (boot/system messages) stays neutral.
 */
export function classifyLogLine(text) {
  if (text.startsWith('You asked:')) {
    // The household member's typed query — neutral white accent.
    return AGENT_STYLE.You;
  }
  if (text.startsWith('PULSE:')) {
    // PULSE's conversational reply — cyan spark accent.
    return AGENT_STYLE.PULSE;
  }
  if (text.startsWith('Action Triggered')) {
    // Brighter green — the actual intervention.
    return { textClass: 'text-emerald-300', prefix: '✓' };
  }
  if (text.startsWith('Acoustic Trigger')) {
    // Telemetry cyan — a detection event.
    return { textClass: 'text-cyan-300', prefix: '»' };
  }
  if (text.startsWith('Visual Trigger')) {
    // Telemetry violet — a camera (video) detection event (sensor fusion).
    return { textClass: 'text-purple-300', prefix: '◉' };
  }
  if (text.startsWith('Context Check')) {
    // Dimmer — supporting context.
    return { textClass: 'text-cyan-100/50', prefix: '·' };
  }
  // System / boot lines.
  return { textClass: 'text-emerald-200/60', prefix: '$' };
}

/**
 * ReasoningTerminal
 *  - Top title bar: three control dots (red/yellow/green) + a dim title label.
 *  - Body: a dark, monospaced (Fira Code), auto-scrolling console. Each line
 *    shows a dim bracketed timestamp followed by accent-colored text; line
 *    types are differentiated by text prefix via classifyLogLine.
 *  - New lines stream in with a Framer Motion fade + upward slide, keyed by
 *    entry id through AnimatePresence.
 *  - The body auto-scrolls to the newest entry whenever `log` changes.
 *  - A blinking cursor line at the bottom sells the live-terminal feel.
 */
export default function ReasoningTerminal({ log }) {
  const scrollRef = useRef(null);

  // Auto-scroll to the newest entry whenever the log changes (Requirement 5.4).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [log]);

  return (
    <div className="mt-4 flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/50 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]">
      {/* macOS window chrome: control dots + dim title (Requirement 5.1). */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-3 py-2">
        <span className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#ff5f56' }} />
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#febc2e' }} />
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: '#28c840' }} />
        </span>
        <span className="flex-1 text-center font-mono text-[11px] text-white/35">
          bedrock-reasoning — zsh
        </span>
        {/* Spacer to keep the title visually centered against the dots. */}
        <span className="w-[52px]" aria-hidden="true" />
      </div>

      {/* Scrolling console body (Requirement 5.2). On lg+ the body relies on
          flex-1 within the bounded right pane and scrolls internally only when
          the log overflows — it no longer forces the pane (or page) taller. A
          small min-height keeps it readable when columns stack on mobile. */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto pulse-scroll px-3 py-3 font-mono text-[11px] leading-relaxed min-h-[260px] lg:min-h-0"
      >
        <AnimatePresence initial={false}>
          {log.map((entry) => {
            const { textClass, prefix } = classifyLogLine(entry.text);
            return (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="flex gap-2 whitespace-pre-wrap break-words py-0.5"
              >
                <span className="shrink-0 text-white/30">[{entry.timestamp}]</span>
                <span className={'shrink-0 ' + textClass}>{prefix}</span>
                <span className={textClass}>{entry.text}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Blinking cursor line for a live-terminal feel. */}
        <div className="flex items-center gap-2 py-0.5 text-emerald-300/80">
          <span className="text-emerald-400/70">$</span>
          <motion.span
            aria-hidden="true"
            className="inline-block h-3.5 w-2 bg-emerald-300/80"
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear', times: [0, 0.5, 0.5, 1] }}
          />
        </div>
      </div>
    </div>
  );
}
