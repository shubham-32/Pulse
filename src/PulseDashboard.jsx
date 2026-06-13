// PulseDashboard — theme foundation + layout shell (Task 2) + state & event pipeline (Task 3).
// This file owns the full ambient dashboard. Presentational pieces are kept as
// small local sub-components per the design's single-component approach.
// Later tasks fill the placeholder regions:
//   Task 3 — state + handleAcousticTrigger event pipeline (DONE: state + controller + demo driver)
//   Task 4 — Household Rhythm Timeline nodes (consumes timelineEvents + COLOR_MAP)
//   Task 5 — Acoustic Pulse sphere + dual waveform (consumes waveAmplitude)
//   Task 6 — Reasoning terminal log streaming (consumes reasoningLog)
//   Task 7 — Intervention card internals (consumes appliances)

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ---------------------------------------------------------------------------
// Module-level constants (no per-render allocation; shared by children later).
// ---------------------------------------------------------------------------

/**
 * COLOR_MAP — semantic color key -> render tokens.
 * `dot` is a Tailwind background class for timeline nodes / status indicators.
 * `glow` is a hex used for box-shadow / SVG glow on nodes + connectors.
 */
const COLOR_MAP = {
  pink:   { dot: 'bg-pink-500',   glow: '#ec4899' },
  orange: { dot: 'bg-amber-500',  glow: '#f59e0b' },
  cyan:   { dot: 'bg-cyan-400',   glow: '#22d3ee' },
  yellow: { dot: 'bg-yellow-400', glow: '#eab308' },
  purple: { dot: 'bg-purple-500', glow: '#a855f7' },
};

/**
 * PROFILE_TO_APPLIANCE — maps a detected acoustic profile to a target
 * appliance id in `appliances` state.
 */
const PROFILE_TO_APPLIANCE = {
  cooker_whistle: 'exhaust', // pressure cooker -> kitchen exhaust
  mixer_grinder:  'exhaust',
  tap_running:    'geyser',
  footsteps:      'balcony',
  fan_hum:        'fan',
};

/**
 * ACTION_TEXT — per-profile presentation strings used to build the reasoning
 * burst. `label` is the human profile name, `context` is the contextual check
 * line, `action` is the action line, and `applianceState` is the new card
 * `state` string applied to the resolved appliance.
 */
const ACTION_TEXT = {
  cooker_whistle: {
    label: 'Pressure Cooker Whistle',
    context: 'Dinner Prep Window + High Humidity',
    action: 'Kitchen Exhaust Fan ON',
    applianceState: 'Exhaust ON — Clearing Steam',
  },
  mixer_grinder: {
    label: 'Mixer Grinder',
    context: 'Kitchen Activity + Rising Particulates',
    action: 'Kitchen Exhaust Fan ON',
    applianceState: 'Exhaust ON — Venting',
  },
  tap_running: {
    label: 'Running Tap',
    context: 'Water Usage Detected + Cold Inlet',
    action: 'Water Geyser Pre-Heat',
    applianceState: 'Geyser Pre-Heating',
  },
  footsteps: {
    label: 'Footsteps',
    context: 'Evening Presence Near Balcony',
    action: 'Balcony Lights ON',
    applianceState: 'Lights ON — Presence',
  },
  fan_hum: {
    label: 'Fan Hum',
    context: 'Rising Room Temperature',
    action: 'Living Room Fan Speed Adjust',
    applianceState: 'Fan Auto-Adjusted',
  },
};

// Wave behaviour tuning.
const WAVE_BASELINE = 1;
const WAVE_SPIKE = 2.4;
const WAVE_DECAY_MS = 2500;
const LOG_CAP = 30;
const DEMO_INTERVAL_MS = 4000;

// Rotating sample profiles for the demo driver.
const DEMO_PROFILES = ['cooker_whistle', 'mixer_grinder', 'tap_running', 'footsteps'];

/** Format the current clock as HH:MM:SS. */
function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

