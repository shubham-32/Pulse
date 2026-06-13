# Implementation Plan: PULSE Smart Home Dashboard

- [x] 1. Scaffold Vite + React project with Tailwind and Framer Motion
  - Create package.json, vite.config.js, index.html, src/main.jsx entry
  - Install/configure Tailwind (tailwind.config.js, postcss.config.js) and Framer Motion
  - Set up src/index.css with Tailwind directives, Inter + Fira Code font imports, obsidian body background
  - _Requirements: 1.1, 1.3_

- [x] 2. Build theme foundation and layout shell in PulseDashboard.jsx
  - Create AmbientBackground (obsidian canvas + bottom-right copper radial glow)
  - Create reusable GlassPanel wrapper (backdrop-blur-xl, bg-white/5, border-white/10, shadow)
  - Create Header ("PULSE" bold uppercase tracking-widest) + listening indicator
  - Lay out full-viewport grid: 3 columns + bottom shelf, responsive stacking
  - _Requirements: 1.2, 1.4, 2.1, 2.2, 2.3, 2.4_

- [x] 3. Define all component state and the event pipeline
  - Declare timelineEvents, appliances, reasoningLog, waveAmplitude, isListening state at top of component
  - Add COLOR_MAP and PROFILE_TO_APPLIANCE constants
  - Implement handleAcousticTrigger(audioProfile, confidenceScore): amplitude spike+decay, structured log burst, appliance update, unknown-profile safety, log cap
  - Add demo interval driver + // TODO Bedrock integration seams and useEffect cleanup
  - _Requirements: 4.5, 5.3, 5.4, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 4. Implement Household Rhythm Timeline (left column)
  - Render vertical rule + colored nodes mapped from timelineEvents state
  - Show time, label, and color-matched node/connector per event
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5. Implement The Acoustic Pulse centerpiece (center column)
  - Build glass sphere (layered gradients, highlight ring, outer bloom)
  - Build SVG DualWaveform: cyan/purple sine left, orange/gold spikes right, animated, amplitude-bound
  - Add concentric glowing platform rings beneath sphere
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Implement Reasoning Engine terminal (right column)
  - macOS window chrome with red/yellow/green dots
  - Render reasoningLog lines (monospaced, bracketed timestamps) with Framer Motion enter animation
  - Auto-scroll to newest entry
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. Implement Intervention Cards shelf (bottom row)
  - Render four appliance cards from state (icon, uppercase name, STATE indicator, status dot)
  - Add glow/border flash animation when an appliance becomes active
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [-] 8. Verify build and run dev server
  - Run install + build, fix any errors, confirm dev server renders the dashboard
  - Confirm triggers spike the wave, stream logs, and flash cards
  - _Requirements: 1.1, 4.5, 7.2_
