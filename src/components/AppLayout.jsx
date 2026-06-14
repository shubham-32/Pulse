// AppLayout — the app shell that wraps every route (Task 16).
//
// Responsibilities:
//   - Render AmbientBackground exactly ONCE here (it was previously rendered by
//     PulseDashboard; moving it to the shell prevents stacked backgrounds when
//     pages are swapped).
//   - Render the persistent NavRail on the far left.
//   - Provide an <Outlet/> content area to the right where each routed page
//     renders. The shell is full-height; the content area is the box the
//     dashboard (and other pages) live inside, accounting for the rail width.
//
// Layout note: the outer container is h-screen + overflow-hidden so the shell
// itself never scrolls. The dashboard manages its own min-h / per-pane scroll
// inside the content area, so we give the content region overflow-y-auto to let
// taller pages (or the dashboard's breathing layout) scroll within the shell.

import { Outlet } from 'react-router-dom';
import AmbientBackground from './AmbientBackground.jsx';
import NavRail from './NavRail.jsx';

export default function AppLayout() {
  return (
    <>
      {/* Single ambient canvas behind everything. */}
      <AmbientBackground />

      <div className="relative h-screen w-full flex gap-3 p-3 md:p-4">
        {/* Persistent left icon rail. */}
        <NavRail />

        {/* Routed page content. min-w-0 lets flex children shrink correctly;
            overflow-y-auto lets a page scroll inside the shell when needed. */}
        <main className="relative flex-1 min-w-0 h-full overflow-y-auto pulse-scroll">
          <Outlet />
        </main>
      </div>
    </>
  );
}
