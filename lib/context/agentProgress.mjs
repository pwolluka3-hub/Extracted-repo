export const PROCESS_UPDATE_PREFIX = 'Process update:';

export function buildProcessUpdate(message) {
  const trimmed = String(message || '').trim();
  if (!trimmed) return `${PROCESS_UPDATE_PREFIX} Working...`;
  if (trimmed.toLowerCase().startsWith(PROCESS_UPDATE_PREFIX.toLowerCase())) {
    return trimmed;
  }
  return `${PROCESS_UPDATE_PREFIX} ${trimmed}`;
}

export function isProcessUpdateMessage(message) {
  return String(message || '').trim().toLowerCase().startsWith(PROCESS_UPDATE_PREFIX.toLowerCase());
}
