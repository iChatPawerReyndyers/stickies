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

// Parses a hex color (3/6/8 digit, with or without '#') into 0-255 RGB
// channels for NeuColorPickerModal's sliders. Returns null for anything
// normalizeHexColor can't make sense of. An 8-digit (alpha) hex only uses
// its first 6 digits — the picker has no alpha control of its own.
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;
  const clean = normalized.slice(1, 7);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
};

// Inverse of hexToRgb — clamps each channel to 0-255 before formatting so a
// slider value that overshoots (shouldn't happen, but cheap insurance)
// can't produce an invalid hex string.
export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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