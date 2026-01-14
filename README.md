# KINEXON Frontend Engineering Challenge

Welcome to the KINEXON Frontend Engineering Challenge! This challenge is designed to give you a chance to showcase your skills in building high-performance, real-time data visualizations—core capabilities for our Industrial IoT platform. It also serves as a foundation for our technical interview discussion.

## Backend Overview

For this challenge, we imagine that the backend is already developed and running. The backend provides a real-time data simulation that mimics our production Industrial IoT platform. It simulates 250 moving objects (containers, tools, and orders) with position updates streaming every 100ms.

**What the backend does:**

- Simulates 250 objects moving across a 100m × 100m map area
- Generates real-time position updates (250 updates per cycle) via Server-Sent Events (SSE)
- Provides RESTful API endpoints for fetching object metadata, current positions, and system statistics
- Maintains object state including position coordinates, orientation, battery levels, and custom properties
- Streams position data in real-time with timestamps and validation flags

Your task is to build the frontend that consumes this data and visualizes it efficiently in the browser.

## The Challenge

Build a **real-time asset tracking visualization** that displays the positions of moving objects on a 2D map. You'll consume live position data from our backend API and render it efficiently in the browser.

### What You'll Build

A web application that:

1. **Connects to a real-time data stream** using Server-Sent Events (SSE)
2. **Visualizes 250 objects with 250 position updates** on a 2D map canvas
3. **Maintains smooth performance** with updates every 100ms
4. **Provides basic interaction** (e.g., object selection, info display)

This mirrors real-world challenges at KINEXON, where our platform tracks thousands of assets across factory floors and warehouses in real-time.

## Getting Started

Refer to SETUP.md to get the backend running on your machine.

### API Endpoints

#### 1. **SSE Stream**

```text
GET /api/positions/stream
```

Returns a Server-Sent Events stream with real-time position updates.

**Event Format:**

```json
{
  "object_id": 1,
  "tag_id": "TAG-0001",
  "timestamp": "2026-01-09T10:30:45.123456Z",
  "is_valid": true,
  "source_id": 3,
  "x": 45.67,
  "y": 32.18,
  "z": 0.0,
  "a": 1.57,
  "b": 0.0,
  "c": 0.0,
  "latitude": 48.1354,
  "longitude": 11.5824,
  "altitude": 520.0,
  "flags": [],
  "tenant_id": 1,
  "battery": {
    "percentage": 87,
    "percentage_last_update": "2026-01-09T10:30:45.123456Z"
  }
}
```

#### 2. **Get All Positions**

```text
GET /api/positions
```

Returns a snapshot of all current positions (useful for initial state).

#### 3. **Get Single Position**

```text
GET /api/position?id={object_id}
```

Returns the current position of a specific object.

#### 4. **Get All Objects**

```text
GET /api/objects
```

Returns metadata for all 250 objects.

**Response Format:**

```json
[
  {
    "id": 5,
    "name": "container-005",
    "labels": ["container"],
    "properties": {
      "capacity": "285",
      "fill_level": "1",
      "material_type": "finished_goods",
      "status": "completed",
      "temperature": "23.8",
      "zone": "Zone-D"
    }
  },
  {
    "id": 7,
    "name": "tool-007",
    "labels": ["tool"],
    "properties": {
      "tool_type": "pallet_jack",
      "max_load": "947",
      "operator": "John",
      "maintenance_due": "2026-02-15",
      "usage_hours": "342",
      "status": "available",
      "zone": "Zone-B"
    }
  }
]
```

#### 5. **Get Single Object**

```text
GET /api/object?id={object_id}
```

Returns metadata for a specific object.

#### 6. **System Stats**

```text
GET /api/stats
```

Returns metadata about the simulation:

```json
{
  "total_objects": 250,
  "total_positions": 250,
  "connected_clients": 2,
  "update_interval_ms": 100,
  "map_dimensions": {
    "width": 100.0,
    "height": 100.0
  }
}
```

