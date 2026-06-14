// RoomDeviceCard (Task 20) — a rich, interactive per-device control card used on
// the Rooms & Devices page. Unlike the dashboard's read-only ApplianceCard, this
// card lets the user drive a device directly: a power switch, a type-appropriate
// control (fan speed / brightness / temperature), and a "Return to AI" undo that
// hands control back to the ambient automation.
//
// Everything is state-driven from the `appliance` record; user actions are routed
// up through the callbacks (onTogglePower / onSetControl / onReturnToAI) which the
// shared controller applies, so changes reflect everywhere (dashboard shelf too).
//
// Accessibility: the power control is a real <button role="switch" aria-checked>;
// brightness is a native range input; speed is a labelled radiogroup; temperature
// is a stepper with aria-live value. All interactive elements are keyboard
// operable with visible focus rings.

import { motion } from 'framer-motion';
import { ApplianceIcon } from './InterventionShelf.jsx';

const ACTIVE_GLOW = '#22d3ee';

/** A real, accessible on/off switch built on a <button role="switch">. */
function PowerSwitch({ active, online, label, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={`${label} power`}
      disabled={!online}
      onClick={onToggle}
      className={
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-300 ' +
        'outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian ' +
        (online ? 'cursor-pointer ' : 'cursor-not-allowed opacity-40 ') +
        (active
          ? 'border-accent-cyan/60 bg-accent-cyan/25'
          : 'border-white/15 bg-white/5')
      }
      style={
        active ? { boxShadow: `0 0 14px ${ACTIVE_GLOW}55, inset 0 0 10px ${ACTIVE_GLOW}33` } : undefined
      }
    >
      <motion.span
        aria-hidden="true"
        className={
          'inline-block h-5 w-5 rounded-full ' + (active ? 'bg-accent-cyan' : 'bg-white/60')
        }
        animate={{ x: active ? 22 : 3 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      />
    </button>
  );
}

/** Segmented 0–3 fan speed control as an accessible radiogroup. */
function SpeedControl({ value, disabled, label, onChange }) {
  const steps = [0, 1, 2, 3];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-sans text-[11px] uppercase tracking-wider text-white/40">Speed</span>
        <span className="font-sans text-xs font-semibold tabular-nums text-white/70">
          {value === 0 ? 'Off' : value}
        </span>
      </div>
      <div
        role="radiogroup"
        aria-label={`${label} speed`}
        className="grid grid-cols-4 gap-1.5"
      >
        {steps.map((s) => {
          const selected = value === s;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={s === 0 ? 'Off' : `Speed ${s}`}
              disabled={disabled}
              onClick={() => onChange(s)}
              className={
                'rounded-lg border px-0 py-1.5 font-sans text-xs font-semibold tabular-nums transition-colors duration-200 ' +
                'outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian ' +
                (disabled ? 'cursor-not-allowed opacity-40 ' : 'cursor-pointer ') +
                (selected
                  ? 'border-accent-cyan/60 bg-accent-cyan/15 text-accent-cyan'
                  : 'border-white/10 bg-white/5 text-white/55 hover:border-white/25 hover:text-white/80')
              }
            >
              {s === 0 ? 'Off' : s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Native range slider for brightness (0–100%). */
function BrightnessControl({ value, disabled, label, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-sans text-[11px] uppercase tracking-wider text-white/40">
          Brightness
        </span>
        <span className="font-sans text-xs font-semibold tabular-nums text-white/70">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        disabled={disabled}
        aria-label={`${label} brightness`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="pulse-range w-full"
      />
    </div>
  );
}

/** Temperature stepper with −/+ buttons and an aria-live value. */
function TempControl({ value, min, max, step = 1, disabled, label, onChange }) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  const btn =
    'flex h-9 w-9 items-center justify-center rounded-lg border font-sans text-lg leading-none transition-colors duration-200 ' +
    'outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian ' +
    'border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div className="flex flex-col gap-2">
      <span className="font-sans text-[11px] uppercase tracking-wider text-white/40">Temperature</span>
      <div className="flex items-center justify-between">
        <button
          type="button"
          className={btn}
          aria-label={`Lower ${label} temperature`}
          disabled={disabled || value <= min}
          onClick={dec}
        >
          −
        </button>
        <span
          aria-live="polite"
          className="font-sans text-xl font-bold tabular-nums text-white/90"
        >
          {value}
          <span className="ml-0.5 text-sm font-medium text-white/45">°C</span>
        </span>
        <button
          type="button"
          className={btn}
          aria-label={`Raise ${label} temperature`}
          disabled={disabled || value >= max}
          onClick={inc}
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * deviceControl — picks the right control surface for an appliance type. Devices
 * without a meaningful quick control return null (the card shows a status line).
 */
function DeviceControl({ appliance, disabled, onSetControl }) {
  const { id, type, controls = {} } = appliance;

  if (type === 'fan' || type === 'exhaust') {
    return (
      <SpeedControl
        value={controls.speed ?? 0}
        disabled={disabled}
        label={appliance.name}
        onChange={(v) => onSetControl(id, 'speed', v)}
      />
    );
  }
  if (type === 'light') {
    return (
      <BrightnessControl
        value={controls.brightness ?? 0}
        disabled={disabled}
        label={appliance.name}
        onChange={(v) => onSetControl(id, 'brightness', v)}
      />
    );
  }
  if (type === 'geyser') {
    return (
      <TempControl
        value={controls.tempC ?? 45}
        min={30}
        max={60}
        step={5}
        disabled={disabled}
        label={appliance.name}
        onChange={(v) => onSetControl(id, 'tempC', v)}
      />
    );
  }
  if (type === 'climate') {
    return (
      <TempControl
        value={controls.tempC ?? 24}
        min={16}
        max={30}
        step={1}
        disabled={disabled}
        label={appliance.name}
        onChange={(v) => onSetControl(id, 'tempC', v)}
      />
    );
  }
  return null;
}

export default function RoomDeviceCard({
  appliance,
  onTogglePower,
  onSetControl,
  onReturnToAI,
}) {
  const { id, name, icon, state, active, online, mode } = appliance;
  const isManual = mode === 'manual';
  const controlDisabled = !online || !active;

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
      animate={{
        borderColor: active ? 'rgba(34,211,238,0.45)' : 'rgba(255,255,255,0.10)',
        boxShadow: active
          ? `0 0 22px ${ACTIVE_GLOW}33, 0 8px 40px rgba(0,0,0,0.45)`
          : '0 8px 40px rgba(0,0,0,0.45)',
      }}
    >
      {/* Header: icon + name/online, power switch on the right. */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={
              'mt-0.5 transition-colors duration-300 ' +
              (active ? 'text-accent-cyan' : 'text-white/40')
            }
          >
            <ApplianceIcon icon={icon} />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-sans text-sm font-bold text-white">{name}</span>
            <span className="mt-1 inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={
                  'h-1.5 w-1.5 rounded-full ' + (online ? 'bg-emerald-400' : 'bg-white/25')
                }
                style={online ? { boxShadow: `0 0 6px 1px ${ACTIVE_GLOW}88` } : undefined}
              />
              <span className="font-sans text-[11px] text-white/40">
                {online ? 'Online' : 'Offline'}
              </span>
            </span>
          </div>
        </div>

        <PowerSwitch active={active} online={online} label={name} onToggle={() => onTogglePower(id)} />
      </div>

      {/* Mode chip + status line. */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={
            'inline-flex items-center rounded-full border px-2.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wider ' +
            (isManual
              ? 'border-accent-orange/40 bg-accent-orange/10 text-accent-orange'
              : 'border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan')
          }
        >
          {isManual ? 'Manual' : 'AI'}
        </span>
        <span
          className={
            'truncate font-sans text-xs ' + (active ? 'text-accent-cyan/90' : 'text-white/45')
          }
        >
          {state}
        </span>
      </div>

      {/* Type-appropriate control (if any). */}
      <DeviceControl appliance={appliance} disabled={controlDisabled} onSetControl={onSetControl} />

      {/* Undo affordance — only while in manual override. Pinned to the bottom. */}
      <div className="mt-auto pt-1">
        {isManual ? (
          <button
            type="button"
            onClick={() => onReturnToAI(id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-accent-cyan/30 bg-accent-cyan/5 px-2.5 py-1 font-sans text-[11px] font-medium text-accent-cyan/90 transition-colors duration-200 hover:border-accent-cyan/60 hover:bg-accent-cyan/10 outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
            </svg>
            Return to AI
          </button>
        ) : (
          <span className="font-sans text-[11px] text-white/30">Managed by PULSE</span>
        )}
      </div>
    </motion.div>
  );
}
