import type { LLMConfig, Message, SketchSummary, SketchFull } from '../types';
import { useAuthStore } from '../store/authStore';

const API_BASE = 'http://localhost:3000/api';

function authHeaders(): HeadersInit {
  const token = useAuthStore.getState().token;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// --- Auth ---

export async function loginWithGoogle(
  credential: string,
): Promise<{ accessToken: string; user: { id: string; email: string; name: string; picture?: string } }> {
  const response = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  if (!response.ok) throw new Error('Google login failed');
  return response.json();
}

export async function loginWithCredentials(
  username: string,
  password: string,
): Promise<{ accessToken: string; user: { id: string; email: string; name: string; picture?: string } }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error('Invalid username or password');
  return response.json();
}

// --- Sketches ---

export async function createSketch(data: {
  title: string;
  code: string;
  description?: string;
}): Promise<SketchFull> {
  const response = await fetch(`${API_BASE}/sketches`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to save sketch');
  return response.json();
}

export async function getSketches(): Promise<SketchSummary[]> {
  const response = await fetch(`${API_BASE}/sketches`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch sketches');
  return response.json();
}

export async function getSketch(id: string): Promise<SketchFull> {
  const response = await fetch(`${API_BASE}/sketches/${id}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch sketch');
  return response.json();
}

export async function updateSketch(
  id: string,
  data: { title?: string; code?: string; description?: string; codeHistory?: unknown[] },
): Promise<SketchFull> {
  const response = await fetch(`${API_BASE}/sketches/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update sketch');
  return response.json();
}

export async function deleteSketch(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/sketches/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete sketch');
}

// --- Chat ---

export interface ChatRequest {
  message: string;
  code: string;
  history: Message[];
  config: LLMConfig;
}

export async function* streamChat(request: ChatRequest): AsyncGenerator<string> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        history: request.history.slice(-10),
      }),
    });
  } catch (error) {
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
}
