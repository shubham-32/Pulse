// KitchenCamPane (Option C) — the grounded "real home" demo. A camera dropdown
// lets the presenter select "Kitchen Cam"; the recorded clip then AUTO-PLAYS
// (no start button) and a cue engine, keyed to the VIDEO clock, fires the whole
// choreography through the shared controller: detection overlays, multi-signal
// context fusion, a 2–5s agent-reasoning latency, the proactive exhaust, the
// unattended-flame safety beat, and presence-based lights on/off — all in sync
// with the footage.
//
// Drop the recording at:  public/clips/kitchen.mp4
//
// Note: detection is choreographed to the clip's timeline (not pixel CV) — the
// honest framing is "perception simulated, contextual reasoning is the real
// agentic AI". Timings below match the recorded clip exactly.

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePulse } from '../hooks/PulseProvider.jsx';
import StreamingText from './StreamingText.jsx';

const VIDEO_SRC = '/kitchen.mp4';

const ACCENTS = {
  cyan: '#22d3ee',
  amber: '#f59e0b',
  purple: '#a855f7',
  green: '#34d399',
};

// Cue points (seconds) → controller cue key. Keyed to the recorded clip.
const CUES = [
  { t: 4, key: 'baseline' }, // summary appears a few seconds after the first boxes
  { t: 6.5, key: 'approach' },
  { t: 8, key: 'enter' },
  { t: 15, key: 'utensil' },
  { t: 18, key: 'place' },
  { t: 26, key: 'ignite' },
  { t: 29, key: 'reasoning' }, // LLM/agent latency after ignition
  { t: 31, key: 'exhaust' }, // proactive action — matches the footage
  { t: 35, key: 'learning' }, // learns/updates the recurring cooking routine
  { t: 41, key: 'exit' },
  { t: 44, key: 'safety' },
  { t: 49, key: 'lightsoff' },
  { t: 51.5, key: 'end' },
];

// Detection boxes (normalized 0–1) shown over the video within time windows.
// No person box (the subject moves; a static box would mismatch) — presence is
// shown as a fixed corner chip instead. Two flame boxes: the already-cooking
// left burner (from 2s) and the newly-ignited burner (from 27s, slightly right).
const OVERLAYS = [
  { from: 2, to: 52, label: 'Burner · Left', conf: 97, accent: 'amber', box: { x: 0.49, y: 0.74, w: 0.15, h: 0.16 } },
  { from: 15, to: 52, label: 'Cookware', conf: 92, accent: 'cyan', box: { x: 0.52, y: 0.66, w: 0.3, h: 0.26 } },
  { from: 27, to: 52, label: 'Flame ignited', conf: 98, accent: 'amber', box: { x: 0.67, y: 0.78, w: 0.15, h: 0.16 } },
  { from: 31, to: 52, label: 'Exhaust ON', conf: 100, accent: 'green', box: { x: 0.42, y: 0.05, w: 0.24, h: 0.4 } },
];