### Map Coordinate System

- **Coordinate System:** Cartesian (X, Y in meters)
- **Origin:** Bottom-left corner (0, 0)
- **Dimensions:** 100m (width) × 100m (height)
- **X Axis:** Left (0) to Right (100)
- **Y Axis:** Bottom (0) to Top (100)

## Core Requirements

Your solution must include:

You must use a modern frontend framework for this challenge. We want to see how you structure and build applications using state-of-the-art tools. At KINEXON, we currently use Angular for our main UI.

### 1. Real-Time Visualization & performance

- [ ] Connect to the SSE stream (`/api/positions/stream`)
- [ ] Fetch object metadata from `/api/objects`
- [ ] Render all 250 objects on a 2D map
- [ ] Update object positions smoothly as new data arrives (250 position updates per cycle). Note: This is not a final load requirement—you should have an idea of how to scale up in the future (e.g., to handle thousands of objects), though full implementation isn't needed now.

### 2. Visual Design

- [ ] Clear representation of the 100m × 100m map area
- [ ] Distinct visual representation of each object, based on `labels`
- [ ] Show object orientation using the `a` (angle) field
- [ ] Handling of "invalid" positions (`is_valid: false`): these are positions that reflect "disappeared" objects. Suggest a way to visualize it
- [ ] Align with KINEXON branding/colors if possible (optional, see `public/index.html` for CSS variables)

### 3. Interactivity

- [ ] Click/tap on an object to view its details
- [ ] Display object metadata: `name`, `labels`, `properties` (capacity, fill_level, operator, etc.)
- [ ] Display position data: `object_id`, `tag_id`, `battery.percentage`, `timestamp`, `coordinates`
- [ ] Clear visual feedback for selected object

### 4. Code Quality

- [ ] Clean, well-structured code
- [ ] TypeScript (or equivalent type safety)
- [ ] Basic error handling (connection failures, parsing errors)

## What We're Looking For

We'll evaluate your submission on:

1. **Performance** (30%)
   - Smooth rendering of the map
   - Efficient use of browser APIs
   - Smart optimization techniques

2. **Code Architecture** (25%)
   - Clean, maintainable code structure
   - Proper separation of concerns
   - Scalable design patterns

3. **Visual Design** (15%)
   - Clear, intuitive interface
   - Professional appearance
   - Attention to detail

4. **Real-Time Data Handling** (20%)
   - Correct SSE implementation
   - Proper state synchronization
   - Error handling

5. **Problem Solving** (10%)
   - Creative solutions to challenges
   - Trade-off decisions
   - Documentation of approach

## Deliverables

Please provide:

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

## Time Expectation

This challenge is designed with a **limited scope** in mind — we understand you have other commitments and don't expect you to spend excessive time on it. As a soft upper limit, we suggest aiming for around **8 hours** to help you manage your time effectively. Focus on the core requirements first. We'll discuss your solution, trade-offs, and any reasoned shortcuts during the interview. It's perfectly fine to submit an imperfect solution if you document your approach and share ideas for future improvements.

## Using AI Tools

You are encouraged to use AI tools to accelerate development. We use them widely at KINEXON, and we'll evaluate how effectively you integrate and adapt AI-generated code rather than simply copying it verbatim.

## Submission

Please submit your solution in the Git repository that you received and inform your recruiting contact about finishing the challenge.

## Tips

- **Start Simple:** Get basic rendering working first, then optimize
- **Profile Early:** Use browser DevTools to identify bottlenecks
- **Think Scale:** What if there were 1,000 objects? 10,000?
- **Show Your Process:** Comments and commit messages explaining complex decisions are valuable
- **Have Fun:** This is similar to what you'd build at KINEXON!

## Questions?

If you have any questions about the challenge, please don't hesitate to reach out to [vitalii.kolmakov@kinexon.com](mailto:vitalii.kolmakov@kinexon.com).

---

Good luck! We're excited to see your solution.
