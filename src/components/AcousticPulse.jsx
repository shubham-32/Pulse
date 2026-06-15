// AcousticPulse (Requirement 4) — the visual centerpiece: a large transparent
// glowing glass sphere with a living dual-waveform inside and glowing platform
// rings beneath. The module-level geometry (viewBox, sine-path builder, sine
// waves, spectrum bars, platform rings) is precomputed once at load so the SVG
// never recomputes paths per render.
//
// Task 11 performance pass (Requirement 4.3): the perpetual motion now runs as
// GPU-friendly CSS keyframes (transform/opacity only) instead of per-element
// Framer Motion loops, the sine waves flow via a cheap translateX of a static
// periodic path (no SVG `d` morphing), the glow filters are applied once per
// group instead of once per element, and the looping breath/bloom/ring motion
// is disabled under prefers-reduced-motion. The visual result is unchanged.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usePulse } from '../hooks/PulseProvider.jsx';

// SVG canvas is a 400x400 viewBox. Center is (200,200). The left half hosts
// flowing sine waves; the right half hosts spiked spectrum bars.
export const WAVE_VIEWBOX = 400;
export const WAVE_MID = WAVE_VIEWBOX / 2; // 200

// Left-half sine band geometry. Waves are drawn across [SINE_X_START, SINE_X_END]
// and clipped to that band so the extra material used for seamless flow never
// bleeds into the right-half spectrum. The band is pulled in from the rim and
// kept symmetric with the right-half spectrum so the two clusters read balanced
// around the center divider rather than slicing off at the circular glass edge.
const SINE_X_START = 70;
const SINE_X_END = 192;
const SINE_WIDTH = SINE_X_END - SINE_X_START; // 122

/**
 * buildSinePath — generate an SVG path string for one sine wave across the
 * left half of the canvas. Retained for compatibility (e.g. tests); the wave
 * argument is keyed to SINE_WIDTH so wavelength is independent of point count.
 */
