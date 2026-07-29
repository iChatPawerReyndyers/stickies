import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NoteCard from '../cards/NoteCard';
import SettingsIcon from '../components/SettingsIcon';
import NoteListRow from '../components/NoteListRow';
import NoteModal from '../modals/NoteModal';
import TabModal from '../modals/TabModal';
import SettingsModal from '../modals/SettingsModal';
import ReadOnlyModal from '../modals/ReadOnlyModal';
import Toast from '../components/Toast';
import PinLockScreen from '../components/PinLockScreen';
import styles, { getCardSize } from '../styles';
import { Note, ChecklistItem, ContentType, TextStyle, Tab, NoteMargins, DEFAULT_MARGINS, ItemSpacing, DEFAULT_ITEM_SPACING, DEFAULT_LINE_SPACING, ChecklistSort, ChecklistTextMode, AppSettings, SortOrder, DEFAULT_COL_SPAN, DEFAULT_ROW_SPAN, MAX_NOTE_ROW_SPAN, StickieStyle } from '../types';
import {
  COLORS,
  TEXT_COLORS,
  FONTS,
  TAB_COLOR_PALETTE,
  ALL_TAB_COLOR,
  GENERAL_TAB_COLOR,
  ARCHIVED_TAB_COLOR,
  TRASH_TAB_COLOR,
  LEGACY_COLOR_MIGRATION,
} from '../constants';
import { getRandomFrameId } from '../frames';
import { NeuView, NeuPressable } from '../components/Neumorphic';
import { NEU_ACCENT, NEU_BASE } from '../theme/neumorphic';
import { darkenColor } from '../utils/color';
import { resolveImageUrl } from '../utils/googleDriveImage';
import { resolveDefaultTabId } from '../utils/tabDefaults';

// Hand-lettered "Stickies" wordmark shown in the header in place of plain
// text. Lives at the project root's /assets folder (sibling to /screens,
// /components, etc.), not under /components — it's a static brand asset,
// not a UI component.
const STICKIES_HEADER_LOGO = require('../../assets/stickies_logo.png');

const NOTES_KEY = '@sticky_notes_notes_v1';
const TABS_KEY = '@sticky_notes_tabs_v1';
const ACTIVE_TAB_KEY = '@sticky_notes_active_tab_v1';
const SETTINGS_KEY = '@sticky_notes_settings_v1';

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const TRASH_PURGE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // check hourly while app is open
const RESTORE_FALLBACK_TAB = 'general';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  defaultColor: COLORS[0],
  defaultTextColor: TEXT_COLORS[0],
  defaultFont: FONTS[0].value,
  defaultFontSize: 16,
  gridColumns: 2,
  viewMode: 'grid',
  sortOrder: 'manual',
  showDiscardConfirmation: true,
  restoreChecklistState: true,
  defaultChecklistTextMode: 'single',
  stickieStyles: [],
  defaultStyleId: undefined,
  defaultTabId: 'all',
  showAllTab: true,
  // App PIN lock — off by default, 4 digits once enabled. See
  // components/PinLockScreen.tsx / PinSetupModal.tsx.
  appLockEnabled: false,
  appPin: '',
  appPinLength: 4,
};

const isBuiltInTabId = (id: string) => id === 'all' || id === 'general' || id === 'archived' || id === 'trash';

// Archived and Trashed notes are both "locked" the same way: no swipe, no
// styling edits, and opening one (tap or long-press) always goes to the
// read-only viewer with a Restore action instead of the normal editor —
// see ReadOnlyModal.tsx, which already implements exactly this (restore to
// previousTabId, no swipe, delete-forever only for Trash). Previously only
// Trash routed there; Archived still opened the full editor, which is what
// let an archived note be swiped/styled at all.
const isLockedNote = (note: Note) => note.tabId === 'trash' || note.tabId === 'archived';

// "All" is a virtual, aggregate view over every other tab — it's never a
// real tab a note can belong to. Anywhere a note's tabId would otherwise
// become 'all' (creating a note while the All view is active, migrating
// notes that predate this rule, editing a note that somehow still carries
// it), resolve it to General instead.
const resolveTabId = (id?: string): string => (!id || id === 'all') ? 'general' : id;

// Like resolveTabId, but also catches a tabId that doesn't match any tab
// that actually exists right now — e.g. a note imported before tabs
// traveled along with the backup (so it kept a tabId from the *source*
// device that has no local counterpart), or a custom tab that's since been
// deleted. Any note whose owning tab genuinely can't be found falls back
// to General rather than becoming invisible everywhere except "All".
const ownerTabId = (note: Pick<Note, 'tabId'>, tabsList: Tab[]): string => {
  const id = resolveTabId(note.tabId);
  return tabsList.some(t => t.id === id) ? id : 'general';
};

// Cycles through the palette based on how many custom tabs already exist,
// so each new tab pill gets a different color.
const getNextTabColor = (currentTabs: Tab[]) => {
  const customCount = currentTabs.filter(t => !isBuiltInTabId(t.id)).length;
  return TAB_COLOR_PALETTE[customCount % TAB_COLOR_PALETTE.length];
};

// ── Grid layout with spanning notes ─────────────────────────────────────────
//
// FlatList's numColumns only supports uniform-size cells, so a note that
// spans multiple columns/rows (see Note.colSpan/rowSpan, set via the
// Styling bar's "Grid Size" control) can't be expressed through it. Instead,
// the grid is packed here into explicit {row, col} placements — a dense,
// CSS-grid-style auto-placement: scan cells top-left to bottom-right in note
// order, and drop each note into the first opening its span fits, which
// naturally fills gaps left by earlier spanning notes rather than just
// stacking everything strictly in a line.
const GRID_GAP = 12;

export type GridPlacement = { note: Note; row: number; col: number; colSpan: number; rowSpan: number };

