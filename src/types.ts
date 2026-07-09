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
  checklistSort?: ChecklistSort;
  checklistTextMode?: ChecklistTextMode;
}

export type DisplayNote = Note | { id: string; placeholder: true };

export interface Tab {
  id: string;
  name: string;
  color: string;
  textColor?: string;
}