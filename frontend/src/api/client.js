/**
 * Saathi API Client
 * Provides base fetchJson and streamChat helpers for the FastAPI backend.
 */

export const BASE_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? '' : 'http://localhost:8000');

export async function fetchJson(endpoint, options = {}) {
  const { silent = false, ...fetchOptions } = options;
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      ...fetchOptions,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (!silent) {
      console.warn(`API call failed for ${endpoint}:`, err);
    }
    throw err;
  }
}

export async function streamChat(body, onEvent, signal) {
  const url = `${BASE_URL}/api/chat/stream`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.detail || `Stream error: HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.slice(5).trim();
      if (!dataStr) continue;
      try {
        const parsed = JSON.parse(dataStr);
        if (onEvent) onEvent(parsed);
      } catch (e) {
        console.warn('Failed to parse SSE JSON chunk:', dataStr, e);
      }
    }
  }

  if (buffer.trim() && buffer.trim().startsWith('data:')) {
    const dataStr = buffer.trim().slice(5).trim();
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        if (onEvent) onEvent(parsed);
      } catch (e) {}
    }
  }
}

