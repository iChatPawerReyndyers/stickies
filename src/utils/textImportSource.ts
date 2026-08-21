// utils/textImportSource.ts
//
// Fetches importable backup text (Stickies notes JSON or StickieStyles
// JSON) from a public Google Drive share link, intended for .txt/.rtf
// source files. Drive share links carry no reliable filename/extension
// without calling the authenticated Drive API (out of scope for this
// no-OAuth app — same limitation utils/googleDriveImage.ts already
// documents for images), so instead of trusting the link's URL, the
// fetched *content* is sniffed: anything starting with the RTF signature
// is treated as RTF and run through stripRtf below; everything else is
// treated as plain text as-is. If the file isn't actually .txt/.rtf (e.g.
// someone links a .docx), the fetched bytes simply won't parse as JSON
// afterward and the caller's own "Invalid JSON" handling catches it —
// there's no separate extension-based rejection.
//
// Only works for files whose sharing is set to "Anyone with the link" —
// same limitation utils/googleDriveImage.ts already documents for images.

import { extractDriveFileId } from './googleDriveImage';

export const isRtfContent = (raw: string): boolean => raw.trimStart().startsWith('{\\rtf');

// Minimal RTF -> plain text converter. Good enough to recover a JSON
// backup's text content from a simple, unstyled .rtf export (e.g. one
// created by pasting plain text into a word processor and saving as
// .rtf) — this is NOT a general-purpose RTF renderer and will mangle
// anything with real rich formatting, tables, or embedded objects. Strips
// control words/symbols and group braces, unescapes \'hh hex-escaped
// bytes, \uNNNN unicode escapes, and doubled backslashes, and turns
// \par/\line into real newlines.
export const stripRtf = (rtf: string): string => {
  let text = rtf;
  text = text.replace(/\\par[d]?\b ?/g, '\n');
  text = text.replace(/\\line\b ?/g, '\n');
  text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
  text = text.replace(/\\u(-?\d+)\??/g, (_m, code) => {
    const codePoint = ((parseInt(code, 10) % 65536) + 65536) % 65536;
    return String.fromCharCode(codePoint);
  });
  text = text.replace(/\\[a-zA-Z]+-?\d* ?/g, '');
  text = text.replace(/[{}]/g, '');
  text = text.replace(/\\\\/g, '\\');
  return text.trim();
};

export class DriveFetchError extends Error {}

// Fetches a public Drive file's raw content and returns it as plain text,
// auto-detecting and stripping RTF. Throws DriveFetchError with a message
// that's safe to show directly in an Alert.
export const fetchDriveTextFile = async (link: string): Promise<string> => {
  const trimmed = link.trim();
  if (!trimmed) {
    throw new DriveFetchError('Paste a Google Drive link first.');
  }
  const fileId = extractDriveFileId(trimmed);
  if (!fileId) {
    throw new DriveFetchError('Could not find a Google Drive file in that link.');
  }

  let response: Response;
  try {
    response = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
  } catch {
    throw new DriveFetchError('Could not reach Google Drive. Check your connection and try again.');
  }
  if (!response.ok) {
    throw new DriveFetchError('Could not download that file. Make sure sharing is set to "Anyone with the link".');
  }

  const raw = await response.text();
  if (!raw.trim()) {
    throw new DriveFetchError('That file appears to be empty.');
  }
  return isRtfContent(raw) ? stripRtf(raw) : raw;
};