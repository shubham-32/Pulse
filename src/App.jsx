// App — routing root for PULSE (Task 16).
//
// PULSE is now a multi-page product. We set up client-side routing here with a
// single layout route (AppLayout: ambient background + nav rail + content
// outlet) and nested page routes. The whole routed tree is wrapped in
// PulseProvider so every page shares ONE controller instance (and the demo
// driver runs exactly once) regardless of which route is active.
//
//   /            -> DashboardPage  (the hero index route)
//   /rooms       -> RoomsPage      (placeholder, Task 20)
//   /family      -> FamilyPage     (placeholder, Task 18)
//   /insights    -> InsightsPage   (placeholder, Task 21)
//   /automations -> AutomationsPage(placeholder, Task 24)
//   /settings    -> SettingsPage   (placeholder, Task 23/24)
//   *            -> redirect to /

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PulseProvider, { usePulse } from './hooks/PulseProvider.jsx';
import AppLayout from './components/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import RoomsPage from './pages/RoomsPage.jsx';
import FamilyPage from './pages/FamilyPage.jsx';
import InsightsPage from './pages/InsightsPage.jsx';
import AutomationsPage from './pages/AutomationsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

/**
 * RequireAuth — route guard for the authenticated app shell. If no member is
 * signed in (currentMemberId is null) it redirects to the full-screen /login
 * route; otherwise it renders the protected children (the AppLayout shell).
 * The app starts logged OUT so the login flow demos on load.
 */
function RequireAuth({ children }) {
  const { currentMemberId } = usePulse();
  if (!currentMemberId) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      {/* One source of truth for all routes — including the login screen, so
          usePulse() works there too. */}
      <PulseProvider>
        <Routes>
          {/* Full-screen login route, OUTSIDE the AppLayout shell (no nav rail). */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated app shell — gated by RequireAuth. */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="family" element={<FamilyPage />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="automations" element={<AutomationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            {/* Unknown paths fall back to the dashboard. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </PulseProvider>
    </BrowserRouter>
  );
}
