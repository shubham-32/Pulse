// ScenarioDirector (Demo Director, Option A) — a small, collapsible floating
// control used to film clean, choreographed demo scenarios. It is NOT part of
// the product surface; it's a presenter aid. Collapsed it's a tiny corner pill
// (so it can stay out of frame); expanded it offers one-click scenarios that
// play deterministically through the real controller.
//
// The star scenario is "Proactive" — PULSE predicts and pre-arms the exhaust
// BEFORE the cooker whistle fires, visibly demonstrating "anticipates, not
// responds". The other buttons fire single reactive triggers. The "Auto-live"
// toggle resumes the ambient random drivers between takes.

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePulse } from '../hooks/PulseProvider.jsx';

const SCENARIOS = [
  { key: 'proactive', label: 'Proactive Demo', hint: 'Predicts + pre-arms before the trigger', star: true },
  { key: 'cooker', label: 'Cooker Whistle', hint: 'Kitchen → exhaust' },
  { key: 'tap', label: 'Running Tap', hint: 'Bathroom → geyser' },
  { key: 'balcony', label: 'Balcony Motion', hint: 'Presence → lights' },
];

export default function ScenarioDirector() {
  const { runScenario, isAutoDemo, toggleAutoDemo } = usePulse();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-64 rounded-2xl border border-white/10 bg-black/70 p-3 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.55)]"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-white/70">
                Demo Director
              </span>
              <span className="font-mono text-[10px] text-white/35">presenter</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {SCENARIOS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => runScenario(s.key)}
                  aria-label={`Run scenario: ${s.label}`}
                  className={
                    'group flex flex-col rounded-xl border px-3 py-2 text-left transition-colors duration-150 ' +
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60 ' +
                    (s.star
                      ? 'border-accent-cyan/40 bg-accent-cyan/10 hover:bg-accent-cyan/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10')
                  }
                >
                  <span
                    className={
                      'flex items-center gap-1.5 font-sans text-xs font-semibold ' +
                      (s.star ? 'text-accent-cyan' : 'text-white/85')
                    }
                  >
                    {s.star && <span aria-hidden="true">✦</span>}
                    {s.label}
                  </span>
                  <span className="font-sans text-[10px] text-white/40">{s.hint}</span>
                </button>
              ))}
            </div>

            {/* Auto-live toggle — resume ambient random drivers between takes. */}
            <button
              type="button"
              role="switch"
              aria-checked={isAutoDemo}
              onClick={toggleAutoDemo}
              className="mt-2.5 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition-colors duration-150 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60"
            >
              <span className="font-sans text-[11px] font-medium text-white/70">
                Auto-live feed
              </span>
              <span
                className={
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors ' +
                  (isAutoDemo ? 'bg-accent-cyan/40' : 'bg-white/15')
                }
              >
                <span
                  className={
                    'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ' +
                    (isAutoDemo ? 'translate-x-4' : 'translate-x-1')
                  }
                />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed pill — tiny so it can stay out of the filmed frame. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Hide Demo Director' : 'Show Demo Director'}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3.5 py-2 font-sans text-[11px] font-semibold text-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-colors hover:bg-black/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60"
      >
        <span
          aria-hidden="true"
          className={'h-2 w-2 rounded-full ' + (isAutoDemo ? 'bg-accent-cyan animate-pulse' : 'bg-amber-400')}
          style={{ boxShadow: isAutoDemo ? '0 0 8px #22d3ee' : '0 0 8px #f59e0b' }}
        />
        Demo
      </button>
    </div>
  );
}
