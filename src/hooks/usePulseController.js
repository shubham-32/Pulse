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

  // Holds pending amplitude-decay timers so we can clear them on unmount.
  const decayTimersRef = useRef([]);

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

  useEffect(() => {
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
  }, [handleAcousticTrigger]);

  // --- Video sensory demo driver (Task 22) ----------------------------------
  //
  // A second, slower driver fires rotating sample VISUAL detections through the
  // same controller (handleSensoryTrigger('video', ...)) so the audio + video
  // fusion feels live. Offset cadence from the audio driver keeps the terminal
  // varied. Interval is cleared on cleanup.
  useEffect(() => {
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
  }, [handleSensoryTrigger]);

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
    approveAnticipation,
    snoozeAnticipation,
    askPulse,
    toggleAppliancePower,
    setApplianceControl,
    returnApplianceToAI,
  };
}
