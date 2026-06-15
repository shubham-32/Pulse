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

import { useEffect, useState, useCallback, useRef } from 'react';
import { COLOR_MAP } from '../data/constants.js';
import { usePulse } from '../hooks/PulseProvider.jsx';
import GlassPanel, { PanelHeading } from '../components/GlassPanel.jsx';
import Header from '../components/Header.jsx';
import HouseholdRhythmTimeline from '../components/HouseholdRhythmTimeline.jsx';
import KitchenCamPane from '../components/KitchenCamPane.jsx';
import AcousticPulse from '../components/AcousticPulse.jsx';
import ReasoningTerminal from '../components/ReasoningTerminal.jsx';
import ApplianceShelf from '../components/InterventionShelf.jsx';
import AnticipationPanel from '../components/AnticipationPanel.jsx';
import AskPulseBar from '../components/AskPulseBar.jsx';
import ScenarioDirector from '../components/ScenarioDirector.jsx';

// Static waveform bar heights — computed once, reused by every AudioTrack.
const WAVEFORM_BARS = Array.from({ length: 36 }, (_, i) => ({
  h: 22 + (Math.sin(i * 1.45) * 0.5 + 0.5) * 68,
}));

// Audio 1 carries the real puja ghanti recording; 2 & 3 are placeholders.
// src and onPlay are optional — absent means a silent placeholder track.
const AUDIO_TRACK_DEFS = [
  { name: 'Audio 1' },
  { name: 'Audio 2' },
  { name: 'Audio 3' },
];

function AudioPlayIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}

function AudioPauseIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="5" y="4" width="5" height="16" rx="1" />
      <rect x="14" y="4" width="5" height="16" rx="1" />
    </svg>
  );
}

function AudioTrack({ name, playing, onToggle, audioSrc, onPlay }) {
  const audioRef = useRef(null);
  // Keep onPlay stable across renders inside the effect.
  const onPlayRef = useRef(onPlay);
  useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);

  // Drive the actual <audio> element in sync with the `playing` flag.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.currentTime = 0;
      el.play().catch(() => {});
      onPlayRef.current?.();
    } else {
      el.pause();
    }
  }, [playing]);

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-white/5 hover:bg-white/[0.08] px-2.5 py-2 transition-colors">
      {/* Hidden audio element — only mounted for tracks that have a real source. */}
      {audioSrc && (
        <audio ref={audioRef} src={audioSrc} onEnded={onToggle} />
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? `Pause ${name}` : `Play ${name}`}
        className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full
                   bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/35
                   transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60"
      >
        {playing ? <AudioPauseIcon /> : <AudioPlayIcon />}
      </button>
      <span className="text-[11px] font-medium text-white/70 w-12 shrink-0">{name}</span>
      {/* Waveform bars + sweeping playhead */}
      <div className="relative flex-1 h-6 overflow-hidden rounded-sm">
        <div className="absolute inset-0 flex items-end gap-px px-0.5">
          {WAVEFORM_BARS.map((bar, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm transition-colors duration-300"
              style={{
                height: `${bar.h}%`,
                background: playing
                  ? 'rgba(34,211,238,0.42)'
                  : 'rgba(255,255,255,0.16)',
              }}
            />
          ))}
        </div>
        {playing && (
          <div
            aria-hidden="true"
            className="audio-playhead absolute top-0 bottom-0 w-[2px] rounded-full
                       bg-accent-cyan shadow-[0_0_8px_rgba(34,211,238,0.85)]"
          />
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  // Shared state + controller + demo driver come from context (one instance).
  const {
    timelineEvents,
    appliances,
    reasoningLog,
    waveAmplitude,
    isListening,
    anticipations,
    approveAnticipation,
    snoozeAnticipation,
    askPulse,
    setAutoDemo,
    triggerPujaAudio,
    prepareAudioMode,
  } = usePulse();

  const [feed, setFeed] = useState('camera');
  const [playingTrack, setPlayingTrack] = useState(null);

  const toggleTrack = useCallback((name) => {
    setPlayingTrack((prev) => (prev === name ? null : name));
  }, []);

  useEffect(() => {
    if (feed === 'audio') {
      setAutoDemo(false);
      setPlayingTrack(null);
      // Reset devices + swap reasoning log to "waiting" standby entries.
      prepareAudioMode();
    } else {
      setAutoDemo(true);
    }
  }, [feed, setAutoDemo, prepareAudioMode]);

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

        {/* Center: a live-sense pane (switchable Camera / Audio) on top with the
            Connected Devices shelf directly beneath it. The live-sense box is
            height-capped (via max-width on its 16:9 frame) so the devices fit
            below within the bounded centre column. */}
        <GlassPanel className="w-full lg:flex-1 p-3 md:p-4 flex flex-col gap-3 min-h-0">
          {/* Live Sense (reduced height, centered) */}
          <div className="shrink-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <PanelHeading>Live Sense</PanelHeading>
              <select
                aria-label="Select live sense feed"
                value={feed}
                onChange={(e) => setFeed(e.target.value)}
                className="rounded-lg border border-white/15 bg-black/40 px-2.5 py-1 font-sans text-[11px] text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/60"
              >
                <option value="camera">Live Camera Feed</option>
                <option value="audio">Live Audio Feed</option>
              </select>
            </div>

            <div className="mx-auto w-full max-w-[500px]">
              {feed === 'camera' ? (
                <KitchenCamPane />
              ) : (
                /* 1 : 2 split — left third: sphere UI, right two-thirds: label + track list */
                <div className="flex rounded-xl border border-white/10 bg-black/50 overflow-hidden h-44">
                  {/* Left 1/3 — AcousticPulse sphere */}
                  <div className="w-1/3 shrink-0 border-r border-white/10 flex flex-col">
                    <AcousticPulse waveAmplitude={waveAmplitude} compact />
                  </div>

                  {/* Right 2/3 — section label inline with the sphere + scrollable audio list */}
                  <div className="flex-1 flex flex-col gap-2 p-3 min-w-0">
                    <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.35em] text-accent-cyan/70">
                      Audio Logs
                    </p>
                    <div className="flex-1 overflow-y-auto pulse-scroll flex flex-col gap-1.5 -mr-1 pr-1 min-h-0">
                      {AUDIO_TRACK_DEFS.map(({ name }, idx) => (
                        <AudioTrack
                          key={name}
                          name={name}
                          playing={playingTrack === name}
                          onToggle={() => toggleTrack(name)}
                          audioSrc={idx === 0 ? '/audios/videoplayback.weba' : undefined}
                          onPlay={idx === 0 ? triggerPujaAudio : undefined}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Connected Devices — moved here, directly below the live sense. */}
          <div className="flex-1 min-h-0 overflow-y-auto pulse-scroll -mr-2 pr-2">
            <ApplianceShelf appliances={appliances} />
          </div>
        </GlassPanel>

        {/* Right: Reasoning Engine terminal (~26%) with the "Ask PULSE" bar
            pinned directly beneath it. */}
        <GlassPanel className="w-full lg:w-[26%] p-5 flex flex-col min-h-0">
          <PanelHeading>Reasoning Engine (Bedrock's Brain)</PanelHeading>
          <ReasoningTerminal log={reasoningLog} />
          <AskPulseBar onAsk={askPulse} />
        </GlassPanel>
      </main>

      {/* Presenter-only floating control to film clean, scripted scenarios. */}
      <ScenarioDirector />
    </div>
  );
}
