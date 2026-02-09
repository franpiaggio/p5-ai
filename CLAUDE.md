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
pnpm --dir backend test -- --watch   # Watch mode
pnpm --dir backend test:e2e          # E2E tests (jest-e2e.json config)
```

### Docker
```bash
docker-compose up   # Frontend on :3080, backend internal on :3000
```

### Install
```bash
pnpm install:all    # Installs both frontend and backend deps
```

## Architecture

### Frontend (`frontend/src/`)

**State management**: Zustand store at `store/editorStore.ts` — holds code, chat messages, editor state, LLM config, code history. Persisted to localStorage as `'p5-ai-editor'`. Auth state in `store/authStore.ts`.

**API client**: `services/api.ts` — all backend communication. Chat uses `streamChat()` which returns an async generator over Server-Sent Events.

**Key component areas** (in `components/`):
- `Chat/` — Chat panel, message bubbles, markdown rendering
- `Editor/` — Monaco-based code editor with p5.js type declarations
- `Preview/` — Live p5.js canvas rendering via iframe
- `Layout/` — Resizable split panes (desktop) and mobile layout
- `Toolbar/` — File menu, settings, user/auth controls
- `Sketches/` — Save/load sketch modals

**Hooks**: `useResizable` (drag-resize panels), `useIsMobile`, `useEscapeClose`

### Backend (`backend/src/`)

**NestJS modules**:
- `chat/` — Core LLM streaming. `chat.service.ts` builds system prompt, clamps history (20 msgs / 250KB), validates images (PNG/JPEG, 4MB each, 8MB total, max 12). Controller streams SSE with 2-min timeout.
- `chat/providers/` — LLM provider implementations behind `LLMProvider` interface: `openai.provider.ts`, `anthropic.provider.ts`, `groq.provider.ts`
- `auth/` — Google OAuth + local username/password login, JWT tokens
- `users/` — User entity with encrypted API key storage (`common/crypto.util.ts`)
- `sketches/` — CRUD with user ownership enforcement, code history stored as `simple-json`

**Database**: SQLite at `./data/p5editor.sqlite`, TypeORM with auto-sync. Entities: `User`, `Sketch` (one-to-many).

**Middleware** (configured in `main.ts`): helmet, compression, cookie-parser, JSON body limits (256kb default, 12mb for `/api/chat`), global ValidationPipe with whitelist, ThrottlerGuard (rate limiting).

### API Routing

Frontend Vite proxy forwards `/api/*` to backend at `:3000`. Backend routes:
- `POST /api/chat` — Stream chat (SSE)
- `POST /api/chat/models` — List models for a provider
- `POST /auth/login`, `POST /auth/google`, `POST /auth/logout`
- `GET/POST/PUT/DELETE /sketches`

### Environment

Config via `.env` at project root (loaded by `@nestjs/config`):
- `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GROQ_API_KEY`, `ADMIN_PASSWORD`
- `CORS_ORIGIN` (default `http://localhost:5173`)
- `PORT` (default `3000`)
