import type { LLMConfig, Message, ImageAttachment, SketchSummary, SketchFull, SketchFile, Library } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// --- Error handling / session ---

export class ApiError extends Error {
  status: number;
  constructor(status: number, message?: string) {
    super(message || `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

/** Register a global handler invoked whenever an authenticated request returns 401. */
export function setUnauthorizedHandler(fn: UnauthorizedHandler | null): void {
  onUnauthorized = fn;
}

/**
 * fetch() wrapper for authenticated endpoints. Always sends the auth cookie and,
 * on a 401 (expired/invalid session), fires the global unauthorized handler and
 * throws an ApiError so callers can react to session expiry.
 */
async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
  });
  if (response.status === 401) {
    onUnauthorized?.();
    throw new ApiError(401, 'Session expired');
  }
  return response;
}

// --- Auth ---

export async function loginWithGoogle(
  credential: string,
): Promise<{ accessToken: string; user: { id: string; email: string; name: string; picture?: string; storeApiKeys?: boolean } }> {
  const response = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ credential }),
  });
  if (!response.ok) throw new Error('Google login failed');
  return response.json();
}

export async function loginWithCredentials(
  username: string,
  password: string,
): Promise<{ accessToken: string; user: { id: string; email: string; name: string; picture?: string; storeApiKeys?: boolean } }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error('Invalid username or password');
  return response.json();
}

export async function logoutApi(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

// --- OpenRouter OAuth ("connect account", PKCE) ---

const OPENROUTER_VERIFIER_KEY = 'p5-ai-openrouter-verifier';

function base64UrlEncode(bytes: ArrayBuffer): string {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Kick off the OpenRouter OAuth flow: generate a PKCE verifier/challenge, stash
 * the verifier for the return trip, and redirect the browser to OpenRouter. On
 * the callback the app finishes the exchange (see `takeOpenRouterVerifier` +
 * `connectOpenRouter`). This navigates away from the app.
 */
export async function startOpenRouterConnect(): Promise<void> {
  const verifier = base64UrlEncode(
    crypto.getRandomValues(new Uint8Array(32)).buffer,
  );
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );
  const challenge = base64UrlEncode(digest);
  sessionStorage.setItem(OPENROUTER_VERIFIER_KEY, verifier);

  // OpenRouter appends `?code=...` to the callback and drops any query we add,
  // so we identify the return trip by the stored verifier, not a custom param.
  const callback = `${window.location.origin}/`;
  const url =
    `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callback)}` +
    `&code_challenge=${challenge}&code_challenge_method=S256`;
  window.location.href = url;
}

/** Read and clear the stored PKCE verifier (single use). */
export function takeOpenRouterVerifier(): string | null {
  const verifier = sessionStorage.getItem(OPENROUTER_VERIFIER_KEY);
  if (verifier) sessionStorage.removeItem(OPENROUTER_VERIFIER_KEY);
  return verifier;
}

/** Exchange the OAuth code for a user-scoped key (stored encrypted server-side). */
export async function connectOpenRouter(
  code: string,
  codeVerifier: string,
): Promise<void> {
  const response = await authFetch(`/auth/openrouter/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, codeVerifier }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || 'Failed to connect OpenRouter account');
  }
}

// --- User Profile & Preferences ---

export async function getProfile(): Promise<{
  id: string;
  email: string;
  name: string;
  picture?: string;
  storeApiKeys: boolean;
}> {
  const response = await authFetch(`/users/me`);
  if (!response.ok) throw new Error('Failed to fetch profile');
  return response.json();
}

export async function updatePreferences(prefs: { storeApiKeys: boolean }): Promise<void> {
  await authFetch(`/users/me/preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  });
}

// --- API Keys (per-provider) ---

export async function saveProviderKey(provider: string, apiKey: string): Promise<void> {
  await authFetch(`/users/me/api-keys/${provider}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
}

export async function getProviderKeys(): Promise<Record<string, string>> {
  try {
    const response = await authFetch(`/users/me/api-keys`);
    if (!response.ok) return {};
    const data = await response.json();
    return data.keys ?? {};
  } catch {
    return {};
  }
}

export async function clearProviderKey(provider: string): Promise<void> {
  await authFetch(`/users/me/api-keys/${provider}`, {
    method: 'DELETE',
  });
}

// --- Sketches ---

export async function createSketch(data: {
  title: string;
  code: string;
  description?: string;
  thumbnail?: string | null;
  isPublic?: boolean;
  files?: SketchFile[];
  libraries?: Library[];
}): Promise<SketchFull> {
  const { thumbnail, ...rest } = data;
  const body = thumbnail ? { ...rest, thumbnail } : rest;
  const response = await authFetch(`/sketches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Failed to save sketch (${response.status})`);
  }
  return response.json();
}

