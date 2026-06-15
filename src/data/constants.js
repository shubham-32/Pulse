// constants.js — module-level constants + small helpers shared across PULSE.
// Extracted from the original single-file dashboard (Task 9 refactor).
// No behavioural change: these are the exact same tokens/values as before.

/**
 * COLOR_MAP — semantic color key -> render tokens.
 * `dot` is a Tailwind background class for timeline nodes / status indicators.
 * `glow` is a hex used for box-shadow / SVG glow on nodes + connectors.
 */
export const COLOR_MAP = {
  pink:   { dot: 'bg-pink-500',   glow: '#ec4899' },
  orange: { dot: 'bg-amber-500',  glow: '#f59e0b' },
  cyan:   { dot: 'bg-cyan-400',   glow: '#22d3ee' },
  yellow: { dot: 'bg-yellow-400', glow: '#eab308' },
  purple: { dot: 'bg-purple-500', glow: '#a855f7' },
};

/**
 * PROFILE_TO_APPLIANCE — maps a detected acoustic profile to a target
 * appliance id in `appliances` state.
 */
export const PROFILE_TO_APPLIANCE = {
  cooker_whistle: 'exhaust', // pressure cooker -> kitchen exhaust
  mixer_grinder:  'exhaust',
  tap_running:    'geyser',
  footsteps:      'balcony',
  fan_hum:        'fan',
  puja_ghanti:    'purifier', // ritual bell -> air purifier (incense smoke)
};

/**
 * ACTION_TEXT — per-profile presentation strings used to build the reasoning
 * burst. `label` is the human profile name, `context` is the contextual check
 * line, `action` is the action line, `applianceState` is the new card `state`
 * string applied to the resolved appliance, and `agent` is the responsible
 * agent name (stored on generated log entries; the terminal UI surfaces it in
 * a later task).
 */
export const ACTION_TEXT = {
  cooker_whistle: {
    label: 'Pressure Cooker Whistle',
    context: 'Dinner Prep Window + High Humidity',
    action: 'Kitchen Exhaust Fan ON',
    applianceState: 'Exhaust ON — Clearing Steam',
    agent: 'KitchenAgent',
  },
  mixer_grinder: {
    label: 'Mixer Grinder',
    context: 'Kitchen Activity + Rising Particulates',
    action: 'Kitchen Exhaust Fan ON',
    applianceState: 'Exhaust ON — Venting',
    agent: 'KitchenAgent',
  },
  tap_running: {
    label: 'Running Tap',
    context: 'Water Usage Detected + Cold Inlet',
    action: 'Water Geyser Pre-Heat',
    applianceState: 'Geyser Pre-Heating',
    agent: 'EnergyAgent',
  },
  footsteps: {
    label: 'Footsteps',
    context: 'Evening Presence Near Balcony',
    action: 'Balcony Lights ON',
    applianceState: 'Lights ON — Presence',
    agent: 'SecurityAgent',
  },
  fan_hum: {
    label: 'Fan Hum',
    context: 'Rising Room Temperature',
    action: 'Living Room Fan Speed Adjust',
    applianceState: 'Fan Auto-Adjusted',
    agent: 'EnergyAgent',
  },
  puja_ghanti: {
    label: 'Puja Ghanti',
    context: 'Evening Ritual Window · Bell-frequency pattern confirmed · Incense smoke likely',
    action: 'Air Purifier ON — Clearing incense particles',
    applianceState: 'ON — Incense Detected',
    agent: 'PujaAgent',
  },
};

/**
 * AGENT_STYLE — accent tokens for conversational ("Ask PULSE", Task 14) log
 * lines, keyed by a tag stored on the entry text prefix. `You`/`UserQuery` is a
 * neutral white-ish accent so the user's own line reads distinctly from PULSE's
 * cyan reply. classifyLogLine in ReasoningTerminal resolves these by prefix so
 * the streaming console color-codes the dialogue cleanly.
 */
export const AGENT_STYLE = {
  // The household member's typed line ("You asked: ...").
  You:       { textClass: 'text-white/80', prefix: '›' },
  UserQuery: { textClass: 'text-white/80', prefix: '›' },
  // PULSE's conversational reply (non-action answers).
  PULSE:     { textClass: 'text-accent-cyan', prefix: '✦' },
  // Household intercom relays (Task 19) — announcements spoken on all devices.
  IntercomAgent: { textClass: 'text-accent-cyan', prefix: '📢' },
};

