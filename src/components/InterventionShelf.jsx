// InterventionShelf (Requirement 6) — the bottom shelf of AI-managed appliance
// cards. Houses the flat ApplianceIcon set, the individual ApplianceCard, and
// the ApplianceShelf grid that maps over `appliances` state. The shelf grid was
// previously inlined in PulseDashboard; it is extracted here unchanged (same
// markup/classes) in the Task 9 refactor.

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PanelHeading } from './GlassPanel.jsx';

/**
 * ApplianceIcon — maps an appliance `icon` key to a clean, flat, stroke-based
 * inline SVG (~24px, currentColor). Original keys: fan, breeze, heater, bulb.
 * Expanded fleet keys: ac, purifier, tv, fridge, washer, vacuum, lock, camera,
 * motion, plug, water, microwave. Any unmapped key falls back to a generic
 * "connected device" glyph.
 *
 * Color is inherited via `currentColor`, so the parent card controls tint
 * (accent when active, dim white when idle).
 */
export function ApplianceIcon({ icon, className = '' }) {
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
    case 'ac':
      // Smart AC — wall split unit with louver vents and a breeze line.
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="7" rx="2" />
          <path d="M5.5 9h13" />
          <path d="M7 15c0 1.2 1 1.2 1 2.4M12 15c0 1.2 1 1.2 1 2.4M17 15c0 1.2 1 1.2 1 2.4" />
        </svg>
      );
    case 'purifier':
      // Air purifier — tall tower with vents and rising clean-air arcs.
      return (
        <svg {...common}>
          <rect x="7" y="3" width="10" height="18" rx="3" />
          <path d="M9.5 7h5M9.5 9.5h5" />
          <path d="M10.5 13c0 1.5 3 1.5 3 0" />
          <path d="M11 16.5c0 1 2 1 2 0" />
        </svg>
      );
    case 'tv':
      // Smart TV — widescreen panel on a small stand.
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M9 20h6M12 16v4" />
        </svg>
      );
    case 'fridge':
      // Refrigerator — two-door body with handles and a divider.
      return (
        <svg {...common}>
          <rect x="6" y="3" width="12" height="18" rx="2" />
          <path d="M6 10h12" />
          <path d="M9 6.5v1.5M9 12v2" />
        </svg>
      );
    case 'washer':
      // Washing machine — front-load body with a round drum door.
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <circle cx="12" cy="14" r="4" />
          <circle cx="12" cy="14" r="1.4" />
          <path d="M7 6h.01M10 6h.01" />
        </svg>
      );
    case 'vacuum':
      // Robot vacuum — round disc with a sensor turret and bumper line.
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="9.5" r="1.4" />
          <path d="M4 13.5h16" />
        </svg>
      );
    case 'lock':
      // Smart door lock — shackle over a body with a keyhole.
      return (
        <svg {...common}>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          <path d="M12 14v2.5" />
        </svg>
      );
    case 'camera':
      // CCTV camera — barrel body with lens on a wall mount.
      return (
        <svg {...common}>
          <path d="M3 7l13-2 1.5 4.5L4.5 11.5 3 7Z" />
          <circle cx="9.5" cy="8" r="1.6" />
          <path d="M16.5 8.5L20 7.5M6 11.5V19M4 19h4" />
        </svg>
      );
    case 'motion':
      // Motion sensor — dome with radiating detection arcs.
      return (
        <svg {...common}>
          <path d="M5 13a7 7 0 0 1 14 0" />
          <path d="M5 13h14l-1.5 4h-11L5 13Z" />
          <path d="M12 13v4" />
        </svg>
      );
    case 'plug':
      // Smart plug — outlet plug with two pins and a cord.
      return (
        <svg {...common}>
          <path d="M8 3v5M16 3v5" />
          <path d="M6 8h12v2a6 6 0 0 1-12 0V8Z" />
          <path d="M12 16v5" />
        </svg>
      );
    case 'water':
      // Water purifier (RO) — droplet over a faucet base.
      return (
        <svg {...common}>
          <path d="M12 3c3 4 5 6.2 5 9a5 5 0 0 1-10 0c0-2.8 2-5 5-9Z" />
          <path d="M10.5 13.5c0 1.2 3 1.2 3 0" />
        </svg>
      );
    case 'microwave':
      // Microwave — box with a door window and a control strip.
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="13" rx="2" />
          <rect x="5.5" y="7.5" width="9" height="8" rx="1" />
          <path d="M17.5 8.5v2M17.5 12.5v2" />
        </svg>
      );
    default:
      // Generic connected device fallback for any unmapped icon key.
      return (
        <svg {...common}>
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <path d="M9 18v2h6v-2M12 6V4" />
          <circle cx="12" cy="12" r="2" />
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
 * When the appliance transitions to active, the card briefly flashes/glows.
 */
export function ApplianceCard({ appliance }) {
  const { name, icon, state, active } = appliance;

  // Accent glow used for the active state (cyan from the shared palette).
  const ACTIVE_GLOW = '#22d3ee';

  return (
    <motion.div
      layout
      style={{ zIndex: active ? 5 : 1 }}
      className="relative overflow-hidden rounded-2xl border backdrop-blur-xl bg-white/5 p-4 flex flex-col gap-2 min-h-[112px]"
      initial={false}
      animate={{
        borderColor: active ? 'rgba(34,211,238,0.55)' : 'rgba(255,255,255,0.10)',
        boxShadow: active
          ? `0 0 22px ${ACTIVE_GLOW}44, inset 0 0 18px ${ACTIVE_GLOW}22, 0 8px 40px rgba(0,0,0,0.45)`
          : '0 8px 40px rgba(0,0,0,0.45)',
      }}
      transition={{ duration: 0.5, ease: 'easeOut', layout: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } }}
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

/**
 * ApplianceShelf — the bottom row: a responsive wrapping grid of intervention
 * cards, one per appliance in state. With the expanded device fleet the grid
 * wraps cleanly across multiple rows (2 → 3 → 4 → 6 columns as width grows) and
 * keeps cards equal-height and aligned. A small "Connected Devices" heading with
 * a live device count labels the shelf without overwhelming it.
 */
export default function ApplianceShelf({ appliances }) {
  return (
    <section className="shrink-0">
      <div className="mb-3 flex items-center justify-between">
        <PanelHeading>Connected Devices</PanelHeading>
        <span className="font-sans text-[11px] font-medium tabular-nums text-white/40">
          {appliances.length} devices · AI-managed
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {appliances.map((appliance) => (
          <ApplianceCard key={appliance.id} appliance={appliance} />
        ))}
      </div>
    </section>
  );
}
