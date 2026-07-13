// types/stickieStyle.ts
//
// A "StickieStyle" is a reusable bundle of the purely-visual settings a note
// can have — everything the Styling bar in NoteModal lets you tweak, minus
// the note's actual content. Saving one lets a user apply the same look
// (color, font, margins, spacing, etc.) to future notes in one tap instead
// of re-configuring the styling bar every time.
//
// NOTE: This file assumes your existing `../types` module already exports
// TextStyle, NoteMargins, DEFAULT_MARGINS, ItemSpacing, DEFAULT_ITEM_SPACING,
// DEFAULT_LINE_SPACING, ChecklistSort, and ChecklistTextMode — all of which
// are already imported by NoteModal.tsx / NoteCard.tsx in your project, so
// this should line up with no changes needed on your end.

import {
  TextStyle,
  NoteMargins,
  DEFAULT_MARGINS,
  ItemSpacing,
  DEFAULT_ITEM_SPACING,
  DEFAULT_LINE_SPACING,
  ChecklistSort,
  ChecklistTextMode,
} from '.';

export interface StickieStyle {
  id: string;
  name: string;

  // Background
  color: string;
  useSvgBackground: boolean;
  svgFrameId?: string;
  backgroundImageUrl?: string;

  // Typography
  textColor: string;
  font: string;
  fontSize: number;
  textStyle: TextStyle;
  lineSpacing: number;

  // Layout
  margins: NoteMargins;
  itemSpacing: ItemSpacing;

  // Checklist-specific
  checklistSort: ChecklistSort;
  checklistTextMode: ChecklistTextMode;
}

// Sensible starting point for "Add New Style" — reuses the same defaults
// your normal note editor falls back to, so a freshly-created style looks
// like a brand new note until the user starts customizing it.
export const makeDefaultStickieStyle = (): Omit<StickieStyle, 'id' | 'name'> => ({
  color: '#FBDDA6',
  useSvgBackground: false,
  svgFrameId: undefined,
  backgroundImageUrl: '',
  textColor: '#3A3F4B',
  font: 'System',
  fontSize: 15,
  textStyle: 'normal',
  lineSpacing: DEFAULT_LINE_SPACING,
  margins: DEFAULT_MARGINS,
  itemSpacing: DEFAULT_ITEM_SPACING,
  checklistSort: 'as-is',
  checklistTextMode: 'single',
});