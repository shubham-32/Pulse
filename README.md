# PULSE — Ambient Smart Home for Indian Households

PULSE is a **multi-page React application** for a next-generation **Edge-ML / Acoustic + Video Sensor Fusion** smart home platform built for Indian households. It understands household context and **anticipates** actions — morning pooja, pressure-cooker schedules, water-motor timings, power cuts, evening kitchen prep — instead of waiting for explicit commands.

> Front-end product (UI). Fully state-driven and backend-ready — all data flows through one controller with clearly marked integration seams for a future Python / AWS Bedrock (agentic AI) backend.

---

## Highlights

- **Ambient Dashboard (hero)** — a glowing glass acoustic sphere with a live dual-waveform, a learned **Household Rhythm Timeline**, **PULSE Predicts** anticipation cards (Approve / Snooze), an agent-tagged **Reasoning Engine** terminal, an **Ask PULSE** conversational bar, a live **sensor-fusion video tile**, and a 16-device intervention shelf.
- **Anticipation, not just response** — "PULSE Predicts" surfaces upcoming actions before they happen (the core of the problem statement).
- **Agentic reasoning** — the terminal streams decisions attributed to collaborating agents ([KitchenAgent], [EnergyAgent], [SecurityAgent], …).
- **Conversational AI (mocked)** — Ask PULSE handles commands, "why" explainability, and presence questions.
- **Sensor fusion** — audio + simulated video detections flow through one unified controller.
- **Multi-page product** — Home ID login, Rooms & device controls, Family + Announcements/Intercom, Insights report, Automations, Settings.
- **Polished UX** — fixed-viewport dashboard with per-pane scrolling, GPU-friendly animation, reduced-motion + larger-text accessibility toggles.

---

## Pages

| Route | Page | What it does |
|-------|------|--------------|
| `/login` | Login | Home ID + member select + demo PIN (any 4 digits) |
| `/` | Dashboard | The ambient hero: sphere, timeline, predicts, reasoning, Ask PULSE, video, devices |
| `/rooms` | Rooms & Devices | Devices grouped by room with power/speed/brightness/temperature controls, manual override + "Return to AI" |
| `/family` | Household | Member cards (avatar, relationship, age, presence) + Announcements / Intercom broadcast |
| `/insights` | Home Insights | Outcome report: ₹ saved, energy, water-motor runtime, power-cuts handled, routine adherence, alerts |
| `/automations` | Automations | Enable/disable learned routines + approve/snooze predictions |
| `/settings` | Settings | Reduced-motion + larger-text toggles, home info, sign out |

---

## Tech Stack

- **React 18** + **Vite**
- **React Router** (multi-page routing + auth gate)
- **Tailwind CSS** (obsidian + copper glassmorphism theme)
- **Framer Motion** (sphere, waveform, transitions, streaming logs)
- Fonts: **Inter** (UI) + **Fira Code** (terminal)

---

## Getting Started

```bash
npm install
npm run dev
```

Open the URL Vite prints (default **http://localhost:5173/**). Sign in with the prefilled Home ID, pick a member, and enter any 4-digit PIN.

> Do not use the VS Code "Go Live" / Live Server extension — this is a Vite app; the JSX must be compiled by the dev server.

```bash
npm run build     # production build to dist/
npm run preview   # preview the production build
```

---

## Architecture

```
src/
├── App.jsx                 # routing + auth gate (BrowserRouter > PulseProvider > Routes)
├── main.jsx
├── index.css               # Tailwind + theme + GPU keyframes + a11y classes
├── hooks/
│   ├── usePulseController.js   # ALL state + the single event pipeline + demo drivers
│   └── PulseProvider.jsx       # one controller instance shared via context (usePulse())
├── data/
│   ├── constants.js            # palette, profile→appliance, agents, helpers
│   └── initialState.js         # seed: home, members, rooms, appliances, anticipations, energy…
├── components/             # AppLayout, NavRail, AcousticPulse, ReasoningTerminal,
│                           # AnticipationPanel, AskPulseBar, SensoryVideoPane,
│                           # InterventionShelf, RoomDeviceCard, MemberCard,
│                           # AnnouncementsPanel, MetricCard, GlassPanel, …
└── pages/                  # Login, Dashboard, Rooms, Family, Insights, Automations, Settings
```

**Single source of truth.** `usePulseController` owns every piece of state and the controller; `PulseProvider` instantiates it once so all pages share the same live state (and the demo drivers run once). The unified entry point is:

```js
handleSensoryTrigger(type, payload)   // type: 'audio' | 'video'
```

It spikes the sphere amplitude, streams a structured agent-attributed reasoning burst, and updates the mapped appliance — in one atomic path. Every state-mutating seam is marked:

```js
// TODO: Wire API connection to Python/AWS Bedrock endpoint here
```

---

## Backend Readiness (next phase)

The UI is intentionally decoupled from data. To go live:
- Replace the demo intervals in `usePulseController` with a live feed (WebSocket / WebRTC) from the edge device.
- Implement the marked `// TODO` seams against the Python / AWS Bedrock backend (NLU for Ask PULSE, routine learning, anticipation, auth/Home-ID verification, TTS for announcements).
- The agent-tagged reasoning log is shaped for an agentic-AI backend (per-agent attribution already in the data model).

---

## Roadmap

- [x] Ambient dashboard + acoustic pulse + reasoning terminal
- [x] Performance pass + per-pane scrolling
- [x] Agent-attributed reasoning, PULSE Predicts, Ask PULSE
- [x] Multi-page product: login/Home ID, Rooms, Family, Insights, Automations, Settings
- [x] Household Announcements / Intercom
- [x] Sensor-fusion video pane
- [x] Accessibility preferences
- [ ] Live backend: Bedrock + real sensors/devices, persistence, TTS
- [ ] Real authentication & multi-home support

---

## Collaboration

```bash
git clone https://github.com/shubham-32/Pulse.git
cd Pulse
npm install
npm run dev
```

Create a branch, commit, push, open a PR. Collaborators are invited via **GitHub repo → Settings → Collaborators**.