export const layoutNotesGrid = (
  list: Note[],
  numColumns: number
): { placements: GridPlacement[]; totalRows: number } => {
  const occupied: boolean[][] = [];
  const ensureRow = (r: number) => {
    if (!occupied[r]) occupied[r] = new Array(numColumns).fill(false);
  };
  const isFree = (row: number, col: number, colSpan: number, rowSpan: number) => {
    if (col + colSpan > numColumns) return false;
    for (let r = row; r < row + rowSpan; r++) {
      ensureRow(r);
      for (let c = col; c < col + colSpan; c++) {
        if (occupied[r][c]) return false;
      }
    }
    return true;
  };
  const occupy = (row: number, col: number, colSpan: number, rowSpan: number) => {
    for (let r = row; r < row + rowSpan; r++) {
      ensureRow(r);
      for (let c = col; c < col + colSpan; c++) occupied[r][c] = true;
    }
  };

  const placements: GridPlacement[] = [];
  let totalRows = 0;

  // Guards against any corrupted/unexpected numColumns (e.g. 0 or NaN from a
  // bad settings value) ever hanging the JS thread — after a generous bound
  // of scanned rows, just drop the note in its own row rather than spin
  // forever. In normal operation (numColumns 2 or 3) this is never hit.
  const MAX_SCAN_ROWS = 2000;

  list.forEach(note => {
    const colSpan = Math.min(Math.max(1, numColumns), Math.max(1, note.colSpan || DEFAULT_COL_SPAN));
    const rowSpan = Math.min(MAX_NOTE_ROW_SPAN, Math.max(1, note.rowSpan || DEFAULT_ROW_SPAN));

    let row = 0;
    let placed = false;
    while (!placed && row < MAX_SCAN_ROWS) {
      for (let col = 0; col <= numColumns - colSpan; col++) {
        if (isFree(row, col, colSpan, rowSpan)) {
          occupy(row, col, colSpan, rowSpan);
          placements.push({ note, row, col, colSpan, rowSpan });
          totalRows = Math.max(totalRows, row + rowSpan);
          placed = true;
          break;
        }
      }
      row += 1;
    }
    if (!placed) {
      // Fallback for the pathological case above — still shows the note
      // rather than silently dropping it.
      const fallbackRow = totalRows;
      placements.push({ note, row: fallbackRow, col: 0, colSpan: 1, rowSpan: 1 });
      totalRows = fallbackRow + 1;
    }
  });

  return { placements, totalRows };
};

