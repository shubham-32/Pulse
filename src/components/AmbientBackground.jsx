// AmbientBackground — full-viewport fixed obsidian canvas (#05060B) with a
// warm, low-opacity copper/amber radial glow anchored in the bottom-right
// quadrant (Requirement 1.2). Extracted unchanged in the Task 9 refactor.

export default function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 bg-obsidian"
      style={{
        background:
          'radial-gradient(60% 60% at 85% 88%, rgba(217, 119, 60, 0.18) 0%, rgba(217, 119, 60, 0.06) 35%, rgba(5, 6, 11, 0) 70%), #05060B',
      }}
    />
  );
}
