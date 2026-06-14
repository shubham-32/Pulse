// DashboardPage — the hero index route ('/') of PULSE (Task 16).
//
// This is the original PulseDashboard composition, moved under pages/ and wired
// to the shared controller via context. Two deliberate changes vs. the old
// single-page version:
//   1. It no longer renders <AmbientBackground/> — the app shell (AppLayout)
//      renders it once for every route, so rendering it here too would stack a
//      second background.
//   2. It consumes usePulse() (shared context) instead of calling
//      usePulseController() directly, so Rooms/Family/etc. read the same live
//      state and the demo driver runs once at the provider level.
//
// The layout (header + three columns + bottom shelf) is otherwise unchanged, so
// the dashboard looks and behaves exactly as before — now inside the shell with
// the nav rail to its left. The outer wrapper uses min-h-full (it lives inside
// the shell's bounded, scrollable content area) instead of the old min-h-screen.

import { COLOR_MAP } from '../data/constants.js';
import { usePulse } from '../hooks/PulseProvider.jsx';
import GlassPanel, { PanelHeading } from '../components/GlassPanel.jsx';
import Header from '../components/Header.jsx';
import HouseholdRhythmTimeline from '../components/HouseholdRhythmTimeline.jsx';
import AcousticPulse from '../components/AcousticPulse.jsx';
import SensoryVideoPane from '../components/SensoryVideoPane.jsx';
import ReasoningTerminal from '../components/ReasoningTerminal.jsx';
import ApplianceShelf from '../components/InterventionShelf.jsx';
import AnticipationPanel from '../components/AnticipationPanel.jsx';
import AskPulseBar from '../components/AskPulseBar.jsx';

export default function DashboardPage() {
  // Shared state + controller + demo driver come from context (one instance).
  const {
    timelineEvents,
    appliances,
    reasoningLog,
    waveAmplitude,
    isListening,
    isCameraOn,
    lastVideoEvent,
    anticipations,
    approveAnticipation,
    snoozeAnticipation,
    askPulse,
  } = usePulse();

  return (
    <div className="relative min-h-full w-full flex flex-col gap-4 p-1 md:p-2 lg:p-3">
      {/* Header pinned top-left */}
      <Header isListening={isListening} />

      {/* Main row: three columns (timeline ~22% / pulse flex-1 / terminal ~26%).
          On small screens columns stack with a comfortable min-height. On lg+
          the row is BOUNDED to roughly one viewport so its flex children have a
          definite box: their own content scrolls internally instead of growing
          the page. */}
      <main className="flex-1 flex flex-col lg:flex-row gap-4 md:gap-6 min-h-[640px] lg:h-[calc(100vh-9rem)] lg:min-h-[560px] lg:max-h-[820px]">
        {/* Left: Household Rhythm Timeline + "PULSE Predicts" (~22%). */}
        <GlassPanel className="w-full lg:w-[22%] p-5 flex flex-col min-h-0">
          <PanelHeading>Household Rhythm Timeline</PanelHeading>
          <div className="flex-1 min-h-0 overflow-y-auto pulse-scroll -mr-2 pr-2">
            <HouseholdRhythmTimeline events={timelineEvents} colorMap={COLOR_MAP} />

            {/* Second labeled section in the left pane: upcoming AI actions. */}
            <div className="mt-7 border-t border-white/10 pt-5">
              <AnticipationPanel
                anticipations={anticipations}
                appliances={appliances}
                onApprove={approveAnticipation}
                onSnooze={snoozeAnticipation}
              />
            </div>
          </div>
        </GlassPanel>

        {/* Center: The Acoustic Pulse (flex-1) + a compact Sensor-Fusion video
            tile beneath it. The sphere stays the prominent centerpiece (it
            takes the remaining flex space); the video tile is intentionally
            short so the bounded one-viewport row never overflows. */}
        <GlassPanel className="w-full lg:flex-1 p-5 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 flex flex-col">
            <AcousticPulse waveAmplitude={waveAmplitude} />
          </div>
          <SensoryVideoPane
            className="mt-4"
            isMicOn={isListening}
            isCameraOn={isCameraOn}
            cameraLabel="Balcony Cam"
            detection={lastVideoEvent}
          />
        </GlassPanel>

        {/* Right: Reasoning Engine terminal (~26%) with the "Ask PULSE" bar
            pinned directly beneath it. */}
        <GlassPanel className="w-full lg:w-[26%] p-5 flex flex-col min-h-0">
          <PanelHeading>Reasoning Engine (Bedrock's Brain)</PanelHeading>
          <ReasoningTerminal log={reasoningLog} />
          <AskPulseBar onAsk={askPulse} />
        </GlassPanel>
      </main>

      {/* Bottom shelf: AI-managed intervention cards (Requirement 6). */}
      <ApplianceShelf appliances={appliances} />
    </div>
  );
}
