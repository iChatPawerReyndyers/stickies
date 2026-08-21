export type ContentType = 'text' | 'checklist';
export type TextStyle = 'normal' | 'bold' | 'italic' | 'underline';
export type ChecklistSort = 'as-is' | 'unchecked-first' | 'alphabetical';
export type ChecklistTextMode = 'single' | 'wrap';
export type SortOrder = 'manual' | 'created-desc' | 'created-asc' | 'title-asc' | 'title-desc';
export type AppTheme = 'light' | 'dark';
// How the main grid renders notes — square preview tiles ('grid') or
// compact single-column title/snippet rows ('list').
export type ViewMode = 'grid' | 'list';

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
  // Public image URL (or Google Drive share link — see
  // utils/googleDriveImage.ts) used as the note's background instead of a
  // flat color. Takes a back seat to useSvgBackground when both are set.
  backgroundImageUrl?: string;
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
  // Grid vs list display for the main notes screen. Defaults to 'grid' so
  // existing users see no change until they opt into list view.
  viewMode: ViewMode;
  sortOrder: SortOrder;
  showDiscardConfirmation: boolean;
  // When true (default), switching a note's content type away from checklist
  // and back again restores the previous items' checked state and order
  // instead of rebuilding a fresh, all-unchecked checklist from the text.
  restoreChecklistState: boolean;
  // Default checklistTextMode ('single' = "Line", 'wrap' = "Wrap") applied
  // to a brand-new checklist note, same role as defaultFont/defaultColor/
  // defaultFontSize above — the note's own styling bar can still override
  // it per-note afterward (see NoteModal.tsx's Display chips).
  defaultChecklistTextMode: ChecklistTextMode;
  // Content type ('text' or 'checklist') a brand-new note starts as, same
  // role as defaultColor/defaultFont/defaultFontSize above.
  defaultContentType: ContentType;
  stickieStyles: StickieStyle[];
  defaultStyleId?: string;
  // When true, a brand-new note (and a note whose "Use StickieStyle" toggle
  // gets turned off — see NoteModal's handleUseStickieStyleToggleChange)
  // is styled with a randomly-picked entry from stickieStyles instead of
  // the plain defaultColor/defaultFont/etc. fields above. Falls back to
  // the plain defaults automatically whenever stickieStyles is empty,
  // regardless of this flag.
  useDefaultStickieStyle: boolean;
  defaultTabId?: string;
  // Whether the "All" pill (an aggregate view across every non-trash,
  // non-archived tab) shows in the tab rail. Purely a view toggle — "All"
  // is never a tab a note actually belongs to; see Note.tabId and
  // MainScreen's resolveTabId helper. Defaults to true so existing users
  // see no change until they opt to hide it.
  showAllTab: boolean;
  // Which tabs' notes actually populate the "All" aggregate view — set via
  // components/AllTabFilterSection.tsx in Settings. undefined (the
  // default) means every tab is included, so existing users see no change
  // until they uncheck something there; once set, it's the explicit list
  // of tab ids still included. "All" itself, Archived, and Trash are never
  // listed there and aren't affected by this — but General IS a normal
  // filterable row like any other tab, not permanently pinned in.
  allTabIncludedIds?: string[];
  // App-wide PIN lock — when enabled, the app shows PinLockScreen on launch
  // (see components/PinLockScreen.tsx) and requires appPin to be entered
  // before the main screen becomes accessible. Stored in plaintext, same as
  // the rest of AppSettings (including JSON export/import) — see the
  // security note in README_pin_lock_integration.md.
  appLockEnabled: boolean;
  appPin: string;
  appPinLength: 4 | 6;
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

// How many grid columns/rows a note's card occupies in the main grid (list
// view ignores these — every row is single-column there). Clamped at render
// time to [1, settings.gridColumns] for columns and [1, MAX_NOTE_ROW_SPAN]
// for rows, so a note set to span 3 columns still renders sanely if the grid
// is later switched down to 2 columns.
export const DEFAULT_COL_SPAN = 1;
export const DEFAULT_ROW_SPAN = 1;
export const MAX_NOTE_ROW_SPAN = 3;

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
  // Public image URL (or Google Drive share link — resolved via
  // utils/googleDriveImage.ts) used as this note's background. Ignored
  // whenever useSvgBackground is true (the SVG frame wins).
  backgroundImageUrl?: string;
  margins?: NoteMargins;
  itemSpacing?: ItemSpacing;
  lineSpacing?: number;
  checklistSort?: ChecklistSort;
  checklistTextMode?: ChecklistTextMode;
  // How many grid columns/rows this note's card should occupy in the main
  // grid. Defaults to 1x1 (a normal single-cell card) when unset. See the
  // DEFAULT_COL_SPAN/DEFAULT_ROW_SPAN/MAX_NOTE_ROW_SPAN constants above.
  colSpan?: number;
  rowSpan?: number;
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
  // Public image URL (or Google Drive share link — resolved via
  // utils/googleDriveImage.ts) shown behind the tab pill/label itself,
  // instead of `color`. `color` stays as the fallback while the image loads
  // or if it fails, and still drives the darken-on-active tint.
  backgroundImageUrl?: string;
  // Separate image shown as the main screen's wallpaper (behind the notes
  // grid/list) whenever this tab is the active one. Independent of
  // backgroundImageUrl above — a tab's pill and its screen backdrop can be
  // two different images, or either can be unset while the other is set.
  screenBackgroundImageUrl?: string;
  // Solid color shown as the main screen's wallpaper, same slot as
  // screenBackgroundImageUrl. Acts as the base layer — when an image is
  // also set, the image draws on top of this color instead of replacing it.
  screenBackgroundColor?: string;
}