function fmt(t) {
  const m = Math.floor(t / 60);
  const s = String(Math.floor(t % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

export default function KitchenCamPane({ className = '' }) {
  const { kitchenCue, setAutoDemo, scenarioBeat } = usePulse();
  const videoRef = useRef(null);
  const firedRef = useRef(new Set());
  const [selected, setSelected] = useState('none');
  const [time, setTime] = useState(0);
  const [hasVideo, setHasVideo] = useState(true);
  const [muted, setMuted] = useState(false);
  const [confs, setConfs] = useState({});

  // Dynamic detection confidence — fluctuates 60–95% at random intervals while
  // a camera is live, so the numbers read like a real detector rather than
  // fixed values.
  useEffect(() => {
    if (selected !== 'kitchen') return undefined;
    let id;
    const tick = () => {
      setConfs((prev) => {
        const next = { ...prev };
        OVERLAYS.forEach((o) => {
          next[o.label] = 60 + Math.floor(Math.random() * 36);
        });
        next.presence = 60 + Math.floor(Math.random() * 36);
        return next;
      });
      id = setTimeout(tick, 500 + Math.random() * 850);
    };
    id = setTimeout(tick, 350);
    return () => clearTimeout(id);
  }, [selected]);

  // Start / stop the scenario when the camera selection changes.
  useEffect(() => {
    const v = videoRef.current;
    if (selected === 'kitchen') {
      setAutoDemo(false); // cold stage — stop ambient random drivers
      kitchenCue('reset');
      firedRef.current = new Set();
      setTime(0);
      if (v) {
        try {
          v.currentTime = 0;
        } catch {
          /* ignore */
        }
        v.muted = muted;
        const p = v.play();
        if (p && p.catch) {
          p.catch(() => {
            // Autoplay-with-sound blocked → retry muted.
            v.muted = true;
            setMuted(true);
            v.play().catch(() => {});
          });
        }
      }
    } else if (v) {
      v.pause();
      setAutoDemo(false); // keep the stage cold until a camera is selected
      kitchenCue('reset');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const ct = v.currentTime;
    setTime(ct);
    for (const cue of CUES) {
      if (ct >= cue.t && !firedRef.current.has(cue.key)) {
        firedRef.current.add(cue.key);
        kitchenCue(cue.key);
      }
    }
  };

  const isLive = selected === 'kitchen';
  const activeBoxes = isLive ? OVERLAYS.filter((o) => time >= o.from && time <= o.to) : [];
  const beatAccent = scenarioBeat ? ACCENTS[scenarioBeat.accent] || ACCENTS.cyan : ACCENTS.cyan;

  return (
    <section
      className={
        'flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/50 ' +
        className
      }
    >
      {/* Header: camera selector + live badge */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-3 py-2">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-wider text-white/55">
          Sensor Fusion · Live Feed
        </span>
        <span className="flex-1" />
        {isLive && (
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-rose-300">
            <motion.span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-rose-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.1, repeat: Infinity }}
            />
            REC {fmt(time)}
          </span>
        )}
        <select
          aria-label="Select camera feed"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-lg border border-white/15 bg-black/60 px-2.5 py-1 font-sans text-[11px] text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60"
        >
          <option value="none">— Select camera —</option>
          <option value="kitchen">Kitchen Cam · Stove</option>
        </select>
      </div>

      {/* Video stage */}
      <div className="relative aspect-video w-full bg-black">
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          playsInline
          muted={muted}
          onTimeUpdate={handleTimeUpdate}
          onError={() => setHasVideo(false)}
          className={'h-full w-full object-contain ' + (isLive ? 'opacity-100' : 'opacity-0')}
        />

        {/* Compact PULSE summary banner — attached on top of the video. Shows
            the current reasoning beat with a word-by-word streaming subtitle and
            a "thinking" indicator while anticipating. No emojis (a green tick is
            shown only on the final summary). */}
        <AnimatePresence>
          {isLive && scenarioBeat && (
            <motion.div
              key={scenarioBeat.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="pointer-events-none absolute left-1/2 top-2 z-20 w-[90%] max-w-[340px] -translate-x-1/2 rounded-lg border bg-black/70 px-3 py-1.5 backdrop-blur-md"
              style={{ borderColor: `${beatAccent}55`, boxShadow: `0 0 16px ${beatAccent}2e` }}
            >
              <div className="flex items-center gap-1.5">
                {scenarioBeat.tick && (
                  <span
                    aria-hidden="true"
                    className="flex h-3.5 w-3.5 items-center justify-center rounded-[4px]"
                    style={{ backgroundColor: beatAccent }}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#05060b" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5 9-11" />
                    </svg>
                  </span>
                )}
                <span
                  className="font-sans text-[8px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: beatAccent }}
                >
                  {scenarioBeat.tag}
                </span>
                {scenarioBeat.phase === 'anticipating' && (
                  <span className="flex items-center gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="inline-block h-1 w-1 rounded-full"
                        style={{ backgroundColor: beatAccent }}
                        animate={{ opacity: [0.25, 1, 0.25] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
                      />
                    ))}
                  </span>
                )}
              </div>
              <div className="font-sans text-[12px] font-bold leading-tight text-white">
                {scenarioBeat.title}
              </div>
              <div className="font-sans text-[10px] leading-snug text-white/65">
                <StreamingText text={scenarioBeat.subtitle} speed={95} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Idle state (no camera selected) */}
        {!isLive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/40" aria-hidden="true">
              <path d="M3 7l13-2 1.5 4.5L4.5 11.5 3 7Z" />
              <circle cx="9.5" cy="8" r="1.6" />
              <path d="M16.5 8.5L20 7.5M6 11.5V19M4 19h16" />
            </svg>
            <p className="font-sans text-xs text-white/45">
              Select <span className="text-white/70">Kitchen Cam</span> to start the live feed
            </p>
            {!hasVideo && (
              <p className="font-mono text-[10px] text-amber-300/70">
                drop your clip at public/kitchen.mp4
              </p>
            )}
          </div>
        )}

        {/* Detection overlays */}
        {isLive &&
          activeBoxes.map((o) => {
            const accent = ACCENTS[o.accent] || ACCENTS.cyan;
            return (
              <motion.div
                key={o.label}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute rounded-md"
                style={{
                  left: `${o.box.x * 100}%`,
                  top: `${o.box.y * 100}%`,
                  width: `${o.box.w * 100}%`,
                  height: `${o.box.h * 100}%`,
                  border: `1.5px solid ${accent}`,
                  boxShadow: `0 0 12px ${accent}66, inset 0 0 12px ${accent}22`,
                }}
              >
                <span
                  className="absolute -top-5 left-0 whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold"
                  style={{ backgroundColor: accent, color: '#05060b' }}
                >
                  {o.label} · {confs[o.label] ?? o.conf}%
                </span>
              </motion.div>
            );
          })}

        {/* Subtle scanline + cam label */}
        {isLive && (
          <>
            <div className="pointer-events-none absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5 font-mono text-[9px] text-white/70">
              CAM-01 · KITCHEN
            </div>
            {/* Presence identification — a fixed chip (not a body-tracking box,
                so it never mismatches the moving subject). Appears shortly after
                entry. */}
            {time >= 5.5 && time <= 44 && (
              <div className="pointer-events-none absolute left-2 top-8 flex items-center gap-1.5 rounded bg-black/55 px-2 py-1 font-mono text-[9px] text-cyan-200">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-cyan-400"
                  style={{ boxShadow: '0 0 8px #22d3ee' }}
                />
                PERSON · SHUBHAM · {confs.presence ?? 92}%
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
