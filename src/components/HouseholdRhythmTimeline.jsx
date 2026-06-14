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
            {/* Glowing node on the connector rule */}
            <span
              aria-hidden="true"
              className={
                'relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full ' +
                'ring-2 ring-white/10 ' +
                tokens.dot
              }
              style={{ boxShadow: `0 0 10px 2px ${tokens.glow}, 0 0 20px 4px ${tokens.glow}55` }}
            />

            {/* Time + label */}
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="font-sans text-lg font-bold tabular-nums text-white">
                {event.time}
              </span>
              <span className="font-sans text-xs text-white/45">
                {event.label}
              </span>
            </div>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}
