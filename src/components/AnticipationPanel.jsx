// AnticipationPanel ("PULSE Predicts", Task 13 / Requirement 7.2) — the demo
// centerpiece that proves PULSE *anticipates* rather than merely responds. It
// surfaces UPCOMING anticipated AI actions before they happen, each as a
// compact glass card with the prediction, the target appliance, an ETA chip, a
// confidence indicator, and Approve / Snooze controls.
//
// Fully state-driven: it renders whatever `anticipations` it receives and
// resolves `targetApplianceId` against the live `appliances` list for the
// device name + icon. Approving/snoozing is delegated to the handlers and the
// card animates out via AnimatePresence.

import { motion, AnimatePresence } from 'framer-motion';
import { PanelHeading } from './GlassPanel.jsx';
import { ApplianceIcon } from './InterventionShelf.jsx';

/**
 * ForesightIcon — a subtle "looking ahead" glyph (an eye over a forward arc)
 * used beside the heading to signal anticipation/foresight.
 */
function ForesightIcon({ className = '' }) {
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
      <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

/**
 * ConfidenceBar — a small horizontal meter for model confidence (0–1) plus the
 * rounded percentage. Width is the only animated dimension.
 */
function ConfidenceBar({ confidence }) {
  const pct = Math.max(0, Math.min(100, Math.round((Number(confidence) || 0) * 100)));
  return (
    <div className="flex items-center gap-2" title={`Confidence ${pct}%`}>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
        <motion.span
          className="block h-full rounded-full bg-accent-cyan/80"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ boxShadow: '0 0 8px #22d3ee66' }}
        />
      </span>
      <span className="font-sans text-[11px] font-semibold tabular-nums text-white/70">
        {pct}%
      </span>
    </div>
  );
}

/**
 * AnticipationCard — one predicted upcoming action. Resolves its target
 * appliance for the name + icon, shows the prediction text + ETA chip +
 * confidence, and exposes Approve / Snooze buttons (real <button>s with
 * hover/focus states + aria-labels).
 */
function AnticipationCard({ anticipation, appliance, onApprove, onSnooze }) {
  const { id, predictionText, etaText, confidence } = anticipation;
  const applianceName = appliance?.name || 'Unassigned device';
  const applianceIcon = appliance?.icon;

  return (
    <motion.li
      layout
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.96, transition: { duration: 0.3, ease: 'easeIn' } }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {/* Row 1 — icon + prediction text on its own full-width line so it wraps
          naturally across 2–3+ words per line (never crowded by the ETA chip). */}
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-accent-cyan/80">
          <ApplianceIcon icon={applianceIcon} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[13px] font-medium leading-relaxed text-white/90 break-words">
            {predictionText}
          </p>
          <p className="mt-1 font-sans text-[10px] uppercase tracking-wide text-white/40 break-words">
            {applianceName}
          </p>
        </div>
      </div>

      {/* Row 2 — ETA chip + confidence, given their own line for breathing room. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="shrink-0 rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-2.5 py-1 font-sans text-[10px] font-semibold tabular-nums text-accent-cyan">
          {etaText}
        </span>
        <ConfidenceBar confidence={confidence} />
      </div>

      {/* Row 3 — Approve / Snooze actions on their own row. */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onApprove?.(id)}
          aria-label={`Approve prediction: ${predictionText}`}
          className="rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-accent-cyan transition-colors duration-200 hover:bg-accent-cyan/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => onSnooze?.(id)}
          aria-label={`Snooze prediction: ${predictionText}`}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-white/55 transition-colors duration-200 hover:bg-white/10 hover:text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          Snooze
        </button>
      </div>
    </motion.li>
  );
}

/**
 * AnticipationPanel — the "PULSE Predicts" section. Heading carries a foresight
 * icon and a small animated pulse/scan accent; the body lists anticipation
 * cards (or a calm empty state once they have all been actioned).
 */
export default function AnticipationPanel({ anticipations = [], appliances = [], onApprove, onSnooze }) {
  const applianceById = (id) => appliances.find((a) => a.id === id);

  return (
    <section className="flex flex-col">
      {/* Heading row: foresight icon + title + animated pulse/scan accent. */}
      <div className="flex items-center gap-2">
        <span className="text-accent-cyan/80">
          <ForesightIcon />
        </span>
        <PanelHeading>PULSE Predicts</PanelHeading>
        <motion.span
          aria-hidden="true"
          className="ml-1 h-1.5 w-1.5 rounded-full bg-accent-cyan"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.15, 0.85] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ boxShadow: '0 0 8px 1px #22d3ee, 0 0 14px 3px #22d3ee66' }}
        />
      </div>

      {/* Anticipation cards (enter/exit animated) or a calm empty state. */}
      {anticipations.length > 0 ? (
        <motion.ul layout className="mt-4 flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {anticipations.map((anticipation) => (
              <AnticipationCard
                key={anticipation.id}
                anticipation={anticipation}
                appliance={applianceById(anticipation.targetApplianceId)}
                onApprove={onApprove}
                onSnooze={onSnooze}
              />
            ))}
          </AnimatePresence>
        </motion.ul>
      ) : (
        <p className="mt-4 font-sans text-xs leading-relaxed text-white/35">
          No upcoming predictions right now. PULSE is watching the household
          rhythm and will surface anticipated actions here.
        </p>
      )}
    </section>
  );
}
