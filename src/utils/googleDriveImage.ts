// utils/googleDriveImage.ts
// Converts a public Google Drive share link (or a bare file ID) into a
// direct-viewable image URL usable as an <Image>/<ImageBackground> source.
// A normal Drive "share" link (…/file/d/FILE_ID/view?usp=sharing) points at
// an HTML viewer page, not raw image bytes — used as-is it renders as a
// blank/broken image in a native Image component, so it needs rewriting.
//
// Only works for files whose sharing is set to "Anyone with the link" —
// this app has no OAuth/Drive-API access, so anything more restricted will
// still fail to load (same as pasting the link into an incognito browser).

const DRIVE_FILE_ID_PATTERNS = [
  /\/file\/d\/([a-zA-Z0-9_-]+)/, // https://drive.google.com/file/d/FILE_ID/view
  /[?&]id=([a-zA-Z0-9_-]+)/,     // https://drive.google.com/open?id=FILE_ID or uc?id=FILE_ID
  /\/d\/([a-zA-Z0-9_-]+)/,       // https://drive.google.com/d/FILE_ID
];

// Drive file IDs are long alphanumeric/-/_ strings with no dots or slashes —
// used to recognize a bare ID pasted without any surrounding URL.
const isBareFileId = (value: string) => /^[a-zA-Z0-9_-]{10,}$/.test(value) && !value.includes('.') && !value.includes('/');

export const extractDriveFileId = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (isBareFileId(trimmed)) return trimmed;

  for (const pattern of DRIVE_FILE_ID_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
};

export const isGoogleDriveLink = (input: string): boolean =>
  /drive\.google\.com/.test(input) || isBareFileId(input.trim());

// Returns a direct-image URL suitable for <Image>/<ImageBackground>. Any
// input that isn't recognized as a Google Drive link is returned unchanged,
// so a plain public image URL (Imgur, a direct Dropbox link, etc.) still
// works untouched through the same field.
export const resolveImageUrl = (input?: string): string | undefined => {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  if (!isGoogleDriveLink(trimmed)) return trimmed;

  const fileId = extractDriveFileId(trimmed);
  if (!fileId) return trimmed;

  // lh3.googleusercontent.com/d/FILE_ID serves the raw file directly and,
  // unlike the older `uc?export=view&id=` endpoint, works reliably inside
  // a native <Image> without first following an HTML redirect.
  return `https://lh3.googleusercontent.com/d/${fileId}`;
};