# Code Review — Findings & Remediation Tracker

Investigation-only review of the p5-ai codebase (backend security + frontend code smells / AI slop).
Work through the items in priority order and check them off as they're fixed.

**Verdict:** Code is well above average. No critical / RCE-class issues. Findings concentrate in
access-control design, secret separation, auth hardening, and a few edit-flow edge cases.

**Legend:** severity 🔴 High · 🟠 Medium · 🟡 Low · 🧹 Slop/cleanup — effort ⚡ small · 🔨 medium · 🏗️ large

---

## Suggested order

1. [x] **H1** — Sketch privacy (public endpoint) 🔴 — *done (branch `sketch-visibility`)*
2. [x] **M2** — Login brute-force throttle 🟠 — *done (branch `sketch-visibility`)*
3. [ ] **M1** — Separate encryption secret from JWT 🟠
4. [ ] **M3** — Token cookie-only (drop from body) 🟠
5. [ ] **M6** — `mergeFragment` over-large replacement guard 🟠
6. [ ] Dead code cleanup (frontend store + utils) 🧹
7. [ ] Remaining Low + slop items

---

## 🔴 High

### H1 — Every saved sketch is world-readable by ID; no privacy flag exists
- [x] Done — `isPublic` column (default `true`), public route 404s private sketches, `codeHistory`
  dropped from the public payload, ID widened to `randomBytes(16)`, per-sketch Public/Private toggle in
  the grid + a Public checkbox on save. Owner loads via the authed route (works for private too).
- **Where:** `backend/src/sketches/sketches.controller.ts:21-24`, `sketches.service.ts:42-60`, `sketch.entity.ts:18-23`
- **Problem:** `GET /api/sketches/public/:id` has no guard and returns the full sketch
  (`code`, `files`, `libraries`, entire `codeHistory`). There is no `isPublic`/visibility column,
  so a sketch can never be kept private. IDs are `randomBytes(5)` = **40 bits** (10 hex) — weak as a
  security boundary. Real vector is ID leakage (Referer, logs, shared URLs, history), not brute force.
- **Fix:**
  - Add boolean `isPublic` column (default `false`).
  - `findOnePublic` → 404 unless `isPublic`.
  - Widen ID to `randomBytes(16)`.
  - Consider excluding `codeHistory` from the public projection even when shared.
- **Effort:** 🔨

---

## 🟠 Medium

### M1 — `JWT_SECRET` reused as the API-key encryption secret (no key separation)
- [ ] Done
- **Where:** `backend/src/users/users.service.ts:30-32`, `common/crypto.util.ts:12-14`, `auth/auth.module.ts:17`
- **Problem:** One secret both signs JWTs and derives the AES key for stored provider API keys.
  Leaking `JWT_SECRET` lets an attacker forge tokens for any user *and* decrypt every stored API key.
- **Fix:** Introduce a separate `ENCRYPTION_KEY` env var for `crypto.util`. Fail startup if either
  secret is missing or under 32 bytes.
- **Effort:** ⚡ (plus a migration note: existing encrypted keys were derived from `JWT_SECRET`).

### M2 — No dedicated brute-force protection on `/api/auth/login`; throttler is production-only
- [x] Done — strict `@Throttle` (5/min per IP) on `login`+`google`; per-username in-memory lockout in
  `AuthService` (5 failures → 15-min lock, resets on success, applies to unknown usernames too); weak
  `ADMIN_PASSWORD` (<12 chars) warning at seed. New `auth.service.spec.ts` covers the lockout.
  Note: throttle is environment-independent-backstopped by the lockout, but the global `ThrottlerGuard`
  is still production-only (`app.module.ts:46`) — acceptable since prod is the deployed target.
- **Where:** `backend/src/auth/auth.controller.ts:18-23`, `app.module.ts:44-49`, `auth/auth.service.ts:52-64`
- **Problem:** `ThrottlerGuard` is only registered when `NODE_ENV==='production'`. Login relies on the
  global limit (no strict per-endpoint cap), no account lockout. The single high-value `admin` account
  is exposed to slow-but-unbounded spray/stuffing.
- **Fix:**
  - Strict `@Throttle` on `login`/`google` (e.g. 5/min).
  - Lockout/backoff after N failures per username.
  - Enforce a strong `ADMIN_PASSWORD` at seed time.
- **Effort:** 🔨

### M3 — `accessToken` returned in the JSON body, defeating the httpOnly cookie
- [ ] Done
- **Where:** `backend/src/auth/auth.controller.ts:12-23`, `auth/auth.service.ts:100-111`
- **Problem:** Token is set as httpOnly cookie *and* echoed in `res.json(result)`. httpOnly exists so
  JS/XSS can't read the token; returning it in the body hands that protection back.
