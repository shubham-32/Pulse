# PULSE — Ambient Smart Home Dashboard

PULSE is a single-page React dashboard for a next-generation **Edge-ML / Acoustic Sensor Fusion** smart home platform built for Indian households. It visualizes real-time acoustic detection, the AI's reasoning, learned daily routines, and AI-managed appliances in one ambient, glassmorphism interface.

> This is the front-end (UI) version. It is fully state-driven and backend-ready — all data flows through a single controller with clearly marked integration seams for a future Python / AWS Bedrock backend.

## Features

- **The Acoustic Pulse** — a glowing glass sphere with an animated dual-waveform (flowing cyan/purple sine waves + orange/gold spectrum spikes) that spikes on each acoustic trigger.
- **Household Rhythm Timeline** — a data-driven vertical timeline of learned routine windows (Morning Pooja, Smart Power-Cut Delay, Intelligent Water Fill, Evening Kitchen Prep).
- **Reasoning Engine** — a macOS-style terminal that streams the AI's structured reasoning (Acoustic Trigger → Context Check → Action) with live timestamps.
- **Intervention Cards** — AI-managed appliance cards (Kitchen Exhaust, Living Room Fan, Water Geyser, Balcony Lights) that update and glow when activated.

## Tech Stack

- **React 18** + **Vite**
- **Tailwind CSS** (glassmorphism theme, obsidian + copper ambient palette)
- **Framer Motion** (sphere, waveform, log streaming, card animations)
- Fonts: **Inter** (UI) + **Fira Code** (terminal)

## Getting Started

```bash
# install dependencies
npm install

# start the dev server
npm run dev
```

Then open the URL Vite prints (default **http://localhost:5173/**).

> Note: do **not** use the VS Code "Go Live" / Live Server extension — this is a Vite app and the JSX must be compiled by the dev server.

### Other scripts

```bash
npm run build     # production build to dist/
npm run preview   # preview the production build
```

## Architecture & Backend Readiness

All UI lives in `src/PulseDashboard.jsx`. State (timeline events, appliances, reasoning log, wave amplitude) is declared at the top of the component — nothing is hardcoded in the render tree.

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

## Project Structure

```
.
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   └── PulseDashboard.jsx   # the full dashboard + state + event pipeline
└── .kiro/specs/pulse-smart-home/   # design, requirements, tasks
```

## Roadmap

- Per-pane scrolling + fixed-viewport layout
- Family/household accounts (members, roles, routines)
- Live video pane (audio + video sensor fusion)
- Expanded device registry and per-device controls
- Agentic AI reasoning attribution in the terminal
