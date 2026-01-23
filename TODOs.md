# TODOs

---

## High-Level Guidance

- **Start Simple:** Get basic rendering working first, then optimize
- **Profile Early:** Use browser DevTools to identify bottlenecks
- **Think Scale:** What if there were 1,000 objects? 10,000?
- **Show Your Process:** Comments and commit messages explaining complex decisions are valuable
- **Have Fun:** This is similar to what you'd build at KINEXON!

---

## Deliverables

1. **Source Code**
   - Complete frontend application
   - All configuration files (package.json, etc.)
   - An additional frontend.Dockerfile and compose.yml to start the full stack at once

2. **README**
   - Setup and run instructions
   - Technology choices and rationale
   - Known limitations or trade-offs
   - Time spent (approximately)

3. **Documentation** (optional but appreciated)
   - Architecture decisions
   - Performance optimizations applied
   - Future improvements you'd make

---

## Requirements

- [x] REQUIREMENT - You must use a modern frontend framework for this challenge.
- [x] REQUIREMENT - Connects to a real-time data stream** using Server-Sent Events (SSE)
- [x] REQUIREMENT - Visualizes 250 objects with 250 position updates** on a 2D map canvas
- [x] REQUIREMENT - Maintains smooth performance** with updates every 100ms
- [x] REQUIREMENT - Real-Time Visualization & performance
  - [x] SUB-REQUIREMENT - Connect to the SSE stream (`/api/positions/stream`)
  - [x] SUB-REQUIREMENT - Fetch object metadata from (`/api/objects`)
  - [x] SUB-REQUIREMENT - Render all 250 objects on a 2D map
  - [x] SUB-REQUIREMENT - Update object positions smoothly as new data arrives (250 position updates per cycle). Note: This is not a final load requirement—you should have an idea of how to scale up in the future (e.g., to handle thousands of objects), though full implementation isn't needed now.
- [x] REQUIREMENT - Visual Design
  - [x] SUB-REQUIREMENT - Clear representation of the 100m × 100m map area
  - [x] SUB-REQUIREMENT - Distinct visual representation of each object, based on `labels`
  - [x] SUB-REQUIREMENT - Show object orientation using the `a` (angle) field
  - [x] SUB-REQUIREMENT - Handling of "invalid" positions (`is_valid: false`): these are positions that reflect "disappeared" objects. Suggest a way to visualize it
  - [x] SUB-REQUIREMENT - Align with KINEXON branding/colors if possible (optional, see `public/index.html` for CSS variables)
- [x] REQUIREMENT - Interactivity
  - [x] SUB-REQUIREMENT - Click/tap on an object to view its details
  - [x] SUB-REQUIREMENT - Display object metadata: `name`, `labels`, `properties` (capacity, fill_level, operator, etc.)
  - [x] SUB-REQUIREMENT - Display position data: `object_id`, `tag_id`, `battery.percentage`, `timestamp`, `coordinates`
  - [x] SUB-REQUIREMENT -  Clear visual feedback for selected object
- [x] REQUIREMENT - Code Quality
  - [x] SUB-REQUIREMENT - Clean, well-structured code
  - [x] SUB-REQUIREMENT - TypeScript (or equivalent type safety)
  - [x] SUB-REQUIREMENT - Basic error handling (connection failures, parsing errors)
- [x] REQUIREMENT - Provides basic interaction (e.g., object selection, info display)
- [x] REQUIREMENT - Map Coordinate System
  - [x] SUB-REQUIREMENT - Coordinate System:** Cartesian (X, Y in meters)
  - [x] SUB-REQUIREMENT - Origin: Bottom-left corner (0, 0)
  - [x] SUB-REQUIREMENT - Dimensions: 100m (width) × 100m (height)
  - [x] SUB-REQUIREMENT - X Axis: Left (0) to Right (100)
  - [x] SUB-REQUIREMENT - Y Axis: Bottom (0) to Top (100)
- [x] REQUIREMENT - Source Code
  - [x] SUB-REQUIREMENT - Complete frontend application
  - [x] SUB-REQUIREMENT - All configuration files (package.json, etc.)
  - [x] SUB-REQUIREMENT - An additional frontend.Dockerfile and compose.yml to start the full stack at once
- [x] REQUIREMENT - Rewrite README (Frontend)
  - [x] SUB-REQUIREMENT - Setup and run instructions
  - [x] SUB-REQUIREMENT - Technology choices and rationale
  - [x] SUB-REQUIREMENT - Known limitations or trade-offs
  - [x] SUB-REQUIREMENT - Time spent (approximately)
- [x] REQUIREMENT - Documentation
  - [x] SUB-REQUIREMENT - Architecture decisions
  - [x] SUB-REQUIREMENT - Performance optimizations applied
  - [x] SUB-REQUIREMENT - Future improvements you'd make
- [x] REQUIREMENT - PERFORM A FINAL CHECK FOR ANY DANGLING TODOs

---

## Completed TODOs

- [x] Pull down repo
- [x] Basic setup - Docker
- [x] Basic setup - BE service
- [x] Basic setup - FE app
- [x] Docker/BE Proof of Life 
- [x] TECH - Angular/AnalogJS
- [x] TECH - Web Worker
- [x] TECH - Vite 8
- [x] TECH - Oxlint
- [x] TECH - Oxfmt
- [x] TECH - Angular Standalone Components - In v19, Angular swapped the default value for standalone from false to true - ng generate @angular/core:standalone
- [x] TECH - OnPush Change Detection Strat -
- [x] TECH - Zoneless - provideZonelessChangeDetection
- [x] Add a CSS reset
- [x] TECH - Template canvas element
- [x] Pull down latest bug fix
- [x] UI - Implement the basic KINEXON UI Theme 
- [x] TECH - State Management Strats

---
