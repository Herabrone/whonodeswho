# RelationFlow

A personal relationship graph app — map people as nodes and their
relationships as colored edges, then explore your network with focus mode and
degrees-of-separation pathfinding.

Built as a local TypeScript workspace with React 18 · Vite · Tailwind CSS ·
React Flow (`@xyflow/react`) on the frontend and NestJS + Prisma + SQLite on
the backend.

## Quick start

```bash
npm install
npm run dev        # web: http://localhost:5173, api: http://localhost:3000
npm run build:web  # frontend production build
npm run build:api  # backend production build
npm run typecheck  # frontend typecheck
npm test           # frontend vitest suite
./ops/build dev    # orchestrated local run (web on http://localhost:3005)
./ops/build prod   # orchestrated production-style run (web on http://localhost:3005)
```

The `build` wrapper script handles startup orchestration for both modes:
- forces frontend to use port `3005`
- checks required ports and stops existing processes on those ports
- waits for API (`/health`) and frontend HTTP health checks before reporting ready

## Local backend

The backend lives in `apps/api` and uses Prisma with a local SQLite database.
The database file is created automatically at `apps/api/dev.db` when you run:

```bash
npm run prisma:push --workspace @relationflow/api
```

The root `npm run dev` command starts both the web app and API together.

## Project status

This repo is currently in the middle of a frontend-only to full-stack workspace
migration. The web app, backend scaffold, local auth flow, and backend graph
persistence are in place. Some docs still reflect the original Phase 0
frontend-only layout and will be updated as the migration continues.

## How this project is built — read the docs

The build is split so three coding agents can work **at the same time** without
collisions. Start here:

| Doc | What it is |
|-----|-----------|
| [`docs/00-architecture.md`](docs/00-architecture.md) | **Master plan.** Parallelization model, file-ownership rules, integration contract. Read first. |
| [`docs/phase-0-foundation.md`](docs/phase-0-foundation.md) | Reference for the foundation: store API, graph primitives, type contracts. |
| [`docs/track-a-crud-data.md`](docs/track-a-crud-data.md) | Track A — add/edit/delete people & relationships, detail panels, JSON/CSV import-export. |
| [`docs/track-b-graph-intelligence.md`](docs/track-b-graph-intelligence.md) | Track B — focus mode, degrees of separation. |
| [`docs/track-c-filtering-search.md`](docs/track-c-filtering-search.md) | Track C — category filters, search, reset view. |

Each track works only inside `src/features/<track>/` and integrates only
through `src/store/useGraphStore.ts`. Hand each agent `00-architecture.md` plus
its own track doc.

## Layout

```
apps/
  web/                                — React + Zustand frontend
  api/                                — NestJS + Prisma backend
packages/
  contracts/                          — shared graph and auth contracts
docs/                                 — the plan and per-track specs
```
