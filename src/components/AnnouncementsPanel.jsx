// AnnouncementsPanel (Task 19) — the Household Intercom. Any signed-in member
// can broadcast a message to the whole home; PULSE relays it and (stub) speaks
// it on every device. Fully state-driven: the compose row shows the signed-in
// member as the speaker, and the feed resolves each announcement's sender from
// `members` by `fromMemberId` (graceful fallback when the id is missing).
//
// On-brand: obsidian glass + cyan accent, real <form> semantics (Enter submits,
// disabled while empty), aria-labels + focus-visible rings, and a Framer Motion
// AnimatePresence enter animation as new announcements arrive newest-first.

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassPanel, { PanelHeading } from './GlassPanel.jsx';

// Quick-suggestion chips — tasteful one-tap prefills for common household
// broadcasts. Selecting one drops the text into the compose field (not sent).
const SUGGESTIONS = ["Dinner's ready", 'Leaving in 10', 'Power cut at 2 PM'];

/** deriveInitials — first letters of the first two name words, uppercased. */
function deriveInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Avatar — initials chip tinted from the member's avatarColor. */
function Avatar({ name, color = '#22d3ee', size = 'md' }) {
  const dims = size === 'sm' ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm';
  return (
    <span
      aria-hidden="true"
      className={`flex ${dims} shrink-0 items-center justify-center rounded-full font-sans font-bold ring-2 ring-white/10`}
      style={{
        backgroundColor: `${color}26`,
        color,
        boxShadow: `0 0 14px ${color}44, inset 0 0 10px ${color}22`,
      }}
    >
      {deriveInitials(name)}
    </span>
  );
}

/** SpeakerIcon — small speaker/broadcast glyph signalling a spoken relay. */
function SpeakerIcon({ className = '' }) {
  return (
    <svg
      width={13}
      height={13}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

/** SendIcon — paper-plane glyph for the broadcast button. */
function SendIcon({ className = '' }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
    </svg>
  );
}

export default function AnnouncementsPanel({
  announcements = [],
  members = [],
  currentMember = null,
  onSend,
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  const trimmed = value.trim();
  const speakerName = currentMember?.name || 'Household';
  const speakerColor = currentMember?.avatarColor || '#22d3ee';

  // Resolve an announcement's sender record from members (graceful fallback).
  const resolveSender = (fromMemberId) =>
    members.find((m) => m.id === fromMemberId) || {
      name: 'Household',
      avatarColor: '#94a3b8',
    };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!trimmed) return;
    onSend?.(trimmed);
    setValue('');
    inputRef.current?.focus();
  };

  const handleChip = (text) => {
    setValue(text);
    inputRef.current?.focus();
  };

  return (
    <GlassPanel className="mt-8 p-5 md:p-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <span className="inline-flex text-accent-cyan/80" aria-hidden="true">
          <SpeakerIcon className="h-4 w-4" />
        </span>
        <PanelHeading>Household Intercom</PanelHeading>
      </div>
      <p className="mt-2 font-sans text-xs text-white/45">
        Broadcast to every room — PULSE relays and speaks it on all devices.
      </p>

      {/* Compose row */}
      <form
        onSubmit={handleSubmit}
        aria-label="Broadcast a household announcement"
        className="mt-4"
      >
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-xl transition-colors duration-200 focus-within:border-accent-cyan/40 focus-within:bg-white/[0.07]">
          {/* Who is speaking — the signed-in member */}
          <Avatar name={speakerName} color={speakerColor} size="sm" />

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Announce to the whole home…"
            aria-label="Announcement message"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent font-sans text-sm text-white/90 placeholder-white/35 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!trimmed}
            aria-label="Broadcast announcement to all devices"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-3.5 py-2 font-sans text-[11px] font-semibold uppercase tracking-wide text-accent-cyan transition-colors duration-200 hover:bg-accent-cyan/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30"
          >
            <SendIcon />
            <span className="hidden sm:inline">Broadcast</span>
          </button>
        </div>

        {/* Quick-suggestion chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleChip(s)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-sans text-[11px] text-white/55 transition-colors duration-200 hover:border-accent-cyan/30 hover:bg-accent-cyan/10 hover:text-accent-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50"
            >
              {s}
            </button>
          ))}
        </div>
      </form>

      {/* Feed — newest first */}
      <ul className="mt-6 flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {announcements.length === 0 ? (
            <motion.li
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center font-sans text-sm text-white/40"
            >
              No announcements yet — broadcast the first one above.
            </motion.li>
          ) : (
            announcements.map((a) => {
              const sender = resolveSender(a.fromMemberId);
              return (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
                >
                  <Avatar name={sender.name} color={sender.avatarColor} />

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-sans text-sm font-bold text-white">
                        {sender.name}
                      </span>
                      <span className="font-mono text-[11px] tabular-nums text-white/40">
                        {a.timestamp}
                      </span>
                    </div>

                    <p className="mt-1 font-sans text-sm leading-relaxed text-white/80">
                      {a.text}
                    </p>

                    {/* Relayed-by-PULSE indicator */}
                    <span className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-accent-cyan/25 bg-accent-cyan/10 px-2.5 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wider text-accent-cyan/90">
                      <SpeakerIcon className="h-3 w-3" />
                      Announced on all devices
                    </span>
                  </div>
                </motion.li>
              );
            })
          )}
        </AnimatePresence>
      </ul>
    </GlassPanel>
  );
}