let logSeq = 0;
/** Monotonic unique id for log entries (avoids key collisions on rapid bursts). */
function nextLogId() {
  logSeq += 1;
  return `log-${Date.now()}-${logSeq}`;
}

// ---------------------------------------------------------------------------
// Presentational sub-components (Task 2 shell; internals filled in Tasks 4–7).
// ---------------------------------------------------------------------------

/**
 * AmbientBackground
 * Full-viewport fixed obsidian canvas (#05060B) with a warm, low-opacity
 * copper/amber radial glow anchored in the bottom-right quadrant.
 */
function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 bg-obsidian"
      style={{
        background:
          'radial-gradient(60% 60% at 85% 88%, rgba(217, 119, 60, 0.18) 0%, rgba(217, 119, 60, 0.06) 35%, rgba(5, 6, 11, 0) 70%), #05060B',
      }}
    />
  );
}

/**
 * GlassPanel
 * Reusable glassmorphism wrapper. Accepts className + children.
 */
function GlassPanel({ className = '', children }) {
  return (
    <div
      className={
        'backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl ' +
        'shadow-[0_8px_40px_rgba(0,0,0,0.45)] ' +
        className
      }
    >
      {children}
    </div>
  );
}

/**
 * Header
 * "PULSE" wordmark top-left + a subtle ambient listening indicator line.
 * Driven by isListening state (Task 3).
 */
function Header({ isListening = true }) {
  return (
    <header className="shrink-0">
      <h1 className="font-sans text-3xl md:text-4xl font-extrabold uppercase tracking-widest text-white">
        PULSE
      </h1>
      <div className="mt-1 flex items-center gap-2 text-xs md:text-sm text-white/50">
        <span
          className={
            'inline-block h-2 w-2 rounded-full ' +
            (isListening ? 'bg-accent-cyan animate-pulse' : 'bg-white/30')
          }
        />
        <span className="font-sans tracking-wide">
          {isListening ? 'Listening to Household Sounds...' : 'Listening Paused'}
        </span>
      </div>
    </header>
  );
}

/**
 * PanelHeading — small section title used inside placeholder panels.
 */
function PanelHeading({ children }) {
  return (
    <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-white/70">
      {children}
    </h2>
  );
}

/**
 * HouseholdRhythmTimeline (Requirement 3)
 * Renders a vertical connector rule down the left edge with one colored,
 * glowing node per learned routine window. Every value is mapped from the
 * `events` prop (timelineEvents state) — nothing is hardcoded in JSX. Node
 * colors are resolved through `colorMap` (COLOR_MAP) so dots + glow stay
 * consistent with the rest of the dashboard.
 *
 * Each row shows: a color-matched glowing dot sitting on the vertical rule,
 * the prominent time (bold), and a smaller dimmed label.
 *
 * A subtle Framer Motion stagger fades/slides the nodes in for polish.
 */
