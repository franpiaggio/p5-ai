# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered p5.js creative coding editor. Users write/edit p5.js sketches with help from an LLM chat assistant that can suggest code changes via a diff review flow. Supports OpenAI, Anthropic, and Groq (demo) providers.

## Monorepo Structure

- **`frontend/`** — React 19 + Vite + TypeScript + Tailwind CSS 4 + Monaco Editor
- **`backend/`** — NestJS 11 + TypeORM + SQLite (better-sqlite3)
- **Root `package.json`** — Only has `concurrently` for running both together

Package manager: **pnpm**

## Commands

### Development
```bash
# Run both frontend and backend concurrently
pnpm dev

# Run individually
pnpm --dir frontend dev      # Vite dev server on :5173
pnpm --dir backend start:dev  # NestJS with --watch on :3001
```

### Build
```bash
pnpm --dir frontend build     # tsc -b && vite build
pnpm --dir backend build      # nest build
```

### Lint / Format
```bash
pnpm --dir frontend lint      # ESLint
pnpm --dir backend lint       # ESLint with --fix
pnpm --dir backend format     # Prettier
```

### Test
```bash
pnpm test                            # All unit tests (backend Jest + frontend Vitest)
pnpm --dir backend test              # Backend unit tests (Jest)
pnpm --dir frontend test             # Frontend unit tests (Vitest)
pnpm test:api                        # Backend API smoke via supertest (in-memory SQLite)
pnpm test:e2e                        # Browser e2e (Playwright; boots its own backend+frontend on ports 3211/5273)
pnpm test:all                        # Everything
```

Unit tests live next to their source (`*.spec.ts` backend, `*.test.ts` frontend). Browser e2e specs live in `e2e/` (LLM responses are mocked at the network layer via `page.route`, so no API keys are needed). CI runs all of these on every push/PR (`.github/workflows/ci.yml`).

### Docker
```bash
docker compose up   # Frontend on :3080, backend internal on :3000
```

### Install
```bash
pnpm install:all    # Installs both frontend and backend deps
```

## Architecture

### Frontend (`frontend/src/`)

**State management**: Zustand store at `store/editorStore.ts` — holds code, chat messages, editor state, LLM config, code history. Persisted to localStorage as `'p5-ai-editor'`. API key is NOT in localStorage — it syncs to sessionStorage (`'p5-ai-editor-key'`). Auth state in `store/authStore.ts` (persisted as `'p5-ai-auth'`).

**API client**: `services/api.ts` — all backend communication. Chat uses `streamChat()` which returns an async generator over SSE. Frontend caps chat history at 10 messages before sending to backend.

**Key component areas** (in `components/`):
- `Chat/` — Chat panel, message bubbles, markdown rendering
- `Editor/` — Monaco-based code editor with p5.js type declarations and custom semantic token provider for function-call coloring
- `Preview/` — Live p5.js canvas rendering via sandboxed iframe (`allow-scripts` only)
- `Layout/` — Resizable split panes (desktop) and mobile layout
- `Toolbar/` — File menu, settings, user/auth controls
- `Sketches/` — Save/load sketch modals
- `Auth/` — Login modal (Google OAuth + credentials)
- `Settings/` — LLM provider/model config, editor theme selector
- `Console/` — Runtime console output display
- `History/` — Code change history browser

**Hooks**: `useResizable` (drag-resize panels), `useIsMobile`, `useEscapeClose`

