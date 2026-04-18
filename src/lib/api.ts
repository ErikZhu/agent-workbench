/**
 * API base URL resolution
 *
 * Priority:
 * 1. localStorage key "apiBase" — set at runtime via the Settings panel
 * 2. VITE_API_BASE env var — baked in at build time
 * 3. "" (empty) — falls back to Vite dev proxy (local dev only)
 */
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('apiBase')
    if (stored) return stored.replace(/\/$/, '')
  }
  return (import.meta.env.VITE_API_BASE as string || '').replace(/\/$/, '')
}

export function apiUrl(path: string): string {
  return `${getApiBase()}${path}`
}