function HouseholdRhythmTimeline({ events, colorMap }) {
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

// ---------------------------------------------------------------------------
// Acoustic Pulse geometry (Task 5 / Requirement 4).
// Precomputed once at module load so the SVG waveform never recomputes paths
// on every React render. Framer Motion drives all motion declaratively.
// ---------------------------------------------------------------------------

// SVG canvas is a 400x400 viewBox. Center is (200,200). The left half hosts
// flowing sine waves; the right half hosts spiked spectrum bars.
const WAVE_VIEWBOX = 400;
const WAVE_MID = WAVE_VIEWBOX / 2; // 200

/**
 * buildSinePath — generate an SVG path string for one sine wave across the
 * left half of the canvas. All keyframes share the same point count so Framer
 * Motion can morph the `d` attribute smoothly between them.
 */
function buildSinePath(phase, amplitude, frequency, midY = WAVE_MID) {
  const xStart = 34;
  const xEnd = 196;
  const points = 48;
  const width = xEnd - xStart;
  let d = '';
  for (let i = 0; i <= points; i += 1) {
    const t = i / points;
    const x = xStart + width * t;
    const y = midY + amplitude * Math.sin(frequency * t * Math.PI * 2 + phase);
    d += i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d;
}

// Three flowing sine lines (cyan -> purple via a shared gradient stroke). Each
// has a distinct amplitude/frequency and a set of phase keyframes that loop
// seamlessly (phase 0 == phase 2π) to suggest continuous wave motion.
const SINE_WAVES = [
  { id: 'sine-a', amp: 28, freq: 1.5, width: 2.5, opacity: 0.9 },
  { id: 'sine-b', amp: 18, freq: 2.3, width: 2.0, opacity: 0.65 },
  { id: 'sine-c', amp: 34, freq: 1.1, width: 2.5, opacity: 0.5 },
].map((w, i) => {
  const phases = [0, Math.PI * 0.66, Math.PI * 1.33, Math.PI * 2];
  return {
    ...w,
    duration: 6 + i,
    frames: phases.map((p) => buildSinePath(p, w.amp, w.freq)),
  };
});

// Right-half spectrum bars (orange/gold). Each bar has a base height plus a
// stagger delay so the cluster jitters like a live frequency spectrum.
const SPIKE_BARS = Array.from({ length: 18 }, (_, i) => {
  const x = 214 + i * 9;
  const base = 26 + (Math.sin(i * 1.3) * 0.5 + 0.5) * 78;
  return { id: `bar-${i}`, x, base, delay: (i % 6) * 0.13 };
});

// Concentric platform rings beneath the sphere (glowing floor it rests on).
const PLATFORM_RINGS = [
  { id: 'ring-0', w: '74%', h: '48px', glow: 34, delay: 0 },
  { id: 'ring-1', w: '52%', h: '32px', glow: 26, delay: 0.5 },
  { id: 'ring-2', w: '32%', h: '20px', glow: 18, delay: 1 },
];

/**
 * AcousticPulse (Requirement 4)
 * The visual centerpiece. Renders a large transparent glowing glass sphere
 * with a living dual-waveform inside and glowing platform rings beneath.
 *
 * Motion strategy (all declarative — no per-frame React state):
 *  - Sphere: gentle continuous breathing scale + an outer bloom glow loop.
 *  - Waveform group: scaleY bound to `waveAmplitude` via a spring, so acoustic
 *    triggers (amplitude 1 -> 2.4 -> 1) make both halves visibly spike/settle.
 *  - Left sine paths: morph their `d` between phase keyframes (continuous flow).
 *  - Right spectrum bars: staggered scaleY/opacity jitter, looping forever.
 *  - Platform rings: staggered opacity/scale pulse.
 */
function AcousticPulse({ waveAmplitude }) {
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center">
      {/* Section subtitle (keeps the centerpiece visually labeled). */}
      <div className="pointer-events-none text-center">
        <p className="font-sans text-[10px] font-medium uppercase tracking-[0.4em] text-accent-cyan/70">
          Real-Time Acoustic Sense
        </p>
        <p className="mt-1 font-sans text-base font-semibold tracking-wide text-white/90">
          The Acoustic Pulse
        </p>
      </div>

      {/* Sphere stack — bloom + glass sphere + waveform. */}
      <div
        className="relative mt-6 flex items-center justify-center"
        style={{ width: 'min(78%, 420px)', aspectRatio: '1 / 1' }}
      >
        {/* Soft outer bloom (separate layer so it can pulse independently). */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(34,211,238,0.20) 0%, rgba(168,85,247,0.12) 45%, rgba(5,6,11,0) 72%)',
            filter: 'blur(32px)',
          }}
          animate={{ opacity: [0.45, 0.8, 0.45], scale: [0.94, 1.06, 0.94] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* The glass sphere: layered radial gradients, highlight ring, blur,
            inner glow + outer bloom shadow, with a slow breathing scale. */}
        <motion.div
          className="relative h-full w-full overflow-hidden rounded-full border border-white/15 backdrop-blur-md"
          style={{
            background:
              'radial-gradient(circle at 32% 26%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 26%, rgba(255,255,255,0) 52%),' +
              'radial-gradient(circle at 50% 62%, rgba(34,211,238,0.12) 0%, rgba(34,211,238,0) 62%),' +
              'radial-gradient(circle at 64% 52%, rgba(168,85,247,0.12) 0%, rgba(168,85,247,0) 66%)',
            boxShadow:
              'inset 0 1px 30px rgba(255,255,255,0.14), inset 0 -16px 48px rgba(168,85,247,0.12),' +
              '0 0 70px rgba(34,211,238,0.20), 0 0 140px rgba(168,85,247,0.14)',
          }}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Thin top highlight where light catches the rim. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.10)',
              background:
                'radial-gradient(circle at 50% 6%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 32%)',
            }}
          />

          {/* Dual-waveform SVG, centered within the sphere. The whole group's
              vertical scale is bound to waveAmplitude with a spring so spikes
              grow then settle smoothly. */}
          <svg
            viewBox={`0 0 ${WAVE_VIEWBOX} ${WAVE_VIEWBOX}`}
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="pulseSineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              <filter id="pulseWaveGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="pulseBarGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <motion.g
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              animate={{ scaleY: waveAmplitude }}
              transition={{ type: 'spring', stiffness: 120, damping: 14 }}
            >
              {/* Faint center divider between the two halves. */}
              <line
                x1={WAVE_MID}
                y1="118"
                x2={WAVE_MID}
                y2="282"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />

              {/* Left half: flowing cyan -> purple sine waves. */}
              {SINE_WAVES.map((w) => (
                <motion.path
                  key={w.id}
                  fill="none"
                  stroke="url(#pulseSineGrad)"
                  strokeWidth={w.width}
                  strokeLinecap="round"
                  opacity={w.opacity}
                  filter="url(#pulseWaveGlow)"
                  animate={{ d: w.frames }}
                  transition={{ duration: w.duration, repeat: Infinity, ease: 'easeInOut' }}
                />
              ))}

              {/* Right half: spiked orange/gold spectrum bars. */}
              {SPIKE_BARS.map((b) => (
                <motion.rect
                  key={b.id}
                  x={b.x}
                  y={WAVE_MID - b.base / 2}
                  width="4"
                  height={b.base}
                  rx="2"
                  fill="#f59e0b"
                  filter="url(#pulseBarGlow)"
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                  animate={{
                    scaleY: [0.32, 1, 0.5, 0.82, 0.32],
                    opacity: [0.55, 1, 0.7, 0.9, 0.55],
                  }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: b.delay,
                  }}
                />
              ))}
            </motion.g>
          </svg>
        </motion.div>
      </div>

      {/* Glowing concentric platform rings — the floor the sphere rests on. */}
      <div
        className="relative mt-2 flex items-center justify-center"
        style={{ width: 'min(78%, 420px)', height: '72px' }}
      >
        {PLATFORM_RINGS.map((r) => (
          <motion.div
            key={r.id}
            aria-hidden="true"
            className="absolute rounded-[50%] border"
            style={{
              width: r.w,
              height: r.h,
              borderColor: 'rgba(34,211,238,0.28)',
              filter: 'blur(2px)',
              boxShadow: `0 0 ${r.glow}px rgba(34,211,238,0.28), inset 0 0 ${r.glow / 2}px rgba(168,85,247,0.18)`,
            }}
            animate={{ opacity: [0.2, 0.6, 0.2], scale: [0.96, 1.05, 0.96] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: r.delay }}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reasoning Terminal (Task 6 / Requirement 5).
// ---------------------------------------------------------------------------

/**
 * classifyLogLine — derive accent styling for a reasoning entry by inspecting
 * its text prefix. Keeps the streaming console readable: action lines pop,
 * trigger lines are telemetry-cyan, context lines are dimmer, and anything
 * else (boot/system messages) stays neutral.
 */
function classifyLogLine(text) {
  if (text.startsWith('Action Triggered')) {
    // Brighter green — the actual intervention.
    return { textClass: 'text-emerald-300', prefix: '✓' };
  }
  if (text.startsWith('Acoustic Trigger')) {
    // Telemetry cyan — a detection event.
    return { textClass: 'text-cyan-300', prefix: '»' };
  }
  if (text.startsWith('Context Check')) {
    // Dimmer — supporting context.
    return { textClass: 'text-cyan-100/50', prefix: '·' };
  }
  // System / boot lines.
  return { textClass: 'text-emerald-200/60', prefix: '$' };
}

/**
 * ReasoningTerminal (Requirement 5)
 * A macOS-style terminal window streaming the AI's reasoning log.
 *
 *  - Top title bar: three control dots (red/yellow/green) + a dim title label.
 *  - Body: a dark, monospaced (Fira Code), auto-scrolling console. Each line
 *    shows a dim bracketed timestamp followed by accent-colored text; line
 *    types are differentiated by text prefix (Acoustic Trigger / Context Check
 *    / Action Triggered) via classifyLogLine.
 *  - New lines stream in with a Framer Motion fade + upward slide, keyed by
 *    entry id through AnimatePresence.
 *  - The body auto-scrolls to the newest entry whenever `log` changes.
 *  - A blinking cursor line at the bottom sells the live-terminal feel.
 */
function ReasoningTerminal({ log }) {
  const scrollRef = useRef(null);

  // Auto-scroll to the newest entry whenever the log changes (Requirement 5.4).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [log]);

  return (
    <div className="mt-4 flex-1 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/50 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]">
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

      {/* Scrolling console body (Requirement 5.2). */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 font-mono text-[11px] leading-relaxed min-h-[180px] lg:min-h-0"
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

// ---------------------------------------------------------------------------
// Intervention Cards (Task 7 / Requirement 6).
// ---------------------------------------------------------------------------

/**
 * ApplianceIcon — maps an appliance `icon` key to a clean, flat, stroke-based
 * inline SVG (~24px, currentColor). Kept simple and tasteful so the cards read
 * as premium hardware controls rather than clip-art.
 *
 *   fan    → kitchen exhaust (circular vent + blades)
 *   breeze → living-room fan (hub + sweeping blade + wind lines)
 *   heater → water geyser (tank with heat waves rising)
 *   bulb   → light bulb (glass + base filament)
 *
 * Color is inherited via `currentColor`, so the parent card controls tint
 * (accent when active, dim white when idle).
 */
function ApplianceIcon({ icon, className = '' }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true,
  };

  switch (icon) {
    case 'fan':
      // Kitchen exhaust — round vent housing with three swept blades + hub.
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="1.6" />
          <path d="M12 10.4c1.8-3.2 0-6 -1.6-6.4 -1.4-.3-1 2.4 1.6 6.4Z" />
          <path d="M13.6 12c3.2 1.8 6 0 6.4-1.6 .3-1.4-2.4-1-6.4 1.6Z" />
          <path d="M10.4 12c-3.2-1.8-6 0-6.4 1.6 -.3 1.4 2.4 1 6.4-1.6Z" />
        </svg>
      );
    case 'breeze':
      // Living-room fan — hub with a sweeping blade and trailing wind lines.
      return (
        <svg {...common}>
          <circle cx="9" cy="12" r="1.4" />
          <path d="M9 10.6c0-3 1.4-5.2 3.4-5.2 1.6 0 2.2 2 .6 3.4-1.2 1-2.6 1.4-4 1.8Z" />
          <path d="M10.4 12c2.6.6 5 2.2 5 4.4 0 1.6-2 2.2-3.4.6-1-1.2-1.2-3.2-1.6-5Z" />
          <path d="M16.5 8.5h3.5M15.5 11h4M16.5 13.5h3" />
        </svg>
      );
    case 'heater':
      // Water geyser — vertical tank with rising heat waves.
      return (
        <svg {...common}>
          <rect x="6.5" y="7" width="11" height="13" rx="3" />
          <path d="M9 10.5h6" />
          <circle cx="12" cy="15.5" r="2" />
          <path d="M9.5 4.5c0 .9-1 1.1-1 2M14.5 4.5c0 .9-1 1.1-1 2" />
        </svg>
      );
    case 'bulb':
      // Light bulb — glass dome over a screw base with a filament hint.
      return (
        <svg {...common}>
          <path d="M9 16.5a5 5 0 1 1 6 0c-.6.5-1 1.1-1 1.9v.6h-4v-.6c0-.8-.4-1.4-1-1.9Z" />
          <path d="M10 21h4M10.5 19.5h3" />
          <path d="M11 13.5l1-2 1 2" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

/**
 * ApplianceCard (Requirement 6.1–6.4)
 * A single AI-managed appliance, rendered inside a glass card:
 *  - flat stroke icon at top (accent-tinted when active, dim white when idle),
 *  - the device NAME in uppercase bold,
 *  - a `STATE: <state>` indicator line (dim; brighter when active),
 *  - a corner status dot (glowing cyan/green when active, dim grey when idle).
 *
 * When the appliance transitions to active, the card briefly flashes/glows:
 * Framer Motion animates the border color + boxShadow based on `active`, and a
 * short scale "pop" is driven by re-mounting the motion ring via a `key` that
 * flips with the active state.
 */
function ApplianceCard({ appliance }) {
  const { name, icon, state, active } = appliance;

  // Accent glow used for the active state (cyan from the shared palette).
  const ACTIVE_GLOW = '#22d3ee';

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border backdrop-blur-xl bg-white/5 p-4 flex flex-col gap-2 min-h-[112px]"
      initial={false}
      animate={{
        borderColor: active ? 'rgba(34,211,238,0.55)' : 'rgba(255,255,255,0.10)',
        boxShadow: active
          ? `0 0 22px ${ACTIVE_GLOW}44, inset 0 0 18px ${ACTIVE_GLOW}22, 0 8px 40px rgba(0,0,0,0.45)`
          : '0 8px 40px rgba(0,0,0,0.45)',
      }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Brief scale "pop" highlight on each active transition. Re-mounting on
          the active key restarts the keyframe so every activation flashes. */}
      <motion.span
        key={active ? 'on' : 'off'}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl"
        initial={active ? { opacity: 0.6, scale: 0.96 } : false}
        animate={active ? { opacity: 0, scale: 1.04 } : { opacity: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{ boxShadow: `inset 0 0 0 1.5px ${ACTIVE_GLOW}, 0 0 26px ${ACTIVE_GLOW}55` }}
      />

      {/* Top row: flat icon + corner status dot. */}
      <div className="flex items-start justify-between">
        <span
          className={
            'transition-colors duration-500 ' +
            (active ? 'text-accent-cyan' : 'text-white/40')
          }
        >
          <ApplianceIcon icon={icon} />
        </span>

        {/* Status indicator dot — glowing cyan/green when active, dim when idle. */}
        <motion.span
          aria-hidden="true"
          className={
            'mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ' +
            (active ? 'bg-emerald-400' : 'bg-white/20')
          }
          animate={
            active
              ? { boxShadow: `0 0 8px 1px ${ACTIVE_GLOW}, 0 0 14px 3px ${ACTIVE_GLOW}66` }
              : { boxShadow: '0 0 0 0 rgba(0,0,0,0)' }
          }
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Device name — uppercase bold, wide tracking. */}
      <span className="font-sans text-xs font-bold uppercase tracking-wide text-white/90">
        {name}
      </span>

      {/* STATE indicator — dim by default, brighter when active. */}
      <span
        className={
          'font-sans text-[11px] leading-snug transition-colors duration-500 ' +
          (active ? 'text-accent-cyan/90' : 'text-white/40')
        }
      >
        STATE: {state}
      </span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// PulseDashboard — owns all state + the single event pipeline controller.
// ---------------------------------------------------------------------------

export default function PulseDashboard() {
  // --- State (all displayed data lives here; nothing hardcoded in render) ---

  // Learned routine windows (Requirement 3) — color is a semantic key resolved
  // via COLOR_MAP by the timeline (Task 4).
  const [timelineEvents] = useState([
    { id: 'pooja',    time: '06:30', label: 'Morning Pooja Window',   color: 'pink'   },
    { id: 'powercut', time: '09:15', label: 'Smart Power-Cut Delay',  color: 'orange' },
    { id: 'water',    time: '13:45', label: 'Intelligent Water Fill', color: 'cyan'   },
    { id: 'kitchen',  time: '17:30', label: 'Evening Kitchen Prep',   color: 'yellow' },
  ]);

  // AI-managed appliances (Requirement 6). Mutated by handleAcousticTrigger.
  const [appliances, setAppliances] = useState([
    { id: 'exhaust', name: 'Kitchen Exhaust', icon: 'fan',    state: 'Managed by AI', active: false },
    { id: 'fan',     name: 'Living Room Fan', icon: 'breeze', state: 'Managed by AI', active: false },
    { id: 'geyser',  name: 'Water Geyser',    icon: 'heater', state: 'Managed by AI', active: false },
    { id: 'balcony', name: 'Balcony Lights',  icon: 'bulb',   state: 'Managed by AI', active: false },
  ]);

  // Terminal telemetry (Requirement 5). Seeded with boot entries.
  const [reasoningLog, setReasoningLog] = useState(() => [
    { id: nextLogId(), timestamp: formatTimestamp(), text: 'PULSE Edge-ML core online. Acoustic Sensor Fusion engaged.' },
    { id: nextLogId(), timestamp: formatTimestamp(), text: 'Listening to household soundscape...' },
  ]);

  // Acoustic sphere energy (Requirement 4.5). Baseline 1; spikes on trigger.
  const [waveAmplitude, setWaveAmplitude] = useState(WAVE_BASELINE);

  // Ambient idle indicator under the header.
  const [isListening] = useState(true);

  // Holds pending amplitude-decay timers so we can clear them on unmount.
  const decayTimersRef = useRef([]);

  // --- The single event pipeline controller (Requirement 7.1, 7.2) ----------

  const handleAcousticTrigger = useCallback((audioProfile, confidenceScore) => {
    const timestamp = formatTimestamp();

    // Clamp the confidence score to 0–100 for display (design edge case).
    const score = Math.max(0, Math.min(100, Math.round(Number(confidenceScore) || 0)));

    // Resolve presentation strings; unknown profiles fall back gracefully.
    const profileInfo = ACTION_TEXT[audioProfile];
    const profileLabel = profileInfo?.label || audioProfile || 'Unknown Source';
    const contextText = profileInfo?.context || 'Unrecognized Acoustic Signature';
    const targetId = PROFILE_TO_APPLIANCE[audioProfile];

    // TODO: Wire API connection to Python/AWS Bedrock endpoint here
    // (1) Spike the acoustic sphere amplitude, then ease it back to baseline.
    setWaveAmplitude(WAVE_SPIKE);
    const decayTimer = setTimeout(() => {
      setWaveAmplitude(WAVE_BASELINE);
    }, WAVE_DECAY_MS);
    decayTimersRef.current.push(decayTimer);

    // (2) Append a structured reasoning burst (Acoustic Trigger -> Context -> Action).
    const burst = [
      { id: nextLogId(), timestamp, text: `Acoustic Trigger: ${profileLabel} Detected (${score}% Match)` },
      { id: nextLogId(), timestamp, text: `Context Check: ${contextText}` },
    ];
    if (targetId && profileInfo) {
      burst.push({ id: nextLogId(), timestamp, text: `Action Triggered: ${profileInfo.action}` });
    } else {
      burst.push({ id: nextLogId(), timestamp, text: 'Action Triggered: None — No appliance mapped' });
    }

    setReasoningLog((prev) => {
      const merged = [...prev, ...burst];
      // Cap stored entries to avoid unbounded growth (Requirement 5.4).
      return merged.length > LOG_CAP ? merged.slice(merged.length - LOG_CAP) : merged;
    });

    // (3) Update the mapped appliance (Requirement 6.4). Unknown profile -> skip safely.
    if (targetId) {
      setAppliances((prev) =>
        prev.map((a) =>
          a.id === targetId
            ? { ...a, active: true, state: profileInfo?.applianceState || 'AI Intervention Active' }
            : a
        )
      );
    }
  }, []);

  // --- Demo driver (Requirement 7.6): periodically invoke the controller ----

  useEffect(() => {
    let tick = 0;
    const interval = setInterval(() => {
      const profile = DEMO_PROFILES[tick % DEMO_PROFILES.length];
      tick += 1;
      // Vary confidence a little so the terminal feels live.
      const score = 85 + Math.floor(Math.random() * 14); // 85–98
      handleAcousticTrigger(profile, score);
    }, DEMO_INTERVAL_MS);

    // TODO: Wire API connection to Python/AWS Bedrock endpoint here
    // Replace the demo interval above with a live subscription, e.g.:
    //   const ws = new WebSocket(BEDROCK_STREAM_URL);
    //   ws.onmessage = (e) => {
    //     const { profile, score } = JSON.parse(e.data);
    //     handleAcousticTrigger(profile, score);
    //   };
    //   return () => ws.close();

    // Capture the ref array at effect-setup time for cleanup.
    const decayTimers = decayTimersRef.current;
    return () => {
      clearInterval(interval);
      // Clear any pending amplitude-decay timers so unmount is clean.
      decayTimers.forEach(clearTimeout);
      decayTimers.length = 0;
    };
  }, [handleAcousticTrigger]);

  // --- Render: layout shell (Task 2) now wired with state/props -------------

  return (
    <>
      <AmbientBackground />

      <div className="relative min-h-screen w-full flex flex-col gap-4 p-4 md:p-6 lg:p-8">
        {/* Header pinned top-left */}
        <Header isListening={isListening} />

        {/* Main row: three columns (timeline ~22% / pulse flex-1 / terminal ~26%) */}
        <main className="flex-1 flex flex-col lg:flex-row gap-4 md:gap-6 min-h-0">
          {/* Left: Household Rhythm Timeline (~22%) */}
          <GlassPanel className="w-full lg:w-[22%] p-5 flex flex-col">
            <PanelHeading>Household Rhythm Timeline</PanelHeading>
            <HouseholdRhythmTimeline events={timelineEvents} colorMap={COLOR_MAP} />
          </GlassPanel>

          {/* Center: The Acoustic Pulse (flex-1) — the visual centerpiece.
              AcousticPulse renders its own labeled subtitle, glass sphere,
              dual waveform (amplitude-bound), and platform rings. */}
          <GlassPanel className="w-full lg:flex-1 p-5 flex flex-col">
            <AcousticPulse waveAmplitude={waveAmplitude} />
          </GlassPanel>

          {/* Right: Reasoning Engine terminal (~26%) — macOS terminal window
              streaming the structured reasoning log. Consumes reasoningLog. */}
          <GlassPanel className="w-full lg:w-[26%] p-5 flex flex-col">
            <PanelHeading>Reasoning Engine (Bedrock's Brain)</PanelHeading>
            <ReasoningTerminal log={reasoningLog} />
          </GlassPanel>
        </main>

        {/* Bottom shelf: 4 AI-managed intervention cards (Requirement 6).
            Each card is mapped from `appliances` state — nothing hardcoded.
            ApplianceCard renders the flat icon, uppercase name, STATE line,
            and a status dot, and flashes/glows when its appliance goes active. */}
        <section className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {appliances.map((appliance) => (
            <ApplianceCard key={appliance.id} appliance={appliance} />
          ))}
        </section>
      </div>
    </>
  );
}
