// usePulseController — owns ALL dashboard state, the single event-pipeline
// controller, and the demo driver (Task 9 refactor; Requirement 7). Behaviour
// is identical to the original PulseDashboard: audio triggers spike the wave,
// stream a structured reasoning burst, and update the mapped appliance — in one
// atomic update path. The controller is generalized to handleSensoryTrigger so
// later tasks (e.g. video fusion) can route through the same seam; the audio
// branch preserves exact current behaviour and handleAcousticTrigger remains a
// thin wrapper the demo driver calls.

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  PROFILE_TO_APPLIANCE,
  ACTION_TEXT,
  VIDEO_EVENT_TEXT,
  WAVE_BASELINE,
  WAVE_SPIKE,
  WAVE_DECAY_MS,
  LOG_CAP,
  DEMO_INTERVAL_MS,
  DEMO_PROFILES,
  VIDEO_DEMO_EVENTS,
  VIDEO_DEMO_INTERVAL_MS,
  formatTimestamp,
  nextLogId,
} from '../data/constants.js';
import {
  HOME_ID,
  HOME_LABEL,
  INITIAL_MEMBERS,
  INITIAL_ROOMS,
  INITIAL_TIMELINE_EVENTS,
  INITIAL_APPLIANCES,
  createInitialReasoningLog,
  INITIAL_NOTIFICATIONS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_ANTICIPATIONS,
  INITIAL_ENERGY,
} from '../data/initialState.js';

// Derived appliance-centric lookups for the anticipation handlers. Each
// anticipation targets an appliance; we map that appliance id back to the
// acoustic profile that drives it (PROFILE_TO_APPLIANCE) so we can reuse the
// existing per-profile ACTION_TEXT (agent name + pre-armed state string).
const APPLIANCE_TO_PROFILE = Object.entries(PROFILE_TO_APPLIANCE).reduce(
  (acc, [profile, applianceId]) => {
    // Keep the first profile mapped to each appliance (stable + sufficient).
    if (!(applianceId in acc)) acc[applianceId] = profile;
    return acc;
  },
  {}
);
const AGENT_FOR_APPLIANCE = Object.entries(APPLIANCE_TO_PROFILE).reduce(
  (acc, [applianceId, profile]) => {
    acc[applianceId] = ACTION_TEXT[profile]?.agent || 'SystemAgent';
    return acc;
  },
  {}
);

// --- "Ask PULSE" intent-matching tables (Task 14) -------------------------
//
// Lightweight, fully local keyword matcher standing in for a Bedrock NLU pass.
// DEVICE_KEYWORDS is ordered so multi-word devices win over generic ones (e.g.
// "exhaust fan" resolves to exhaust before the bare "fan" keyword). Each device
// maps back to an acoustic profile so explainability answers can reuse the
// existing ACTION_TEXT context strings.
const DEVICE_KEYWORDS = [
  { id: 'exhaust', words: ['exhaust', 'chimney', 'vent'] },
  { id: 'geyser', words: ['geyser', 'water heater'] },
  { id: 'fan', words: ['fan', 'breeze'] },
  { id: 'balcony', words: ['balcony', 'light', 'lights', 'lamp'] },
];
const DEVICE_TO_PROFILE = {
  exhaust: 'cooker_whistle',
  geyser: 'tap_running',
  fan: 'fan_hum',
  balcony: 'footsteps',
};
// Verbs that signal a command (vs. a question).
const COMMAND_VERBS = [
  'turn on', 'turn off', 'switch on', 'switch off', 'switch',
  'start', 'stop', 'set', 'enable', 'disable', 'pre-heat', 'preheat', 'heat',
];
// Words that flip a command to the OFF state.
const OFF_WORDS = ['off', 'stop', 'disable'];
// Presence-question phrasings.
const PRESENCE_PHRASES = [
  'anyone home', 'anybody home', 'who is home', "who's home", 'whos home',
  'is anyone in', 'who is in',
];

// --- Manual per-device control helpers (Task 20) --------------------------
//
// describeControl maps a control change to the human-readable `state` string
// shown on the device card and dashboard shelf (always tagged "— Manual" so it
// reads as a user override). activeFromControl decides whether a control value
// implies the device is on (e.g. speed/brightness 0 = off).
function describeControl(key, value) {
  switch (key) {
    case 'speed':
      return value <= 0 ? 'Off — Manual' : `Speed ${value} — Manual`;
    case 'brightness':
      return value <= 0 ? 'Off — Manual' : `Brightness ${value}% — Manual`;
    case 'tempC':
      return `${value}°C — Manual`;
    default:
      return `${key} ${value} — Manual`;
  }
}

function activeFromControl(key, value) {
  if (key === 'speed' || key === 'brightness') return value > 0;
  // Temperature (and any other) adjustments imply the device is in use.
  return true;
}

// --- Accessibility / UI preferences (Task 23) -----------------------------
//
// Two app-wide preferences the user can toggle from Settings:
//   - reducedMotion: minimises perpetual animations across PULSE.
//   - largerText:    bumps base font sizing for readability.
//
// Both persist to localStorage so a refresh keeps the choice, and both are
// reflected as classes on <html> (see the effect below) so a single CSS switch
// drives the whole app. reducedMotion DEFAULTS to the OS setting
// (prefers-reduced-motion) the first time, but the explicit toggle then wins.
const PREFS_STORAGE_KEY = 'pulse:prefs';

function osPrefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readStoredPrefs() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    // Corrupt/unavailable storage — fall back to defaults silently.
    return {};
  }
}

