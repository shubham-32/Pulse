// LoginPage — household entry / member-select screen (Task 17).
//
// The user "signs in" to a household by its Home ID, picks their member
// profile, and enters a demo PIN. On success they call signIn(memberId) and
// enter the dashboard. This anchors the multi-page product: members, devices
// and announcements all belong to one Home ID.
//
// This is a full-screen route rendered OUTSIDE the AppLayout shell (no nav
// rail). AmbientBackground is rendered here too so the obsidian + copper
// identity is consistent with the rest of PULSE.
//
// Demo auth only: any 4-digit PIN is accepted (hint shows 1234). The real
// Home-ID verification / identity check would replace the local submit handler.
// TODO: Wire API connection to Python/AWS Bedrock endpoint here

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePulse } from '../hooks/PulseProvider.jsx';
import AmbientBackground from '../components/AmbientBackground.jsx';
import GlassPanel, { PanelHeading } from '../components/GlassPanel.jsx';

// Initials from a full name, e.g. "Rajesh Sharma" -> "RS".
function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

export default function LoginPage() {
  const { homeId, homeLabel, members, signIn } = usePulse();
  const navigate = useNavigate();

  // Default-highlight the head of household (first member) but require an
  // explicit selection + Sign In click before entering.
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id ?? null);
  const [pin, setPin] = useState('');

  const pinValid = /^\d{4}$/.test(pin);
  const canSubmit = Boolean(selectedMemberId) && pinValid;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    // Demo: any 4-digit PIN is accepted. Real verification goes here.
    // TODO: Wire API connection to Python/AWS Bedrock endpoint here
    signIn(selectedMemberId);
    navigate('/', { replace: true });
  };

  return (
    <>
      <AmbientBackground />

      <div className="relative min-h-screen w-full flex items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <GlassPanel className="p-8 md:p-10">
            {/* PULSE mark + household identity */}
            <div className="flex flex-col items-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-cyan/10 text-accent-cyan shadow-[0_0_28px_rgba(34,211,238,0.25)]">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" fill="currentColor" />
                  <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
                </svg>
              </span>
              <h1 className="mt-4 font-sans text-2xl font-extrabold tracking-tight text-white">
                Welcome to PULSE
              </h1>
              <p className="mt-1 font-sans text-sm text-white/55">
                Sign in to <span className="text-white/80">{homeLabel}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
              {/* Home ID — read-only/prefilled for the demo (single household). */}
              <div>
                <label
                  htmlFor="home-id"
                  className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/50"
                >
                  Home ID
                </label>
                <input
                  id="home-id"
                  type="text"
                  value={homeId}
                  readOnly
                  aria-label="Home ID"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5
                             font-mono text-sm tracking-wider text-accent-cyan/90
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/70"
                />
              </div>

              {/* Member select — avatar tiles */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <PanelHeading>Who's signing in?</PanelHeading>
                </div>
                <div
                  role="radiogroup"
                  aria-label="Select your profile"
                  className="grid grid-cols-2 gap-2.5"
                >
                  {members.map((m) => {
                    const selected = m.id === selectedMemberId;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={`${m.name}, ${m.relationship}`}
                        onClick={() => setSelectedMemberId(m.id)}
                        className={[
                          'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left',
                          'transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/70',
                          selected
                            ? 'border-accent-cyan/60 bg-accent-cyan/10 shadow-[0_0_18px_rgba(34,211,238,0.18)]'
                            : 'border-white/10 bg-white/5 hover:bg-white/10',
                        ].join(' ')}
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-obsidian"
                          style={{ backgroundColor: m.avatarColor }}
                        >
                          {initialsOf(m.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-white">
                            {m.name.split(' ')[0]}
                          </span>
                          <span className="block truncate text-[11px] text-white/50">
                            {m.relationship}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Demo PIN */}
              <div>
                <label
                  htmlFor="pin"
                  className="mb-2 block text-xs font-medium uppercase tracking-wider text-white/50"
                >
                  PIN
                </label>
                <input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  aria-label="4-digit PIN"
                  placeholder="••••"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5
                             text-center font-mono text-lg tracking-[0.6em] text-white placeholder:tracking-[0.6em]
                             placeholder:text-white/25
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/70"
                />
                <p className="mt-2 text-[11px] text-white/35">
                  Demo mode — any 4-digit PIN works (try 1234).
                </p>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className={[
                  'mt-1 w-full rounded-xl px-4 py-3 text-sm font-semibold tracking-wide',
                  'transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/70',
                  canSubmit
                    ? 'bg-accent-cyan text-obsidian shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:brightness-110'
                    : 'cursor-not-allowed bg-white/10 text-white/40',
                ].join(' ')}
              >
                Sign In
              </button>
            </form>
          </GlassPanel>

          <p className="mt-4 text-center font-mono text-[11px] text-white/25">
            {homeId} · Secure household session
          </p>
        </motion.div>
      </div>
    </>
  );
}
