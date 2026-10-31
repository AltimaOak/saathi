/**
 * Saathi API Client
 * Provides base fetchJson and streamChat helpers for the FastAPI backend.
 */

export const BASE_URL = (() => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // When running in production (e.g. on Vercel or any non-localhost domain),
    // NEVER use localhost:8000! Requests must go to the same origin relative /api
    if (host !== 'localhost' && host !== '127.0.0.1' && host !== '0.0.0.0') {
      const customUrl = import.meta.env.VITE_API_URL;
      if (customUrl && customUrl.startsWith('http') && !customUrl.includes('localhost') && !customUrl.includes('127.0.0.1')) {
        return customUrl;
      }
      return '';
    }
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';
})();

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

/**
 * Fraud & Payment Claim Verification API (Phase 1)
 */
export async function verifyPaymentClaim(formData) {
  const url = `${BASE_URL}/api/fraud/verify-payment`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || `Verification failed: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function getFraudCases(merchantId) {
  const q = merchantId ? `?merchant_id=${merchantId}` : '';
  return fetchJson(`/api/fraud/cases${q}`);
}

export async function getFraudCaseDetail(caseRef, merchantId) {
  const q = merchantId ? `?merchant_id=${merchantId}` : '';
  return fetchJson(`/api/fraud/cases/${caseRef}${q}`);
}

/**
 * Merchant Voice & Language Settings API (Section 15.2 - 15.9)
 */
export async function getVoiceSettings(merchantId) {
  return fetchJson(`/api/merchants/${merchantId}/voice-settings`);
}

export async function updateVoiceSettings(merchantId, settings) {
  return fetchJson(`/api/merchants/${merchantId}/voice-settings`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

