# Design Document: PULSE Smart Home Dashboard

## Overview

PULSE is a single-page, ambient smart home dashboard for an Edge-ML / Acoustic Sensor Fusion platform aimed at Indian households. It is implemented as one self-contained React component using **Tailwind CSS** for styling and **Framer Motion** for animation.

The visual language is "ambient intelligence": a dark obsidian canvas, glassmorphism panels, a living acoustic sphere at the center, a learned-routine timeline on the left, and a streaming reasoning terminal on the right. The bottom shelf shows AI-managed appliances.

The design is explicitly **backend-ready**: all displayed data lives in React state, mutations flow through a single controller function `handleAcousticTrigger(audioProfile, confidenceScore)`, and integration points are marked with `// TODO: Wire API connection to Python/AWS Bedrock endpoint here`.

## Goals

- Reproduce the reference layout: Header, Left Timeline, Center Acoustic Pulse, Right Reasoning Terminal, Bottom Intervention Cards.
- Strict glassmorphism + obsidian/copper ambient theme.
- Animated dual-waveform sphere that reacts to acoustic triggers.
- Fully state-driven rendering (no hardcoded values inside JSX trees).
- A clean, single event pipeline (`handleAcousticTrigger`) that spikes the wave, logs reasoning, and updates appliance state.

## Non-Goals

- No real backend, ML inference, or AWS Bedrock wiring (only commented integration plugs).
- No routing, auth, or multi-page navigation.
- No persistence (state resets on reload).

## Technology Stack

| Concern | Choice | Reason |
|--------|--------|--------|
| Framework | React 18 (Vite) | Fast dev server, modern JSX, single-component scope |
| Styling | Tailwind CSS | Utility-first, matches glassmorphism spec exactly |
| Animation | Framer Motion | Declarative spring/keyframe animation for sphere, waves, log entries |
| Fonts | Inter (UI) + Fira Code (terminal) | Geometric sans + monospace per spec |
| Build | Vite | Lightweight SPA tooling |

## Architecture

### Component Tree

```
App
└── PulseDashboard                      (top-level, owns all state)
    ├── AmbientBackground               (obsidian canvas + copper radial glow)
    ├── Header                          ("PULSE", tracking-widest)
    ├── GlassPanel (Left)
    │   └── HouseholdRhythmTimeline
    │       └── TimelineNode[]          (mapped from timelineEvents state)
    ├── GlassPanel (Center)
    │   └── AcousticPulse
    │       ├── GlassSphere
    │       │   └── DualWaveform        (cyan/purple sine + orange/gold spikes)
    │       └── PlatformRings           (concentric glowing ellipses)
    ├── GlassPanel (Right)
    │   └── ReasoningTerminal
    │       ├── TerminalControls        (red/yellow/green dots)
    │       └── LogLine[]               (mapped from reasoningLog state)
    └── InterventionShelf
        └── ApplianceCard[]             (mapped from appliances state)
```

### Why a single owning component

The spec requires that the event pipeline (`handleAcousticTrigger`) can simultaneously mutate the waveform amplitude, append to the terminal log, and update a specific appliance card. Centralizing all state in `PulseDashboard` keeps these three side effects in one atomic update path and makes the future API wiring a single seam. Presentational children receive data + callbacks via props.

## State Design

All state is declared at the top of `PulseDashboard`. Nothing is hardcoded inside render trees; every rendered value is mapped from these arrays/objects.

### `timelineEvents` (static-ish, learned routine windows)

```js
[
  { id: 'pooja',   time: '06:30', label: 'Morning Pooja Window',     color: 'pink'   },
  { id: 'powercut',time: '09:15', label: 'Smart Power-Cut Delay',    color: 'orange' },
  { id: 'water',   time: '13:45', label: 'Intelligent Water Fill',   color: 'cyan'   },
  { id: 'kitchen', time: '17:30', label: 'Evening Kitchen Prep',     color: 'yellow' },
]
```

Color is stored as a semantic key; a `COLOR_MAP` translates keys to Tailwind classes + glow hex so nodes/connectors render consistently.

### `appliances` (intervention cards)

```js
[
  { id: 'exhaust', name: 'Kitchen Exhaust', icon: 'fan',    state: 'Managed by AI', active: false },
  { id: 'fan',     name: 'Living Room Fan', icon: 'breeze', state: 'Managed by AI', active: false },
  { id: 'geyser',  name: 'Water Geyser',    icon: 'heater', state: 'Managed by AI', active: false },
  { id: 'balcony', name: 'Balcony Lights',  icon: 'bulb',   state: 'Managed by AI', active: false },
]
```

Each card maps an `audioProfile` keyword to a target appliance (see pipeline). `state` and `active` are mutated by the controller.

### `reasoningLog` (terminal telemetry)

```js
[
  { id, timestamp: '20:15:02', text: 'Acoustic Trigger: Mixer Grinder Detected (92% Match)' },
  ...
]
```

Newest entries are appended; the terminal auto-scrolls to the latest.

### `waveAmplitude` (acoustic sphere energy)

A single number (e.g. `1` baseline). On trigger it spikes (e.g. to `2.4`) then eases back to baseline over ~2.5s, driving the waveform's vertical scale via Framer Motion.

### `isListening` (ambient idle indicator)

Boolean controlling the "Listening to Household Sounds..." pulse under the header.

## The Event Pipeline — `handleAcousticTrigger`

This is the single public controller and the core integration seam.

```js
function handleAcousticTrigger(audioProfile, confidenceScore) {
  // 1. Spike the acoustic sphere amplitude, then decay back to baseline.
  // 2. Resolve which appliance this profile maps to (PROFILE_TO_APPLIANCE).
  // 3. Append a structured reasoning entry (Acoustic Trigger -> Context Check -> Action).
  // 4. Update the target appliance's state + active flag.
  // TODO: Wire API connection to Python/AWS Bedrock endpoint here
}
```

