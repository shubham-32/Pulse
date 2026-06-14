// GlassPanel — reusable glassmorphism wrapper (Requirement 1.4) plus the small
// shared PanelHeading section title. Extracted unchanged in the Task 9 refactor.

/**
 * GlassPanel
 * Reusable glassmorphism wrapper. Accepts className + children.
 */
export default function GlassPanel({ className = '', children }) {
  return (
    <div
      className={
        'backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl ' +
        'shadow-[0_8px_40px_rgba(0,0,0,0.45)] ' +
        className
      }
    >
      {children}
    </div>
  );
}

/**
 * PanelHeading — small section title used inside panels. Exported here so it
 * stays importable alongside the glass wrapper it labels.
 */
export function PanelHeading({ children }) {
  return (
    <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-white/70">
      {children}
    </h2>
  );
}
