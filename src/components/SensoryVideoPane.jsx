// SensoryVideoPane (Task 22) — a compact glass "camera feed" tile that, paired
// with the AcousticPulse, sells the sensor-FUSION story (audio + video). It is
// deliberately a SIMULATION: a dark video area with a slow light sweep, a thin
// scanline, faint grain and a corner timestamp, a blinking "LIVE" badge, a
// camera label, and animated bounding-box overlays that appear over the feed
// whenever a real visual detection arrives (the `detection` prop, fed from the
// SAME controller that drives the sphere + terminal). Mic + camera "active"
// indicators reinforce that both senses are online.
//
// Performance: the perpetual sweep/scanline are pure CSS keyframes (see
// index.css); only the occasional bounding box uses Framer Motion (one element,
// enter/exit). All motion honors prefers-reduced-motion.
//
// TODO: Wire API connection to Python/AWS Bedrock endpoint here
//   Swap the simulated <div> feed for a live WebRTC/HLS <video> element and
//   draw real CV bounding boxes from the detector stream.

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelHeading } from './GlassPanel.jsx';

/** Reactively track the OS "reduce motion" setting (mirrors AcousticPulse). */
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

// Where a detection's bounding box sits over the simulated feed, by zone. Values
// are percentages of the feed area; kept loose so the box reads as "somewhere in
// frame" rather than pixel-accurate. Falls back to a centered box.
const ZONE_BOX = {
  Balcony: { left: '58%', top: '28%', width: '30%', height: '52%' },
  Kitchen: { left: '12%', top: '34%', width: '32%', height: '48%' },
};
const DEFAULT_BOX = { left: '36%', top: '30%', width: '30%', height: '48%' };

// Small inline icons (no icon dependency). Stroke uses currentColor so the
// active/idle color is controlled by the wrapper.
function MicIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CamIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="6" width="13" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 10l5-3v10l-5-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Indicator({ on, label, children }) {
  return (
    <span
      className={
        'flex items-center gap-1 rounded-md px-1.5 py-1 text-[9px] font-medium uppercase tracking-wider ' +
        (on
          ? 'bg-accent-cyan/15 text-accent-cyan shadow-[0_0_10px_rgba(34,211,238,0.25)]'
          : 'bg-white/5 text-white/40')
      }
      title={`${label} ${on ? 'active' : 'off'}`}
    >
      <span className="h-3 w-3">{children}</span>
      {on && <span className="h-1 w-1 rounded-full bg-accent-cyan animate-pulse" aria-hidden="true" />}
    </span>
  );
}

/**
 * SensoryVideoPane
 * @param {boolean} isMicOn      mic indicator state (defaults to true)
 * @param {boolean} isCameraOn   camera indicator + feed state (defaults true)
 * @param {string}  cameraLabel  label shown over the feed (e.g. "Balcony Cam")
 * @param {object}  detection    latest visual detection { label, zone, score, ts }
 * @param {string}  className    extra classes for the outer tile
 */
export default function SensoryVideoPane({
  isMicOn = true,
  isCameraOn = true,
  cameraLabel = 'Balcony Cam',
  detection = null,
  className = '',
}) {
  const reduceMotion = usePrefersReducedMotion();
  const box = (detection && ZONE_BOX[detection.zone]) || DEFAULT_BOX;

  return (
    <section className={'shrink-0 ' + className}>
      {/* Caption row: title + sensor indicators. */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <PanelHeading>Sensor Fusion — Live Feed</PanelHeading>
        <div className="flex items-center gap-1.5">
          <Indicator on={isMicOn} label="Mic"><MicIcon className="h-3 w-3" /></Indicator>
          <Indicator on={isCameraOn} label="Camera"><CamIcon className="h-3 w-3" /></Indicator>
        </div>
      </div>

      {/* Simulated dark video area — compact so the sphere stays prominent. */}
      <div
        className="relative h-24 w-full overflow-hidden rounded-xl border border-white/10 sm:h-28"
        style={{
          background:
            'radial-gradient(120% 90% at 30% 20%, rgba(34,211,238,0.10) 0%, rgba(168,85,247,0.06) 40%, rgba(5,6,11,0.96) 78%),' +
            'linear-gradient(180deg, #070912 0%, #04050a 100%)',
        }}
      >
        {isCameraOn ? (
          <>
            {/* Slow diagonal light sweep (CSS keyframe). */}
            <div
              aria-hidden="true"
              className="pulse-cam-sweep pointer-events-none absolute inset-y-0 -left-1/3 w-1/3"
              style={{
                background:
                  'linear-gradient(90deg, rgba(34,211,238,0) 0%, rgba(34,211,238,0.18) 50%, rgba(34,211,238,0) 100%)',
                filter: 'blur(6px)',
              }}
            />

            {/* Thin moving scanline (CSS keyframe). */}
            <div
              aria-hidden="true"
              className="pulse-cam-scan pointer-events-none absolute inset-x-0 top-0 h-8"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0) 100%)',
              }}
            />

            {/* Static scanline grain — repeating lines (no animation). */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-overlay"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 3px)',
              }}
            />

            {/* Bounding-box overlay — appears when a detection arrives. One
                Framer element with enter/exit; suppressed under reduced-motion. */}
            <AnimatePresence>
              {detection && !reduceMotion && (
                <motion.div
                  key={detection.ts}
                  className="absolute rounded-md border border-accent-cyan/80"
                  style={{
                    ...box,
                    boxShadow: '0 0 12px rgba(34,211,238,0.45), inset 0 0 12px rgba(34,211,238,0.12)',
                  }}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  {/* Detection label tag riding the top-left corner of the box. */}
                  <span className="absolute -top-[18px] left-0 whitespace-nowrap rounded bg-accent-cyan/90 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-black">
                    {detection.label} · {detection.score}%
                  </span>
                  {/* Corner ticks for a CV-tracker feel. */}
                  <span className="absolute -left-px -top-px h-2 w-2 border-l-2 border-t-2 border-accent-cyan" />
                  <span className="absolute -right-px -bottom-px h-2 w-2 border-b-2 border-r-2 border-accent-cyan" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* LIVE badge + blinking red dot (top-left). */}
            <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md bg-black/45 px-1.5 py-0.5 backdrop-blur-sm">
              <span
                className={'h-1.5 w-1.5 rounded-full bg-red-500 ' + (reduceMotion ? '' : 'animate-pulse')}
                aria-hidden="true"
              />
              <span className="font-mono text-[9px] font-semibold uppercase tracking-widest text-white/85">
                Live
              </span>
            </div>

            {/* Simulated timestamp (top-right) — pure decoration. */}
            <span className="absolute right-2 top-2 rounded bg-black/45 px-1.5 py-0.5 font-mono text-[9px] text-white/60 backdrop-blur-sm">
              CAM 01 · SIM
            </span>

            {/* Camera label (bottom-left). */}
            <span className="absolute bottom-2 left-2 font-mono text-[10px] font-medium tracking-wide text-white/80">
              {cameraLabel}
            </span>
          </>
        ) : (
          // Camera off — calm placeholder.
          <div className="flex h-full w-full items-center justify-center">
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">
              Camera Off
            </span>
          </div>
        )}
      </div>

      {/* Tiny caption clarifying this is a simulated fusion preview. */}
      <p className="mt-1.5 text-center font-sans text-[9px] uppercase tracking-[0.3em] text-white/30">
        Simulated CV preview · audio + video fused
      </p>
    </section>
  );
}
