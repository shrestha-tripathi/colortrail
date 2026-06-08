/**
 * localStorage palette persistence — most-recent N colors.
 *
 * Schema: array of HEX strings (always uppercase, "#RRGGBB"). Old entries
 * trimmed beyond MAX. Duplicates collapsed (moved to head).
 *
 * Wrapped in try/catch — private mode / quota-exceeded silently no-op.
 */

const STORAGE_KEY = "screencolorpicker:palette:v1";
const MAX = 24;

const safeStorage = (): Storage | null => {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
};

/** Return the current palette (newest first). Never throws. */
export function readPalette(): string[] {
  const s = safeStorage();
  if (!s) return [];
  try {
    const raw = s.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is string => typeof x === "string" && /^#[0-9A-F]{6}$/.test(x),
    ).slice(0, MAX);
  } catch {
    return [];
  }
}

/** Persist (silent on quota errors). */
function writePalette(items: string[]): void {
  const s = safeStorage();
  if (!s) return;
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX)));
  } catch {
    /* quota / private mode — ignore */
  }
}

/**
 * Add a color to the front. De-dupe if it exists elsewhere in history.
 * HEX must be in "#RRGGBB" uppercase form (caller's job — use formatHex).
 * Returns the resulting palette.
 */
export function addToPalette(hex: string): string[] {
  const norm = hex.toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(norm)) return readPalette();
  const current = readPalette();
  const filtered = current.filter((c) => c !== norm);
  const next = [norm, ...filtered].slice(0, MAX);
  writePalette(next);
  return next;
}

/** Remove a specific color. Returns resulting palette. */
export function removeFromPalette(hex: string): string[] {
  const norm = hex.toUpperCase();
  const current = readPalette();
  const next = current.filter((c) => c !== norm);
  writePalette(next);
  return next;
}

/** Clear all (returns []). */
export function clearPalette(): string[] {
  const s = safeStorage();
  if (!s) return [];
  try {
    s.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return [];
}

export const PALETTE_MAX = MAX;
