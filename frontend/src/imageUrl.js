import api from './api';

// Product uploads are stored on the API server. Rebase old localhost, LAN, or
// relative /media URLs onto the currently configured API host so every view
// can render the same database image regardless of which dev host opened it.
export function resolveImageUrl(value) {
  if (!value || typeof value !== 'string') return '';
  const raw = value.trim();
  if (!raw || /^(data:|blob:)/i.test(raw)) return raw;
  try {
    const apiBase = new URL(api.defaults.baseURL, window.location.origin);
    const parsed = new URL(raw, apiBase);
    if (/\/media\/products\//i.test(parsed.pathname)) {
      return `${apiBase.origin}${parsed.pathname}${parsed.search}`;
    }
    return parsed.href;
  } catch {
    return raw;
  }
}
