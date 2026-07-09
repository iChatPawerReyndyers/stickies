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