### Profile → Appliance mapping

```js
const PROFILE_TO_APPLIANCE = {
  cooker_whistle: 'exhaust',   // pressure cooker -> kitchen exhaust
  mixer_grinder:  'exhaust',
  tap_running:    'geyser',
  footsteps:      'balcony',
  fan_hum:        'fan',
};
```

### Reasoning sequence generated per trigger

For a given trigger the controller pushes a short, staggered burst that mirrors the reference terminal:

1. `Acoustic Trigger: <Profile> Detected (<confidence>% Match)`
2. `Context Check: <window> + <environmental factor>`
3. `Action Triggered: <Appliance> ON`

A timestamp is generated from the current clock (`HH:MM:SS`).

### Demo driver

A `useEffect` interval (and/or manual trigger buttons) calls `handleAcousticTrigger` with sample profiles so the dashboard feels alive during demos. This interval is the placeholder for the real WebSocket/polling feed from the edge device.

```js
// TODO: Wire API connection to Python/AWS Bedrock endpoint here
// Replace the demo interval with a live subscription, e.g.:
//   const ws = new WebSocket(BEDROCK_STREAM_URL);
//   ws.onmessage = (e) => { const { profile, score } = JSON.parse(e.data);
//                           handleAcousticTrigger(profile, score); };
```

## Visual / Styling Design

### Theme tokens

- **Canvas:** `#05060B` base. A `radial-gradient` copper/amber glow (`rgba(217, 119, 60, ~0.18)`) anchored bottom-right, low opacity.
- **Glass panels:** `backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.45)]`.
- **Text:** Inter via Tailwind `font-sans`; terminal uses `font-mono` (Fira Code).
- **Accent palette:** cyan `#22d3ee`, purple `#a855f7`, orange/gold `#f59e0b`, pink `#ec4899`, yellow `#eab308`.

### Layout grid

Full-viewport flex/grid:
- Header pinned top-left.
- Main row: 3 columns — left timeline (~22%), center pulse (flex-1), right terminal (~26%).
- Bottom row: 4 equal intervention cards in a horizontal shelf.
- Responsive: columns stack on narrow screens (center sphere stays prominent).

### The Acoustic Pulse (centerpiece)

- A large circular glass sphere: layered radial gradients + `backdrop-blur`, thin highlight ring, soft outer bloom.
- **DualWaveform** rendered as SVG inside the sphere:
  - Left half: smooth flowing sine paths (cyan → purple), animated by shifting phase.
  - Right half: spiked high-frequency bars/nodes (orange/gold), animated heights.
  - Vertical scale multiplied by `waveAmplitude` so triggers visibly spike the wave.
- **PlatformRings:** 2–3 concentric `ellipse` rings beneath the sphere with blur + opacity pulse to imply a glowing platform floor.

### Reasoning Terminal

- macOS window chrome: rounded top bar with red/yellow/green dots.
- Body: monospaced, bracketed timestamps, dim-green/cyan text, subtle line-in animation (Framer Motion `initial/animate` fade + slide) as entries append.
- Auto-scroll container with a fixed max height and overflow scroll.

### Intervention Cards

- Rounded glass cards, flat SVG icon top, uppercase bold device name, `STATE: ...` subtext.
- Small status indicator dot (green when `active`, dim when idle) echoing the reference check-circles.
- On state change, a brief Framer Motion highlight (border/glow flash) draws the eye to the affected card.

## Animation Strategy (Framer Motion)

| Element | Animation |
|--------|-----------|
| Sphere | Gentle continuous breathing scale + glow opacity loop |
| Waveform | Phase-shifting paths; amplitude bound to `waveAmplitude` spring |
| Amplitude spike | Spring up on trigger, ease back to baseline |
| Platform rings | Staggered opacity/scale pulse |
| Log lines | Enter with fade + upward slide; container auto-scrolls |
| Appliance card | Glow/border flash on `active` transition |
| Header "Listening" | Soft opacity pulse dot |

## Data Flow Summary

```
demo interval / future WS feed
        │  handleAcousticTrigger(profile, score)
        ▼
 ┌──────────────────────────────────────────┐
 │ setWaveAmplitude(spike → decay)           │ → sphere waveform scales
 │ setReasoningLog([...log, entries])        │ → terminal streams + scrolls
 │ setAppliances(update target by id)        │ → matching card flashes/active
 └──────────────────────────────────────────┘
```

## File Structure

```
pulse-smart-home/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx
    ├── index.css                 (Tailwind directives + font imports + theme bg)
    └── PulseDashboard.jsx        (the single component + all subcomponents/state)
```

> The spec asks for a single-page React component. All UI lives in `PulseDashboard.jsx`; presentational pieces may be small local sub-components within the same file for readability, but all state and the `handleAcousticTrigger` controller live at the top of `PulseDashboard`.

## Error Handling & Edge Cases

- Unknown `audioProfile` → log the trigger + context but skip appliance update gracefully (no crash).
- `confidenceScore` clamped to 0–100 for display.
- Reasoning log capped (e.g. last 30 entries) to avoid unbounded growth.
- Amplitude decay cleared on unmount (clear timers/intervals in `useEffect` cleanup).

## Testing Strategy

- **Controller unit tests** for `handleAcousticTrigger`: known profile updates correct appliance, unknown profile is safe, log grows with structured entries, amplitude spikes then decays.
- **Render tests**: timeline renders all `timelineEvents`, shelf renders all `appliances`, terminal renders `reasoningLog`.
- **Manual/visual**: verify glassmorphism, sphere animation, copper glow, responsive stacking.
```
