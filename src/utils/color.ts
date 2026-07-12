export const normalizeHexColor = (value?: string): string | undefined => {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  const normalized = withoutHash.toUpperCase();

  if (/^[0-9A-F]{3}$/.test(normalized)) {
    return `#${normalized.split('').map(ch => `${ch}${ch}`).join('')}`;
  }

  if (/^[0-9A-F]{6}$/.test(normalized)) {
    return `#${normalized}`;
  }

  if (/^[0-9A-F]{8}$/.test(normalized)) {
    return `#${normalized}`;
  }

  return undefined;
};

export const getHexInputValue = (value?: string): string => {
  if (!value) return '';
  return value.startsWith('#') ? value.slice(1) : value;
};

// Darkens a hex color toward black by `amount` (0-1) — used for the active
// tab pill, so "selected" reads as a richer shade of the tab's own color
// instead of a generic grey carved-in overlay that can clash with it.
export const darkenColor = (hex: string, amount = 0.18): string => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c * (1 - amount));
  return `#${[mix(r), mix(g), mix(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
};