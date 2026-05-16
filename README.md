# RelationFlow

A personal relationship graph app — map people as nodes and their
relationships as colored edges, then explore your network with focus mode and
degrees-of-separation pathfinding.

Built with React 18 · TypeScript · Vite · Tailwind CSS · React Flow
(`@xyflow/react`) · Zustand.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173 — loads a seeded demo graph
npm run build      # production build
npm run typecheck  # tsc -b
npm test           # vitest
```

## Project status

This repo is **Phase 0 — the foundation**. It is complete and runnable: the
graph canvas, store, persistence, types, and graph algorithms all work, and a
seeded demo graph loads on first run. Three features are stubbed and built in
parallel as Tracks A, B, and C.

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
src/
  types.ts         constants.ts       — frozen contracts
  lib/graph.ts                        — graph algorithms (BFS, degrees, layout)
  store/                              — Zustand store + localStorage persistence
  graph/                              — React Flow canvas (reacts to store)
  features/crud · intelligence · filtering   — the three parallel tracks
docs/                                 — the plan and per-track specs
```
