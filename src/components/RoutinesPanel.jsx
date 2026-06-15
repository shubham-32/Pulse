// RoutinesPanel — household routine management, shown on the Family page.
// Lists the routines PULSE has learned plus ones the family adds, lets any
// member add a new routine (time + label), and toggle/remove them. It writes to
// the SAME timelineEvents state the dashboard Home Rhythm renders, so anything
// added here appears there instantly (fully synced).

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { COLOR_MAP } from '../data/constants.js';
import { PanelHeading } from './GlassPanel.jsx';

function RoutineToggle({ enabled, label, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${enabled ? 'Disable' : 'Enable'} routine: ${label}`}
      onClick={onToggle}
      className={
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 ' +
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60 ' +
        (enabled ? 'border-accent-cyan/50 bg-accent-cyan/25' : 'border-white/15 bg-white/5')
      }
    >
      <span
        className={
          'inline-block h-3.5 w-3.5 rounded-full transition-transform ' +
          (enabled ? 'translate-x-4 bg-accent-cyan' : 'translate-x-0.5 bg-white/50')
        }
      />
    </button>
  );
}

export default function RoutinesPanel({
  routines = [],
  members = [],
  currentMember,
  onAdd,
  onToggle,
  onRemove,
}) {
  const [byMemberId, setByMemberId] = useState(currentMember?.id || members[0]?.id || '');
  const [time, setTime] = useState('');
  const [label, setLabel] = useState('');

  const canAdd = /^\d{2}:\d{2}$/.test(time) && label.trim().length > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!canAdd) return;
    onAdd?.({ time, label: label.trim(), byMemberId });
    setLabel('');
    setTime('');
  };

  return (
    <section className="mt-10">
      <div className="flex items-center gap-3">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-fuchsia-400 animate-pulse" />
        <PanelHeading>Household Routines</PanelHeading>
      </div>
      <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-white/55">
        Routines PULSE has <span className="text-fuchsia-300">learned</span> from your habits, plus
        ones your family adds. Anything here drives the <span className="text-white/80">Home Rhythm</span> on
        the dashboard — in real time.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* Routine list */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <ul className="flex flex-col gap-2.5">
            <AnimatePresence initial={false}>
              {routines.map((r) => {
                const tokens = COLOR_MAP[r.color] || COLOR_MAP.cyan;
                const enabled = r.enabled !== false;
                return (
                  <motion.li
                    key={r.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    className={
                      'flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 ' +
                      (enabled ? '' : 'opacity-50')
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={'h-2.5 w-2.5 shrink-0 rounded-full ' + tokens.dot}
                      style={{ boxShadow: `0 0 8px ${tokens.glow}` }}
                    />
                    <span className="font-sans text-sm font-bold tabular-nums text-white">
                      {r.time}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-sans text-xs text-white/60">
                      {r.label}
                    </span>
                    {r.learned && (
                      <span className="rounded-full border border-fuchsia-400/40 bg-fuchsia-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-fuchsia-300">
                        Learned
                      </span>
                    )}
                    {!r.learned && r.addedBy && (
                      <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-cyan-300">
                        {r.addedBy}
                      </span>
                    )}
                    <RoutineToggle enabled={enabled} label={r.label} onToggle={() => onToggle?.(r.id)} />
                    {r.addedBy && !r.learned && (
                      <button
                        type="button"
                        onClick={() => onRemove?.(r.id)}
                        aria-label={`Remove routine: ${r.label}`}
                        className="shrink-0 rounded-md px-1.5 text-white/40 transition-colors hover:text-rose-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
                      >
                        ✕
                      </button>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>

        {/* Add-a-routine form */}
        <form
          onSubmit={submit}
          className="flex h-fit flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
        >
          <span className="font-sans text-xs font-semibold uppercase tracking-wider text-white/70">
            Add a routine
          </span>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/45">Member</span>
            <select
              value={byMemberId}
              onChange={(e) => setByMemberId(e.target.value)}
              aria-label="Who is adding this routine"
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-sans text-sm text-white/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name.split(' ')[0]} · {m.relationship}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/45">Time</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              aria-label="Routine time"
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-sans text-sm text-white/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-white/45">What happens</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={48}
              placeholder="e.g. Evening tea + geyser on"
              aria-label="Routine description"
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-sans text-sm text-white/85 placeholder:text-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60"
            />
          </label>

          <button
            type="submit"
            disabled={!canAdd}
            className={
              'mt-1 rounded-lg px-4 py-2 font-sans text-sm font-semibold tracking-wide transition-all duration-200 ' +
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/70 ' +
              (canAdd
                ? 'bg-accent-cyan text-obsidian hover:brightness-110 shadow-[0_0_20px_rgba(34,211,238,0.3)]'
                : 'cursor-not-allowed bg-white/10 text-white/40')
            }
          >
            + Add to Household Rhythm
          </button>
          <p className="text-[10px] leading-snug text-white/35">
            Appears instantly on the dashboard Home Rhythm and is shared with everyone at home.
          </p>
        </form>
      </div>
    </section>
  );
}
