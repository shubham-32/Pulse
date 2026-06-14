// AutomationsPage (Task 24) — the Automations & Routines view. A dedicated
// place to review the routines PULSE has LEARNED (the household-rhythm windows)
// and the UPCOMING anticipations it will fire before you ask, with light
// controls. The Dashboard stays the hero; this page is a calm management view.
//
// Fully state-driven from the shared PULSE context: `timelineEvents` become the
// "Learned Routines" cards (each with an accessible enable/disable switch wired
// to `toggleRoutine`), and `anticipations` reuse the AnticipationPanel with
// Approve / Snooze wired to `approveAnticipation` / `snoozeAnticipation`.
//
// Lives inside AppLayout's routed content area, so it uses normal top-aligned
// page flow and scrolls naturally (min-h-full) — not a fixed-viewport layout.
//
// TODO: Wire API connection to Python/AWS Bedrock endpoint here
//   The learned routines and anticipations shown here are seeded locally; a
//   live backend would stream the learned schedule + foresight, and the
//   enable/disable + approve/snooze controls would persist through it.

import { motion } from 'framer-motion';
import { usePulse } from '../hooks/PulseProvider.jsx';
import { PanelHeading } from '../components/GlassPanel.jsx';
import AnticipationPanel from '../components/AnticipationPanel.jsx';
import { COLOR_MAP } from '../data/constants.js';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

/**
 * RoutineToggle — an accessible on/off switch (role="switch") for a learned
 * routine. Keyboard-focusable, exposes aria-checked + an aria-label, and the
 * knob slides via a transform-only transition.
 */
function RoutineToggle({ enabled, label, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${enabled ? 'Disable' : 'Enable'} routine: ${label}`}
      onClick={onToggle}
      className={
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border ' +
        'transition-colors duration-200 focus:outline-none focus-visible:ring-2 ' +
        'focus-visible:ring-accent-cyan/60 ' +
        (enabled
          ? 'border-accent-cyan/50 bg-accent-cyan/25'
          : 'border-white/15 bg-white/5')
      }
      style={enabled ? { boxShadow: '0 0 12px rgba(34,211,238,0.35)' } : undefined}
    >
      <motion.span
        aria-hidden="true"
        className={
          'inline-block h-4 w-4 rounded-full ' +
          (enabled ? 'bg-accent-cyan' : 'bg-white/50')
        }
        animate={{ x: enabled ? 22 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        style={enabled ? { boxShadow: '0 0 8px rgba(34,211,238,0.8)' } : undefined}
      />
    </button>
  );
}

/**
 * RoutineCard — one learned routine window. Shows the time, the label, a
 * color-accent (resolved via COLOR_MAP) and the enable/disable switch. When
 * disabled the card content reads visually dimmed.
 */
function RoutineCard({ routine, onToggle }) {
  const enabled = routine.enabled !== false;
  const tokens = COLOR_MAP[routine.color] || COLOR_MAP.cyan;

  return (
    <motion.li
      variants={fadeUp}
      className={
        'flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 ' +
        'backdrop-blur-xl transition-opacity duration-300 ' +
        (enabled ? 'opacity-100' : 'opacity-45')
      }
    >
      {/* Color-accent node mirroring the dashboard timeline. */}
      <span
        aria-hidden="true"
        className={'h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white/10 ' + tokens.dot}
        style={
          enabled
            ? { boxShadow: `0 0 10px 2px ${tokens.glow}, 0 0 20px 4px ${tokens.glow}55` }
            : undefined
        }
      />

      {/* Time + label. */}
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="font-sans text-lg font-bold tabular-nums text-white">
          {routine.time}
        </span>
        <span className="truncate font-sans text-xs text-white/50">
          {routine.label}
        </span>
      </div>

      {/* Status word + accessible switch. */}
      <span
        className={
          'font-sans text-[10px] font-semibold uppercase tracking-wider ' +
          (enabled ? 'text-accent-cyan/80' : 'text-white/35')
        }
      >
        {enabled ? 'On' : 'Off'}
      </span>
      <RoutineToggle
        enabled={enabled}
        label={routine.label}
        onToggle={() => onToggle(routine.id)}
      />
    </motion.li>
  );
}

export default function AutomationsPage() {
  const {
    timelineEvents,
    anticipations,
    appliances,
    toggleRoutine,
    approveAnticipation,
    snoozeAnticipation,
  } = usePulse();

  const routineCount = timelineEvents.length;
  const predictionCount = anticipations.length;

  return (
    <div className="min-h-full w-full p-4 md:p-8">
      <motion.div
        className="mx-auto w-full max-w-6xl"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
        }}
      >
        {/* Header — eyebrow, title, subtitle and a one-line summary. */}
        <motion.header variants={fadeUp}>
          <div className="flex items-center gap-3">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-cyan animate-pulse" />
            <PanelHeading>Automations &amp; Routines</PanelHeading>
          </div>

          <h1 className="mt-3 font-sans text-3xl font-extrabold tracking-tight text-white md:text-4xl">
            Automations &amp; Routines
          </h1>
          <p className="mt-3 max-w-2xl font-sans text-base leading-relaxed text-white/65 md:text-lg">
            Review the routines PULSE has learned from your household rhythm and
            the actions it expects to take next. Switch routines on or off, or
            approve what&apos;s coming up.
          </p>
          <p className="mt-3 font-sans text-sm font-medium text-white/45">
            <span className="tabular-nums text-white/70">{routineCount}</span>{' '}
            learned routines{' '}
            <span className="mx-1.5 text-white/25">·</span>
            <span className="tabular-nums text-white/70">{predictionCount}</span>{' '}
            upcoming predictions
          </p>
        </motion.header>

        {/* Two-column grid on large screens: routines on the left, predictions
            on the right. Stacks on smaller screens. Items top-aligned. */}
        <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          {/* Learned Routines. */}
          <motion.section variants={fadeUp}>
            <div className="flex items-center justify-between">
              <PanelHeading>Learned Routines</PanelHeading>
              <button
                type="button"
                disabled
                title="Coming soon"
                aria-disabled="true"
                className="cursor-not-allowed rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-white/35"
              >
                + Add routine
              </button>
            </div>

            {routineCount > 0 ? (
              <motion.ul
                className="mt-4 flex flex-col gap-3"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.06 } },
                }}
              >
                {timelineEvents.map((routine) => (
                  <RoutineCard
                    key={routine.id}
                    routine={routine}
                    onToggle={toggleRoutine}
                  />
                ))}
              </motion.ul>
            ) : (
              <p className="mt-4 font-sans text-xs leading-relaxed text-white/35">
                No learned routines yet. PULSE is still studying the household
                rhythm and will surface routines here as patterns emerge.
              </p>
            )}
          </motion.section>

          {/* Upcoming Predictions — reuse the dashboard's AnticipationPanel so
              Approve / Snooze behave identically here. */}
          <motion.div variants={fadeUp} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <AnticipationPanel
              anticipations={anticipations}
              appliances={appliances}
              onApprove={approveAnticipation}
              onSnooze={snoozeAnticipation}
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
