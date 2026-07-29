// utils/richText.ts
//
// The app's note content stays a plain string (see types.ts) — no new data
// model. Inline formatting from the custom selection toolbar (see
// components/TextSelectionToolbar.tsx) is expressed as lightweight markers
// wrapped directly around the selected text, the same way a markdown editor
// works: you see the raw markers while typing, and every *read-only*
// rendering of the note (NoteCard, ReadOnlyModal, StickieStylePreviewCard,
// and NoteModal's own read-only branches) runs the text through
// parseRichText() and renders real bold/italic/strike/underline spans
// instead.
//
// Delimiters are deliberately all 2-character and otherwise uncommon in
// normal typed text, to keep accidental collisions with real note content
// rare:
//   Bold      **text**
//   Italic    ''text''   (double apostrophe — a single '_' or '*' is too
//                         common in ordinary text, e.g. "call_me_maybe",
//                         to safely double as a delimiter)
//   Strike    ~~text~~
//   Underline ++text++

export type RichSegment = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  underline?: boolean;
};

export type MarkerKind = 'bold' | 'italic' | 'strike' | 'underline';

export const MARKER_DELIM: Record<MarkerKind, string> = {
  bold: '**',
  italic: "''",
  strike: '~~',
  underline: '++',
};

// Parse order determines how nested combinations resolve (e.g. bold wrapping
// italic) — outermost-applied marker should generally be checked first so
// **''word''** resolves as bold-containing-italic rather than the reverse.
const PARSE_ORDER: MarkerKind[] = ['bold', 'strike', 'underline', 'italic'];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseLevel = (text: string, levelIndex: number, flags: Partial<RichSegment>): RichSegment[] => {
  if (levelIndex >= PARSE_ORDER.length) {
    return text ? [{ text, ...flags }] : [];
  }
  const marker = PARSE_ORDER[levelIndex];
  const delim = MARKER_DELIM[marker];
  const re = new RegExp(`${escapeRegExp(delim)}([\\s\\S]+?)${escapeRegExp(delim)}`, 'g');

  const segments: RichSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) segments.push(...parseLevel(before, levelIndex + 1, flags));
    segments.push(...parseLevel(match[1], levelIndex + 1, { ...flags, [marker]: true }));
    lastIndex = match.index + match[0].length;
  }
  const after = text.slice(lastIndex);
  if (after) segments.push(...parseLevel(after, levelIndex + 1, flags));
  return segments;
};

// Splits `text` into runs of plain text plus which of the four styles apply
// to each run — the single function every read-only renderer calls.
export const parseRichText = (text: string): RichSegment[] => parseLevel(text, 0, {});

// ── Toolbar toggle logic ─────────────────────────────────────────────────────

export type ToggleResult = { text: string; selectionStart: number; selectionEnd: number };

// Applies (or removes) a marker around [selStart, selEnd) of `fullText`.
//   - If the selection is already exactly wrapped by this marker, unwrap it
//     (toggle off).
//   - Otherwise, strip any *nested same-type* markers already inside the
//     selection first (so re-bolding a selection that already contains a
//     bolded word collapses to one clean outer pair instead of stacking
//     redundant markers), then wrap the whole selection.
// Returns the new full text plus where the selection should land afterward
// (used to re-apply a controlled `selection` on the TextInput once).
export const toggleMarkerOnSelection = (
  fullText: string,
  selStart: number,
  selEnd: number,
  kind: MarkerKind
): ToggleResult => {
  if (selStart === selEnd) return { text: fullText, selectionStart: selStart, selectionEnd: selEnd };

  const delim = MARKER_DELIM[kind];
  const dLen = delim.length;
  const alreadyWrapped =
    fullText.slice(Math.max(0, selStart - dLen), selStart) === delim &&
    fullText.slice(selEnd, selEnd + dLen) === delim;

  if (alreadyWrapped) {
    const newText =
      fullText.slice(0, selStart - dLen) + fullText.slice(selStart, selEnd) + fullText.slice(selEnd + dLen);
    return { text: newText, selectionStart: selStart - dLen, selectionEnd: selEnd - dLen };
  }

  const selected = fullText.slice(selStart, selEnd);
  const stripped = selected.split(delim).join('');
  const wrapped = `${delim}${stripped}${delim}`;
  const newText = fullText.slice(0, selStart) + wrapped + fullText.slice(selEnd);
  const newStart = selStart + dLen;
  return { text: newText, selectionStart: newStart, selectionEnd: newStart + stripped.length };
};