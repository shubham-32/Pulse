# Requirements: PULSE Smart Home Dashboard

## Introduction

PULSE is a single-page ambient smart home dashboard for an Edge-ML / Acoustic Sensor Fusion platform aimed at Indian households. It is built as a React component using Tailwind CSS and Framer Motion. The UI is fully state-driven and backend-ready, exposing a single controller (`handleAcousticTrigger`) and clearly marked integration seams for a future Python/AWS Bedrock backend.

## Requirements

### Requirement 1 — Project Scaffold & Theme

**User Story:** As a developer, I want a runnable React + Tailwind + Framer Motion project with the PULSE visual theme, so that the dashboard renders on a deep obsidian canvas with copper ambient glow.

#### Acceptance Criteria
1. WHEN the project is started THEN the app SHALL run via Vite with React 18, Tailwind CSS, and Framer Motion installed.
2. THE background SHALL be a deep obsidian canvas (`#05060B`) with a warm, low-opacity copper/amber radial glow in the bottom-right quadrant.
3. THE UI SHALL use a geometric sans-serif (Inter) globally and a monospaced font (Fira Code) for terminal logs.
4. ALL panels SHALL use glassmorphism: `backdrop-blur-xl`, `bg-white/5`, `border-white/10`, and soft outer shadows.

### Requirement 2 — Layout Grid

**User Story:** As a user, I want a clean full-viewport layout, so that I can see all dashboard regions at once.

#### Acceptance Criteria
1. THE header SHALL show "PULSE" in the top-left, bold uppercase, tracking-widest.
2. THE main area SHALL have three columns: left timeline, center acoustic pulse, right reasoning terminal.
3. THE bottom row SHALL show a horizontal shelf of four intervention cards.
4. WHEN the viewport narrows THEN columns SHALL stack responsively without breaking layout.

### Requirement 3 — Household Rhythm Timeline

**User Story:** As a user, I want a vertical timeline of learned routine windows, so that I can see scheduled automation events.

#### Acceptance Criteria
1. THE timeline SHALL render a vertical rule with colored nodes from state, not hardcoded in JSX.
2. THE timeline SHALL include: 06:30 Morning Pooja (pink), 09:15 Smart Power-Cut Delay (orange), 13:45 Intelligent Water Fill (cyan), 17:30 Evening Kitchen Prep (yellow).
3. EACH node SHALL show its time, label, and color-matched node + connector.

### Requirement 4 — The Acoustic Pulse (Centerpiece)

**User Story:** As a user, I want a glowing glass sphere with a living waveform, so that acoustic activity feels tangible.

#### Acceptance Criteria
1. THE center SHALL render a large transparent glowing glass sphere.
2. INSIDE the sphere THE system SHALL render a dual-waveform: flowing cyan/purple sine waves on the left and spiked orange/gold high-frequency nodes on the right.
3. THE waveform SHALL be continuously animated via Framer Motion.
4. THE base of the sphere SHALL show glowing concentric elliptical rings on a platform floor.
5. WHEN an acoustic trigger fires THEN the wave amplitude SHALL visibly spike and then decay back to baseline.

### Requirement 5 — Reasoning Engine Terminal

**User Story:** As a user, I want a terminal that streams the AI's reasoning, so that I understand why actions were taken.

#### Acceptance Criteria
1. THE right column SHALL mimic a macOS terminal window with red/yellow/green control dots top-left.
2. LOG lines SHALL be monospaced with bracketed timestamps, rendered from state.
3. WHEN a trigger fires THEN structured reasoning entries SHALL stream in (Acoustic Trigger → Context Check → Action) with an enter animation.
4. THE terminal SHALL auto-scroll to the newest entry and cap stored entries to avoid unbounded growth.

### Requirement 6 — Intervention Cards

**User Story:** As a user, I want appliance cards showing AI-managed state, so that I can see what the system is controlling.

#### Acceptance Criteria
1. THE shelf SHALL render four cards from state: Kitchen Exhaust, Living Room Fan, Water Geyser, Balcony Lights.
2. EACH card SHALL show a flat icon, uppercase bold device name, and a `STATE:` indicator.
3. EACH card SHALL show an active/idle status indicator.
4. WHEN a trigger updates an appliance THEN that card's state SHALL update and briefly flash/glow.

### Requirement 7 — Event Pipeline & Backend Readiness

**User Story:** As a developer, I want a single controller and clear integration seams, so that wiring a real backend is frictionless.

#### Acceptance Criteria
1. THE component SHALL expose `handleAcousticTrigger(audioProfile, confidenceScore)` as the central controller.
2. WHEN called THE controller SHALL spike wave amplitude, push structured log entries, and update the mapped appliance — in one update path.
3. ALL displayed data (logs, timeline events, appliances) SHALL live in React state at the top of the component, not hardcoded in render trees.
4. EVERY state-modifying integration point SHALL include a `// TODO: Wire API connection to Python/AWS Bedrock endpoint here` comment.
5. AN unknown `audioProfile` SHALL be handled gracefully without crashing.
6. A demo driver SHALL periodically invoke the controller so the dashboard appears live, with a commented seam to replace it with a real feed.
