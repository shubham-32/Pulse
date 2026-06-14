// NavRail — slim persistent vertical icon rail on the far left (Task 16).
//
// Glassmorphism styling matches the rest of PULSE (obsidian + cyan). The PULSE
// mark sits at the top; below it a column of NavLinks routes to each page. Each
// item:
//   - is a react-router <NavLink> (drives the active state automatically)
//   - shows a flat inline SVG icon (no icon-font dependency)
//   - carries an aria-label + a native title tooltip + a small hover label
//   - has an accent-cyan glow indicator when active, plus hover/focus-visible
//     states for keyboard users.

import { NavLink, useNavigate } from 'react-router-dom';
import { usePulse } from '../hooks/PulseProvider.jsx';
import Avatar from './Avatar.jsx';

// --- Inline flat SVG icons (stroke-based, currentColor) -------------------
// 24x24 viewBox, 1.6 stroke. currentColor lets the link control the tint.
const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

function DashboardIcon() {
  // Pulse/activity waveform — the dashboard hero.
  return (
    <svg {...iconProps}>
      <path d="M3 12h3l2.5-7 4 14 2.5-7H21" />
    </svg>
  );
}

function RoomsIcon() {
  // House outline.
  return (
    <svg {...iconProps}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}

function FamilyIcon() {
  // Two people.
  return (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.5a3 3 0 0 1 0 6" />
      <path d="M16.5 14a5.5 5.5 0 0 1 4 6" />
    </svg>
  );
}

function InsightsIcon() {
  // Bar chart.
  return (
    <svg {...iconProps}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M3 20h18" />
    </svg>
  );
}

function AutomationsIcon() {
  // Lightning bolt — routines.
  return (
    <svg {...iconProps}>
      <path d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z" />
    </svg>
  );
}

function SettingsIcon() {
  // Gear (simplified).
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
    </svg>
  );
}

function SignOutIcon() {
  // Door + arrow — sign out.
  return (
    <svg {...iconProps}>
      <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
      <path d="M9 12h11" />
      <path d="m16 8 4 4-4 4" />
    </svg>
  );
}

// Nav model — order defines vertical layout. `end` makes the index route only
// match exactly "/" (so Dashboard isn't highlighted on every nested path).
const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', Icon: DashboardIcon, end: true },
  { to: '/rooms', label: 'Rooms', Icon: RoomsIcon },
  { to: '/family', label: 'Family', Icon: FamilyIcon },
  { to: '/insights', label: 'Insights', Icon: InsightsIcon },
  { to: '/automations', label: 'Automations', Icon: AutomationsIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
];

export default function NavRail() {
  const { currentMember, signOut } = usePulse();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  return (
    <nav
      aria-label="Primary"
      className="shrink-0 w-16 md:w-20 h-full flex flex-col items-center gap-3 py-4
                 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl
                 shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
    >
      {/* PULSE mark — concentric pulse glyph, links home. */}
      <NavLink
        to="/"
        end
        aria-label="PULSE home"
        title="PULSE"
        className="group relative flex h-11 w-11 items-center justify-center rounded-xl
                   text-accent-cyan transition-colors
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/70"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
        </svg>
      </NavLink>

      <div className="my-1 h-px w-8 bg-white/10" />

      {/* Nav items */}
      <ul className="flex w-full flex-1 flex-col items-center gap-2">
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <li key={to} className="w-full px-2">
            <NavLink
              to={to}
              end={end}
              aria-label={label}
              title={label}
              className={({ isActive }) =>
                [
                  'group relative flex flex-col items-center justify-center gap-1 rounded-xl py-2.5',
                  'transition-colors duration-200',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/70',
                  isActive
                    ? 'text-accent-cyan bg-accent-cyan/10 shadow-[0_0_18px_rgba(34,211,238,0.25)]'
                    : 'text-white/55 hover:text-white hover:bg-white/5',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator bar on the left edge */}
                  <span
                    aria-hidden="true"
                    className={
                      'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full ' +
                      'transition-opacity duration-200 bg-accent-cyan ' +
                      (isActive
                        ? 'opacity-100 shadow-[0_0_10px_rgba(34,211,238,0.8)]'
                        : 'opacity-0')
                    }
                  />
                  <Icon />
                  {/* Compact label under the icon (hidden on the narrowest rail) */}
                  <span className="hidden md:block text-[10px] font-medium tracking-wide">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Current member + sign out (Task 17) */}
      {currentMember && (
        <div className="mt-auto flex w-full flex-col items-center gap-2 px-2">
          <div className="my-1 h-px w-8 bg-white/10" />
          <span title={`${currentMember.name} · ${currentMember.relationship}`}>
            <Avatar member={currentMember} size={36} />
          </span>
          <span className="hidden md:block max-w-full truncate text-[10px] font-medium text-white/60">
            {currentMember.name.split(' ')[0]}
          </span>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label={`Sign out ${currentMember.name}`}
            title="Sign out"
            className="group flex h-9 w-9 items-center justify-center rounded-xl text-white/55
                       transition-colors duration-200 hover:bg-white/5 hover:text-accent-orange
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/70"
          >
            <SignOutIcon />
          </button>
        </div>
      )}
    </nav>
  );
}