export default function usePulseController() {
  // --- State (all displayed data lives here; nothing hardcoded in render) ---

  // Household identity + family/rooms (Phase-2 seeds; not rendered yet).
  const [homeId] = useState(HOME_ID);
  const [homeLabel] = useState(HOME_LABEL);
  const [members] = useState(INITIAL_MEMBERS);
  const [rooms] = useState(INITIAL_ROOMS);

  // Learned routine windows (Requirement 3). Stateful since Task 24 so routines
  // can be enabled/disabled from the Automations page; the dashboard timeline
  // renders every window regardless (it ignores `enabled`).
  const [timelineEvents, setTimelineEvents] = useState(INITIAL_TIMELINE_EVENTS);

  // AI-managed appliances (Requirement 6). Mutated by the controller.
  const [appliances, setAppliances] = useState(INITIAL_APPLIANCES);

  // Terminal telemetry (Requirement 5). Seeded with boot entries (lazy init so
  // timestamps/ids are generated on first render, as before).
  const [reasoningLog, setReasoningLog] = useState(createInitialReasoningLog);

  // Acoustic sphere energy (Requirement 4.5). Baseline 1; spikes on trigger.
  const [waveAmplitude, setWaveAmplitude] = useState(WAVE_BASELINE);

  // Ambient idle indicator under the header.
  const [isListening] = useState(true);

  // Sensor-fusion camera channel (Task 22). isCameraOn drives the live-feed
  // indicators; lastVideoEvent is the most recent visual detection so the
  // SensoryVideoPane can surface a correlated bounding box / label overlay.
  const [isCameraOn] = useState(true);
  const [lastVideoEvent, setLastVideoEvent] = useState(null);

  // --- Accessibility / UI preferences (Task 23) ---------------------------
  //
  // Lazy initial state: stored choice wins; otherwise reducedMotion seeds from
  // the OS setting and largerText defaults off. Togglers/setters below let the
  // Settings page drive these, and an effect reflects them onto <html> + saves.
  const [reducedMotion, setReducedMotion] = useState(() => {
    const stored = readStoredPrefs();
    return typeof stored.reducedMotion === 'boolean'
      ? stored.reducedMotion
      : osPrefersReducedMotion();
  });
  const [largerText, setLargerText] = useState(() => {
    const stored = readStoredPrefs();
    return typeof stored.largerText === 'boolean' ? stored.largerText : false;
  });

  const toggleReducedMotion = useCallback(() => setReducedMotion((v) => !v), []);
  const toggleLargerText = useCallback(() => setLargerText((v) => !v), []);

  // Reflect preferences app-wide: toggle classes on <html> so one CSS switch
  // drives every page/component, and persist the pair to localStorage.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.toggle('pulse-reduce-motion', reducedMotion);
      root.classList.toggle('pulse-large-text', largerText);
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(
          PREFS_STORAGE_KEY,
          JSON.stringify({ reducedMotion, largerText })
        );
      } catch {
        // Ignore storage write failures (private mode, quota, etc.).
      }
    }
  }, [reducedMotion, largerText]);

  // --- Session / auth (Task 17) ---------------------------------------------
  //
  // Lightweight demo session: which household member is "signed in". null means
  // logged out (the login screen gates the app). No real authentication — the
  // LoginPage accepts any 4-digit demo PIN — but this is the seam where a real
  // Home-ID + identity verification call would live.
  //
  // TODO: Wire API connection to Python/AWS Bedrock endpoint here
  //   Replace signIn() with a real auth/Home-ID verification call, e.g.:
  //     const session = await verifyHomeMember(homeId, memberId, pin);
  //     setCurrentMemberId(session.memberId);
  const [currentMemberId, setCurrentMemberId] = useState(null);

  const signIn = useCallback((memberId) => {
    // TODO: Wire API connection to Python/AWS Bedrock endpoint here
    setCurrentMemberId(memberId);
  }, []);

  const signOut = useCallback(() => {
    // TODO: Wire API connection to Python/AWS Bedrock endpoint here
    setCurrentMemberId(null);
  }, []);

  // Phase-2 seeds for later tasks (outcomes, notifications, foresight).
  const [notifications] = useState(INITIAL_NOTIFICATIONS);
  const [announcements, setAnnouncements] = useState(INITIAL_ANNOUNCEMENTS);
  // Anticipated upcoming actions ("PULSE Predicts", Task 13). Mutated as the
  // user approves/snoozes predictions.
  const [anticipations, setAnticipations] = useState(INITIAL_ANTICIPATIONS);
  const [energy] = useState(INITIAL_ENERGY);

  // Demo Director (Option A): when true, the ambient random drivers run so the
  // dashboard feels live on its own. A scripted scenario pauses them (sets this
  // false) so the staged choreography plays cleanly for filming.
  const [isAutoDemo, setIsAutoDemo] = useState(true);
  const toggleAutoDemo = useCallback(() => setIsAutoDemo((v) => !v), []);

  // Demo Director cinematic beat — the current "Anticipation Theater" step the
  // center-stage overlay renders during a scripted scenario (null when idle).
  const [scenarioBeat, setScenarioBeat] = useState(null);

  // Holds pending amplitude-decay timers so we can clear them on unmount.
  const decayTimersRef = useRef([]);
  // Holds pending scenario step timers so we can clear/replace a running
  // scripted scenario (Demo Director) and clean up on unmount.
  const scenarioTimersRef = useRef([]);

  // --- The single event pipeline controller (Requirement 7.1, 7.2) ----------
  //
  // handleSensoryTrigger(type, payload) is the generalized seam. For now only
  // 'audio' is implemented; its behaviour matches the original
  // handleAcousticTrigger exactly. Future sensory channels (e.g. 'video') add
  // new branches here and flow through the same atomic update path.

  const handleSensoryTrigger = useCallback((type, payload = {}) => {
    // --- Video sensory channel (Task 22, sensor fusion) ---------------------
    // Visual detections flow through the SAME controller as audio so they
    // stream into the reasoning terminal, react the shared sphere, and update
    // appliances — proving one unified sensory pipeline (audio + video).
    if (type === 'video') {
      const { event: videoEvent, confidence, zone: payloadZone } = payload;
      const timestamp = formatTimestamp();

      // Clamp confidence to 0–100 for display (matches the audio branch).
      const score = Math.max(0, Math.min(100, Math.round(Number(confidence) || 0)));

      const info = VIDEO_EVENT_TEXT[videoEvent];
      const label = info?.label || videoEvent || 'Visual Event';
      const zone = payloadZone || info?.zone || 'Home';
      const contextText = info?.context || 'Unrecognized Visual Pattern';
      const agent = info?.agent || 'SecurityAgent';
      const targetId = info?.appliance;

      // TODO: Wire API connection to Python/AWS Bedrock endpoint here
      //   Real CV / WebRTC detections (object/person/motion) plug in here and
      //   call handleSensoryTrigger('video', { event, confidence, zone }).

      // (1) Spike the shared acoustic sphere so audio + video fusion reacts
      //     through the same amplitude path (then ease back to baseline).
      setWaveAmplitude(WAVE_SPIKE);
      const decayTimer = setTimeout(() => {
        setWaveAmplitude(WAVE_BASELINE);
      }, WAVE_DECAY_MS);
      decayTimersRef.current.push(decayTimer);

      // (2) Append a structured reasoning burst (Visual Trigger -> Context -> Action).
      const burst = [
        { id: nextLogId(), timestamp, agent, text: `Visual Trigger: ${label} detected at ${zone} (${score}% Match)` },
        { id: nextLogId(), timestamp, agent, text: `Context Check: ${contextText}` },
        { id: nextLogId(), timestamp, agent, text: `Action Triggered: ${info?.action || 'None — Monitoring'}` },
      ];
      setReasoningLog((prev) => {
        const merged = [...prev, ...burst];
        return merged.length > LOG_CAP ? merged.slice(merged.length - LOG_CAP) : merged;
      });

      // (3) Update the mapped appliance when the event implies one.
      if (targetId && info?.applianceState) {
        setAppliances((prev) =>
          prev.map((a) =>
            a.id === targetId ? { ...a, active: true, state: info.applianceState } : a
          )
        );
      }

      // (4) Surface the latest detection for the live-feed pane overlay.
      setLastVideoEvent({ event: videoEvent, label, zone, score, agent, ts: Date.now() });
      return;
    }

    if (type !== 'audio') {
      // TODO: Wire API connection to Python/AWS Bedrock endpoint here
      // Future sensory types route through this same controller.
      return;
    }

    const { profile: audioProfile, score: confidenceScore } = payload;
    const timestamp = formatTimestamp();

    // Clamp the confidence score to 0–100 for display (design edge case).
    const score = Math.max(0, Math.min(100, Math.round(Number(confidenceScore) || 0)));

    // Resolve presentation strings; unknown profiles fall back gracefully.
    const profileInfo = ACTION_TEXT[audioProfile];
    const profileLabel = profileInfo?.label || audioProfile || 'Unknown Source';
    const contextText = profileInfo?.context || 'Unrecognized Acoustic Signature';
    const targetId = PROFILE_TO_APPLIANCE[audioProfile];

    // TODO: Wire API connection to Python/AWS Bedrock endpoint here
    // (1) Spike the acoustic sphere amplitude, then ease it back to baseline.
    setWaveAmplitude(WAVE_SPIKE);
    const decayTimer = setTimeout(() => {
      setWaveAmplitude(WAVE_BASELINE);
    }, WAVE_DECAY_MS);
    decayTimersRef.current.push(decayTimer);

    // (2) Append a structured reasoning burst (Acoustic Trigger -> Context -> Action).
    const burst = [
      { id: nextLogId(), timestamp, agent: profileInfo?.agent, text: `Acoustic Trigger: ${profileLabel} Detected (${score}% Match)` },
      { id: nextLogId(), timestamp, agent: profileInfo?.agent, text: `Context Check: ${contextText}` },
    ];
    if (targetId && profileInfo) {
      burst.push({ id: nextLogId(), timestamp, agent: profileInfo?.agent, text: `Action Triggered: ${profileInfo.action}` });
    } else {
      burst.push({ id: nextLogId(), timestamp, text: 'Action Triggered: None — No appliance mapped' });
    }

    setReasoningLog((prev) => {
      const merged = [...prev, ...burst];
      // Cap stored entries to avoid unbounded growth (Requirement 5.4).
      return merged.length > LOG_CAP ? merged.slice(merged.length - LOG_CAP) : merged;
    });

    // (3) Update the mapped appliance (Requirement 6.4). Unknown profile -> skip safely.
    if (targetId) {
      setAppliances((prev) =>
        prev.map((a) =>
          a.id === targetId
            ? { ...a, active: true, state: profileInfo?.applianceState || 'AI Intervention Active' }
            : a
        )
      );
    }
  }, []);

  // Thin wrapper preserving the original public controller signature.
  const handleAcousticTrigger = useCallback(
    (profile, score) => handleSensoryTrigger('audio', { profile, score }),
    [handleSensoryTrigger]
  );

  // --- "PULSE Predicts" anticipation handlers (Task 13, Requirement 7.2) ----
  //
  // Both handlers remove the anticipation from state and push a reasoning-log
  // entry attributed to the agent that owns the target appliance. Approving
  // additionally pre-arms the target appliance (active + a pre-arm state). The
  // backend seam is marked for live wiring.

  const approveAnticipation = useCallback((id) => {
    setAnticipations((prev) => {
      const item = prev.find((a) => a.id === id);
      if (!item) return prev;

      const target = INITIAL_APPLIANCES.find((a) => a.id === item.targetApplianceId);
      const applianceName = target?.name || 'device';
      const profileInfo = ACTION_TEXT[APPLIANCE_TO_PROFILE[item.targetApplianceId]];
      const agent = AGENT_FOR_APPLIANCE[item.targetApplianceId] || 'SystemAgent';
      const timestamp = formatTimestamp();

      // TODO: Wire API connection to Python/AWS Bedrock endpoint here
      // Pre-arm the target appliance so the anticipated action is staged.
      if (item.targetApplianceId) {
        setAppliances((appls) =>
          appls.map((a) =>
            a.id === item.targetApplianceId
              ? { ...a, active: true, mode: 'ai', state: profileInfo?.applianceState || 'Pre-Armed (Anticipated)' }
              : a
          )
        );
      }

      setReasoningLog((log) => {
        const entry = {
          id: nextLogId(),
          timestamp,
          agent,
          text: `Anticipation approved: ${item.predictionText} — pre-arming ${applianceName}`,
        };
        const merged = [...log, entry];
        return merged.length > LOG_CAP ? merged.slice(merged.length - LOG_CAP) : merged;
      });

      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const snoozeAnticipation = useCallback((id) => {
    setAnticipations((prev) => {
      const item = prev.find((a) => a.id === id);
      if (!item) return prev;

      const agent = AGENT_FOR_APPLIANCE[item.targetApplianceId] || 'SystemAgent';
      const timestamp = formatTimestamp();

      // TODO: Wire API connection to Python/AWS Bedrock endpoint here
      setReasoningLog((log) => {
        const entry = {
          id: nextLogId(),
          timestamp,
          agent,
          text: `Anticipation snoozed: ${item.predictionText}`,
        };
        const merged = [...log, entry];
        return merged.length > LOG_CAP ? merged.slice(merged.length - LOG_CAP) : merged;
      });

      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // --- "Ask PULSE" conversational handler (Task 14, Requirements 5.3, 7.2) --
  //
  // Resolves a typed natural-language query to one of four mocked intents and
  // streams an explainable answer into the reasoning terminal: the user's line
  // first (tagged 'You'), then PULSE's reply attributed to a sensible agent.
  // Commands additionally update the matched appliance (manual override). All
  // entries respect LOG_CAP. The keyword matcher is a deliberate drop-in seam
  // for a live Bedrock conversational call.
  const askPulse = useCallback(
    (rawQuery) => {
      const query = String(rawQuery || '').trim();
      if (!query) return;

      const q = query.toLowerCase();
      const timestamp = formatTimestamp();

      // TODO: Wire API connection to Python/AWS Bedrock endpoint here
      //   The keyword matcher below stands in for Bedrock NLU / conversational
      //   AI. Replace it with a live call, e.g.:
      //     const { reply, applianceUpdate } = await askBedrock(query, snapshot);
      //   then stream `reply` into reasoningLog and apply `applianceUpdate`.

      // The user's own line — neutral 'You' tag (styled via AGENT_STYLE).
      const userEntry = {
        id: nextLogId(),
        timestamp,
        agent: 'You',
        text: `You asked: "${query}"`,
      };

      // Intent resolution (questions checked before commands so "why did the
      // fan switch on?" is read as explainability, not a command).
      const device = DEVICE_KEYWORDS.find((d) => d.words.some((w) => q.includes(w)));
      const isWhy = q.startsWith('why') || q.includes('why ');
      const isPresence = PRESENCE_PHRASES.some((p) => q.includes(p));
      const hasCommandVerb = COMMAND_VERBS.some((v) => q.includes(v));

      const responses = [];
      let applianceUpdate = null;

      if (isWhy) {
        // Explainability — reference recent acoustic context for the device.
        const profile = device ? DEVICE_TO_PROFILE[device.id] : null;
        const info = profile ? ACTION_TEXT[profile] : null;
        const name = device
          ? INITIAL_APPLIANCES.find((a) => a.id === device.id)?.name
          : null;
        responses.push({
          id: nextLogId(),
          timestamp,
          agent: info?.agent || 'ComfortAgent',
          text: info && name
            ? `PULSE: ${name} responded to "${info.context}" → ${info.action}.`
            : 'PULSE: Recent actions were driven by the learned household rhythm and live acoustic context.',
        });
      } else if (isPresence) {
        // Presence — answer from members state.
        const homeMembers = members.filter((m) => m.presence === 'home');
        const names = homeMembers.map((m) => m.name.split(' ')[0]).join(', ');
        responses.push({
          id: nextLogId(),
          timestamp,
          agent: 'ComfortAgent',
          text: homeMembers.length
            ? `PULSE: ${homeMembers.length} home right now — ${names}.`
            : 'PULSE: No one appears to be home right now.',
        });
      } else if (device && hasCommandVerb) {
        // Command — update the matched appliance as a manual override.
        const target = INITIAL_APPLIANCES.find((a) => a.id === device.id);
        const name = target?.name || device.id;
        const turnOff = OFF_WORDS.some((w) => q.includes(w));
        const agent = AGENT_FOR_APPLIANCE[device.id] || 'ComfortAgent';
        applianceUpdate = { id: device.id, active: !turnOff };
        responses.push({
          id: nextLogId(),
          timestamp,
          agent,
          text: `Action Triggered: ${name} ${turnOff ? 'OFF' : 'ON'} — manual override via Ask PULSE`,
        });
      } else {
        // Fallback — friendly acknowledgement.
        responses.push({
          id: nextLogId(),
          timestamp,
          agent: 'ComfortAgent',
          text: "PULSE: I'll look into that and follow up shortly.",
        });
      }

      setReasoningLog((prev) => {
        const merged = [...prev, userEntry, ...responses];
        return merged.length > LOG_CAP ? merged.slice(merged.length - LOG_CAP) : merged;
      });

      if (applianceUpdate) {
        setAppliances((prev) =>
          prev.map((a) =>
            a.id === applianceUpdate.id
              ? {
                  ...a,
                  active: applianceUpdate.active,
                  mode: 'manual',
                  state: applianceUpdate.active
                    ? 'ON — Manual (Ask PULSE)'
                    : 'OFF — Manual (Ask PULSE)',
                }
              : a
          )
        );
      }
    },
    [members]
  );

  // --- Household intercom / announcements (Task 19) -------------------------
  //
  // sendAnnouncement(text, fromMemberId?) lets ANY signed-in household member
  // broadcast a message to the whole home. It records the announcement (newest
  // first, capped) and pushes a reasoning-log entry attributed to the
  // IntercomAgent that reads as PULSE relaying + speaking it on every device —
  // a spoken-by-PULSE stub standing in for live TTS / push-to-devices.
  const sendAnnouncement = useCallback(
    (rawText, fromMemberId) => {
      const text = String(rawText || '').trim();
      if (!text) return;

      // Resolve the sender: explicit arg → signed-in member → head of household
      // (first member) as a graceful fallback so the feed never loses an author.
      const senderId =
        fromMemberId || currentMemberId || INITIAL_MEMBERS[0]?.id || null;
      const timestamp = formatTimestamp();

      // TODO: Wire API connection to Python/AWS Bedrock endpoint here
      //   Replace the local relay below with a real broadcast call, e.g.:
      //     await relayAnnouncement(homeId, { fromMemberId: senderId, text });
      //   which would synthesize speech (TTS) and push it to all home devices.
      const announcement = {
        id: nextLogId(),
        fromMemberId: senderId,
        text,
        timestamp,
      };

      // Prepend (newest visible first) and cap the stored feed length.
      setAnnouncements((prev) => [announcement, ...prev].slice(0, 20));

      const senderName =
        INITIAL_MEMBERS.find((m) => m.id === senderId)?.name?.split(' ')[0] ||
        'Someone';

      setReasoningLog((prev) => {
        const entry = {
          id: nextLogId(),
          timestamp,
          agent: 'IntercomAgent',
          text: `Announcement relayed to all rooms (from ${senderName}): "${text}" — spoken on 4 devices`,
        };
        const merged = [...prev, entry];
        return merged.length > LOG_CAP ? merged.slice(merged.length - LOG_CAP) : merged;
      });
    },
    [currentMemberId]
  );

  // --- Rooms & per-device manual controls (Task 20, Requirement 7.2) --------
  //
  // Direct user control over any device, independent of the ambient AI. Each
  // handler flips the device into 'manual' mode, updates its human-readable
  // `state`, and appends an attributed reasoning entry. returnApplianceToAI is
  // the undo / "back to AI" affordance that hands control back to the ambient
  // automation. Because every page reads the SAME appliances state through the
  // provider, a change here is instantly reflected on the dashboard shelf too.
  //
  // The owning agent is resolved from AGENT_FOR_APPLIANCE (the original mapped
  // devices) and falls back to ComfortAgent for the expanded fleet.

  // Small shared log appender that respects LOG_CAP (Requirement 5.4).
  const appendLog = useCallback((agent, text) => {
    setReasoningLog((prev) => {
      const entry = { id: nextLogId(), timestamp: formatTimestamp(), agent, text };
      const merged = [...prev, entry];
      return merged.length > LOG_CAP ? merged.slice(merged.length - LOG_CAP) : merged;
    });
  }, []);

  // --- Puja Ghanti audio trigger (Audio 1 playback) -------------------------
  //
  // All timestamps are fixed to the 18:45 evening window so the demo reads as
  // a real recorded session rather than reflecting the current clock.
  //
  //   Phase 1 (0 s)   — acoustic recognition logged, sphere spiked
  //   Phase 2 (1.5 s) — AirQualityAgent infers incense smoke
  //   Phase 3 (2.5 s) — left-panel timeline updated: "Evening Puja Arti"
  //   Phase 4 (3.5 s) — Air Purifier turned ON
  //   Phase 5 (4.5 s) — Balcony Lights ON for aarti ambiance
  const triggerPujaAudio = useCallback(() => {
    // Spike the acoustic sphere.
    setWaveAmplitude(WAVE_SPIKE);
    const decayT = setTimeout(() => setWaveAmplitude(WAVE_BASELINE), WAVE_DECAY_MS);
    decayTimersRef.current.push(decayT);

    // Phase 1 — 7 s: recognition burst (system needs time to analyse the audio).
    const t0 = setTimeout(() => {
      setReasoningLog((prev) => {
        const entries = [
          { id: nextLogId(), timestamp: '18:45:00', agent: 'PujaAgent',       text: 'Acoustic Trigger: Puja Ghanti Detected (96% Match)' },
          { id: nextLogId(), timestamp: '18:45:00', agent: 'PujaAgent',       text: 'Context Check: Evening ritual window · Bell-frequency signature confirmed' },
          { id: nextLogId(), timestamp: '18:45:00', agent: 'AirQualityAgent', text: 'Correlation: Ritual activity pattern — incense combustion imminent' },
        ];
        const merged = [...prev, ...entries];
        return merged.length > LOG_CAP ? merged.slice(merged.length - LOG_CAP) : merged;
      });
    }, 7000);
    decayTimersRef.current.push(t0);

    // Phase 2 — 8.5 s: air quality reasoning.
    const t1 = setTimeout(() => {
      setReasoningLog((prev) => {
        const entry = { id: nextLogId(), timestamp: '18:45:01', agent: 'AirQualityAgent', text: 'Inference: Fine particulate (PM2.5) rise predicted within 60 s — evaluating purification' };
        const merged = [...prev, entry];
        return merged.length > LOG_CAP ? merged.slice(merged.length - LOG_CAP) : merged;
      });
    }, 8500);
    decayTimersRef.current.push(t1);

    // Phase 3 — 9.5 s: register "Evening Puja Arti" in the left-panel timeline.
    const t2 = setTimeout(() => {
      setTimelineEvents((prev) => {
        if (prev.some((e) => e.id === 'puja_eve')) return prev;
        const updated = [
          ...prev,
          { id: 'puja_eve', time: '18:45', label: 'Evening Puja Arti', color: 'pink', enabled: true },
        ];
        updated.sort((a, b) => a.time.localeCompare(b.time));
        return updated;
      });
      setReasoningLog((prev) => {
        const entry = { id: nextLogId(), timestamp: '18:45:03', agent: 'RoutineAgent', text: 'Timeline updated: "Evening Puja Arti" registered in Household Rhythm' };
        const merged = [...prev, entry];
        return merged.length > LOG_CAP ? merged.slice(merged.length - LOG_CAP) : merged;
      });
    }, 9500);
    decayTimersRef.current.push(t2);

    // Phase 4 — 10.5 s: turn on air purifier.
    const t3 = setTimeout(() => {
      setAppliances((prev) =>
        prev.map((a) =>
          a.id === 'purifier'
            ? { ...a, active: true, mode: 'ai', state: 'ON — Incense Detected' }
            : a
        )
      );
      setReasoningLog((prev) => {
        const entry = { id: nextLogId(), timestamp: '18:45:05', agent: 'AirQualityAgent', text: 'Action Triggered: Air Purifier ON — clearing incense particles post-puja' };
        const merged = [...prev, entry];
        return merged.length > LOG_CAP ? merged.slice(merged.length - LOG_CAP) : merged;
      });
    }, 10500);
    decayTimersRef.current.push(t3);

    // Phase 5 — 11.5 s: turn on balcony lights for evening aarti ambiance.
    const t4 = setTimeout(() => {
      setAppliances((prev) =>
        prev.map((a) =>
          a.id === 'balcony'
            ? { ...a, active: true, mode: 'ai', state: 'ON — Night Approaching' }
            : a
        )
      );
      setReasoningLog((prev) => {
        const entry = { id: nextLogId(), timestamp: '18:45:07', agent: 'SecurityAgent', text: 'Action Triggered: Balcony Lights ON — Night approaching, aarti marks dusk' };
        const merged = [...prev, entry];
        return merged.length > LOG_CAP ? merged.slice(merged.length - LOG_CAP) : merged;
      });
    }, 11500);
    decayTimersRef.current.push(t4);
  }, []);

  // Prepares the UI for audio mode: resets puja-scene devices to off and
  // replaces the reasoning log with "waiting for audio" standby entries.
  // Fixed 18:4x timestamps keep the demo session coherent.
  const prepareAudioMode = useCallback(() => {
    setAppliances((prev) =>
      prev.map((a) => ({ ...a, active: false, mode: 'ai', state: 'Managed by AI' }))
    );
    setReasoningLog([
      { id: nextLogId(), timestamp: '18:44:52', agent: 'SystemAgent', text: 'Acoustic sensor online — waiting for audio input' },
    ]);
  }, []);

  const toggleAppliancePower = useCallback(
    (id) => {
      // TODO: Wire API connection to Python/AWS Bedrock endpoint here
      let logged = null;
      setAppliances((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          const nextActive = !a.active;
          logged = {
            agent: AGENT_FOR_APPLIANCE[a.id] || 'ComfortAgent',
            name: a.name,
            nextActive,
          };
          return {
            ...a,
            active: nextActive,
            mode: 'manual',
            state: nextActive ? 'ON — Manual' : 'OFF — Manual',
          };
        })
      );
      if (logged) {
        appendLog(
          logged.agent,
          `Manual override: ${logged.name} turned ${logged.nextActive ? 'ON' : 'OFF'}`
        );
      }
    },
    [appendLog]
  );

  const setApplianceControl = useCallback(
    (id, key, value) => {
      // TODO: Wire API connection to Python/AWS Bedrock endpoint here
      let logged = null;
      setAppliances((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          const state = describeControl(key, value);
          logged = {
            agent: AGENT_FOR_APPLIANCE[a.id] || 'ComfortAgent',
            name: a.name,
            state,
          };
          return {
            ...a,
            controls: { ...a.controls, [key]: value },
            active: activeFromControl(key, value),
            mode: 'manual',
            state,
          };
        })
      );
      if (logged) {
        // Strip the trailing "— Manual" tag for a cleaner log sentence.
        const detail = logged.state.replace(/\s*—\s*Manual$/, '');
        appendLog(logged.agent, `Manual override: ${logged.name} set to ${detail}`);
      }
    },
    [appendLog]
  );

  const returnApplianceToAI = useCallback(
    (id) => {
      // TODO: Wire API connection to Python/AWS Bedrock endpoint here
      let logged = null;
      setAppliances((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          logged = { agent: AGENT_FOR_APPLIANCE[a.id] || 'ComfortAgent', name: a.name };
          return { ...a, mode: 'ai', active: false, state: 'Managed by AI' };
        })
      );
      if (logged) {
        appendLog(logged.agent, `Returned ${logged.name} to AI control`);
      }
    },
    [appendLog]
  );

  // --- Learned routines enable/disable (Task 24) ----------------------------
  //
  // Each learned routine window (timelineEvents) can be switched on/off by the
  // user from the Automations page. Toggling flips the `enabled` flag and
  // appends an attributed reasoning entry. The dashboard timeline reads the
  // SAME state and keeps rendering every window (it ignores `enabled`), so the
  // hero is unaffected.
  const toggleRoutine = useCallback(
    (id) => {
      // TODO: Wire API connection to Python/AWS Bedrock endpoint here
      //   A real call would persist the routine's enabled state to the backend
      //   (and pause/resume the learned automation), e.g.:
      //     await setRoutineEnabled(homeId, id, nextEnabled);
      let logged = null;
      setTimelineEvents((prev) =>
        prev.map((ev) => {
          if (ev.id !== id) return ev;
          // `enabled` defaults to true when absent.
          const nextEnabled = ev.enabled === false;
          logged = { label: ev.label, nextEnabled };
          return { ...ev, enabled: nextEnabled };
        })
      );
      if (logged) {
        appendLog(
          'RoutineAgent',
          `Routine '${logged.label}' ${logged.nextEnabled ? 'enabled' : 'disabled'}`
        );
      }
    },
    [appendLog]
  );

  // --- Add / remove a household routine (member-authored) -------------------
  //
  // Any family member can add a routine from the Family page. It appends to the
  // SAME timelineEvents state the dashboard Home Rhythm renders, so it appears
  // there instantly (sorted by time), tagged with who added it.
  const addRoutine = useCallback(
    (routine) => {
      const time = String(routine?.time || '').trim();
      const label = String(routine?.label || '').trim();
      if (!time || !label) return;
      const byMemberId = routine?.byMemberId || currentMemberId || INITIAL_MEMBERS[0]?.id;
      const member = INITIAL_MEMBERS.find((m) => m.id === byMemberId);
      const addedBy = member?.name?.split(' ')[0] || null;
      const palette = ['cyan', 'pink', 'orange', 'yellow', 'purple'];

      setTimelineEvents((prev) => {
        const color = palette[prev.length % palette.length];
        const id = `rt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const next = [...prev, { id, time, label, color, enabled: true, addedBy }];
        next.sort((a, b) => a.time.localeCompare(b.time));
        return next;
      });

      appendLog(
        'RoutineAgent',
        `Routine added by ${addedBy || 'a member'}: "${label}" at ${time} — synced to the household rhythm`
      );
    },
    [appendLog, currentMemberId]
  );

  const removeRoutine = useCallback(
    (id) => {
      let removed = null;
      setTimelineEvents((prev) => {
        const t = prev.find((e) => e.id === id);
        removed = t?.label || null;
        return prev.filter((e) => e.id !== id);
      });
      if (removed) appendLog('RoutineAgent', `Routine removed: "${removed}"`);
    },
    [appendLog]
  );

  // --- Demo Director: scripted scenarios (Option A) -------------------------
  //
  // runScenario(key) plays a clean, choreographed sequence for filming. It
  // pauses the ambient random drivers (uncluttered stage), clears any in-flight
  // scenario, then schedules steps that drive the SAME controller methods the
  // live system uses — so what's filmed is the real pipeline, just
  // deterministically timed. The 'proactive' scenario is the centrepiece: PULSE
  // predicts and pre-arms the exhaust BEFORE the cooker whistle actually fires
  // ("anticipates, not responds").
  const runScenario = useCallback(
    (key) => {
      // Stage the scene: stop the random drivers, clear any running scenario.
      setIsAutoDemo(false);
      scenarioTimersRef.current.forEach(clearTimeout);
      scenarioTimersRef.current = [];
      const at = (ms, fn) => scenarioTimersRef.current.push(setTimeout(fn, ms));
      const spike = () => {
        setWaveAmplitude(WAVE_SPIKE);
        const t = setTimeout(() => setWaveAmplitude(WAVE_BASELINE), WAVE_DECAY_MS);
        decayTimersRef.current.push(t);
      };
      let beatSeq = 0;
      const beat = (obj) =>
        setScenarioBeat({ id: `beat-${Date.now()}-${(beatSeq += 1)}`, ...obj });

      if (key === 'cooker') {
        at(150, () => handleSensoryTrigger('audio', { profile: 'cooker_whistle', score: 95 }));
        at(240, () =>
          beat({
            phase: 'reacting',
            icon: '⚡',
            accent: 'cyan',
            title: 'Detected & Acted',
            subtitle: 'Pressure cooker whistle → Kitchen Exhaust ON',
            tag: 'Reactive · Acoustic',
          })
        );
        at(3800, () => setScenarioBeat(null));
      } else if (key === 'tap') {
        at(150, () => handleSensoryTrigger('audio', { profile: 'tap_running', score: 92 }));
        at(240, () =>
          beat({
            phase: 'reacting',
            icon: '⚡',
            accent: 'cyan',
            title: 'Detected & Acted',
            subtitle: 'Running tap → Water Geyser pre-heat',
            tag: 'Reactive · Acoustic',
          })
        );
        at(3800, () => setScenarioBeat(null));
      } else if (key === 'balcony') {
        at(150, () =>
          handleSensoryTrigger('video', { event: 'motion_balcony', confidence: 94, zone: 'Balcony' })
        );
        at(240, () =>
          beat({
            phase: 'reacting',
            icon: '⚡',
            accent: 'purple',
            title: 'Detected & Acted',
            subtitle: 'Balcony motion → Presence lights ON',
            tag: 'Reactive · Video',
          })
        );
        at(3800, () => setScenarioBeat(null));
      } else if (key === 'proactive') {
        // 1) Context forms from the learned household rhythm (no trigger yet).
        at(150, () => {
          appendLog(
            'EnergyAgent',
            'Context Check: Evening dinner-prep window opening · Lakshmi home · humidity rising'
          );
          beat({
            phase: 'sensing',
            step: 1,
            icon: '🧠',
            accent: 'purple',
            title: 'Sensing Context',
            subtitle: 'Dinner-prep window · Lakshmi home · humidity rising',
            tag: 'Step 1 / 4',
          });
        });
        // 2) PULSE anticipates the event and surfaces a prediction card.
        at(1600, () => {
          setAnticipations((prev) => [
            {
              id: nextLogId(),
              predictionText: 'Pressure cooker likely in ~2 min',
              etaText: 'in 2 min',
              targetApplianceId: 'exhaust',
              confidence: 0.92,
            },
            ...prev,
          ]);
          appendLog('KitchenAgent', 'Anticipation: pressure cooker imminent — staging Kitchen Exhaust');
          beat({
            phase: 'anticipating',
            step: 2,
            icon: '🔮',
            accent: 'cyan',
            title: 'Anticipating',
            subtitle: 'Pressure cooker likely — staging Kitchen Exhaust',
            eta: 120,
            tag: 'Step 2 / 4',
          });
        });
        // 3) PROACTIVE action — pre-arm the exhaust BEFORE the whistle.
        at(3500, () => {
          spike();
          setAppliances((prev) =>
            prev.map((a) =>
              a.id === 'exhaust'
                ? { ...a, active: true, mode: 'ai', state: 'Pre-Armed (Anticipated)' }
                : a
            )
          );
          appendLog('KitchenAgent', 'Action (proactive): Kitchen Exhaust pre-armed ahead of the event');
          beat({
            phase: 'action',
            step: 3,
            icon: '⚡',
            accent: 'amber',
            title: 'Proactive Action',
            subtitle: 'Kitchen Exhaust pre-armed — before the event',
            tag: 'Step 3 / 4',
          });
        });
        // 4) The actual acoustic trigger arrives — prediction confirmed.
        at(5600, () => handleSensoryTrigger('audio', { profile: 'cooker_whistle', score: 97 }));
        at(5800, () => {
          appendLog(
            'SystemAgent',
            'Prediction confirmed ✓ Exhaust was already running before the whistle'
          );
          beat({
            phase: 'confirmed',
            step: 4,
            icon: '✅',
            accent: 'green',
            title: 'Prediction Confirmed',
            subtitle: 'Exhaust was already running ~2 min before the whistle',
            tag: 'Step 4 / 4',
          });
        });
        at(9500, () => setScenarioBeat(null));
      }
    },
    [handleSensoryTrigger, appendLog]
  );

  // Clear any pending scenario timers on unmount.
  useEffect(
    () => () => {
      scenarioTimersRef.current.forEach(clearTimeout);
      scenarioTimersRef.current = [];
    },
    []
  );

  // --- Kitchen Cam scenario cues (video-synced, Option C) -------------------
  //
  // The KitchenCamPane plays the recorded kitchen clip and calls kitchenCue(key)
  // at each timestamp (keyed to the VIDEO clock, so overlays stay in lockstep
  // with the footage). Each cue drives the SAME shared state the live system
  // uses: it flips devices on/off, streams agent-attributed reasoning, spikes
  // the sphere, and sets the center-stage Anticipation Theater beat. This is the
  // grounded "real home" demo: sense → fuse context → reason (with latency) →
  // anticipate → act → keep safe.
  const kitchenCue = useCallback(
    (key) => {
      const beat = (obj) =>
        setScenarioBeat({ id: `kc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...obj });
      const setDev = (id, patch) =>
        setAppliances((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
      const spike = () => {
        setWaveAmplitude(WAVE_SPIKE);
        const t = setTimeout(() => setWaveAmplitude(WAVE_BASELINE), WAVE_DECAY_MS);
        decayTimersRef.current.push(t);
      };

      switch (key) {
        case 'reset':
          // Everything off / idle for a clean cold-start before the clip plays.
          setAppliances((prev) =>
            prev.map((a) =>
              a.id === 'exhaust' || a.id === 'kitchenlights'
                ? { ...a, active: false, mode: 'ai', state: 'Managed by AI' }
                : a
            )
          );
          // Drop any previously-learned routine so a replay re-learns it fresh.
          setTimelineEvents((prev) => prev.filter((e) => !e.learned));
          setScenarioBeat(null);
          break;
        case 'baseline':
          appendLog('SystemAgent', 'Kitchen camera online — baseline: daylight, cooktop idle, chimney healthy ✓, room empty');
          beat({ phase: 'sensing', icon: '🛰', accent: 'cyan', title: 'Scene Online', subtitle: 'Daylight · cooktop idle · chimney online ✓ · kitchen unoccupied', tag: 'Kitchen Cam · Baseline' });
          break;
        case 'approach':
          appendLog('SecurityAgent', 'Motion at entry — a person is approaching the kitchen');
          beat({ phase: 'sensing', step: 1, icon: '👣', accent: 'purple', title: 'Motion at Entry', subtitle: 'Someone approaching the kitchen', tag: 'Signal · Presence' });
          break;
        case 'enter':
          setDev('kitchenlights', { active: true, mode: 'ai', state: 'ON — Presence' });
          appendLog('ComfortAgent', 'Person identified (Shubham) · Kitchen Lights ON — presence-based');
          beat({ phase: 'action', step: 2, accent: 'amber', title: 'Lights On', subtitle: 'Shubham entered · presence-based lighting', tag: 'Action · Comfort' });
          break;
        case 'utensil':
          appendLog('KitchenAgent', 'Cookware detected in hand — meal preparation likely · matches learned lunch routine');
          beat({ phase: 'sensing', icon: '🍲', accent: 'cyan', title: 'Cookware Detected', subtitle: 'Utensil in hand — meal prep likely (lunch window)', tag: 'Signal · Vision' });
          break;
        case 'place':
          appendLog('KitchenAgent', 'Cookware placed on burner — cooking imminent');
          beat({ phase: 'sensing', icon: '🍳', accent: 'cyan', title: 'Cookware on Burner', subtitle: 'Pan placed on the stove', tag: 'Signal · Vision' });
          break;
        case 'ignite':
          spike();
          appendLog('KitchenAgent', 'Flame ignited — burner ON');
          appendLog('SystemAgent', 'Context fused: ACTIVE COOKING (93%) — time + presence + cookware + flame + lunch routine');
          beat({ phase: 'anticipating', step: 3, accent: 'amber', title: 'Flame Ignited', subtitle: 'Burner ON — fusing multiple signals into context…', tag: 'Context · Active Cooking 93%' });
          break;
        case 'reasoning':
          appendLog('AirQualityAgent', 'Inference: smoke & steam imminent (~30s) — air quality will drop');
          beat({ phase: 'anticipating', accent: 'purple', title: 'PULSE Reasoning…', subtitle: 'KitchenAgent · AirQualityAgent · SafetyAgent conferring', tag: 'Agentic · Amazon Bedrock' });
          break;
        case 'exhaust':
          spike();
          setDev('exhaust', { active: true, mode: 'ai', state: 'Auto ON — Pre-empting smoke' });
          appendLog('KitchenAgent', 'Action (proactive): Kitchen Exhaust ON — ahead of smoke, not after it');
          beat({ phase: 'action', step: 4, accent: 'green', title: 'Proactive Action', subtitle: 'Chimney / Exhaust ON — before any smoke appears', tag: 'Anticipated · Acted Early' });
          break;
        case 'exit':
          appendLog('SecurityAgent', 'Person left the kitchen — burner still active');
          beat({ phase: 'sensing', accent: 'cyan', title: 'Cook Stepped Away', subtitle: 'Person leaving — burner still ON', tag: 'Signal · Presence' });
          break;
        case 'safety':
          appendLog('SafetyAgent', 'Unattended flame — alert sent to Shubham · exhaust maintained · gas auto-cut armed (3 min)');
          beat({ phase: 'confirmed', accent: 'amber', title: 'Safety Watch', subtitle: 'Unattended burner — exhaust kept on · alert sent · gas auto-cut armed', tag: 'Safety · Proactive' });
          break;
        case 'lightsoff':
          setDev('kitchenlights', { active: false, mode: 'ai', state: 'Off — Room empty' });
          appendLog('EnergyAgent', 'Room empty — Kitchen Lights OFF · energy saved');
          beat({ phase: 'action', accent: 'cyan', title: 'Energy Saved', subtitle: 'Room empty — Kitchen Lights OFF', tag: 'Action · Energy' });
          break;
        case 'learning':
          // PULSE observes the recurring cooking pattern and updates the learned
          // household routine — a new node animates into the Rhythm Timeline.
          setTimelineEvents((prev) =>
            prev.some((e) => e.id === 'lunchprep')
              ? prev
              : [
                  ...prev,
                  {
                    id: 'lunchprep',
                    time: '13:15',
                    label: 'Afternoon Cooking Prep',
                    color: 'orange',
                    enabled: true,
                    learned: true,
                    confidence: 0.86,
                  },
                ]
          );
          appendLog('LearningAgent', 'Pattern observed: cooking around 1:15 PM — 3rd weekday this week');
          appendLog('RoutineAgent', 'Routine model updated: "Afternoon Cooking Prep" added to household rhythm (confidence 86%)');
          beat({ phase: 'sensing', accent: 'purple', title: 'Learning New Routine', subtitle: 'Afternoon cooking pattern recognized — added to your household rhythm', tag: 'Learning · Routine Updated' });
          break;
        case 'end':
          beat({ phase: 'confirmed', tick: true, accent: 'green', title: 'Acted Before the Problem', subtitle: 'Sensed → understood context → anticipated → acted early → learned a new routine', tag: 'PULSE · Summary' });
          break;
        case 'clear':
          setScenarioBeat(null);
          break;
        default:
          break;
      }
    },
    [appendLog]
  );

  useEffect(() => {
    if (!isAutoDemo) return undefined;
    let tick = 0;
    const interval = setInterval(() => {
      const profile = DEMO_PROFILES[tick % DEMO_PROFILES.length];
      tick += 1;
      // Vary confidence a little so the terminal feels live.
      const score = 85 + Math.floor(Math.random() * 14); // 85–98
      handleAcousticTrigger(profile, score);
    }, DEMO_INTERVAL_MS);

    // TODO: Wire API connection to Python/AWS Bedrock endpoint here
    // Replace the demo interval above with a live subscription, e.g.:
    //   const ws = new WebSocket(BEDROCK_STREAM_URL);
    //   ws.onmessage = (e) => {
    //     const { profile, score } = JSON.parse(e.data);
    //     handleAcousticTrigger(profile, score);
    //   };
    //   return () => ws.close();

    // Capture the ref array at effect-setup time for cleanup.
    const decayTimers = decayTimersRef.current;
    return () => {
      clearInterval(interval);
      // Clear any pending amplitude-decay timers so unmount is clean.
      decayTimers.forEach(clearTimeout);
      decayTimers.length = 0;
    };
  }, [handleAcousticTrigger, isAutoDemo]);

  // --- Video sensory demo driver (Task 22) ----------------------------------
  //
  // A second, slower driver fires rotating sample VISUAL detections through the
  // same controller (handleSensoryTrigger('video', ...)) so the audio + video
  // fusion feels live. Offset cadence from the audio driver keeps the terminal
  // varied. Interval is cleared on cleanup.
  useEffect(() => {
    if (!isAutoDemo) return undefined;
    let vtick = 0;
    const videoInterval = setInterval(() => {
      const sample = VIDEO_DEMO_EVENTS[vtick % VIDEO_DEMO_EVENTS.length];
      vtick += 1;
      // Vary confidence a little so the feed reads as a real detector.
      const confidence = 88 + Math.floor(Math.random() * 11); // 88–98
      handleSensoryTrigger('video', { event: sample.event, confidence, zone: sample.zone });
    }, VIDEO_DEMO_INTERVAL_MS);

    // TODO: Wire API connection to Python/AWS Bedrock endpoint here
    // Replace the demo interval above with a live WebRTC/HLS camera + CV feed:
    //   const pc = new RTCPeerConnection(rtcConfig);
    //   detector.onDetection = ({ event, confidence, zone }) =>
    //     handleSensoryTrigger('video', { event, confidence, zone });
    //   return () => pc.close();

    return () => clearInterval(videoInterval);
  }, [handleSensoryTrigger, isAutoDemo]);

  // Convenience: the full member record for the signed-in id (null when out).
  const currentMember = members.find((m) => m.id === currentMemberId) || null;

  return {
    homeId,
    homeLabel,
    members,
    rooms,
    currentMemberId,
    currentMember,
    signIn,
    signOut,
    timelineEvents,
    toggleRoutine,
    addRoutine,
    removeRoutine,
    appliances,
    reasoningLog,
    waveAmplitude,
    isListening,
    isCameraOn,
    lastVideoEvent,
    reducedMotion,
    largerText,
    setReducedMotion,
    setLargerText,
    toggleReducedMotion,
    toggleLargerText,
    notifications,
    announcements,
    sendAnnouncement,
    anticipations,
    energy,
    handleSensoryTrigger,
    handleAcousticTrigger,
    triggerPujaAudio,
    prepareAudioMode,
    approveAnticipation,
    snoozeAnticipation,
    askPulse,
    toggleAppliancePower,
    setApplianceControl,
    returnApplianceToAI,
    // Demo Director (Option A)
    isAutoDemo,
    toggleAutoDemo,
    setAutoDemo: setIsAutoDemo,
    runScenario,
    scenarioBeat,
    // Kitchen Cam scenario (Option C)
    kitchenCue,
  };
}
