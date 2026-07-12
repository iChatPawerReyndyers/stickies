export type ContentType = 'text' | 'checklist';
export type TextStyle = 'normal' | 'bold' | 'italic' | 'underline';
export type ChecklistSort = 'as-is' | 'unchecked-first' | 'alphabetical';
export type ChecklistTextMode = 'single' | 'wrap';
export type SortOrder = 'manual' | 'created-desc' | 'created-asc' | 'title-asc' | 'title-desc';
export type AppTheme = 'light' | 'dark';

export interface StickieStyle {
  id: string;
  name: string;
  color: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  textStyle: TextStyle;
  contentType: ContentType;
  useSvgBackground: boolean;
  svgFrameId?: string;
  margins?: NoteMargins;
  itemSpacing?: ItemSpacing;
  lineSpacing?: number;
  checklistSort?: ChecklistSort;
  checklistTextMode?: ChecklistTextMode;
}

export interface AppSettings {
  theme: AppTheme;
  defaultColor: string;
  defaultTextColor: string;
  defaultFont: string;
  defaultFontSize: number;
  gridColumns: 2 | 3;
  sortOrder: SortOrder;
  showDiscardConfirmation: boolean;
  // When true (default), switching a note's content type away from checklist
  // and back again restores the previous items' checked state and order
  // instead of rebuilding a fresh, all-unchecked checklist from the text.
  restoreChecklistState: boolean;
  stickieStyles: StickieStyle[];
  defaultStyleId?: string;
  defaultTabId?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface NoteMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const DEFAULT_MARGINS: NoteMargins = { top: 0, bottom: 0, left: 0, right: 0 };

// Vertical gap applied above/below each checklist item (row-to-row spacing),
// as distinct from NoteMargins which pads the whole content area.
export interface ItemSpacing {
  top: number;
  bottom: number;
}

export const DEFAULT_ITEM_SPACING: ItemSpacing = { top: 6, bottom: 6 };

// Extra pixels added on top of fontSize to form a text note's lineHeight —
// the analogous "spacing" control for text content, since text notes don't
// have discrete items the way checklists do.
export const DEFAULT_LINE_SPACING = 6;

export interface Note {
  id: string;
  title: string;
  contentType: ContentType;
  content: string | ChecklistItem[];
  createdAt: number;
  color: string;
  fontFamily: string;
  fontSize: number;
  textStyle: TextStyle;
  textColor: string;
  tabId: string;
  useSvgBackground?: boolean;
  svgFrameId?: string;
  margins?: NoteMargins;
  itemSpacing?: ItemSpacing;
  lineSpacing?: number;
  checklistSort?: ChecklistSort;
  checklistTextMode?: ChecklistTextMode;
  // Set when the note is swiped into Trash — used to auto-purge after 30 days.
  deletedAt?: number;
  // Set when the note is swiped into Archived — informational, not required
  // for any logic, but handy if you want to sort/display "archived on" later.
  archivedAt?: number;
  // The tabId the note lived in right before being trashed or archived, so
  // swipe-right (restore/unarchive) can put it back where it came from
  // instead of always dropping it into General.
  previousTabId?: string;
  // Snapshot of the checklist items (order + checked state) captured the
  // last time this note's content type was switched away from checklist.
  // Lets switching back to checklist later restore that state instead of
  // rebuilding a fresh, all-unchecked list from the plain text.
  checklistSnapshot?: ChecklistItem[];
}

export type DisplayNote = Note | { id: string; placeholder: true };

export interface Tab {
  id: string;
  name: string;
  color: string;
  textColor?: string;
}