- **Fix:** Cookie-only — return just the `user` object. Verify the frontend doesn't read the body token.
- **Effort:** ⚡ (touch frontend `services/api.ts` / auth store).

### M5 — ESM preview mode breaks runtime error line-mapping
- [ ] Done
- **Where:** `frontend/src/components/Preview/previewTemplate.ts:221` (offset hardcoded `'0'`), `:198`, `:227`
- **Problem:** In module mode each file loads as a `data:` URL and `lineOffset` is hardcoded to `0`, so
  `window.onerror` line numbers land on wrong/absent Monaco lines the moment a sketch uses `import`/`export`.
  The concatenation path computes a real offset (`:274`); the module path abandons it.
- **Fix:** At minimum document the limitation; ideally remap via the error stack / data-URL → file map.
- **Effort:** 🔨

### M6 — `mergeFragment` can silently replace the wrong region of user code
- [ ] Done
- **Where:** `frontend/src/utils/fileEdits.ts:165-202`
- **Problem:** Anchors on lines appearing exactly once (trimmed, len ≥ 4) and replaces everything between
  the first and last anchor. If the model emits anchors that bracket a large unrelated span, that span is
  overwritten. Guards (≥2 anchors, in-order, unique) reduce but don't eliminate it. Failure mode is data
  loss inside an accepted file (only fires on non-diff "apply" changes).
- **Fix:** Reject the merge when the spanned region is much larger than the fragment (ratio bound).
- **Effort:** ⚡

### M7 — Library URLs injected raw into iframe HTML
- [ ] Done
- **Where:** `frontend/src/components/Preview/previewTemplate.ts:194`, `:245` (also feeds `ExamplesGrid.tsx:46-48`)
- **Problem:** `<script src="${lib.url}">` unsanitized; a URL containing `"`/`>` breaks out of the tag.
  Largely contained — iframe is `sandbox="allow-scripts"` with no `allow-same-origin`
  (`P5Preview.tsx:203`) — but injected code can still `postMessage` to the parent, which acts on
  `type:'error'`/`log` messages.
- **Fix:** Validate library URLs (require `https:` scheme, reject quotes/`>`) before templating.
- **Effort:** ⚡

---

## 🟡 Low

### L1 — Username enumeration via login timing
- [ ] Done
- **Where:** `backend/src/auth/auth.service.ts:53-61`
- **Problem:** Nonexistent user returns immediately; existing user runs `bcrypt.compare` (~100ms). Timing
  delta reveals valid usernames.
- **Fix:** Compare against a fixed dummy hash when the user is absent so both paths cost the same.
- **Effort:** ⚡

### L2 — Hardcoded scrypt salt
- [ ] Done
- **Where:** `backend/src/common/crypto.util.ts:13` — `scryptSync(secret, 'p5-ai-salt', 32)`
- **Problem:** Constant salt makes KDF output fully determined by the secret. Limited practical impact
  (random GCM IV per encryption), but a per-deployment random salt is correct hardening.
- **Fix:** Store a random salt per deployment in env; derive with it.
- **Effort:** ⚡ (coordinate with M1; both touch key derivation + require re-encrypt of existing data).

### L3 — Google `email_verified` not checked
- [ ] Done
- **Where:** `backend/src/auth/auth.service.ts:66-90`
- **Problem:** Trusts `payload.email` without checking `payload.email_verified`; uses `payload.email!`/
  `payload.name!` (token missing these → 500 on non-nullable columns). Accounts key on `googleId`, so not
  account-takeover, but best practice to verify.
- **Fix:** Check `email_verified`; handle missing fields gracefully.
- **Effort:** ⚡

### L4 — `saveProviderKey` bypasses ValidationPipe
- [ ] Done
- **Where:** `backend/src/users/users.controller.ts:50-63` (also `updatePreferences` :38-48 same pattern)
- **Problem:** `@Body('apiKey') apiKey: string` is raw extraction — no `@IsString`/`@MaxLength`. With the
  256kb body limit a client can store a ~256kb "key" (own-account DoS; later shipped to the provider).
- **Fix:** Use a proper DTO with `@IsString @MaxLength(500)`.
- **Effort:** ⚡

### L5 — Provider error messages relayed to the client
- [ ] Done
- **Where:** `backend/src/chat/chat.controller.ts:84-89`, `:39-43` (fallbacks e.g. `openai.provider.ts:110`)
- **Problem:** Catch-all writes `error.message` into the SSE stream / HTTP error. Provider `formatError`
  usually sanitizes, but fallback branches and non-provider errors (DB/JWT) leak raw internal messages.
- **Fix:** Generic client-facing message + server-side logging of the detail.
- **Effort:** ⚡

