# PULSE — Ambient Smart Home Dashboard

PULSE is a single-page React dashboard for a next-generation **Edge-ML / Acoustic Sensor Fusion** smart home platform built for Indian households. It visualizes real-time acoustic detection, the AI's reasoning, learned daily routines, and AI-managed appliances in one ambient, glassmorphism interface.

> This is the front-end (UI) version. It is fully state-driven and backend-ready — all data flows through a single controller with clearly marked integration seams for a future Python / AWS Bedrock (agentic AI) backend.

---

## Features

- **The Acoustic Pulse** — a glowing glass sphere with an animated dual-waveform (flowing cyan/purple sine waves + orange/gold spectrum spikes) that spikes on each acoustic trigger.
- **Household Rhythm Timeline** — a data-driven vertical timeline of learned routine windows (Morning Pooja, Smart Power-Cut Delay, Intelligent Water Fill, Evening Kitchen Prep).
- **Reasoning Engine** — a macOS-style terminal that streams the AI's structured reasoning (Acoustic Trigger → Context Check → Action) with live timestamps.
- **Intervention Cards** — AI-managed appliance cards (Kitchen Exhaust, Living Room Fan, Water Geyser, Balcony Lights) that update and glow when activated.

---

## Tech Stack

- **React 18** + **Vite**
- **Tailwind CSS** (glassmorphism theme, obsidian + copper ambient palette)
- **Framer Motion** (sphere, waveform, log streaming, card animations)
- Fonts: **Inter** (UI) + **Fira Code** (terminal)

---

## Getting Started

```bash
# 1. install dependencies
npm install

# 2. start the dev server
npm run dev
```

Then open the URL Vite prints (default **http://localhost:5173/**).

> ⚠️ Do **not** use the VS Code "Go Live" / Live Server extension — this is a Vite app and the JSX must be compiled by the dev server, not served as static files.

### Other scripts

```bash
npm run build     # production build to dist/
npm run preview   # preview the production build
```

---

## Architecture & Backend Readiness

All UI lives in `src/PulseDashboard.jsx`. State (timeline events, appliances, reasoning log, wave amplitude) is declared at the top of the component — nothing is hardcoded in the render tree, so any value can be driven live from the backend.

The single event pipeline is:

```js
handleAcousticTrigger(audioProfile, confidenceScore)
```

When invoked it (1) spikes the waveform amplitude, (2) pushes structured entries to the reasoning terminal, and (3) updates the mapped appliance — in one atomic update path.

A demo interval currently drives sample triggers so the dashboard feels live. Integration points are marked with:

```js
// TODO: Wire API connection to Python/AWS Bedrock endpoint here
```

Replace the demo interval with a live feed (e.g. a WebSocket from the edge device) to connect the real backend.

---

## Project Structure

```
.
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── README.md
├── .gitignore
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   └── PulseDashboard.jsx        # the full dashboard + state + event pipeline
└── .kiro/specs/pulse-smart-home/ # design, requirements, tasks (spec docs)
```

> `node_modules/` and `dist/` are intentionally git-ignored — run `npm install` and `npm run build` to regenerate them.

---

## Roadmap / Future Tasks

### Performance & UX
- [ ] Optimize animation performance (animate only `transform`/`opacity`, move waveform to CSS keyframes / a single `requestAnimationFrame` loop, reduce simultaneous blur layers).
- [ ] Respect `prefers-reduced-motion` and add a "reduce motion" toggle.
- [ ] Fixed-viewport layout (`h-screen`) with **per-pane scrolling** so the page itself never scrolls — only each pane's content does.

### Household & Personalization
- [ ] Family/household account with member profiles (name, relationship, date of birth/age, avatar, presence: home/away).
- [ ] Per-member routines tied to the timeline (pooja, study time, work hours).
- [ ] Roles & permissions (admin vs. member).
- [ ] Per-room organization (Kitchen, Living Room, Bedroom, Balcony).
- [ ] Multi-language support (Hindi / regional languages) and accessibility options.

### Sensory Fusion
- [ ] **Live video pane** — camera feed(s) alongside the audio pulse, with motion/object-detection overlays.
- [ ] Generalize the event pipeline to `handleSensoryTrigger(type, payload)` for audio **and** video events.
- [ ] Clear privacy controls and mic/camera active indicators.

### Devices & Automation
- [ ] Device registry / discovery (add, remove, pair devices; assign to rooms and members).
- [ ] Per-device controls beyond on/off (fan speed, geyser temperature, light brightness/color, AC mode/temp).
- [ ] Automation rules editor (if-this-then-that), schedules, scenes ("Good Morning", "Away").
- [ ] Device health/status (online/offline, firmware, battery).
- [ ] Manual override + "undo this automation" / "don't do this again".

### Insights
- [ ] Energy & cost summary (especially for power-cut delay and geyser pre-heat).
- [ ] Notifications/alerts feed (e.g. "Geyser left on", "Unusual sound at 2 AM").

### Backend Integration (Agentic AI)
- [ ] Replace the demo interval with a live WebSocket/stream from the edge device.
- [ ] Connect the Python / AWS Bedrock agentic backend at the marked `// TODO` seams.
- [ ] Make the **Household Rhythm Timeline** update dynamically from backend-learned routines (the UI is already data-driven; only the live data source is pending).
- [ ] Extend reasoning-log entries with an `agent` field so the terminal attributes decisions to specific agents (e.g. `[KitchenAgent]`, `[EnergyAgent]`, `[SecurityAgent]`).

---

## Collaboration

This is a team project. To contribute:

```bash
git clone <repo-url>
cd <repo>
npm install
npm run dev
```

Create a branch for your work, commit, push, and open a pull request. Collaborators must be invited via **GitHub repo → Settings → Collaborators**.
