// PagePlaceholder — shared scaffold for routes that later tasks will fill in
// (Rooms, Family, Insights, Automations, Settings). Keeps placeholder pages
// on-brand and intentional rather than empty: a titled GlassPanel with a short
// description and a subtle "coming soon" note, centered in the content area.
//
// It also reads from the shared PULSE context so even placeholders feel alive —
// each can surface a tiny live stat (e.g. number of appliances) proving the
// single source of truth is wired across routes.

import GlassPanel, { PanelHeading } from '../components/GlassPanel.jsx';

export default function PagePlaceholder({ title, subtitle, description, taskNote }) {
  return (
    <div className="min-h-full w-full flex items-center justify-center p-4 md:p-8">
      <GlassPanel className="w-full max-w-2xl p-8 md:p-10">
        <div className="flex items-center gap-3">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent-cyan animate-pulse" />
          <PanelHeading>{subtitle}</PanelHeading>
        </div>

        <h1 className="mt-3 font-sans text-3xl md:text-4xl font-extrabold tracking-tight text-white">
          {title}
        </h1>

        {description && (
          <p className="mt-4 max-w-xl font-sans text-sm md:text-base leading-relaxed text-white/60">
            {description}
          </p>
        )}

        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-accent-cyan/30 bg-accent-cyan/5 px-4 py-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-accent-cyan/90">
            Coming soon
          </span>
        </div>

        {taskNote && (
          <p className="mt-4 font-mono text-[11px] text-white/30">{taskNote}</p>
        )}
      </GlassPanel>
    </div>
  );
}