**Multi-file sketches**: A sketch is a `SketchFile[]` (name/content/language) plus a
`Library[]` (CDN url list); the protected entry point is `sketch.js` or `sketch.ts`
(`isEntryFile`/`findEntryFile` in `constants/defaultFiles.ts`) — switching the editor
language (Code menu) migrates the entry's extension and updates sibling imports. The
store keeps the active file's content mirrored in the live `code` buffer
(`syncActiveFile`). Open editor tabs live in `openFiles` (closing a tab ≠ deleting the
file; the last tab can't close).
- **Preview assembly** (`Preview/previewTemplate.ts`): hybrid. If any file uses
  `import`/`export`, files are assembled as **native ES modules** (import map + data
  URLs, relative specifiers rewritten to bare, a bridge re-exposes `setup`/`draw` to
  `window` for p5 global mode). Otherwise files are **concatenated** as global
  `<script>`s with `sketch.js` last.
- **Single file by default** (`utils/fileMode.ts`, pure + unit-tested): a sketch stays
  in one file unless multi-file is earned. `allowsMultiFile({files, message, enabled})`
  is true when the user toggled it on (`multiFileEnabled` in the store, Files sidebar),
  the sketch already has several files, the message asks for a split
  (`requestsMultiFile`, EN + ES), or the code passed `MULTI_FILE_LINE_THRESHOLD` (400
  lines). The flag is sent to the backend as `allowMultiFile` (it swaps the layout rules
  in the system prompt) **and** enforced client-side: with it false, `planFileChanges`
  folds any file the model tried to create into the entry file
  (`coalesceIntoEntry` → `joinFileSources`, helpers first, module syntax stripped).
  Turning the toggle off merges the sketch back down (`mergeFilesToSingle`).
- **AI edits** (`utils/fileEdits.ts`, pure + unit-tested): `planFileChanges` turns an
  assistant message into per-file changes (search/replace with optional `// filename:`
  prefixes, one block per file, or several `// filename:` sections in one block).
  `presentationFor` decides UX: a single edit to the active file → reviewable **diff**
  (`pendingDiff`); anything else (multi-file, non-active, new) → applied to the preview
  immediately and reviewed per file Cursor-style (`pendingFilesReview`: accept/reject
  each file, accept-all; reject reverts that file). `ChatPanel` orchestrates.
- **Tests**: `pnpm --dir frontend test` (Vitest). Pure logic in `utils/*.test.ts`,
  `constants/*.test.ts`, `Preview/previewTemplate.test.ts`.

### Backend (`backend/src/`)

**NestJS modules**:
- `chat/` — Core LLM streaming. `chat.service.ts` builds the system prompt
  (`buildSystemPrompt(allowMultiFile)` swaps in single-file or multi-file layout rules —
  the client decides, see `utils/fileMode.ts`), clamps history (20 msgs / 250KB), validates images (PNG/JPEG magic bytes, 4MB each, 8MB total, max 12). Controller streams SSE with 2-min timeout. App-only: `OriginGuard` (`common/origin.guard.ts`) rejects requests whose Origin/Referer isn't in `CORS_ORIGIN` — protects the server-side demo key from direct scripts (spoofable by a determined client; throttling covers the rest). **Free/demo mode (`provider: 'demo'`) is rationed per day (no login required)**: logged-in users get the per-user allowance, anonymous callers a lower per-IP one. The controller returns 429 when the quota is spent and charges one message only once real output starts (a failed generation costs nothing). BYOK providers skip the quota. `GET /api/chat/usage` returns the caller's quota (`{ anonymous }` flags the per-IP tier). Demo streaming runs a free-tier fallback chain (`ChatService.streamDemo`): Groq → Gemini, switching to the next provider only if one fails *before* emitting any token.
- `usage/` — `UsageService` + `UsageDaily` entity (`usage_daily`, composite PK subject+UTC day, where subject is `u:<userId>` or `ip:<addr>`). Counts free/demo messages per subject per day via an atomic SQLite upsert; allowances are `FREE_MESSAGES_PER_DAY` (user, default 25) and `ANON_FREE_MESSAGES_PER_DAY` (anonymous, default 3). Real client IP needs `trust proxy` (set in `main.ts`) behind nginx.
- `chat/providers/` — LLM provider implementations behind `LLMProvider` interface: `openai.provider.ts`, `anthropic.provider.ts`, `groq.provider.ts`, `gemini.provider.ts` (Google Gemini via its OpenAI-compatible endpoint — free-tier fallback for demo mode), `deepseek.provider.ts`, `openrouter.provider.ts` (OpenRouter via its OpenAI-compatible endpoint — the user's own OAuth-connected account/credits; models addressed as `vendor/model`), `opencode.provider.ts` (talks to a local `opencode serve` instance instead of a hosted API — no API key; models are addressed as `providerID/modelID` from opencode's own catalog)
- `auth/` — Google OAuth + local username/password login, JWT in httpOnly cookie, admin user seeded from `ADMIN_PASSWORD` env. `connectOpenRouter` completes an OpenRouter OAuth PKCE exchange (`POST /api/auth/openrouter/connect`, auth-required): swaps the auth code for a user-scoped OpenRouter key and stores it encrypted as the user's `openrouter` provider key — the frontend generates the PKCE challenge and redirects (see `services/api.ts` `startOpenRouterConnect` + the callback handler in `App.tsx`).
- `users/` — User entity with encrypted API key storage (`common/crypto.util.ts`)
- `sketches/` — CRUD with user ownership enforcement, code history stored as `simple-json`

**Database**: SQLite at `./data/p5editor.sqlite` (configurable via `DATABASE_PATH`), TypeORM with auto-sync. Entities: `User`, `Sketch` (one-to-many).

**Middleware** (configured in `main.ts`): helmet, compression, cookie-parser, JSON body limits (256kb default, 12mb for `/api/chat`), global ValidationPipe (`whitelist`, `forbidNonWhitelisted`, `transform`), ThrottlerGuard (30 req/min, 200 req/10min).

### API Routing

Frontend Vite proxy forwards `/api/*` to backend at `:3001`. Backend routes:
- `POST /api/chat` — Stream chat (SSE)
- `POST /api/chat/models` — List models for a provider
- `POST /api/auth/login`, `POST /api/auth/google`, `POST /api/auth/logout`
- `POST /api/auth/openrouter/connect` — Complete OpenRouter OAuth PKCE, store user-scoped key (auth required)
- `GET /api/users/me` — Current user profile
- `GET/PUT /api/users/me/api-key` — Retrieve/save encrypted API key
- `GET/POST/PUT/DELETE /api/sketches` — Sketch CRUD (auth required)
- `GET /api/health` — Health check

### Environment

Config via `.env` at project root or `backend/.env` (root takes priority). Loaded by `@nestjs/config`:
- `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GROQ_API_KEY`, `ADMIN_PASSWORD`
- `GEMINI_API_KEY` (optional) — free-tier fallback for demo mode; `GEMINI_DEMO_MODEL` (default `gemini-2.0-flash`)
- `FREE_MESSAGES_PER_DAY` (default 25) — per-user daily allowance for free/demo chat
- `ANON_FREE_MESSAGES_PER_DAY` (default 3) — per-IP daily allowance for anonymous free/demo chat
- `DATABASE_PATH` (default `./data/p5editor.sqlite`)
- `CORS_ORIGIN` (default `http://localhost:5173`, supports comma-separated values)
- `PORT` (default `3001`)
- `OPENCODE_BASE_URL` (default `http://127.0.0.1:4096`) — local dev only, points the `opencode` provider at a running `opencode serve` instance
