// AnticipationTheater (Demo Director payoff) — a center-stage cinematic overlay
// that narrates each beat of a scripted scenario in big, legible, animated UI.
// It turns the otherwise-subtle state changes (a log line + a card flip) into an
// unmissable hero moment for the demo recording — especially the proactive
// sequence where PULSE acts BEFORE the trigger.
//
// It's purely presentational: it reads `scenarioBeat` from the shared controller
// (set by runScenario) and renders the current step. pointer-events-none so it
// never blocks the dashboard or the Demo Director beneath it.

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePulse } from '../hooks/PulseProvider.jsx';

const ACCENTS = {
  cyan: '#22d3ee',
  amber: '#f59e0b',
  purple: '#a855f7',
  green: '#34d399',
};

/** Cosmetic mm:ss countdown for the "anticipating" beat (visual flair). */
function Countdown({ from = 120 }) {
  const [s, setS] = useState(from);
  useEffect(() => {
    setS(from);
    const id = setInterval(() => setS((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [from]);
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return (
    <span className="tabular-nums">
      {mm}:{ss}
    </span>
  );
}

/** Four-step progress dots for the proactive journey. */
function StepDots({ step, accent }) {
  return (
    <div className="mt-3 flex items-center justify-center gap-1.5">
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: n === step ? 22 : 8,
            backgroundColor: n <= step ? accent : 'rgba(255,255,255,0.18)',
            boxShadow: n === step ? `0 0 10px ${accent}` : 'none',
          }}
        />
      ))}
    </div>
  );
}

export default function AnticipationTheater() {
  const { scenarioBeat } = usePulse();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-40 flex justify-center px-4">
      <AnimatePresence mode="wait">
        {scenarioBeat && (
          <motion.div
            key={scenarioBeat.id}
            initial={{ opacity: 0, y: -18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-xl overflow-hidden rounded-3xl border bg-black/70 px-7 py-5 text-center backdrop-blur-2xl"
            style={{
              borderColor: `${ACCENTS[scenarioBeat.accent] || ACCENTS.cyan}66`,
              boxShadow: `0 0 60px ${ACCENTS[scenarioBeat.accent] || ACCENTS.cyan}33, 0 20px 60px rgba(0,0,0,0.6)`,
            }}
          >
            {/* Tag */}
            <span
              className="font-sans text-[11px] font-semibold uppercase tracking-[0.35em]"
              style={{ color: ACCENTS[scenarioBeat.accent] || ACCENTS.cyan }}
            >
              {scenarioBeat.tag}
            </span>

            {/* Icon + Title */}
            <div className="mt-2.5 flex items-center justify-center gap-3">
              <motion.span
                aria-hidden="true"
                className="text-3xl"
                initial={{ scale: 0.6, rotate: -8 }}
                animate={{ scale: [0.6, 1.2, 1], rotate: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                {scenarioBeat.icon}
              </motion.span>
              <h2 className="font-sans text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                {scenarioBeat.title}
              </h2>
            </div>

            {/* Subtitle */}
            <p className="mx-auto mt-2 max-w-md font-sans text-sm leading-relaxed text-white/70 md:text-base">
              {scenarioBeat.subtitle}
            </p>

            {/* ETA countdown (anticipating beat only) */}
            {scenarioBeat.eta != null && (
              <div
                className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5"
                style={{
                  borderColor: `${ACCENTS[scenarioBeat.accent] || ACCENTS.cyan}55`,
                  backgroundColor: `${ACCENTS[scenarioBeat.accent] || ACCENTS.cyan}14`,
                }}
              >
                <motion.span
                  aria-hidden="true"
                  className="text-sm"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  ⏱
                </motion.span>
                <span
                  className="font-mono text-sm font-semibold"
                  style={{ color: ACCENTS[scenarioBeat.accent] || ACCENTS.cyan }}
                >
                  ETA <Countdown from={scenarioBeat.eta} />
                </span>
              </div>
            )}

            {/* Step dots (proactive journey only) */}
            {scenarioBeat.step != null && (
              <StepDots step={scenarioBeat.step} accent={ACCENTS[scenarioBeat.accent] || ACCENTS.cyan} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
