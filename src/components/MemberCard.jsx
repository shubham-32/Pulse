// MemberCard (Task 18) — a single household member rendered as a premium glass
// card. Every value is derived from the member record passed in `member`
// (nothing hardcoded): the avatar circle tints from `avatarColor` and shows
// initials derived from `name`; age is computed from the ISO `dob` at render;
// and a presence indicator reflects `presence` ('home' | 'away'). The signed-in
// member is marked with a subtle "You" badge via the `isCurrent` flag.

import { motion } from 'framer-motion';
import Avatar from './Avatar.jsx';

/** computeAge — whole years between the ISO `dob` and now (clamped to >= 0). */
function computeAge(dob) {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}

export default function MemberCard({ member, isCurrent = false }) {
  const { name, relationship, dob, presence } = member;

  const age = computeAge(dob);
  const isHome = presence === 'home';

  return (
    <motion.div
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {/* "You" badge for the signed-in member — subtle accent chip, top-right. */}
      {isCurrent && (
        <span className="absolute right-3 top-3 inline-flex items-center rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-cyan/90">
          You
        </span>
      )}

      {/* Top row: avatar (image with initials fallback) + glow ring. */}
      <div className="flex items-center gap-4">
        <Avatar member={member} size={56} />

        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-sans text-base font-bold text-white">
            {name}
          </span>
          <span className="truncate font-sans text-xs text-white/45">
            {relationship}
          </span>
        </div>
      </div>

      {/* Meta row: age (derived) + presence indicator. Pushed to the bottom so
          cards line up regardless of name length. */}
      <div className="mt-5 flex items-end justify-between">
        <div className="flex flex-col">
          <span className="font-sans text-[11px] uppercase tracking-wider text-white/35">
            Age
          </span>
          <span className="font-sans text-sm font-semibold tabular-nums text-white/80">
            {age === null ? '—' : `${age} yrs`}
          </span>
        </div>

        {/* Presence: glowing cyan/green dot + label when home, dim grey away. */}
        <span
          className={
            'inline-flex items-center gap-2 rounded-full border px-3 py-1 ' +
            (isHome
              ? 'border-emerald-400/30 bg-emerald-400/5'
              : 'border-white/10 bg-white/5')
          }
        >
          <span
            aria-hidden="true"
            className={
              'h-2 w-2 rounded-full ' + (isHome ? 'bg-emerald-400' : 'bg-white/25')
            }
            style={
              isHome
                ? { boxShadow: '0 0 8px 1px #22d3ee, 0 0 14px 3px #22d3ee66' }
                : undefined
            }
          />
          <span
            className={
              'font-sans text-[11px] font-medium ' +
              (isHome ? 'text-emerald-300/90' : 'text-white/40')
            }
          >
            {isHome ? 'Home' : 'Away'}
          </span>
        </span>
      </div>
    </motion.div>
  );
}
