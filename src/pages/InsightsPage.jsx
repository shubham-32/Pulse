// InsightsPage (Task 21) — the Home Insights Report. A clean, customer-centric
// summary that leads with OUTCOMES (money saved, comfort, peace of mind) in
// plain language, backed by a few tasteful metrics and a color-coded alerts
// feed. Everything is state-driven from the shared PULSE context — `energy`,
// `notifications`, `appliances`, `members`, `homeLabel` — so nothing here is
// hardcoded except tasteful trend hints and section copy.
//
// This page lives inside AppLayout's routed content area (the shell provides
// the ambient background + nav rail), so it uses normal top-aligned page flow
// and scrolls naturally — it is NOT a fixed-viewport locked layout.
//
// TODO: Wire API connection to Python/AWS Bedrock endpoint here
//   These insight metrics (savings, energy, water-motor runtime, power-cut
//   handling, routine adherence) and the alerts feed will be computed by the
//   analytics / Bedrock backend and streamed in, replacing the seed `energy`
//   and `notifications` snapshot.

import { motion } from 'framer-motion';
import { usePulse } from '../hooks/PulseProvider.jsx';
import { PanelHeading } from '../components/GlassPanel.jsx';
import MetricCard from '../components/MetricCard.jsx';

// --- Small stroke glyphs (currentColor, ~22px) used by the metric cards. ----
// Kept inline + flat to match the existing ApplianceIcon house style.
const svg = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const RupeeGlyph = () => (
  <svg {...svg}>
    <path d="M7 5h10M7 9h10M16 5c0 4-3 5-6 5h-1l6 6" />
  </svg>
);
const BoltGlyph = () => (
  <svg {...svg}>
    <path d="M13 3 5 13h5l-1 8 8-10h-5l1-8Z" />
  </svg>
);
const DropGlyph = () => (
  <svg {...svg}>
    <path d="M12 3c3.5 4.5 6 7 6 10a6 6 0 0 1-12 0c0-3 2.5-5.5 6-10Z" />
  </svg>
);
const ShieldGlyph = () => (
  <svg {...svg}>
    <path d="M12 3 5 6v5c0 4.2 3 7.3 7 9 4-1.7 7-4.8 7-9V6l-7-3Z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

// --- Severity → presentation map for the alerts feed. -----------------------
// info = neutral cyan, warning = amber, critical = rose. Each entry supplies
// the dot color, border/background tints and a short label badge.
const SEVERITY_STYLE = {
  info: {
    label: 'Info',
    dot: 'bg-accent-cyan',
    dotGlow: '0 0 8px 1px rgba(34,211,238,0.7)',
    chip: 'border-accent-cyan/30 bg-accent-cyan/5 text-accent-cyan/90',
    border: 'border-accent-cyan/15',
  },
  warning: {
    label: 'Warning',
    dot: 'bg-amber-400',
    dotGlow: '0 0 8px 1px rgba(251,191,36,0.7)',
    chip: 'border-amber-400/30 bg-amber-400/5 text-amber-300/90',
    border: 'border-amber-400/15',
  },
  critical: {
    label: 'Critical',
    dot: 'bg-rose-500',
    dotGlow: '0 0 8px 1px rgba(244,63,94,0.7)',
    chip: 'border-rose-500/30 bg-rose-500/5 text-rose-300/90',
    border: 'border-rose-500/20',
  },
};

/** formatINR — Indian-style grouped number (e.g. 1240 → "1,240"). */
function formatINR(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString('en-IN');
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export default function InsightsPage() {
  const { energy, notifications, appliances, members, homeLabel } = usePulse();

  const {
    savedRupees,
    todayKwh,
    waterMotorMinutes,
    powerCutsHandled,
    routineAdherencePct,
  } = energy;

  const membersHome = members.filter((m) => m.presence === 'home').length;

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
        {/* Header: eyebrow, title + household, and a warm plain-language hero
            line that leads with the outcome (money saved this week). */}
        <motion.header variants={fadeUp}>
          <div className="flex items-center gap-3">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-cyan animate-pulse" />
            <PanelHeading>Home Insights</PanelHeading>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="font-sans text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              {homeLabel}
            </h1>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-wider text-white/45">
              This week
            </span>
          </div>

          <p className="mt-4 max-w-2xl font-sans text-lg leading-relaxed text-white/70 md:text-xl">
            PULSE saved you{' '}
            <span className="font-bold text-accent-cyan">
              ₹{formatINR(savedRupees)}
            </span>{' '}
            this week — quietly handling power cuts, trimming wasted energy and
            keeping the home comfortable, so you didn&apos;t have to think about it.
          </p>
        </motion.header>

        {/* Metric cards — a single aligned, equal-height row of outcomes. */}
        <motion.section
          className="mt-8 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
        >
          <MetricCard
            glyph={<RupeeGlyph />}
            prefix="₹"
            value={formatINR(savedRupees)}
            label="Money saved"
            trend="▲ 12% vs last week"
          />
          <MetricCard
            glyph={<BoltGlyph />}
            value={todayKwh}
            unit="kWh"
            label="Energy today"
            trend="▼ 8% vs avg"
          />
          <MetricCard
            glyph={<DropGlyph />}
            value={waterMotorMinutes}
            unit="min"
            label="Water motor runtime"
            trend="On schedule"
            trendUp={false}
          />
          <MetricCard
            glyph={<ShieldGlyph />}
            value={powerCutsHandled}
            label="Power-cuts handled"
            trend="No disruption"
          />
          <MetricCard
            progress={routineAdherencePct}
            value={`${routineAdherencePct}%`}
            label="Routine adherence"
            trend="▲ 4% vs last week"
          />
        </motion.section>

        {/* Highlights & Alerts — color-coded notifications feed. */}
        <motion.section className="mt-10" variants={fadeUp}>
          <div className="flex items-center justify-between">
            <PanelHeading>Highlights &amp; Alerts</PanelHeading>
            <span className="font-sans text-[11px] font-medium tabular-nums text-white/40">
              {notifications.length} this week
            </span>
          </div>

          <motion.ul
            className="mt-4 flex flex-col gap-3"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.06 } },
            }}
          >
            {notifications.map((n) => {
              const style = SEVERITY_STYLE[n.severity] || SEVERITY_STYLE.info;
              return (
                <motion.li
                  key={n.id}
                  variants={fadeUp}
                  className={
                    'flex items-start gap-4 rounded-2xl border bg-white/5 p-4 backdrop-blur-xl ' +
                    style.border
                  }
                >
                  <span
                    aria-hidden="true"
                    className={'mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ' + style.dot}
                    style={{ boxShadow: style.dotGlow }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-sm leading-relaxed text-white/85">
                      {n.text}
                    </p>
                    <p className="mt-1 font-mono text-[11px] tracking-wide text-white/35">
                      {n.timestamp}
                    </p>
                  </div>
                  <span
                    className={
                      'shrink-0 rounded-full border px-2.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider ' +
                      style.chip
                    }
                  >
                    {style.label}
                  </span>
                </motion.li>
              );
            })}
          </motion.ul>
        </motion.section>

        {/* Tiny footer stats — kept minimal so the report stays uncluttered. */}
        <motion.div
          variants={fadeUp}
          className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/5 pt-5 font-sans text-xs text-white/45"
        >
          <span>
            <span className="font-semibold tabular-nums text-white/70">
              {appliances.length}
            </span>{' '}
            devices managed
          </span>
          <span className="h-3 w-px bg-white/10" aria-hidden="true" />
          <span>
            <span className="font-semibold tabular-nums text-white/70">
              {membersHome}
            </span>{' '}
            members home
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
