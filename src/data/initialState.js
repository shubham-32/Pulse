// initialState.js — seed data for the PULSE dashboard (Task 9 refactor).
//
// All displayed data lives in React state (Requirement 7.3); this module holds
// the initial seed values the usePulseController hook loads on mount. The
// Phase-1 seeds (timelineEvents, appliances, reasoning boot log) are preserved
// EXACTLY so the rendered UI is unchanged. New fields (members, rooms, expanded
// appliance metadata, notifications, announcements, anticipations, energy) are
// defined here for later Phase-2 tasks to consume — they are not rendered yet.
//
// TODO: Wire API connection to Python/AWS Bedrock endpoint here
//   These seeds become the initial snapshot fetched from the backend; live
//   updates then stream in through usePulseController's sensory pipeline.

import { formatTimestamp, nextLogId } from './constants.js';

/** Stable household identifier (backend correlation key). */
export const HOME_ID = 'PULSE-HOME-4821';

/** Human-friendly household label (shown alongside the Home ID in Phase-2). */
export const HOME_LABEL = 'Sharma Residence';

/**
 * members — household profiles (Phase-2 family panel, Task 12).
 * dob is an ISO date string so age can be derived at render time.
 * presence is 'home' | 'away'; avatarColor is a hex from the accent palette.
 */
export const INITIAL_MEMBERS = [
  { id: 'rajesh',  name: 'Rajesh Sharma',  relationship: 'Father',      dob: '1978-04-12', avatarColor: '#22d3ee', presence: 'home', avatar: '/avatars/rajesh.svg' },
  { id: 'priya',   name: 'Priya Sharma',   relationship: 'Mother',      dob: '1982-09-23', avatarColor: '#ec4899', presence: 'home', avatar: '/avatars/priya.svg' },
  { id: 'aarav',   name: 'Aarav Sharma',   relationship: 'Son',         dob: '2010-01-15', avatarColor: '#a855f7', presence: 'away', avatar: '/avatars/aarav.svg' },
  { id: 'lakshmi', name: 'Lakshmi Sharma', relationship: 'Grandmother', dob: '1951-07-08', avatarColor: '#f59e0b', presence: 'home', avatar: '/avatars/lakshmi.svg' },
];

/** rooms — physical zones appliances are grouped into (Task 13). */
export const INITIAL_ROOMS = [
  { id: 'kitchen',  name: 'Kitchen'     },
  { id: 'living',   name: 'Living Room' },
  { id: 'bathroom', name: 'Bathroom'    },
  { id: 'balcony',  name: 'Balcony'     },
  { id: 'bedroom',  name: 'Bedroom'     },
  { id: 'entrance', name: 'Entrance'    },
  { id: 'dining',   name: 'Dining'      },
  { id: 'utility',  name: 'Utility'     },
];

/**
 * timelineEvents — learned routine windows (Requirement 3). `color` is a
 * semantic key resolved via COLOR_MAP by the timeline component. `enabled`
 * (Task 24) lets the user switch a learned routine on/off from the Automations
 * page; it defaults to true so the dashboard timeline renders exactly as before
 * (the timeline component simply ignores the field).
 */
export const INITIAL_TIMELINE_EVENTS = [
  { id: 'pooja',    time: '06:30', label: 'Morning Pooja Window',   color: 'pink',   enabled: true },
  { id: 'powercut', time: '09:15', label: 'Smart Power-Cut Delay',  color: 'orange', enabled: true },
  { id: 'water',    time: '13:45', label: 'Intelligent Water Fill', color: 'cyan',   enabled: true },
  { id: 'kitchen',  time: '17:30', label: 'Evening Kitchen Prep',   color: 'yellow', enabled: true },
];

/**
 * appliances — AI-managed devices (Requirement 6). The Phase-1 fields
 * (id, name, icon, state, active) are preserved exactly so the intervention
 * cards render identically. Phase-2 metadata is added for later tasks:
 *   room    — room id this device lives in
 *   type    — 'exhaust' | 'fan' | 'geyser' | 'light'
 *   online  — connectivity flag
 *   mode    — 'ai' (managed) | 'manual' (override)
 *   controls— type-appropriate control surface (not rendered yet)
 */
