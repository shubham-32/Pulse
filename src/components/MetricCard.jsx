// MetricCard (Task 21) — a single outcome metric rendered as a premium glass
// card for the Home Insights Report. Every value is passed in from state by the
// InsightsPage (nothing hardcoded here): a small stroke glyph, a large value
// (with optional unit), a dim label, and an optional tasteful trend hint.
//
// When a `progress` value (0–100) is supplied, the card swaps its glyph for a
// small circular progress ring — used for routine-adherence so the headline
// metric reads at a glance. Cards are flex-column + h-full so a grid of them
// stays equal-height and aligned regardless of content length.

import { motion } from 'framer-motion';

/** CircularProgress — compact SVG ring showing a 0–100 percentage. */
function CircularProgress({ value = 0 }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const size = 52;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <span className="relative inline-flex items-center justify-center" aria-hidden="true">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#22d3ee"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
          style={{ filter: 'drop-shadow(0 0 5px rgba(34,211,238,0.55))' }}
        />
      </svg>
      <span className="absolute font-sans text-[11px] font-bold tabular-nums text-accent-cyan">
        {Math.round(pct)}%
      </span>
    </span>
  );
}

/**
 * MetricCard
 *   glyph    — JSX for a small stroke icon (ignored when `progress` is set)
 *   value    — primary value (string or number, pre-formatted by the caller)
 *   unit     — optional small unit shown after the value (e.g. "kWh", "min")
 *   prefix   — optional small prefix shown before the value (e.g. "₹")
 *   label    — dim caption beneath the value
 *   trend    — optional tiny trend hint (e.g. "▲ 12% vs last week")
 *   trendUp  — tints the trend emerald (up) vs white/dim (flat) — default true
 *   progress — when provided (0–100) renders a circular ring instead of glyph
 */
export default function MetricCard({
  glyph,
  value,
  unit,
  prefix,
  label,
  trend,
  trendUp = true,
  progress,
}) {
  const showRing = typeof progress === 'number';

  return (
    <motion.div
      className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {/* Top row: glyph (or progress ring) + optional trend hint. */}
      <div className="flex items-start justify-between">
        {showRing ? (
          <CircularProgress value={progress} />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 text-accent-cyan">
            {glyph}
          </span>
        )}

        {trend && (
          <span
            className={
              'font-sans text-[11px] font-medium tabular-nums ' +
              (trendUp ? 'text-emerald-300/90' : 'text-white/40')
            }
          >
            {trend}
          </span>
        )}
      </div>

      {/* Value + label, pushed to the bottom so cards align in a grid. */}
      <div className="mt-6">
        <div className="flex items-baseline gap-1">
          {prefix && (
            <span className="font-sans text-xl font-semibold text-white/80">
              {prefix}
            </span>
          )}
          <span className="font-sans text-3xl font-extrabold tracking-tight tabular-nums text-white">
            {value}
          </span>
          {unit && (
            <span className="font-sans text-sm font-medium text-white/45">
              {unit}
            </span>
          )}
        </div>
        <p className="mt-1 font-sans text-[11px] uppercase tracking-wider text-white/40">
          {label}
        </p>
      </div>
    </motion.div>
  );
}
