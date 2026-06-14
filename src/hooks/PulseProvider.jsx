// PulseProvider — single source of truth for the whole multi-page app (Task 16).
//
// Before routing, PulseDashboard called usePulseController() directly and owned
// all live state + the demo driver. Now that PULSE spans multiple routes
// (Dashboard, Rooms, Family, Insights, Automations, Settings), every page must
// read the SAME state — the same appliances, reasoning log, anticipations and
// the one running demo driver. To guarantee a single instance, we call
// usePulseController() exactly once here and hand its value down via context.
//
// Wrap the routed app in <PulseProvider> (around the layout) and consume with
// the usePulse() hook instead of calling usePulseController() per page.

import { createContext, useContext } from 'react';
import usePulseController from './usePulseController.js';

const PulseContext = createContext(null);

/**
 * PulseProvider — instantiates the controller once and provides it to the tree.
 * Because the hook (and its demo-driver useEffect) runs a single time at this
 * provider level, navigating between routes never restarts the demo or forks
 * state into separate copies.
 */
export default function PulseProvider({ children }) {
  const controller = usePulseController();
  return <PulseContext.Provider value={controller}>{children}</PulseContext.Provider>;
}

/**
 * usePulse — consumer hook. Returns the shared controller value. Throws if used
 * outside a <PulseProvider> so misuse fails loudly during development.
 */
export function usePulse() {
  const ctx = useContext(PulseContext);
  if (ctx === null) {
    throw new Error('usePulse() must be used within a <PulseProvider>.');
  }
  return ctx;
}
