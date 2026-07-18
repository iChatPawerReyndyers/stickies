// types/stickieStyle.ts
//
// StickieStyle has one canonical definition now, in the main `types.ts`
// (it has to — it's a field on AppSettings, and NoteModal.tsx's own
// applyStickieStyle() already reads it as `style.fontFamily`, `style.
// contentType`, etc.). This file used to redeclare a second, different
// StickieStyle interface (`font` instead of `fontFamily`, no `contentType`,
// required-instead-of-optional margins/itemSpacing) — the two drifted out
// of sync and broke (TS2322: "Property 'font' is missing in type
// StickieStyle but required in type StickieStyle") the moment both were
// used together via AppSettings.stickieStyles.
//
// Kept as a thin re-export so existing `import { StickieStyle } from
// '../types/stickieStyle'` call sites (StickieStyleDropdown.tsx,
// StickieStyleSection.tsx, StickieStylePreviewCard.tsx) don't need an
// import-path change — they now all get the one real type from `../types`.

export type { StickieStyle } from '../types';

import {
  StickieStyle,
  DEFAULT_MARGINS,
  DEFAULT_ITEM_SPACING,
  DEFAULT_LINE_SPACING,
} from '../types';

// Sensible starting point for "Add New Style" — reuses the same defaults
// your normal note editor falls back to, so a freshly-created style looks
// like a brand new note until the user starts customizing it.
export const makeDefaultStickieStyle = (): Omit<StickieStyle, 'id' | 'name'> => ({
  color: '#FBDDA6',
  textColor: '#3A3F4B',
  fontFamily: 'System',
  fontSize: 15,
  textStyle: 'normal',
  contentType: 'checklist',
  useSvgBackground: false,
  svgFrameId: undefined,
  backgroundImageUrl: '',
  margins: DEFAULT_MARGINS,
  itemSpacing: DEFAULT_ITEM_SPACING,
  lineSpacing: DEFAULT_LINE_SPACING,
  checklistSort: 'as-is',
  checklistTextMode: 'single',
});