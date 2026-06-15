// HouseholdRhythmTimeline (Requirement 3) — vertical connector rule with one
// colored, glowing node per learned routine window. Every value is mapped from
// the `events` prop; node colors resolve through `colorMap` (COLOR_MAP).
// Extracted unchanged in the Task 9 refactor.

import { motion } from 'framer-motion';

/**
 * Each row shows: a color-matched glowing dot sitting on the vertical rule,
 * the prominent time (bold), and a smaller dimmed label. A subtle Framer Motion
 * stagger fades/slides the nodes in for polish.
 */
export default function HouseholdRhythmTimeline({ events, colorMap }) {
  return (
    <motion.ol
      className="relative mt-5 flex-1 pl-1"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
      }}
    >
      {/* Vertical connector line: anchored to the node-dot column (left-[7px]),
          spanning from the first node to the last. */}
      <span
        aria-hidden="true"
        className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-white/5 via-white/20 to-white/5"
      />

      {events.map((event) => {
        const tokens = colorMap[event.color] || colorMap.cyan;
        const learned = event.learned;
        const addedBy = event.addedBy;
        const highlight = learned || addedBy;
        return (
          <motion.li
            key={event.id}
            className="relative flex items-start gap-4 pb-7 last:pb-0"
            variants={{
              hidden: { opacity: 0, x: -12 },
              visible: { opacity: 1, x: 0 },
            }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* Glowing node on the connector rule. Learned / member-added
                routines pulse to draw the eye to what just appeared. */}
            <motion.span
              aria-hidden="true"
              className={
                'relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full ' +
                'ring-2 ring-white/10 ' +
                tokens.dot
              }
              style={{ boxShadow: `0 0 10px 2px ${tokens.glow}, 0 0 20px 4px ${tokens.glow}55` }}
              animate={
                highlight
                  ? { scale: [1, 1.35, 1], boxShadow: [`0 0 10px 2px ${tokens.glow}`, `0 0 18px 6px ${tokens.glow}`, `0 0 10px 2px ${tokens.glow}`] }
                  : {}
              }
              transition={highlight ? { duration: 1.4, repeat: Infinity } : {}}
            />

            {/* Time + label */}
            <div className="flex min-w-0 flex-col leading-tight">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-sans text-lg font-bold tabular-nums text-white">
                  {event.time}
                </span>
                {learned && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-full border border-fuchsia-400/40 bg-fuchsia-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-fuchsia-300"
                    style={{ boxShadow: '0 0 10px rgba(232,121,249,0.4)' }}
                  >
                    New · Learned
                  </motion.span>
                )}
                {!learned && addedBy && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-cyan-300"
                  >
                    Added · {addedBy}
                  </motion.span>
                )}
              </div>
              <span className="font-sans text-xs text-white/45">
                {event.label}
              </span>
              {learned && event.confidence != null && (
                <span className="mt-0.5 font-mono text-[9px] text-fuchsia-300/70">
                  pattern confidence {Math.round(event.confidence * 100)}%
                </span>
              )}
            </div>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}
