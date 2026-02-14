import type { LLMConfig, Message, ImageAttachment, SketchSummary, SketchFull } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

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

// --- User Profile & Preferences ---

export async function getProfile(): Promise<{
  id: string;
  email: string;
  name: string;
  picture?: string;
  storeApiKeys: boolean;
}> {
  const response = await fetch(`${API_BASE}/users/me`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch profile');
  return response.json();
}

export async function updatePreferences(prefs: { storeApiKeys: boolean }): Promise<void> {
  await fetch(`${API_BASE}/users/me/preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(prefs),
  });
}

// --- API Keys (per-provider) ---

export async function saveProviderKey(provider: string, apiKey: string): Promise<void> {
  await fetch(`${API_BASE}/users/me/api-keys/${provider}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ apiKey }),
  });
}

export async function getProviderKeys(): Promise<Record<string, string>> {
  try {
    const response = await fetch(`${API_BASE}/users/me/api-keys`, {
      credentials: 'include',
    });
    if (!response.ok) return {};
    const data = await response.json();
    return data.keys ?? {};
  } catch {
    return {};
  }
}

export async function clearProviderKey(provider: string): Promise<void> {
  await fetch(`${API_BASE}/users/me/api-keys/${provider}`, {
    method: 'DELETE',
    credentials: 'include',
  });
}

// --- Sketches ---

export async function createSketch(data: {
  title: string;
  code: string;
  description?: string;
  thumbnail?: string | null;
}): Promise<SketchFull> {
  const response = await fetch(`${API_BASE}/sketches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to save sketch');
  return response.json();
}

export async function getSketches(): Promise<SketchSummary[]> {
  const response = await fetch(`${API_BASE}/sketches`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
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
  const response = await fetch(`${API_BASE}/sketches/${id}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch sketch');
  return response.json();
}

export async function updateSketch(
  id: string,
  data: { title?: string; code?: string; description?: string; thumbnail?: string | null; codeHistory?: unknown[] },
): Promise<SketchFull> {
  const response = await fetch(`${API_BASE}/sketches/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update sketch');
  return response.json();
}

export async function deleteSketch(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/sketches/${id}`, {
    method: 'DELETE',
    credentials: 'include',
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

// --- Chat ---

export interface ChatRequest {
  message: string;
  code: string;
  language?: 'javascript' | 'typescript';
  history: Message[];
  config: Omit<LLMConfig, 'apiKey'> & { apiKey?: string };
  images?: ImageAttachment[];
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
    throw new Error('Cannot connect to backend. Is it running on localhost:3000?');
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}: Failed to connect to chat API`);
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
    if (error instanceof TypeError && /network|abort|terminated/i.test(error.message)) return;
    throw error;
  }
}