export async function getSketches(): Promise<SketchSummary[]> {
  const response = await authFetch(`/sketches`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch sketches');
  return response.json();
}

export async function getPublicSketch(id: string): Promise<SketchFull> {
  const response = await fetch(`${API_BASE}/sketches/public/${id}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch sketch');
  return response.json();
}

export async function getSketch(id: string): Promise<SketchFull> {
  const response = await authFetch(`/sketches/${id}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch sketch');
  return response.json();
}

export async function updateSketch(
  id: string,
  data: { title?: string; code?: string; description?: string; thumbnail?: string | null; isPublic?: boolean; codeHistory?: unknown[]; files?: SketchFile[]; libraries?: Library[] },
): Promise<SketchFull> {
  const { thumbnail, ...rest } = data;
  const body = thumbnail ? { ...rest, thumbnail } : rest;
  const response = await authFetch(`/sketches/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Failed to update sketch (${response.status})`);
  }
  return response.json();
}

export async function deleteSketch(id: string): Promise<void> {
  const response = await authFetch(`/sketches/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete sketch');
}

// --- Models ---

export async function fetchModels(
  provider: string,
  apiKey?: string,
): Promise<string[]> {
  const response = await fetch(`${API_BASE}/chat/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ provider, ...(apiKey ? { apiKey } : {}) }),
  });
  if (!response.ok) return [];
  const data = await response.json();
  return data.models ?? [];
}

// --- Health ---

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- Chat usage / quota ---

export interface ChatUsage {
  /** Retained for compatibility; free usage no longer requires login. */
  requiresLogin: boolean;
  /** True when the quota is the lower per-IP anonymous allowance. */
  anonymous: boolean;
  /** Daily free-message allowance for this caller. */
  limit: number;
  /** Messages spent today. */
  used: number;
  /** Messages left today. */
  remaining: number;
  /** ISO timestamp of the next reset. */
  resetsAt: string;
}

/** Free-usage quota for the current user (sends the auth cookie if present). */
export async function getChatUsage(): Promise<ChatUsage | null> {
  try {
    const response = await fetch(`${API_BASE}/chat/usage`, {
      credentials: 'include',
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

// --- Chat ---

export interface ChatRequest {
  message: string;
  code: string;
  language?: 'javascript' | 'typescript';
  history: Message[];
  config: Omit<LLMConfig, 'apiKey'> & { apiKey?: string };
  images?: ImageAttachment[];
  files?: { name: string; content: string }[];
  libraries?: { name: string; url: string }[];
  /** Lets the assistant answer with several files. Off by default — sketches are
   * single-file unless the user opted in or the sketch outgrew one file. */
  allowMultiFile?: boolean;
}

export async function* streamChat(request: ChatRequest, signal?: AbortSignal): AsyncGenerator<string> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ...request,
        history: request.history.slice(-10),
      }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    throw new Error('Cannot connect to backend. Is it running on localhost:3001?');
  }

  if (!response.ok) {
    // Errors raised before the SSE stream opens (login required, quota reached,
    // missing key) come back as a normal JSON body. Prefer its human-readable
    // message and carry the status so the UI can react (e.g. prompt sign-in).
    const raw = await response.text();
    let message = raw;
    try {
      const parsed = JSON.parse(raw);
      message = parsed.error || parsed.message || raw;
    } catch {
      // Non-JSON body — use the raw text as-is.
    }
    throw new ApiError(
      response.status,
      message || `HTTP ${response.status}: Failed to connect to chat API`,
    );
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body from server');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;
          if (!data) continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.content) {
              yield parsed.content;
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue; // Skip invalid JSON
            throw e; // Re-throw other errors
          }
        }
      }
    }
  } catch (error) {
    // A user-initiated cancel aborts the fetch reader with a DOMException named
    // 'AbortError'. Swallow it (like the initial-fetch catch does) so cancelling
    // a generation doesn't surface a spurious "signal is aborted" error bubble.
    if (error instanceof DOMException && error.name === 'AbortError') return;
    if (error instanceof TypeError && /network|abort|terminated/i.test(error.message)) return;
    throw error;
  }
}
