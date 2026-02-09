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
pnpm --dir backend start:dev  # NestJS with --watch on :3000
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

### Test (backend only, no frontend tests)
```bash
pnpm --dir backend test              # Jest
pnpm --dir backend test:watch        # Watch mode
pnpm --dir backend test:cov          # Coverage
pnpm --dir backend test:e2e          # E2E tests (jest-e2e.json config)
```

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

### Backend (`backend/src/`)

**NestJS modules**:
- `chat/` — Core LLM streaming. `chat.service.ts` builds system prompt, clamps history (20 msgs / 250KB), validates images (PNG/JPEG magic bytes, 4MB each, 8MB total, max 12). Controller streams SSE with 2-min timeout. **Currently unauthenticated.**
- `chat/providers/` — LLM provider implementations behind `LLMProvider` interface: `openai.provider.ts`, `anthropic.provider.ts`, `groq.provider.ts`
- `auth/` — Google OAuth + local username/password login, JWT in httpOnly cookie, admin user seeded from `ADMIN_PASSWORD` env
- `users/` — User entity with encrypted API key storage (`common/crypto.util.ts`)
- `sketches/` — CRUD with user ownership enforcement, code history stored as `simple-json`

**Database**: SQLite at `./data/p5editor.sqlite` (configurable via `DATABASE_PATH`), TypeORM with auto-sync. Entities: `User`, `Sketch` (one-to-many).

**Middleware** (configured in `main.ts`): helmet, compression, cookie-parser, JSON body limits (256kb default, 12mb for `/api/chat`), global ValidationPipe (`whitelist`, `forbidNonWhitelisted`, `transform`), ThrottlerGuard (30 req/min, 200 req/10min).

### API Routing

Frontend Vite proxy forwards `/api/*` to backend at `:3000`. Backend routes:
- `POST /api/chat` — Stream chat (SSE)
- `POST /api/chat/models` — List models for a provider
- `POST /api/auth/login`, `POST /api/auth/google`, `POST /api/auth/logout`
- `GET /api/users/me` — Current user profile
- `GET/PUT /api/users/me/api-key` — Retrieve/save encrypted API key
- `GET/POST/PUT/DELETE /api/sketches` — Sketch CRUD (auth required)
- `GET /api/health` — Health check

### Environment

Config via `.env` at project root or `backend/.env` (root takes priority). Loaded by `@nestjs/config`:
- `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GROQ_API_KEY`, `ADMIN_PASSWORD`
- `DATABASE_PATH` (default `./data/p5editor.sqlite`)
- `CORS_ORIGIN` (default `http://localhost:5173`, supports comma-separated values)
- `PORT` (default `3000`)
