// SettingsPage (Task 23) — real accessibility & preference controls plus a
// small read-only "About this home" panel and a convenience Sign Out.
//
// The two preferences (Reduced Motion, Larger Text) live in the shared
// controller and are reflected onto <html> as classes (pulse-reduce-motion /
// pulse-large-text), so toggling here takes effect across the entire app — the
// perpetual animations quiet down and base type scales up immediately.
//
// Accessibility: each toggle is a real <button role="switch" aria-checked> with
// an aria-label, helper text, and a visible focus-visible ring (mirrors the
// device PowerSwitch pattern). The page scrolls naturally, top-aligned, inside
// the AppLayout shell.

import { motion } from 'framer-motion';
import GlassPanel, { PanelHeading } from '../components/GlassPanel.jsx';
import { usePulse } from '../hooks/PulseProvider.jsx';

const ACTIVE_GLOW = '#22d3ee';

/**
 * PreferenceSwitch — an accessible on/off switch row: a label + helper text on
 * the left and a real <button role="switch"> on the right. The whole row's
 * descriptive text is wired to the control via aria-labelledby/aria-describedby.
 */
function PreferenceSwitch({ id, label, description, checked, onToggle }) {
  const labelId = `${id}-label`;
  const descId = `${id}-desc`;
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0">
        <p id={labelId} className="font-sans text-sm font-semibold text-white">
          {label}
        </p>
        <p id={descId} className="mt-1 font-sans text-xs leading-relaxed text-white/50">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descId}
        onClick={onToggle}
        className={
          'relative mt-0.5 inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-300 ' +
          'outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian ' +
          (checked
            ? 'border-accent-cyan/60 bg-accent-cyan/25'
            : 'border-white/15 bg-white/5')
        }
        style={
          checked
            ? { boxShadow: `0 0 14px ${ACTIVE_GLOW}55, inset 0 0 10px ${ACTIVE_GLOW}33` }
            : undefined
        }
      >
        <motion.span
          aria-hidden="true"
          className={
            'inline-block h-5 w-5 rounded-full ' + (checked ? 'bg-accent-cyan' : 'bg-white/60')
          }
          animate={{ x: checked ? 22 : 3 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </button>
    </div>
  );
}

/** A labelled read-only field for the "About this home" panel. */
function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="font-sans text-xs uppercase tracking-wider text-white/40">{label}</span>
      <span className="truncate font-sans text-sm font-medium text-white/80">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const {
    reducedMotion,
    largerText,
    toggleReducedMotion,
    toggleLargerText,
    homeId,
    homeLabel,
    currentMember,
    signOut,
  } = usePulse();

  return (
    <div className="min-h-full w-full p-4 md:p-8">
      <div className="mx-auto w-full max-w-3xl">
        {/* Page header. */}
        <div className="flex items-center gap-3">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-cyan animate-pulse" />
          <PanelHeading>Preferences</PanelHeading>
        </div>
        <h1 className="mt-3 font-sans text-3xl md:text-4xl font-extrabold tracking-tight text-white">
          Settings
        </h1>
        <p className="mt-3 max-w-xl font-sans text-sm md:text-base leading-relaxed text-white/60">
          Tune PULSE to your home. Accessibility preferences apply across every page instantly.
        </p>

        {/* Accessibility section. */}
        <GlassPanel className="mt-8 p-6 md:p-8">
          <PanelHeading>Accessibility</PanelHeading>
          <div className="mt-4 divide-y divide-white/10">
            <PreferenceSwitch
              id="pref-reduced-motion"
              label="Reduced Motion"
              description="Minimises animations across PULSE — the acoustic sphere, waveforms and ambient effects hold still."
              checked={reducedMotion}
              onToggle={toggleReducedMotion}
            />
            <PreferenceSwitch
              id="pref-larger-text"
              label="Larger Text"
              description="Increases text size for readability throughout the app."
              checked={largerText}
              onToggle={toggleLargerText}
            />
          </div>
        </GlassPanel>

        {/* About this home + sign out. */}
        <GlassPanel className="mt-6 p-6 md:p-8">
          <PanelHeading>About this home</PanelHeading>
          <div className="mt-4 divide-y divide-white/10">
            <InfoRow label="Home" value={homeLabel} />
            <InfoRow label="Home ID" value={homeId} />
            <InfoRow label="Signed in as" value={currentMember?.name || '—'} />
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 font-sans text-sm font-medium text-white/80 transition-colors duration-200 hover:border-accent-cyan/50 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
