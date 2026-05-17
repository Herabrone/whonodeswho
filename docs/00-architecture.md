# whoNodeswho — Architecture

## Repo layout

This is a TypeScript npm workspace. All source lives under `apps/` and
`packages/`; the workspace root holds only orchestration config.

```
apps/
  web/          React 18 + Vite + Tailwind + React Flow + Zustand (frontend)
  api/          NestJS + Prisma + SQLite (backend, runs on :3000 locally)
packages/
  contracts/    Shared TypeScript types consumed by both apps
docs/           Architecture and feature track specs
```

## Running locally

```bash
npm install                                        # installs all workspaces
npm run prisma:push --workspace @relationflow/api  # creates apps/api/dev.db
npm run dev                                        # starts web (:5173) + api (:3000)
```

## Frontend — `apps/web`

React single-page app built with Vite. State lives in a Zustand store
(`src/store/useGraphStore.ts`). All persistence goes through the
`RelationshipStore` interface (`src/store/persistence.ts`), currently backed by
`HttpStore` which calls the backend API. Auth is managed by `AuthContext`, which
bootstraps by calling `GET /auth/me` and exposes `signIn`, `signUp`, and
`signOut` actions backed by the NestJS session endpoints.

**Key files:**

| File | Purpose |
|------|---------|
| `src/types.ts` | Re-exports from `@relationflow/contracts`; keeps old import paths working |
| `src/store/useGraphStore.ts` | Zustand store — all tracks integrate here |
| `src/store/persistence.ts` | Async `RelationshipStore` interface |
| `src/store/httpStore.ts` | HTTP implementation of `RelationshipStore` |
| `src/auth/AuthContext.tsx` | Auth provider, session bootstrap, sign-in/up/out |
| `src/auth/AuthGuard.tsx` | Loading/login/app gate |

## Backend — `apps/api`

NestJS REST API. Modules: `AuthModule`, `GraphModule`, `HealthModule`,
`PrismaModule`. Authentication uses server-side sessions backed by
`express-session`; session cookies are `httpOnly`, `sameSite: lax`. All
`/graph/*` routes are guarded by `SessionAuthGuard`.

**Endpoints:**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | none | Health check |
| POST | `/auth/register` | none | Create account + set session |
| POST | `/auth/login` | none | Verify credentials + set session |
| GET | `/auth/me` | none | Return current user or `null` |
| POST | `/auth/logout` | session | Destroy session |
| GET | `/graph` | session | Load user's full graph snapshot |
| PUT | `/graph` | session | Save user's full graph snapshot |
| DELETE | `/graph` | session | Reset user's graph to empty |

**Key files:**

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Single `User` model; graph stored as JSON columns |
| `src/auth/auth.service.ts` | Register, login, getCurrentUser |
| `src/auth/auth.controller.ts` | Session endpoint handlers |
| `src/auth/session-auth.guard.ts` | Route guard that checks `req.session.userId` |
| `src/graph/graph.service.ts` | Load, save, clear graph + server-side first-run seed |
| `src/graph/graph.controller.ts` | Graph endpoint handlers |

## Shared contracts — `packages/contracts`

Pure TypeScript, no runtime dependencies. Exports the frozen domain types
(`Person`, `Relationship`, `GraphData`, `PersistedState`, etc.) and auth
response shapes. Both apps import these shared contracts from
`@relationflow/contracts`.

**Do not add React or NestJS imports here.**

## Data flow

```
Browser                Backend               Database
  |                      |                      |
  |-- POST /auth/login -->|                      |
  |<-- { user } ---------| bcrypt.compare ------>|
  |                       |<--- user row ---------|
  |
  |-- GET /graph -------->|
  |                       |-- SELECT user ------->|
  |<-- PersistedState ----|<--- JSON columns ------|
  |
  |-- PUT /graph -------->|
  |                       |-- UPDATE user ------->|
  |<-- PersistedState ----|<--- updated row -------|
```

## Persistence contract

The store only ever talks to persistence through the `RelationshipStore`
interface (`load / save / clear`). Swapping the backend (e.g. to PostgreSQL, or
adding real-time sync) means writing a new implementation; the store and UI do
not change.

## Type contract

`packages/contracts/src/index.ts` is the integration boundary. Both apps import
types from `@relationflow/contracts`. The frontend `src/types.ts` is a thin
re-export that keeps existing `../types` import paths working without a
mass-rename.

**Rules:**
- Add new shared types to `packages/contracts/src/index.ts` only.
- `src/types.ts` must stay a pure re-export; no logic here.
- The backend must never import from `apps/web`.
- The frontend must never import from `apps/api`.

## Auth model

Sessions are backed by `express-session` with a server-side session store.
Cookies are `httpOnly` and `sameSite: lax`. The frontend never sees or stores a
raw token. On page load, `AuthContext` calls `GET /auth/me`; if it returns a
user the app hydrates the graph immediately.

## First-run experience

When a new account is registered (`POST /auth/register`), the backend writes the
full demo seed graph into the user's row before returning. This means every new
user gets the same starting graph regardless of which device they register from.

## Feature tracks

Three feature areas are built inside `src/features/` and integrate only through
the Zustand store. No feature track may edit the store file directly.

| Track | Directory | What it owns |
|-------|-----------|--------------|
| A — CRUD | `src/features/crud/` | Add/edit/delete people & relationships, JSON/CSV import-export |
| B — Intelligence | `src/features/intelligence/` | Focus mode, degrees of separation |
| C — Filtering | `src/features/filtering/` | Category filters, search, reset view |