const MainScreen = () => {
  // Read manually instead of relying solely on SafeAreaView's automatic top
  // inset — the header below is deliberately rendered outside that inset
  // (edges=['left','right','bottom'] on SafeAreaView) so its own background
  // can extend all the way to the true top of the screen on iOS, with just
  // its *content* pushed down by this value instead of the whole bar.
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newNoteContentType, setNewNoteContentType] = useState<ContentType>('text');
  const [newNoteContent, setNewNoteContent] = useState<string | ChecklistItem[]>('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedTextColor, setSelectedTextColor] = useState(TEXT_COLORS[0]);
  const [selectedFont, setSelectedFont] = useState(FONTS[0].value);
  const [selectedFontSize, setSelectedFontSize] = useState(16);
  const [selectedTextStyle, setSelectedTextStyle] = useState<TextStyle>('normal');
  const [useSvgBackground, setUseSvgBackground] = useState(false);
  const [svgFrameId, setSvgFrameId] = useState<string | undefined>(undefined);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | undefined>(undefined);
  const [selectedMargins, setSelectedMargins] = useState<NoteMargins>(DEFAULT_MARGINS);
  const [selectedItemSpacing, setSelectedItemSpacing] = useState<ItemSpacing>(DEFAULT_ITEM_SPACING);
  const [selectedLineSpacing, setSelectedLineSpacing] = useState<number>(DEFAULT_LINE_SPACING);
  const [selectedChecklistSort, setSelectedChecklistSort] = useState<ChecklistSort>('as-is');
  const [selectedChecklistTextMode, setSelectedChecklistTextMode] = useState<ChecklistTextMode>('single');
  // How many grid columns/rows the note being created/edited should occupy
  // in the main grid (see the Styling bar's "Grid Size" control).
  const [selectedColSpan, setSelectedColSpan] = useState<number>(DEFAULT_COL_SPAN);
  const [selectedRowSpan, setSelectedRowSpan] = useState<number>(DEFAULT_ROW_SPAN);
  // Which tab the note being created/edited belongs to — drives NoteModal's
  // new header dropdown. Previously this was implicit: a new note always
  // took resolveTabId(activeTabId) and an edited note always kept its own
  // tabId, both baked straight into saveNote() with no way to change it
  // from the editor itself.
  const [selectedTabId, setSelectedTabId] = useState<string>('general');
  // Last-known checklist state (order + checked status) for the note being
  // edited, captured whenever its content type leaves 'checklist'. Lets
  // switching back restore it instead of starting from scratch — see
  // NoteModal's contentType-conversion effect.
  const [checklistSnapshot, setChecklistSnapshot] = useState<ChecklistItem[] | undefined>(undefined);
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'all', name: 'All', color: ALL_TAB_COLOR },
    { id: 'general', name: 'General', color: GENERAL_TAB_COLOR },
    { id: 'archived', name: 'Archived', color: ARCHIVED_TAB_COLOR },
    { id: 'trash', name: 'Trash', color: TRASH_TAB_COLOR },
  ]);
  const [activeTabId, setActiveTabId] = useState('all');
  const [showTabModal, setShowTabModal] = useState(false);
  const [editingTab, setEditingTab] = useState<Tab | null>(null);
  const [readOnlyNote, setReadOnlyNote] = useState<Note | null>(null);
  const [showReadOnlyModal, setShowReadOnlyModal] = useState(false);
  // View Only — opened via long-press on any note card. Reuses NoteModal in
  // its `viewOnly` mode so the note's real color/font/SVG frame render
  // exactly as saved, with no editing affordances.
  const [viewOnlyNote, setViewOnlyNote] = useState<Note | null>(null);
  const [showViewOnlyModal, setShowViewOnlyModal] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  // Bottom "toast" shown after any swipe action (trash / archive / restore /
  // permanent delete), with an Undo button. Auto-hides after 5s (see Toast.tsx).
  const [toast, setToast] = useState<{ visible: boolean; message: string; onUndo?: () => void }>({
    visible: false,
    message: '',
  });
  // Whether the PIN gate has been passed for this app session. Starts
  // false every cold start; once true it stays true until the app is
  // relaunched (see PinLockScreen gate below in the render).
  const [unlocked, setUnlocked] = useState(false);

  const updateSettings = (patch: Partial<AppSettings>) =>
    setSettings(prev => ({ ...prev, ...patch }));

  // NoteModal's "Save as StickieStyle" button (styling bar, below "Use
  // StickieStyle") — appends the note's current live styling as a brand
  // new saved style, same list Settings' own StickieStyleSection reads
  // from and writes to.
  //
  // Written to AsyncStorage right here rather than only via setSettings —
  // the main persist effect below (keyed on [notes, tabs, activeTabId,
  // settings, isDataLoaded]) would eventually catch this same change on
  // its next run, but that's a step behind the state update rather than
  // guaranteed to happen before it. A style saved from the note editor
  // should be durable the instant Save is tapped, not dependent on the app
  // staying open long enough for a following render's effect to fire.
  const handleSaveNoteStyleAsStickieStyle = (style: StickieStyle) => {
    setSettings(prev => {
      const next = { ...prev, stickieStyles: [...prev.stickieStyles, style] };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(e =>
        console.warn('Failed to persist new StickieStyle', e)
      );
      return next;
    });
  };

  // Whether the main grid renders as single-column list rows instead of the
  // square-tile grid. When true, grid column count is irrelevant.
  const isListView = settings.viewMode === 'list';

  // Single source of truth for column count — drives FlatList's numColumns,
  // per-item right-margin, and placeholder padding below, so the whole grid
  // always agrees on how many columns actually exist. Forced to 1 in list view.
  const numColumns = isListView ? 1 : settings.gridColumns;

  const nonTrashTabs = tabs.filter(t => t.id !== 'trash' && (t.id !== 'all' || settings.showAllTab));
  const trashTab = tabs.find(t => t.id === 'trash');

  const showToast = (message: string, onUndo?: () => void) => {
    setToast({ visible: true, message, onUndo });
  };
  const hideToast = () => setToast(prev => ({ ...prev, visible: false }));

  useEffect(() => {
    const load = async () => {
      try {
        const [notesJson, tabsJson, activeTab, settingsJson] = await Promise.all([
          AsyncStorage.getItem(NOTES_KEY),
          AsyncStorage.getItem(TABS_KEY),
          AsyncStorage.getItem(ACTIVE_TAB_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
        ]);

        // Tabs are resolved first so the note-tabId migration below can
        // check each note's tabId against the *actual* set of tabs that
        // will exist, not just do a blind pass-through.
        let finalTabsForMigration: Tab[] = tabs;

        if (tabsJson) {
          const parsedTabs = JSON.parse(tabsJson);
          if (Array.isArray(parsedTabs)) {
            const hasAll = parsedTabs.some((t: any) => t.id === 'all');
            const hasTrash = parsedTabs.some((t: any) => t.id === 'trash');
            const hasGeneral = parsedTabs.some((t: any) => t.id === 'general');
            const hasArchived = parsedTabs.some((t: any) => t.id === 'archived');
            let finalTabs = parsedTabs;
            if (!hasAll) finalTabs = [{ id: 'all', name: 'All', color: ALL_TAB_COLOR }, ...finalTabs];
            if (!hasGeneral) finalTabs = [...finalTabs, { id: 'general', name: 'General', color: GENERAL_TAB_COLOR }];
            if (!hasArchived) {
              // Insert right before Trash if Trash already exists, otherwise append.
              const trashIdx = finalTabs.findIndex((t: any) => t.id === 'trash');
              const archivedTab = { id: 'archived', name: 'Archived', color: ARCHIVED_TAB_COLOR };
              if (trashIdx >= 0) {
                finalTabs = [...finalTabs.slice(0, trashIdx), archivedTab, ...finalTabs.slice(trashIdx)];
              } else {
                finalTabs = [...finalTabs, archivedTab];
              }
            }
            if (!hasTrash) finalTabs = [...finalTabs, { id: 'trash', name: 'Trash', color: TRASH_TAB_COLOR }];

            // Back-fill colors for tabs that were persisted before the colored pill rail existed.
            let customColorIndex = 0;
            finalTabs = finalTabs.map((t: any) => {
              if (t.color) return t;
              if (t.id === 'all') return { ...t, color: ALL_TAB_COLOR };
              if (t.id === 'general') return { ...t, color: GENERAL_TAB_COLOR };
              if (t.id === 'archived') return { ...t, color: ARCHIVED_TAB_COLOR };
              if (t.id === 'trash') return { ...t, color: TRASH_TAB_COLOR };
              const color = TAB_COLOR_PALETTE[customColorIndex % TAB_COLOR_PALETTE.length];
              customColorIndex += 1;
              return { ...t, color };
            });

            setTabs(finalTabs);
            finalTabsForMigration = finalTabs;
          }
        }

        if (notesJson) {
          const parsed = JSON.parse(notesJson);
          if (Array.isArray(parsed)) {
            setNotes(parsed.map((note: any) => ({
              ...note,
              textColor: note.textColor || '#333333',
              contentType: note.contentType === 'bullets' ? 'text' : note.contentType,
              color: LEGACY_COLOR_MIGRATION[note.color] || note.color,
              // Folds notes with no real owner — no tabId, the old literal
              // 'all', or a tabId from a source device/deleted tab that
              // doesn't exist here (e.g. an early import that predates
              // tabs traveling with the backup) — into General.
              tabId: ownerTabId(note, finalTabsForMigration),
            })));
          }
        }

        if (settingsJson) {
          try {
            const parsed = JSON.parse(settingsJson);
            setSettings(prev => ({ ...prev, ...parsed }));
            // Prefer the user's chosen default tab on startup if available —
            // resolveDefaultTabId sanitizes whichever candidate wins (the
            // stored defaultTabId, or the last-active tab as its own
            // fallback) against the tabs that actually still exist and
            // whether All is currently hidden.
            const rawStartupTab = parsed.defaultTabId || activeTab || 'all';
            setActiveTabId(resolveDefaultTabId(rawStartupTab, finalTabsForMigration, parsed.showAllTab ?? true));
          } catch {
            // keep defaults
            setActiveTabId(activeTab || 'all');
          }
        } else {
          setActiveTabId(activeTab || 'all');
        }
      } catch (e) {
        console.warn('Failed to load persisted notes/tabs', e);
      } finally {
        setIsDataLoaded(true);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!isDataLoaded) return;

    const save = async () => {
      try {
        await Promise.all([
          AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes)),
          AsyncStorage.setItem(TABS_KEY, JSON.stringify(tabs)),
          AsyncStorage.setItem(ACTIVE_TAB_KEY, activeTabId),
          AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)),
        ]);
      } catch (e) {
        console.warn('Failed to persist notes/tabs', e);
      }
    };
    save();
  }, [notes, tabs, activeTabId, settings, isDataLoaded]);

  // Auto-purge — permanently removes any note that's been sitting in Trash
  // for more than 30 days. Runs once after load, then re-checks hourly while
  // the app stays open (a note only gets purged if the app is actually
  // running past its 30-day mark, same as most "empty trash automatically"
  // implementations without a background task).
  useEffect(() => {
    if (!isDataLoaded) return;

    const purgeExpiredTrash = () => {
      const now = Date.now();
      setNotes(prev => prev.filter(n => !(n.tabId === 'trash' && n.deletedAt && now - n.deletedAt > TRASH_RETENTION_MS)));
    };

    purgeExpiredTrash();
    const interval = setInterval(purgeExpiredTrash, TRASH_PURGE_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isDataLoaded]);

  // If the All pill is hidden (or gets hidden mid-session) while it's the
  // active tab, there'd be nothing to show in the rail as "selected" — jump
  // to General instead (or, if General's also been deleted, the first
  // remaining user-created tab — see resolveDefaultTabId), same place a
  // note filed from the All view now ends up (see resolveTabId).
  useEffect(() => {
    if (isDataLoaded && !settings.showAllTab && activeTabId === 'all') {
      setActiveTabId(resolveDefaultTabId('general', tabs, settings.showAllTab));
    }
  }, [isDataLoaded, settings.showAllTab, activeTabId, tabs]);

  const createNewNote = () => {
    if (activeTabId === 'trash') {
      Alert.alert('Cannot create in Trash', 'You cannot create a note inside Trash.');
      return;
    }
    if (activeTabId === 'archived') {
      Alert.alert('Cannot create in Archived', 'Create the note elsewhere, then archive it.');
      return;
    }
    setEditingNote(null);
    setNewNoteContentType('text');
    setNewNoteContent('');
    setSelectedColor(settings.defaultColor);
    setSelectedTextColor(settings.defaultTextColor);
    setSelectedFont(settings.defaultFont);
    setSelectedFontSize(settings.defaultFontSize);
    setSelectedTextStyle('normal');
    setUseSvgBackground(false);
    setSvgFrameId(undefined);
    setBackgroundImageUrl(undefined);
    setSelectedMargins(DEFAULT_MARGINS);
    setSelectedItemSpacing(DEFAULT_ITEM_SPACING);
    setSelectedLineSpacing(DEFAULT_LINE_SPACING);
    setSelectedChecklistSort('as-is');
    setSelectedChecklistTextMode('single');
    setSelectedColSpan(DEFAULT_COL_SPAN);
    setSelectedRowSpan(DEFAULT_ROW_SPAN);
    setChecklistSnapshot(undefined);
    setSelectedTabId(resolveTabId(activeTabId));
    setShowModal(true);
  };

  const openReadOnly = (note: Note) => {
    setReadOnlyNote(note);
    setShowReadOnlyModal(true);
  };

  const openViewOnlyModal = (note: Note) => {
    setViewOnlyNote(note);
    setShowViewOnlyModal(true);
  };

  const closeViewOnlyModal = () => {
    setShowViewOnlyModal(false);
    setViewOnlyNote(null);
  };

  // Only reachable via the View Only checklist's tappable checkboxes (see
  // NoteModal's viewOnly branch) — everything else about a View Only note is
  // still read-only. Updates the note in place and lets the existing
  // notes-effect below persist it to AsyncStorage, so a check/uncheck saves
  // immediately with no separate Save step.
  const handleViewOnlyContentChange = (content: ChecklistItem[] | string) => {
    if (!viewOnlyNote) return;
    setViewOnlyNote(prev => (prev ? { ...prev, content } : prev));
    setNotes(prev => prev.map(n => (n.id === viewOnlyNote.id ? { ...n, content } : n)));
  };

  const createNewTab = () => {
    setEditingTab(null);
    setShowTabModal(true);
  };

  const extractTitleFromContent = (contentType: ContentType, content: string | ChecklistItem[]): string => {
    if (contentType === 'text') {
      const text = content as string;
      const words = text.trim().split(/\s+/);
      return words.slice(0, 5).join(' ') || 'Untitled Note';
    }
    const items = content as ChecklistItem[];
    const firstItem = items.find(item => item.text.trim());
    return firstItem?.text.trim() || 'Untitled Note';
  };

  const editNote = (note: Note) => {
    setEditingNote(note);
    setNewNoteContentType(note.contentType);
    setNewNoteContent(note.content);
    setSelectedColor(note.color);
    setSelectedTextColor(note.textColor || TEXT_COLORS[0]);
    setSelectedFont(note.fontFamily);
    setSelectedFontSize(note.fontSize || 16);
    setSelectedTextStyle(note.textStyle);
    setUseSvgBackground(note.useSvgBackground || false);
    setSvgFrameId(note.svgFrameId);
    setBackgroundImageUrl(note.backgroundImageUrl);
    setSelectedMargins(note.margins || DEFAULT_MARGINS);
    setSelectedItemSpacing(note.itemSpacing || DEFAULT_ITEM_SPACING);
    setSelectedLineSpacing(note.lineSpacing ?? DEFAULT_LINE_SPACING);
    setSelectedChecklistSort(note.checklistSort || 'as-is');
    setSelectedChecklistTextMode(note.checklistTextMode || 'single');
    setSelectedColSpan(note.colSpan || DEFAULT_COL_SPAN);
    setSelectedRowSpan(note.rowSpan || DEFAULT_ROW_SPAN);
    setChecklistSnapshot(note.checklistSnapshot);
    setSelectedTabId(ownerTabId(note, tabs));
    setShowModal(true);
  };

  const saveTab = (
    id: string | undefined,
    name: string,
    color: string | undefined,
    afterTabId?: string,
    textColor?: string,
    backgroundImageUrl?: string,
    screenBackgroundImageUrl?: string,
    screenBackgroundColor?: string,
  ) => {
    if (!name.trim()) return;

    const insertAfter = (list: Tab[], item: Tab, afterId?: string) => {
      const filtered = list.filter(t => t.id !== item.id);
      if (afterId) {
        const index = filtered.findIndex(t => t.id === afterId);
        if (index >= 0) {
          filtered.splice(index + 1, 0, item);
          return filtered;
        }
      }
      const generalIndex = filtered.findIndex(t => t.id === 'general');
      const insertAt = generalIndex >= 0 ? generalIndex + 1 : filtered.length;
      filtered.splice(insertAt, 0, item);
      return filtered;
    };

    if (id) {
      setTabs(prevTabs => {
        const updatedTab = prevTabs.map(t => (t.id === id
          ? { ...t, name, color: color || t.color, textColor: textColor || t.textColor, backgroundImageUrl, screenBackgroundImageUrl, screenBackgroundColor }
          : t));
        if (afterTabId && afterTabId !== id) {
          const tab = updatedTab.find(t => t.id === id);
          if (!tab) return updatedTab;
          return insertAfter(updatedTab, tab, afterTabId);
        }
        return updatedTab;
      });
    } else {
      const newTab: Tab = {
        id: Date.now().toString(),
        name,
        color: color || getNextTabColor(tabs),
        textColor: textColor || '#FFFFFF',
        backgroundImageUrl,
        screenBackgroundImageUrl,
        screenBackgroundColor,
      };
      setTabs(prevTabs => insertAfter(prevTabs, newTab, afterTabId));
      setActiveTabId(newTab.id);
    }
    setShowTabModal(false);
  };

  const deleteTab = (id: string) => {
    if (id === 'all' || id === 'trash' || id === 'archived') return;
    setTabs(tabs.filter(t => t.id !== id));
    setNotes(notes.map(n => (n.tabId === id ? { ...n, tabId: 'trash', deletedAt: Date.now(), previousTabId: 'general' } : n)));
    setActiveTabId('trash');
    setShowTabModal(false);
  };

  const saveNote = () => {
    if (typeof newNoteContent === 'string' && !newNoteContent.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }
    if (Array.isArray(newNoteContent) && !newNoteContent.some(item => item.text.trim())) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    const generatedTitle = extractTitleFromContent(newNoteContentType, newNoteContent);

    if (editingNote) {
      setNotes(notes.map(note =>
        note.id === editingNote.id
          ? {
              ...note,
              title: generatedTitle,
              contentType: newNoteContentType,
              content: newNoteContent,
              color: selectedColor,
              textColor: selectedTextColor,
              fontFamily: selectedFont,
              fontSize: selectedFontSize,
              textStyle: selectedTextStyle,
              tabId: resolveTabId(selectedTabId),
              useSvgBackground,
              svgFrameId: useSvgBackground ? svgFrameId : undefined,
              backgroundImageUrl,
              margins: selectedMargins,
              itemSpacing: selectedItemSpacing,
              lineSpacing: selectedLineSpacing,
              checklistSort: selectedChecklistSort,
              checklistTextMode: selectedChecklistTextMode,
              colSpan: selectedColSpan,
              rowSpan: selectedRowSpan,
              checklistSnapshot,
            }
          : note
      ));
    } else {
      const newNote: Note = {
        id: Date.now().toString(),
        title: generatedTitle,
        contentType: newNoteContentType,
        content: newNoteContent,
        createdAt: Date.now(),
        color: selectedColor,
        textColor: selectedTextColor,
        fontFamily: selectedFont,
        fontSize: selectedFontSize,
        textStyle: selectedTextStyle,
        tabId: resolveTabId(selectedTabId),
        useSvgBackground,
        svgFrameId: useSvgBackground ? svgFrameId : undefined,
        backgroundImageUrl,
        margins: selectedMargins,
        itemSpacing: selectedItemSpacing,
        lineSpacing: selectedLineSpacing,
        checklistSort: selectedChecklistSort,
        checklistTextMode: selectedChecklistTextMode,
        colSpan: selectedColSpan,
        rowSpan: selectedRowSpan,
        checklistSnapshot,
      };
      setNotes([newNote, ...notes]);
    }

    setShowModal(false);
  };

  const deleteNote = (id: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: () => setNotes(notes.filter(note => note.id !== id)),
          style: 'destructive',
        },
      ]
    );
  };

  // Central handler for every swipe-left / swipe-right gesture, wherever it
  // happens (regular editor, View Only, or the read-only Trash viewer).
  // Behavior depends on where the note currently lives:
  //   • Normal tab  → left: Trash, right: Archive
  //   • Archived    → left: Trash (keeps its pre-archive previousTabId),
  //                   right: Unarchive (restore to previousTabId)
  //   • Trash       → left: Permanently delete, right: Restore to previousTabId
  // Every branch shows a 5s toast with Undo that reverts the exact change.
  const handleSwipeAction = (note: Note, direction: 'left' | 'right') => {
    const prevSnapshot: Note = { ...note };

    if (note.tabId === 'trash') {
      if (direction === 'left') {
        setNotes(prev => prev.filter(n => n.id !== note.id));
        showToast('Note permanently deleted', () => {
          setNotes(prev => [prevSnapshot, ...prev]);
        });
      } else {
        const restoreTo = note.previousTabId || RESTORE_FALLBACK_TAB;
        setNotes(prev => prev.map(n => n.id === note.id
          ? { ...n, tabId: restoreTo, deletedAt: undefined, previousTabId: undefined }
          : n));
        showToast('Note restored', () => {
          setNotes(prev => prev.map(n => n.id === note.id ? prevSnapshot : n));
        });
      }
      return;
    }

    if (note.tabId === 'archived') {
      if (direction === 'left') {
        // Archived -> Trash: keep previousTabId pointing at the tab the note
        // lived in before it was archived, so a later restore-from-trash
        // lands back there instead of at "Archived".
        setNotes(prev => prev.map(n => n.id === note.id
          ? { ...n, tabId: 'trash', deletedAt: Date.now() }
          : n));
        showToast('Moved to Trash', () => {
          setNotes(prev => prev.map(n => n.id === note.id ? prevSnapshot : n));
        });
      } else {
        const restoreTo = note.previousTabId || RESTORE_FALLBACK_TAB;
        setNotes(prev => prev.map(n => n.id === note.id
          ? { ...n, tabId: restoreTo, archivedAt: undefined, previousTabId: undefined }
          : n));
        showToast('Note unarchived', () => {
          setNotes(prev => prev.map(n => n.id === note.id ? prevSnapshot : n));
        });
      }
      return;
    }

    // Normal (non-trash, non-archived) tab
    if (direction === 'left') {
      setNotes(prev => prev.map(n => n.id === note.id
        ? { ...n, tabId: 'trash', deletedAt: Date.now(), previousTabId: note.tabId }
        : n));
      showToast('Moved to Trash', () => {
        setNotes(prev => prev.map(n => n.id === note.id ? prevSnapshot : n));
      });
    } else {
      setNotes(prev => prev.map(n => n.id === note.id
        ? { ...n, tabId: 'archived', archivedAt: Date.now(), previousTabId: note.tabId }
        : n));
      showToast('Archived', () => {
        setNotes(prev => prev.map(n => n.id === note.id ? prevSnapshot : n));
      });
    }
  };

  // Wallpaper behind the notes grid — independent of the active tab's own
  // pill image (tab.backgroundImageUrl), and only present when that tab
  // was explicitly given one.
  const activeTab = tabs.find(t => t.id === activeTabId);
  const resolvedScreenBgImage = resolveImageUrl(activeTab?.screenBackgroundImageUrl);
  // When there's a photo behind the grid, the neumorphic shadow pair on
  // each card/row reads as visual noise rather than a soft-UI edge, so it's
  // dropped entirely rather than tuned per-photo. See Neumorphic.tsx's
  // `noShadow` prop.
  const hasScreenBackgroundImage = !!resolvedScreenBgImage;

  // List view: single-column compact rows, no swipe-to-delete on the row
  // itself (swipe still works from inside the note modals).
  const renderListItem = ({ item }: { item: Note }) => (
    <NoteListRow
      note={item}
      onEdit={() => (isLockedNote(item) ? openReadOnly(item) : editNote(item))}
      onLongPress={() => (isLockedNote(item) ? openReadOnly(item) : openViewOnlyModal(item))}
      hasScreenBackgroundImage={hasScreenBackgroundImage}
      isDark={settings.theme === 'dark'}
    />
  );

  // "All" aggregates every normal tab, but Trash and Archived are their own
  // dedicated views — a note swiped into either should disappear from "All"
  // (and every other normal tab) just like it already does from its
  // original tab, only reappearing under Trash/Archived themselves.
  //
  // A note whose tab can't actually be found — no tabId at all, an old
  // literal 'all', or a tabId belonging to a tab that's been deleted or was
  // never local to begin with — is treated as belonging to General here
  // too, as a defensive fallback on top of the load-time migration above,
  // so it's never simply invisible from every real tab.
  //
  // settings.allTabIncludedIds (set via Settings' "Tabs shown in All"
  // section — see components/AllTabFilterSection.tsx) further narrows
  // which tabs' notes actually populate "All": undefined means every tab
  // is included (unchanged behavior for anyone who's never touched that
  // setting), otherwise only notes whose resolved owner tab is in that
  // list show up here.
  const rawBaseNotes = activeTabId === 'all'
    ? notes.filter(n => {
        if (n.tabId === 'trash' || n.tabId === 'archived') return false;
        if (!settings.allTabIncludedIds) return true;
        return settings.allTabIncludedIds.includes(ownerTabId(n, tabs));
      })
    : notes.filter(n => ownerTabId(n, tabs) === activeTabId);

  const baseNotes = (() => {
    const s = settings.sortOrder;
    if (s === 'manual') return rawBaseNotes;
    const sorted = [...rawBaseNotes];
    if (s === 'created-desc') sorted.sort((a, b) => b.createdAt - a.createdAt);
    else if (s === 'created-asc') sorted.sort((a, b) => a.createdAt - b.createdAt);
    else if (s === 'title-asc') sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (s === 'title-desc') sorted.sort((a, b) => b.title.localeCompare(a.title));
    return sorted;
  })();

  const cardSize = getCardSize(numColumns);

  // Packs baseNotes (including any spanning colSpan/rowSpan notes) into
  // explicit grid cell placements — see layoutNotesGrid above. Only needed
  // in grid view; list view renders every note as its own full-width row.
  const gridLayout = useMemo(
    () => (isListView ? null : layoutNotesGrid(baseNotes, numColumns)),
    [baseNotes, numColumns, isListView]
  );

  const noteModalTabId = editingNote ? editingNote.tabId : activeTabId;
  const noteModalTabName = tabs.find(t => t.id === noteModalTabId)?.name || 'General';
  const viewOnlyTabName = tabs.find(t => t.id === viewOnlyNote?.tabId)?.name || 'General';

  // App PIN lock gate — shown instead of the main screen whenever the lock
  // is enabled and this session hasn't been unlocked yet. Placed after data
  // load so it doesn't flash the lock screen with stale/default settings
  // before AsyncStorage has actually loaded the real appLockEnabled value.
  if (isDataLoaded && settings.appLockEnabled && !unlocked) {
    return (
      <PinLockScreen
        correctPin={settings.appPin}
        pinLength={settings.appPinLength}
        isDark={settings.theme === 'dark'}
        onUnlock={() => setUnlocked(true)}
      />
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: NEU_BASE }, settings.theme === 'dark' && { backgroundColor: '#1C1C1E' }]}>
      {/* Tab wallpaper — painted on this outer View (which spans the true
          device screen bounds, including the iOS status bar/notch area)
          rather than as a child of SafeAreaView below. A SafeAreaView
          positions its own children — including absolutely-positioned ones
          — inset from the safe area, so the same layers used to stop short
          of the very top of the screen. NEU_BASE (or the dark override)
          set on this View is the default whole-screen background whenever
          a tab has no custom wallpaper of its own. */}
      {!!activeTab?.screenBackgroundColor && (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: activeTab.screenBackgroundColor }]}
          pointerEvents="none"
        />
      )}
      {!!resolvedScreenBgImage && (
        <>
          <Image
            source={{ uri: resolvedScreenBgImage }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          {/* Scrim so a busy photo doesn't fight visually with the empty
              gutters between cards — spans the full screen along with the
              image itself. Tints toward white in light mode and black in
              dark mode, matching whichever theme is active. */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: settings.theme === 'dark' ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)' },
            ]}
            pointerEvents="none"
          />
        </>
      )}

      <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={[styles.header, styles.headerSpacing, { paddingTop: insets.top + 15}]}>
        <Image
          source={STICKIES_HEADER_LOGO}
          style={{ height: 55, width: 120, alignSelf: 'center' }}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="Stickies"
        />
        <NeuPressable
          radius={20}
          isDark={settings.theme === 'dark'}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setShowSettings(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <SettingsIcon size={20} color={NEU_ACCENT} />
        </NeuPressable>
      </View>

      <View style={styles.mainContentRow}>
        <ScrollView
          style={styles.pillRail}
          contentContainerStyle={styles.pillRailContent}
          showsVerticalScrollIndicator={false}
        >
          {nonTrashTabs.map(tab => {
            const isActive = activeTabId === tab.id;
            // Resolved image sits on top of the flat color, which stays
            // underneath as the load/failure fallback (and still drives the
            // darken-on-active tint via NeuView's backgroundColor).
            const resolvedTabImage = resolveImageUrl(tab.backgroundImageUrl);
            return (
              <View key={tab.id} style={styles.tabPillGroup}>
                <View style={{ position: 'relative' }}>
                  {/* Active-tab indicator — a small accent bar hanging off
                      the pill's outer (left/rail) edge, independent of the
                      pill's own shape/shadow. Reads clearly at a glance
                      without competing with the app's soft neumorphic
                      style the way a hard border ring would. */}
                  {isActive && <View pointerEvents="none" style={styles.activeTabNotch} />}
                  <NeuView
                    radius={16}
                    isDark={settings.theme === 'dark'}
                    backgroundColor={isActive ? darkenColor(tab.color) : tab.color}
                    style={{ width: 32, height: 80, marginBottom: 4, overflow: 'hidden' }}
                  >
                    {!!resolvedTabImage && (
                      <Image
                        source={{ uri: resolvedTabImage }}
                        style={[StyleSheet.absoluteFill, isActive && { opacity: 0.55 }]}
                        resizeMode="cover"
                      />
                    )}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                      onPress={() => setActiveTabId(tab.id)}
                      onLongPress={() => { setEditingTab(tab); setShowTabModal(true); }}
                    >
                      <View style={styles.tabPillLabelWrapper}>
                        <Text
                          style={[styles.tabPillLabelText, { color: tab.textColor || '#FFFFFF' }, isActive && styles.tabPillLabelTextActive]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.5}
                        >
                          {tab.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </NeuView>
                </View>
                <View style={styles.tabPillConnector} />
              </View>
            );
          })}

          <NeuPressable
            radius={16}
            isDark={settings.theme === 'dark'}
            style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
            onPress={createNewTab}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: NEU_ACCENT, lineHeight: 20 }}>+</Text>
          </NeuPressable>

          {trashTab && (
            <View style={styles.tabPillDivider}>
              <View style={{ position: 'relative' }}>
                {activeTabId === trashTab.id && <View pointerEvents="none" style={styles.activeTabNotch} />}
                <NeuView
                  radius={16}
                  isDark={settings.theme === 'dark'}
                  backgroundColor={activeTabId === trashTab.id ? darkenColor(trashTab.color) : trashTab.color}
                  style={{ width: 32, height: 80, overflow: 'hidden' }}
                >
                  {!!resolveImageUrl(trashTab.backgroundImageUrl) && (
                    <Image
                      source={{ uri: resolveImageUrl(trashTab.backgroundImageUrl) }}
                      style={[StyleSheet.absoluteFill, activeTabId === trashTab.id && { opacity: 0.55 }]}
                      resizeMode="cover"
                    />
                  )}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setActiveTabId(trashTab.id)}
                    onLongPress={() => { setEditingTab(trashTab); setShowTabModal(true); }}
                  >
                    <View style={styles.tabPillLabelWrapper}>
                      <Text
                        style={[styles.tabPillLabelText, { color: trashTab.textColor || '#FFFFFF' }, activeTabId === trashTab.id && styles.tabPillLabelTextActive]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.5}
                      >
                        {trashTab.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </NeuView>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.mainContentArea}>
          {isListView ? (
            <FlatList
              key={`list-${settings.viewMode}`}
              style={{ flex: 1 }}
              data={baseNotes}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={renderListItem}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No notes yet. Create one to get started!</Text>
                </View>
              }
            />
          ) : baseNotes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No notes yet. Create one to get started!</Text>
            </View>
          ) : (
            // Grid view — notes are positioned explicitly (rather than via
            // FlatList's numColumns, which only supports uniform cell sizes)
            // so a note with colSpan/rowSpan > 1 can occupy a rectangle of
            // cells instead of exactly one. See layoutNotesGrid above.
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
              <View
                style={{
                  position: 'relative',
                  width: '100%',
                  height: gridLayout!.totalRows * (cardSize + GRID_GAP) - GRID_GAP,
                }}
              >
                {gridLayout!.placements.map(({ note, row, col, colSpan, rowSpan }) => {
                  const width = cardSize * colSpan + GRID_GAP * (colSpan - 1);
                  const height = cardSize * rowSpan + GRID_GAP * (rowSpan - 1);
                  return (
                    <View
                      key={note.id}
                      style={{
                        position: 'absolute',
                        left: col * (cardSize + GRID_GAP),
                        top: row * (cardSize + GRID_GAP),
                        width,
                        height,
                      }}
                    >
                      <NoteCard
                        note={note}
                        onEdit={() => (isLockedNote(note) ? openReadOnly(note) : editNote(note))}
                        onDelete={() => deleteNote(note.id)}
                        onLongPress={() => (isLockedNote(note) ? openReadOnly(note) : openViewOnlyModal(note))}
                        cardWidth={width}
                        cardHeight={height}
                        hasScreenBackgroundImage={hasScreenBackgroundImage}
                        isDark={settings.theme === 'dark'}
                      />
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </View>

      <TabModal
        visible={showTabModal}
        editing={editingTab}
        tabs={tabs}
        onSave={saveTab}
        onDelete={(id) => { if (id) deleteTab(id); }}
        onCancel={() => setShowTabModal(false)}
        isDark={settings.theme === 'dark'}
      />

      <ReadOnlyModal
        visible={showReadOnlyModal}
        note={readOnlyNote}
        isDark={settings.theme === 'dark'}
        onClose={() => { setShowReadOnlyModal(false); setReadOnlyNote(null); }}
        onDeleteForever={readOnlyNote ? () => {
          const note = readOnlyNote;
          setShowReadOnlyModal(false);
          setReadOnlyNote(null);
          handleSwipeAction(note, 'left');
        } : undefined}
        onRestore={readOnlyNote ? () => {
          const note = readOnlyNote;
          setShowReadOnlyModal(false);
          setReadOnlyNote(null);
          handleSwipeAction(note, 'right');
        } : undefined}
      />

      <NoteModal
        visible={showModal}
        tabName={noteModalTabName}
        noteId={editingNote?.id}
        isDark={settings.theme === 'dark'}
        contentType={newNoteContentType}
        onContentTypeChange={setNewNoteContentType}
        content={newNoteContent}
        onContentChange={setNewNoteContent}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
        selectedTextColor={selectedTextColor}
        onTextColorChange={setSelectedTextColor}
        selectedFont={selectedFont}
        onFontChange={setSelectedFont}
        selectedFontSize={selectedFontSize}
        onFontSizeChange={setSelectedFontSize}
        selectedTextStyle={selectedTextStyle}
        onTextStyleChange={setSelectedTextStyle}
        useSvgBackground={useSvgBackground}
        onUseSvgBackgroundChange={(value: boolean) => {
          setUseSvgBackground(value);
          setSvgFrameId(value ? getRandomFrameId() : undefined);
        }}
        svgFrameId={svgFrameId}
        onSvgFrameIdChange={setSvgFrameId}
        backgroundImageUrl={backgroundImageUrl}
        onBackgroundImageUrlChange={setBackgroundImageUrl}
        selectedMargins={selectedMargins}
        onMarginsChange={setSelectedMargins}
        selectedItemSpacing={selectedItemSpacing}
        onItemSpacingChange={setSelectedItemSpacing}
        selectedLineSpacing={selectedLineSpacing}
        onLineSpacingChange={setSelectedLineSpacing}
        selectedChecklistSort={selectedChecklistSort}
        onChecklistSortChange={setSelectedChecklistSort}
        selectedChecklistTextMode={selectedChecklistTextMode}
        onChecklistTextModeChange={setSelectedChecklistTextMode}
        selectedColSpan={selectedColSpan}
        onColSpanChange={setSelectedColSpan}
        selectedRowSpan={selectedRowSpan}
        onRowSpanChange={setSelectedRowSpan}
        maxColSpan={settings.gridColumns}
        tabs={tabs}
        selectedTabId={selectedTabId}
        onTabIdChange={setSelectedTabId}
        stickieStyles={settings.stickieStyles}
        onSaveAsStickieStyle={handleSaveNoteStyleAsStickieStyle}
        restoreChecklistState={settings.restoreChecklistState}
        checklistSnapshot={checklistSnapshot}
        onChecklistSnapshotChange={setChecklistSnapshot}
        showDiscardConfirmation={settings.showDiscardConfirmation}
        onDisableDiscardConfirmation={() => updateSettings({ showDiscardConfirmation: false })}
        onSave={saveNote}
        onCancel={() => setShowModal(false)}
        onSwipeDelete={editingNote ? () => {
          const note = editingNote;
          setShowModal(false);
          handleSwipeAction(note, 'left');
        } : undefined}
        onSwipeArchive={editingNote ? () => {
          const note = editingNote;
          setShowModal(false);
          handleSwipeAction(note, 'right');
        } : undefined}
      />

      {/* View Only — long-press any note card. Renders the note exactly as
          saved (color/font/SVG frame) with no editing controls; closes via
          the ✕, or via a swipe left/right to trash/archive. */}
      <NoteModal
        visible={showViewOnlyModal}
        tabName={viewOnlyTabName}
        noteId={viewOnlyNote?.id}
        isDark={settings.theme === 'dark'}
        contentType={viewOnlyNote?.contentType || 'text'}
        onContentTypeChange={() => {}}
        content={viewOnlyNote?.content ?? ''}
        onContentChange={handleViewOnlyContentChange}
        selectedColor={viewOnlyNote?.color || COLORS[0]}
        onColorChange={() => {}}
        selectedTextColor={viewOnlyNote?.textColor || TEXT_COLORS[0]}
        onTextColorChange={() => {}}
        selectedFont={viewOnlyNote?.fontFamily || FONTS[0].value}
        onFontChange={() => {}}
        selectedFontSize={viewOnlyNote?.fontSize || 16}
        onFontSizeChange={() => {}}
        selectedTextStyle={viewOnlyNote?.textStyle || 'normal'}
        onTextStyleChange={() => {}}
        useSvgBackground={viewOnlyNote?.useSvgBackground || false}
        onUseSvgBackgroundChange={() => {}}
        svgFrameId={viewOnlyNote?.svgFrameId}
        backgroundImageUrl={viewOnlyNote?.backgroundImageUrl}
        onBackgroundImageUrlChange={() => {}}
        selectedMargins={viewOnlyNote?.margins || DEFAULT_MARGINS}
        onMarginsChange={() => {}}
        selectedItemSpacing={viewOnlyNote?.itemSpacing || DEFAULT_ITEM_SPACING}
        onItemSpacingChange={() => {}}
        selectedLineSpacing={viewOnlyNote?.lineSpacing ?? DEFAULT_LINE_SPACING}
        onLineSpacingChange={() => {}}
        selectedChecklistSort={viewOnlyNote?.checklistSort || 'as-is'}
        onChecklistSortChange={() => {}}
        selectedChecklistTextMode={viewOnlyNote?.checklistTextMode || 'single'}
        onChecklistTextModeChange={() => {}}
        restoreChecklistState={settings.restoreChecklistState}
        checklistSnapshot={viewOnlyNote?.checklistSnapshot}
        onSave={() => {}}
        onCancel={closeViewOnlyModal}
        showDiscardConfirmation={false}
        onDisableDiscardConfirmation={() => {}}
        viewOnly
        onSwipeDelete={viewOnlyNote ? () => {
          const note = viewOnlyNote;
          closeViewOnlyModal();
          handleSwipeAction(note, 'left');
        } : undefined}
        onSwipeArchive={viewOnlyNote ? () => {
          const note = viewOnlyNote;
          closeViewOnlyModal();
          handleSwipeAction(note, 'right');
        } : undefined}
      />

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        notes={notes}
        tabs={tabs}
        onImportNotes={(importedNotes, importedTabs) => {
          // Any custom (non built-in) tab from the backup that doesn't
          // already exist locally (matched by id) gets added as-is —
          // built-in tabs (all/general/archived/trash) always exist
          // already, so they're never (re)created here.
          const existingTabIds = new Set(tabs.map(t => t.id));
          const newTabs = importedTabs.filter(t => !isBuiltInTabId(t.id) && !existingTabIds.has(t.id));

          setTabs(prev => {
            // For a tab that already exists locally (including built-ins
            // like General), only fill in styling fields that are
            // currently unset — an existing customization is never
            // overwritten by the import.
            const merged = prev.map(t => {
              const imported = importedTabs.find(it => it.id === t.id);
              if (!imported) return t;
              return {
                ...t,
                color: t.color || imported.color,
                textColor: t.textColor || imported.textColor,
                backgroundImageUrl: t.backgroundImageUrl || imported.backgroundImageUrl,
                screenBackgroundImageUrl: t.screenBackgroundImageUrl || imported.screenBackgroundImageUrl,
              };
            });
            return [...merged, ...newTabs];
          });

          // Every tab id a note could validly belong to after the merge
          // above (existing tabs + any brand-new custom ones just added).
          const validTabIds = new Set([...tabs.map(t => t.id), ...newTabs.map(t => t.id)]);

          setNotes(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newOnes = importedNotes
              .filter(n => !existingIds.has(n.id))
              .map(n => {
                // "All" is a virtual aggregator, not a real tab a note can
                // live in — and any tabId that doesn't resolve to a tab we
                // actually have (missing entirely, from an older
                // notes-only export, or referencing a tab absent from this
                // particular backup) falls back to General instead.
                const tabId = n.tabId && n.tabId !== 'all' && validTabIds.has(n.tabId) ? n.tabId : 'general';
                return { ...n, tabId };
              });
            return [...prev, ...newOnes];
          });
        }}
      />

      {/* Positioning lives on this plain wrapper, not on NeuPressable itself —
          NeuPressable only forwards `style` to its inner NeuView, never to
          the outer Pressable that actually receives touches (see the same
          note in TabModal.tsx/StickieStyleNameModal.tsx). Previously the
          position:absolute/bottom/right/width/height were passed straight
          into NeuPressable's `style`, which could visually render the "+"
          in the bottom-right corner while the real touchable Pressable sat
          in a different, zero/mismatched-size box — reliably tappable in
          the emulator's layout rounding, but missed on physical devices.
          bottom adds insets.bottom (the same hook already used for the
          header's top padding) on top of the usual 32px gap — on Android
          that's the on-screen nav bar's real height when the 3-button bar
          is showing, a smaller value under gesture navigation, and 0 when
          there's no nav bar to avoid at all; iOS gets its home-indicator
          inset the same way. */}
      {/* Hidden entirely in Archived/Trash — creating a note there was
          already blocked (see createNewNote's Alert guards above), but
          showing a "+" that just pops an alert when tapped is worse than
          not showing one at all. createNewNote's own guards stay in place
          as a defensive fallback (e.g. a stale activeTabId at the instant
          of a tab switch), they just shouldn't normally be reachable now. */}
      {activeTabId !== 'archived' && activeTabId !== 'trash' && (
        <View style={{ position: 'absolute', bottom: 32 + insets.bottom, right: 32 }}>
          <NeuPressable
            radius={28}
            isDark={settings.theme === 'dark'}
            style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}
            onPress={createNewNote}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.fabText}>+</Text>
          </NeuPressable>
        </View>
      )}

      <Toast
        visible={toast.visible}
        message={toast.message}
        onUndo={toast.onUndo}
        onHide={hideToast}
        isDark={settings.theme === 'dark'}
      />
    </SafeAreaView>
    </View>
  );
};

export default MainScreen;