export const INITIAL_APPLIANCES = [
  {
    id: 'exhaust', name: 'Kitchen Exhaust', icon: 'fan', state: 'Managed by AI', active: false,
    room: 'kitchen', type: 'exhaust', online: true, mode: 'ai', controls: { speed: 2 },
  },
  {
    id: 'fan', name: 'Living Room Fan', icon: 'breeze', state: 'Managed by AI', active: false,
    room: 'living', type: 'fan', online: true, mode: 'ai', controls: { speed: 2 },
  },
  {
    id: 'geyser', name: 'Water Geyser', icon: 'heater', state: 'Managed by AI', active: false,
    room: 'bathroom', type: 'geyser', online: true, mode: 'ai', controls: { tempC: 45 },
  },
  {
    id: 'balcony', name: 'Balcony Lights', icon: 'bulb', state: 'Managed by AI', active: false,
    room: 'balcony', type: 'light', online: true, mode: 'ai', controls: { brightness: 80 },
  },

  // --- Expanded smart-home fleet (UX polish): common, market-available Indian
  // smart devices. All AI-managed + online, idle by default so the shelf reads
  // as a calm "everything's handled" state until a trigger lights a card up.
  {
    id: 'ac', name: 'Smart AC', icon: 'ac', state: 'Eco Mode — 24°C', active: false,
    room: 'bedroom', type: 'climate', online: true, mode: 'ai', controls: { tempC: 24, fanSpeed: 'auto' },
  },
  {
    id: 'purifier', name: 'Air Purifier', icon: 'purifier', state: 'Auto — Air Quality Good', active: false,
    room: 'bedroom', type: 'purifier', online: true, mode: 'ai', controls: { fanLevel: 'auto' },
  },
  {
    id: 'tv', name: 'Smart TV', icon: 'tv', state: 'Idle — Standby', active: false,
    room: 'living', type: 'media', online: true, mode: 'ai', controls: { source: 'home' },
  },
  {
    id: 'fridge', name: 'Refrigerator', icon: 'fridge', state: 'Optimal — 4°C', active: false,
    room: 'kitchen', type: 'cooling', online: true, mode: 'ai', controls: { tempC: 4 },
  },
  {
    id: 'washer', name: 'Washing Machine', icon: 'washer', state: 'Idle — Cycle Complete', active: false,
    room: 'utility', type: 'laundry', online: true, mode: 'ai', controls: { program: 'cotton' },
  },
  {
    id: 'vacuum', name: 'Robot Vacuum', icon: 'vacuum', state: 'Docked — Charged', active: false,
    room: 'living', type: 'cleaning', online: true, mode: 'ai', controls: { mode: 'auto' },
  },
  {
    id: 'lock', name: 'Smart Door Lock', icon: 'lock', state: 'Secured — Locked', active: false,
    room: 'entrance', type: 'security', online: true, mode: 'ai', controls: { locked: true },
  },
  {
    id: 'cctv', name: 'CCTV Camera', icon: 'camera', state: 'Recording — All Clear', active: false,
    room: 'entrance', type: 'security', online: true, mode: 'ai', controls: { recording: true },
  },
  {
    id: 'motion', name: 'Motion Sensor', icon: 'motion', state: 'Armed — No Motion', active: false,
    room: 'entrance', type: 'sensor', online: true, mode: 'ai', controls: { armed: true },
  },
  {
    id: 'plug', name: 'Smart Plug', icon: 'plug', state: 'Managed by AI', active: false,
    room: 'living', type: 'power', online: true, mode: 'ai', controls: { on: true },
  },
  {
    id: 'ro', name: 'Water Purifier (RO)', icon: 'water', state: 'Tank Full — Purified', active: false,
    room: 'kitchen', type: 'water', online: true, mode: 'ai', controls: { tankPct: 100 },
  },
  {
    id: 'microwave', name: 'Microwave', icon: 'microwave', state: 'Idle — Standby', active: false,
    room: 'kitchen', type: 'cooking', online: true, mode: 'ai', controls: { power: 800 },
  },
];

/**
 * createInitialReasoningLog — boot telemetry (Requirement 5). Returned from a
 * factory so timestamps/ids are generated when the hook first initializes,
 * matching the original lazy-initializer behaviour. An optional `agent` field
 * is attached (surfaced by the terminal in a later task; ignored for now).
 */
export function createInitialReasoningLog() {
  return [
    { id: nextLogId(), timestamp: formatTimestamp(), agent: 'SystemAgent', text: 'PULSE Edge-ML core online. Acoustic Sensor Fusion engaged.' },
    { id: nextLogId(), timestamp: formatTimestamp(), agent: 'SystemAgent', text: 'Listening to household soundscape...' },
  ];
}

/** notifications — alerts/insights feed (Task 14). severity: 'info' | 'warning' | 'critical'. */
export const INITIAL_NOTIFICATIONS = [
  { id: 'ntf-1', severity: 'info',     text: 'Power-cut delay handled the 09:15 outage smoothly.', timestamp: '09:16:02' },
  { id: 'ntf-2', severity: 'warning',  text: 'Geyser left on in the Bathroom for 45 min.',        timestamp: '08:05:33' },
  { id: 'ntf-3', severity: 'critical', text: 'Unusual sound detected near the Balcony at 2 AM.',   timestamp: '02:04:17' },
];

/** announcements — household member messages (Task 14). */
export const INITIAL_ANNOUNCEMENTS = [
  { id: 'ann-1', fromMemberId: 'priya', text: 'Dinner prep starting — keeping the kitchen exhaust on standby.', timestamp: '17:05:00' },
  { id: 'ann-2', fromMemberId: 'rajesh', text: 'Heading out, switching the balcony to presence mode.',          timestamp: '18:20:00' },
];

/**
 * anticipations — predicted upcoming actions (Phase-2 foresight, Task 13).
 *   predictionText    — what PULSE expects to happen
 *   etaText           — human ETA label
 *   targetApplianceId — appliance the anticipated action will touch
 *   confidence        — model confidence 0–1
 */
export const INITIAL_ANTICIPATIONS = [
  { id: 'ant-1', predictionText: 'Pressure cooker likely around 7 PM.',  etaText: 'in 35 min', targetApplianceId: 'exhaust', confidence: 0.86 },
  { id: 'ant-2', predictionText: 'Geyser pre-heat before the evening bath.', etaText: 'in 40 min', targetApplianceId: 'geyser',  confidence: 0.78 },
  { id: 'ant-3', predictionText: 'Balcony presence lighting after sunset.',   etaText: 'in 1 hr 10 min', targetApplianceId: 'balcony', confidence: 0.64 },
];

/** energy — outcome/savings metrics (Task 14 / Task 21 insights). */
export const INITIAL_ENERGY = {
  savedRupees: 1240,
  todayKwh: 6.4,
  waterMotorMinutes: 92,
  powerCutsHandled: 3,
  routineAdherencePct: 87,
};