/**
 * AGENTS — the roster of specialist agents in PULSE's "Bedrock's Brain". Each
 * reasoning entry carries an `agent`; the terminal renders a color-coded
 * [Agent] tag (agentColor) and shows an active-agents legend so the multi-agent
 * collaboration is visible. label = short display name, hex = accent color.
 */
export const AGENTS = {
  SystemAgent:     { label: 'System',   hex: '#9ca3af' },
  KitchenAgent:    { label: 'Kitchen',  hex: '#f59e0b' },
  EnergyAgent:     { label: 'Energy',   hex: '#22d3ee' },
  SecurityAgent:   { label: 'Security', hex: '#fb7185' },
  SafetyAgent:     { label: 'Safety',   hex: '#ef4444' },
  ComfortAgent:    { label: 'Comfort',  hex: '#a855f7' },
  AirQualityAgent: { label: 'Air',      hex: '#2dd4bf' },
  LearningAgent:   { label: 'Learning', hex: '#e879f9' },
  RoutineAgent:    { label: 'Routine',  hex: '#eab308' },
  IntercomAgent:   { label: 'Intercom', hex: '#38bdf8' },
  PujaAgent:       { label: 'Puja',     hex: '#ec4899' },
};

/** Accent hex for an agent name (falls back to a neutral grey). */
export function agentColor(name) {
  return AGENTS[name]?.hex || '#9ca3af';
}

/** Curated roster shown in the terminal's "active agents" legend. */
export const AGENT_LEGEND = [
  'KitchenAgent',
  'EnergyAgent',
  'SecurityAgent',
  'SafetyAgent',
  'AirQualityAgent',
  'LearningAgent',
  'PujaAgent',
];

/**
 * VIDEO_EVENT_TEXT — per visual-event presentation strings used to build the
 * video reasoning burst (Task 22, sensor fusion). Mirrors ACTION_TEXT but for
 * the camera channel: `label` is the detected object/motion, `zone` is the
 * default camera zone, `context` is the fusion context line (often referencing
 * the acoustic correlation), `action` is the action line, `applianceState` is
 * the new card state applied to `appliance` (null = monitor only), and `agent`
 * is the responsible agent. Routed through the SAME handleSensoryTrigger.
 */
export const VIDEO_EVENT_TEXT = {
  person_detected: {
    label: 'Person',
    zone: 'Balcony',
    context: 'Evening Presence Confirmed (Visual + Acoustic)',
    action: 'Balcony Lights ON',
    applianceState: 'Lights ON — Presence Verified',
    agent: 'SecurityAgent',
    appliance: 'balcony',
  },
  motion_balcony: {
    label: 'Motion',
    zone: 'Balcony',
    context: 'Movement Near Balcony Door',
    action: 'Balcony Lights ON',
    applianceState: 'Lights ON — Motion Sensed',
    agent: 'SecurityAgent',
    appliance: 'balcony',
  },
  kitchen_activity: {
    label: 'Kitchen Activity',
    zone: 'Kitchen',
    context: 'Cooking Motion + Acoustic Correlation',
    action: 'Kitchen Exhaust Fan ON',
    applianceState: 'Exhaust ON — Activity Sensed',
    agent: 'KitchenAgent',
    appliance: 'exhaust',
  },
  no_motion: {
    label: 'No Motion',
    zone: 'Balcony',
    context: 'Area Clear — Standing Down',
    action: 'No Action — Monitoring',
    applianceState: null,
    agent: 'SecurityAgent',
    appliance: null,
  },
};

// Wave behaviour tuning.
export const WAVE_BASELINE = 1;
export const WAVE_SPIKE = 2.4;
export const WAVE_DECAY_MS = 2500;
export const LOG_CAP = 30;
export const DEMO_INTERVAL_MS = 4000;

// Rotating sample profiles for the demo driver.
export const DEMO_PROFILES = ['cooker_whistle', 'mixer_grinder', 'tap_running', 'footsteps'];

// Video sensory demo driver (Task 22) — rotating sample visual detections and
// its own cadence, offset from the audio driver so the fusion feels live.
export const VIDEO_DEMO_EVENTS = [
  { event: 'person_detected', zone: 'Balcony' },
  { event: 'kitchen_activity', zone: 'Kitchen' },
  { event: 'motion_balcony', zone: 'Balcony' },
  { event: 'no_motion', zone: 'Balcony' },
];
export const VIDEO_DEMO_INTERVAL_MS = 5500;

/** Format the current clock as HH:MM:SS. */
export function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

let logSeq = 0;
/** Monotonic unique id for log entries (avoids key collisions on rapid bursts). */
export function nextLogId() {
  logSeq += 1;
  return `log-${Date.now()}-${logSeq}`;
}