### L6 — `app.listen` binds 0.0.0.0
- [ ] Done
- **Where:** `backend/src/main.ts:49`
- **Problem:** Binds all interfaces. Safe as deployed (compose exposes only frontend `3080`; backend
  unmapped) but risky if ever run directly on a VPS.
- **Fix:** `app.listen(port, '127.0.0.1')` behind the reverse proxy, or a host firewall rule.
- **Effort:** ⚡

### L7 — `simple-json` arrays have no element-count cap
- [ ] Done
- **Where:** `backend/src/sketches/dto/update-sketch.dto.ts:83-99`, `create-sketch.dto.ts:56-66`
- **Problem:** `codeHistory`/`files`/`libraries` have `@ValidateNested` but no `@ArrayMaxSize`. Bounded by
  the 2mb body limit so not a DoS, but the whole blob is one SQLite row re-serialized on every save.
- **Fix:** Add `@ArrayMaxSize` for defense-in-depth.
- **Effort:** ⚡

---

## 🧹 AI slop / cleanup (non-security)

### C1 — Timeout comment/code/doc mismatch
- [ ] Done
- **Where:** `backend/src/chat/chat.controller.ts:62-63` — comment says "2 minutes max" but code is
  `res.setTimeout(300_000)` = 5 min. `CLAUDE.md` also says "2-min timeout".
- **Fix:** Reconcile comment + code + CLAUDE.md to the real value.
- **Effort:** ⚡

### C2 — Dead store actions (still shipped, some tested → false confidence)
- [ ] Done
- **Where:** `frontend/src/store/editorStore.ts` — `applyCodeFromChat` (:407, only tests use it),
  `setStreamingCode` (:479), `setFiles` (:631), `setFileContent` (:621) — no app references.
- **Fix:** Delete, or wire them up. `setFiles` carries reconciliation logic that will silently rot.
- **Effort:** ⚡

### C3 — Dead util exports
- [ ] Done
- **Where:** `frontend/src/utils/codeUtils.ts` — `extractFirstJsBlock` (:12), `extractFileName` (:223,
  superseded by `splitFileSections` — two filename parsers coexist); `frontend/src/utils/fileEdits.ts` —
  `focusAfterChanges` (:224).
- **Fix:** Remove.
- **Effort:** ⚡

### C4 — Misc smells
- [ ] Done
- `backend/src/users/users.service.ts:105` — `(null as unknown as string)` double-cast; use a typed
  `Partial<User>` update or `| null` field type.
- `backend/src/chat/chat.service.ts:184-204` — redundant double image size check.
- `backend/src/chat/dto/chat.dto.ts:24-35` — `MessageDto.id`/`timestamp` required + validated but unused.
- `backend/src/app.controller.ts:8-11` — leftover `GET /` → `'Hello World!'` scaffold (also docker healthcheck).
- `frontend/src/store/editorStore.ts:715-794` — `onRehydrateStorage` is the most fragile spot (6
  `Array.isArray` guards + 2 legacy migrations + drift repair). Consider `version` + zustand `migrate`.
- Magic numbers: history cap "10" duplicated (`ChatPanel.tsx:163` + `api.ts:255`), `RENDER_INTERVAL_MS=80`,
  assorted postMessage timeouts (`2000/3000/10000`), hardcoded `#fff` preview backgrounds.
- **Effort:** ⚡ each.

---

## ✅ Verified GOOD (do not re-flag)

- AES-256-GCM: random 12-byte IV per encryption, auth tag stored, fail-closed `decrypt`.
- Sketch ownership on `findOne`/`update`/`remove`; `Object.assign(sketch, dto)` safe (DTO whitelisted,
  `userId` not assignable) → no mass-assignment.
- `sameSite:'lax'`, `select:false` on password/apiKey, keys masked to frontend (`...last4`).
- No default/fallback `JWT_SECRET` (fails closed). `OriginGuard` honestly documented and not
  subdomain-bypassable.
- Monaco transpiler models disposed (no leak), blob URLs revoked, SSE parsing robust, image validation
  (magic bytes + size caps) thorough, history-strip regexes not ReDoS-prone.

---

## Deployment note (GitHub Pages)

GH Pages serves **static only**, so it hosts the frontend build only. The backend (auth, sketches, chat
with the GROQ key) needs a separate host. Most High/Medium findings are backend and don't apply to a
static deploy — but they do once the backend runs on a VPS. See the security agent's VPS checklist:
set `NODE_ENV=production` (else the throttler is disabled), keep the backend port unmapped, serve over
HTTPS (the cookie `secure` flag is gated on production), and use strong unique `JWT_SECRET` /
`ADMIN_PASSWORD` / (after M1) `ENCRYPTION_KEY`.
