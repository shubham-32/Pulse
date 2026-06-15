// FamilyPage (Task 18) — the Household members view. Fully state-driven from
// the shared PULSE context: the header identity (homeLabel + Home ID), the
// "N of M home" summary, and the grid of member cards all derive from
// `members` / `homeLabel` / `homeId`. No member data is hardcoded in JSX.
//
// This page lives inside AppLayout's routed content area (the shell provides
// the ambient background + nav rail), so it uses normal top-aligned page flow
// and scrolls naturally — it is NOT a fixed-viewport locked layout.

import { motion } from 'framer-motion';
import { usePulse } from '../hooks/PulseProvider.jsx';
import { PanelHeading } from '../components/GlassPanel.jsx';
import MemberCard from '../components/MemberCard.jsx';
import AnnouncementsPanel from '../components/AnnouncementsPanel.jsx';
import RoutinesPanel from '../components/RoutinesPanel.jsx';

export default function FamilyPage() {
  const {
    members,
    homeId,
    homeLabel,
    currentMemberId,
    currentMember,
    announcements,
    sendAnnouncement,
    timelineEvents,
    addRoutine,
    toggleRoutine,
    removeRoutine,
  } = usePulse();

  const homeCount = members.filter((m) => m.presence === 'home').length;
  const totalCount = members.length;

  return (
    <div className="min-h-full w-full p-4 md:p-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* Page header: subtitle eyebrow, household label as title, Home ID chip
            and a one-line presence summary — all from state. */}
        <header>
          <div className="flex items-center gap-3">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-cyan animate-pulse" />
            <PanelHeading>Household</PanelHeading>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="font-sans text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              {homeLabel}
            </h1>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] tracking-wide text-white/50">
              {homeId}
            </span>
          </div>

          <p className="mt-3 font-sans text-sm text-white/55">
            <span className="font-semibold tabular-nums text-white/80">
              {homeCount} of {totalCount}
            </span>{' '}
            members home right now
          </p>
        </header>

        {/* Responsive grid of member cards with a stagger entrance. Equal-height
            cards (items-stretch + h-full on the card) keep the grid aligned. */}
        <motion.div
          className="mt-8 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
          }}
        >
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isCurrent={member.id === currentMemberId}
            />
          ))}
        </motion.div>

        {/* Household routine management — learned + member-added routines that
            drive the dashboard Home Rhythm (fully synced). */}
        <RoutinesPanel
          routines={timelineEvents}
          members={members}
          currentMember={currentMember}
          onAdd={addRoutine}
          onToggle={toggleRoutine}
          onRemove={removeRoutine}
        />

        {/* Task 19 — Household Announcements / Intercom: any member broadcasts
            to all; feed + spoken-by-PULSE relay stub. */}
        <AnnouncementsPanel
          announcements={announcements}
          members={members}
          currentMember={currentMember}
          onSend={sendAnnouncement}
        />
      </div>
    </div>
  );
}