export function buildSinePath(phase, amplitude, frequency, midY = WAVE_MID) {
  const points = 48;
  let d = '';
  for (let i = 0; i <= points; i += 1) {
    const t = i / points;
    const x = SINE_X_START + SINE_WIDTH * t;
    const y = midY + amplitude * Math.sin(frequency * t * Math.PI * 2 + phase);
    d += i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return d;
}

/**
 * buildFlowSinePath — build a STATIC sine path that is extended one full
 * wavelength (plus a small margin) past the visible band. Because a sine is
 * periodic, translating this path left by exactly one wavelength looks like a
 * continuous flow and loops seamlessly. Returns the path plus the wavelength
 * (the flow distance) so the caller can drive a transform animation.
 */
function buildFlowSinePath(amplitude, frequency, midY = WAVE_MID) {
  const cycleLen = SINE_WIDTH / frequency; // one wavelength, in user units
  const margin = 8; // guard so the right edge is always covered mid-loop
  const xEnd = SINE_X_END + cycleLen + margin;
  const totalW = xEnd - SINE_X_START;
  // Keep point density roughly constant vs. the original 48-pt/162u sampling.
  const points = Math.max(48, Math.round((totalW / SINE_WIDTH) * 48));
  let d = '';
  for (let i = 0; i <= points; i += 1) {
    const x = SINE_X_START + totalW * (i / points);
    const t = (x - SINE_X_START) / SINE_WIDTH; // wavelength tied to SINE_WIDTH
    const y = midY + amplitude * Math.sin(frequency * t * Math.PI * 2);
    d += i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`;
  }
  return { d, cycleLen };
}

// Three flowing sine lines (cyan -> purple via a shared gradient stroke). Each
// is a single static path that flows via a translateX loop; distinct durations
// (and wavelengths) keep the organic, layered feel of the original keyframes.
export const SINE_WAVES = [
  { id: 'sine-a', amp: 18, freq: 1.5, width: 2.5, opacity: 0.9 },
  { id: 'sine-b', amp: 12, freq: 2.3, width: 2.0, opacity: 0.65 },
  { id: 'sine-c', amp: 22, freq: 1.1, width: 2.5, opacity: 0.5 },
].map((w, i) => {
  const { d, cycleLen } = buildFlowSinePath(w.amp, w.freq);
  // Negative => flow leftward; one wavelength per loop keeps it seamless.
  return { ...w, d, flowDist: -cycleLen, duration: 6 + i };
});

// Right-half spectrum bars (orange/gold). The cluster is narrowed and pulled in
// from the rim so it mirrors the left-half sine band around the center divider,
// and the base heights are reduced so even at a full amplitude spike the bars
// stay comfortably WITHIN the circular glass instead of being clipped hard.
export const SPIKE_BARS = Array.from({ length: 16 }, (_, i) => {
  const x = 210 + i * 7.5;
  const base = 18 + (Math.sin(i * 1.3) * 0.5 + 0.5) * 54;
  return { id: `bar-${i}`, x, base, delay: (i % 6) * 0.13 };
});

// Concentric platform rings beneath the sphere (glowing floor it rests on).
export const PLATFORM_RINGS = [
  { id: 'ring-0', w: '74%', h: '48px', glow: 34, delay: 0 },
  { id: 'ring-1', w: '52%', h: '32px', glow: 26, delay: 0.5 },
  { id: 'ring-2', w: '32%', h: '20px', glow: 18, delay: 1 },
];

/**
 * usePrefersReducedMotion — reactively tracks the OS "reduce motion" setting so
 * the perpetual Framer loops (breathing sphere, bloom, ring pulse) can be held
 * static for users who request it. CSS handles the bars/sines via media query.
 */
function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduce;
}

/**
 * AcousticPulse
 * Motion strategy (no per-frame React state):
 *  - Sphere: gentle continuous breathing scale + an outer bloom glow loop
 *    (Framer; disabled under reduced-motion). Transform/opacity only.
 *  - Waveform group: scaleY bound to `waveAmplitude` via a spring, so acoustic
 *    triggers (amplitude 1 -> 2.4 -> 1) make both halves visibly spike/settle.
 *    Transform only.
 *  - Left sine paths: static periodic paths flowing via a CSS translateX loop.
 *  - Right spectrum bars: CSS scaleY/opacity jitter, staggered per bar.
 *  - Platform rings: staggered opacity/scale pulse (Framer; reduced-motion off).
 */
export default function AcousticPulse({ waveAmplitude, compact = false }) {
  const osReduceMotion = usePrefersReducedMotion();
  // The user's explicit Settings toggle is authoritative; fall back to the OS
  // setting when the preference is unset/false so JS-driven Framer loops (sphere
  // breathing, bloom, ring pulse) stop whenever EITHER asks for reduced motion.
  const { reducedMotion: prefReduceMotion } = usePulse();
  const reduceMotion = prefReduceMotion || osReduceMotion;

  // Compact mode shrinks the sphere + rings so the whole pane fits inside a
  // 16:9 frame the same size as the camera feed (used by the "Live Audio Feed"
  // selector on the dashboard).
  const sphereSize = compact ? 'min(56%, 188px)' : 'min(78%, 420px)';
  const ringsHeight = compact ? '36px' : '72px';

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center">
      {/* Section subtitle (keeps the centerpiece visually labeled). */}
      <div className="pointer-events-none text-center">
        <p className="font-sans text-[10px] font-medium uppercase tracking-[0.4em] text-accent-cyan/70">
          Real-Time Sense
        </p>
        <p className={'mt-1 font-sans font-semibold tracking-wide text-white/90 ' + (compact ? 'text-sm' : 'text-base')}>
          The Acoustic Pulse
        </p>
      </div>

      {/* Sphere stack — bloom + glass sphere + waveform. */}
      <div
        className={'relative flex items-center justify-center ' + (compact ? 'mt-3' : 'mt-6')}
        style={{ width: sphereSize, aspectRatio: '1 / 1' }}
      >
        {/* Soft outer bloom (separate layer so it can pulse independently).
            Pre-blurred; we animate opacity/scale only (never the blur radius). */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(34,211,238,0.20) 0%, rgba(168,85,247,0.12) 45%, rgba(5,6,11,0) 72%)',
            filter: 'blur(32px)',
            willChange: 'transform, opacity',
          }}
          animate={reduceMotion ? { opacity: 0.6, scale: 1 } : { opacity: [0.45, 0.8, 0.45], scale: [0.94, 1.06, 0.94] }}
          transition={reduceMotion ? { duration: 0 } : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
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
            willChange: 'transform',
          }}
          animate={reduceMotion ? { scale: 1 } : { scale: [1, 1.03, 1] }}
          transition={reduceMotion ? { duration: 0 } : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
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

          {/* Dual-waveform SVG, centered within the sphere and inset from the
              rim so neither cluster is sliced off by the circular glass edge.
              The whole group's vertical scale is bound to waveAmplitude with a
              spring so spikes grow then settle smoothly (transform only). */}
          <svg
            viewBox={`0 0 ${WAVE_VIEWBOX} ${WAVE_VIEWBOX}`}
            className="absolute inset-[11%] h-[78%] w-[78%]"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="pulseSineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
              {/* Reduced stdDeviation vs. the original; glow reads the same but
                  is cheaper, and is now applied once per group (below). */}
              <filter id="pulseWaveGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="pulseBarGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="1.8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Clip the sine band so the extended flow paths stay left-half. */}
              <clipPath id="pulseSineClip">
                <rect x="68" y="130" width="126" height="140" />
              </clipPath>
            </defs>

            <motion.g
              style={{ transformBox: 'fill-box', transformOrigin: 'center', willChange: 'transform' }}
              animate={{ scaleY: waveAmplitude }}
              transition={{ type: 'spring', stiffness: 120, damping: 14 }}
            >
              {/* Faint center divider between the two halves. */}
              <line
                x1={WAVE_MID}
                y1="134"
                x2={WAVE_MID}
                y2="266"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />

              {/* Left half: flowing cyan -> purple sine waves. One glow filter
                  for the whole group (was one per path); clipped to the band;
                  each path flows via a GPU translateX loop (CSS). */}
              <g clipPath="url(#pulseSineClip)">
                <g filter="url(#pulseWaveGlow)">
                  {SINE_WAVES.map((w) => (
                    <path
                      key={w.id}
                      className="pulse-sine"
                      d={w.d}
                      fill="none"
                      stroke="url(#pulseSineGrad)"
                      strokeWidth={w.width}
                      strokeLinecap="round"
                      opacity={w.opacity}
                      style={{
                        '--pulse-flow-dist': `${w.flowDist}px`,
                        animationDuration: `${w.duration}s`,
                      }}
                    />
                  ))}
                </g>
              </g>

              {/* Right half: spiked orange/gold spectrum bars. One glow filter
                  for the whole group (was one per bar); each bar jitters via a
                  staggered CSS scaleY/opacity loop (off the main thread). */}
              <g filter="url(#pulseBarGlow)">
                {SPIKE_BARS.map((b) => (
                  <rect
                    key={b.id}
                    className="pulse-bar"
                    x={b.x}
                    y={WAVE_MID - b.base / 2}
                    width="4"
                    height={b.base}
                    rx="2"
                    fill="#f59e0b"
                    style={{
                      transformBox: 'fill-box',
                      transformOrigin: 'center',
                      animationDelay: `${b.delay}s`,
                    }}
                  />
                ))}
              </g>
            </motion.g>
          </svg>
        </motion.div>
      </div>

      {/* Glowing concentric platform rings — the floor the sphere rests on. */}
      <div
        className={'relative flex items-center justify-center ' + (compact ? 'mt-1' : 'mt-2')}
        style={{ width: sphereSize, height: ringsHeight }}
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
              willChange: 'transform, opacity',
            }}
            animate={reduceMotion ? { opacity: 0.4, scale: 1 } : { opacity: [0.2, 0.6, 0.2], scale: [0.96, 1.05, 0.96] }}
            transition={reduceMotion ? { duration: 0 } : { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: r.delay }}
          />
        ))}
      </div>
    </div>
  );
}
