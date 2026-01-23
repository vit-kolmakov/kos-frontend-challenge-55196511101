# KINEXON-FRONTEND

## Overview

AnalogJS (v2) serving an Angular (v21+) Single Page Application.

### Technical Rationale

Refer to [ARCHITECTURE.md](../ARCHITECTURE.md) for an expansive breakdown on decisions made.

### Technical Process

Refer to [TODOs.md](../TODOs.md) for a comprehensive record of work completed.

### Technical Setup

This project was built using a a WSL2 instance on a Windows machine, which offers a comparable experience to developing on Linux. With this in mind the majority of commands should behave on a standard POSIX machine.

### Technical Effort

Approximately 12 hours was spent on completion of the core task, with another 3 hours spent optimization and refinement passes.

---

## Setup

Split across multiple axes

### Terminal Commands

```bash
# To install or update dependencies
pnpm install
# To run the FE dev server
pnpm dev
# To build the FE application
pnpm build
# Start the BE Docker container
docker compose up backend
# Start the FE Docker container
docker compose up frontend
# Start the FS Docker containers
docker compose up
```

### Docker 

1. In Docker Desktop select the gear icon
2. Select the Resources Tab
3. Select the WSL Integration Tab
4. Select "Enable integration with my default WSL distro"
5. Select your current distro
6. From here you may now start/stop/delete images and gain visibility into their systems

### Browser 

1. You can record an Angular specific profile per the Angular [docs](https://angular.dev/best-practices/profiling-with-chrome-devtools#recording-a-profile).
2. By running `ng.enableProfiling()` in Chrome's console panel and following the steps at the link you can find Angular specific optimizations.
3. NOTE: Angular profiling works exclusively in development mode.

---

## Development

Vite's HMR will automatically reload the application if you change any of the source files.

### Front End 

Run `pnpm dev` for the FE dev server. Navigate to `http://localhost:5173/` for the live application. If you want to test the production build behaviors, instead run `docker compose up frontend`. The BE server must be running to receive data. 

### Back End 

Run `docker compose up backend` for the BE dev server. Navigate to `http://localhost:8080/` for the server status page. Refer to  [SETUP.md](../SETUP.md) for an explicit setup guide.

### Full Stack 

Run `docker compose up` to simultaneously launch both the BE and FE. Navigate to `http://localhost:5173/` to see the live site.

---

## Build

Run `pnpm run build` to build the client/server project. The client build artifacts are located in the `dist/analog/public` directory. The server for the API build artifacts are located in the `dist/analog/server` directory.This build process is encapsulated within the `frontend.Dockerfile` and can be triggered by running `docker compose build`, which will build the entire stack's images.

---

## Resources

- Angular Docs - [Home](https://angular.dev/)
- AnalogJS Docs - [Home](https://analogjs.org/docs)
- Vite Docs - [Home](https://vite.dev/guide/)
- Docker Docs - [Home](https://docs.docker.com/)

---
