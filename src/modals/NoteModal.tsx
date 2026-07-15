import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ChecklistItem, ContentType, TextStyle, NoteMargins, DEFAULT_MARGINS, ItemSpacing, ChecklistSort, ChecklistTextMode, DEFAULT_COL_SPAN, DEFAULT_ROW_SPAN, MAX_NOTE_ROW_SPAN } from '../types';
import { COLORS, TEXT_COLORS, FONTS } from '../constants';
import { FRAME_COMPONENTS } from '../frames';
import SwipeToAction from '../components/SwipeToAction';
import { resolveImageUrl } from '../utils/googleDriveImage';
import { NeuView, NeuPressable } from '../components/Neumorphic';
import NeuColorPickerModal from '../components/NeuColorPickerModal';
import CheckboxIcon from '../components/CheckboxIcon';
import { resolveFontStyle } from '../utils/fontResolver';
import { NEU_RADIUS, NEU_ACCENT, NEU_DANGER, getNeuPalette } from '../theme/neumorphic';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.5;
const STYLING_BAR_HEIGHT = Math.round(SCREEN_HEIGHT * 0.285);
const MODAL_WIDTH = 320;
const CARD_HORIZONTAL_PADDING = 24;
const CHECKBOX_SIZE = 26;
const ROW_GAP = 14;
const BRUSH_HEIGHT = 24;
const AVAILABLE_TEXT_ROW_WIDTH =
  MODAL_WIDTH - CARD_HORIZONTAL_PADDING * 2 - CHECKBOX_SIZE - ROW_GAP;
const MINI_SWATCH = 22;
const MINI_GAP = 6;

const BRUSH_STROKE_COLOR = '#E7C4B2';

// CheckboxIcon now lives in ../components/CheckboxIcon (imported above) so
// it can be reused by StickieStylePreviewCard without duplicating the SVG
// markup. Its default size (26) matches this file's CHECKBOX_SIZE, so every
// existing `<CheckboxIcon checked={...} />` call site below is unchanged.

// ── Brush stroke ───────────────────────────────────────────────────────────────

function smoothClosedPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} `;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)} `;
  }
  return `${d}Z`;
}

function generateBrushStrokePath(seed: number, w: number, h: number): string {
  const top: { x: number; y: number }[] = [];
  const bot: { x: number; y: number }[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const x = t * w;
    const taper = Math.pow(Math.sin(t * Math.PI), 0.5);
    const wobble = Math.sin(t * 6 + seed) * (h * 0.12) + Math.sin(t * 13 + seed * 2.1) * (h * 0.05);
    const half = h * 0.42 * (0.55 + 0.45 * taper);
    top.push({ x, y: h / 2 - half + wobble });
    bot.push({ x, y: h / 2 + half + wobble });
  }
  return smoothClosedPath([...top, ...bot.reverse()]);
}

const BRUSH_VARIANTS = [0.5, 2.0, 3.3, 4.7, 6.1].map((seed, i) => {
  const w = Math.round(AVAILABLE_TEXT_ROW_WIDTH * [0.95, 0.72, 0.93, 0.88, 0.65][i]);
  return { w, h: BRUSH_HEIGHT, path: generateBrushStrokePath(seed, w, BRUSH_HEIGHT) };
});

const BrushStroke: React.FC<{ index: number }> = ({ index }) => {
  const v = BRUSH_VARIANTS[index % BRUSH_VARIANTS.length];
  return (
    <View style={clStyles.brushWrap} pointerEvents="none">
      <Svg width={v.w} height={v.h} viewBox={`0 0 ${v.w} ${v.h}`}>
        <Path d={v.path} fill={BRUSH_STROKE_COLOR} opacity={0.65} />
      </Svg>
    </View>
  );
};

// ── Props ──────────────────────────────────────────────────────────────────────

type NoteModalProps = {
  visible: boolean;
  tabName: string;
  // Follows the app's Theme setting for all chrome outside the note's own
  // colored card — the styling bar, footer, discard dialog, etc. The note
  // card itself keeps rendering in the note's own chosen color regardless
  // of this, same as NoteCard/StickieStylePreviewCard already do — only
  // the surrounding app UI was previously stuck always-light.
  isDark?: boolean;
  contentType: ContentType;
  onContentTypeChange: (type: ContentType) => void;
  content: string | ChecklistItem[];
  onContentChange: (content: string | ChecklistItem[]) => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  selectedTextColor: string;
  onTextColorChange: (color: string) => void;
  selectedFont: string;
  onFontChange: (font: string) => void;
  selectedFontSize: number;
  onFontSizeChange: (size: number) => void;
  selectedTextStyle: TextStyle;
  onTextStyleChange: (style: TextStyle) => void;
  useSvgBackground: boolean;
  onUseSvgBackgroundChange: (value: boolean) => void;
  svgFrameId?: string;
  // Public image URL (or Google Drive share link) used as the note's
  // background. Loses to useSvgBackground when both are set — same
  // mutual-exclusivity the styling bar's swatch grid already enforces
  // against useSvgBackground.
  backgroundImageUrl?: string;
  onBackgroundImageUrlChange?: (url: string) => void;
  selectedMargins: NoteMargins;
  onMarginsChange: (margins: NoteMargins) => void;
  selectedItemSpacing: ItemSpacing;
  onItemSpacingChange: (spacing: ItemSpacing) => void;
  selectedLineSpacing: number;
  onLineSpacingChange: (spacing: number) => void;
  selectedChecklistSort: ChecklistSort;
  onChecklistSortChange: (sort: ChecklistSort) => void;
  selectedChecklistTextMode: ChecklistTextMode;
  onChecklistTextModeChange: (mode: ChecklistTextMode) => void;
  // How many grid columns/rows this note occupies in the main grid. Optional
  // (default 1/1/3) since a StickieStyle template (styleEditorMode) has no
  // grid position of its own — the Grid Size control is hidden in that mode,
  // so those callers never need to pass these.
  selectedColSpan?: number;
  onColSpanChange?: (span: number) => void;
  selectedRowSpan?: number;
  onRowSpanChange?: (span: number) => void;
  // Max column span allowed — pass the current settings.gridColumns (2 or 3).
  maxColSpan?: number;
  // When true (default), converting the note away from checklist and back
  // remembers and restores the previous items' checked state and order
  // instead of rebuilding a fresh, all-unchecked list from the text.
  restoreChecklistState?: boolean;
  // Last-known checklist state for this note, owned by the parent so it
  // survives closing/reopening the modal (and gets persisted with the note).
  checklistSnapshot?: ChecklistItem[];
  onChecklistSnapshotChange?: (items: ChecklistItem[]) => void;
  onSave: () => void;
  onCancel: () => void;
  showDiscardConfirmation: boolean;
  onDisableDiscardConfirmation: () => void;
  previewMode?: boolean;
  initialShowStyling?: boolean;
  // Read-only presentation: keeps the note's real styling/frame/colors but
  // strips all editing affordances — no styling ('v') toggle, no footer
  // buttons. Closed only via the ✕ in the top-right corner (calls onCancel).
  viewOnly?: boolean;
  // When true, the modal behaves as a style-only editor: content is
  // read-only, the Styling bar is force-opened and can't be closed
  // independently, and the footer shows Confirm/Cancel instead of the
  // normal Save/Cancel (or the hidden footer used by viewOnly).
  styleEditorMode?: boolean;
  // Called when Confirm is tapped in styleEditorMode. Falls back to onSave
  // if not provided.
  onConfirmStyle?: () => void;
  // Swipe-to-action — only wired up when the caller actually has a real,
  // already-saved note to act on (undefined disables swipe silently).
  onSwipeDelete?: () => void;
  onSwipeArchive?: () => void;
};

// ── Snapshot type ──────────────────────────────────────────────────────────────

interface StylingSnapshot {
  contentType: ContentType;
  content: string | ChecklistItem[];
  selectedColor: string;
  selectedTextColor: string;
  selectedFont: string;
  selectedFontSize: number;
  selectedTextStyle: TextStyle;
  useSvgBackground: boolean;
  backgroundImageUrl: string | undefined;
  selectedMargins: NoteMargins;
  selectedItemSpacing: ItemSpacing;
  selectedLineSpacing: number;
  selectedChecklistSort: ChecklistSort;
  selectedChecklistTextMode: ChecklistTextMode;
  selectedColSpan: number;
  selectedRowSpan: number;
  checklistSnapshot: ChecklistItem[] | undefined;
}

// ── Component ──────────────────────────────────────────────────────────────────

const NoteModal = ({
  visible, tabName,
  isDark = false,
  contentType, onContentTypeChange,
  content, onContentChange,
  selectedColor, onColorChange,
  selectedTextColor, onTextColorChange,
  selectedFont, onFontChange,
  selectedFontSize, onFontSizeChange,
  selectedTextStyle, onTextStyleChange,
  useSvgBackground, onUseSvgBackgroundChange,
  svgFrameId,
  backgroundImageUrl, onBackgroundImageUrlChange,
  selectedMargins, onMarginsChange,
  selectedItemSpacing, onItemSpacingChange,
  selectedLineSpacing, onLineSpacingChange,
  selectedChecklistSort, onChecklistSortChange,
  selectedChecklistTextMode, onChecklistTextModeChange,
  selectedColSpan = DEFAULT_COL_SPAN,
  onColSpanChange = () => {},
  selectedRowSpan = DEFAULT_ROW_SPAN,
  onRowSpanChange = () => {},
  maxColSpan = 3,
  restoreChecklistState = true,
  checklistSnapshot,
  onChecklistSnapshotChange,
  onSave, onCancel,
  showDiscardConfirmation, onDisableDiscardConfirmation,
  previewMode = false,
  initialShowStyling = false,
  viewOnly = false,
  styleEditorMode = false,
  onConfirmStyle,
  onSwipeDelete,
  onSwipeArchive,
}: NoteModalProps) => {
  const [showStyling, setShowStyling] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [stylingSnapshot, setStylingSnapshot] = useState<StylingSnapshot | null>(null);
  // Tracks which checklist item (if any) currently has keyboard focus. While an item
  // is focused we freeze *that item's own* sort key (its text/completed value at the
  // moment it gained focus) so it doesn't jump position mid-keystroke — every other
  // item still re-sorts live against the current selectedChecklistSort. Previously
  // this disabled sorting for the *entire* list while any item was focused, which
  // made changing the Order setting look broken any time your cursor was in a field.
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const editingSnapshotRef = useRef<ChecklistItem | null>(null);
  // Tracked so swipe-to-delete/archive only engages once the keyboard is
  // dismissed — otherwise a horizontal drag on the text input would fight
  // with cursor placement / text selection.
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  // Drives the dot pagination indicator under the styling bar's horizontal
  // scroll strip — tracked as raw pixel measurements rather than a 0-1
  // fraction so the active-dot math only has to run once, in the render
  // below, instead of on every scroll event.
  const [barScrollX, setBarScrollX] = useState(0);
  const [barViewportWidth, setBarViewportWidth] = useState(0);
  const [barContentWidth, setBarContentWidth] = useState(0);
  // Which swatchGrid's "custom color" tile opened NeuColorPickerModal —
  // null when closed. Lets Background and Font Color share one picker
  // instance instead of two.
  const [colorPickerTarget, setColorPickerTarget] = useState<'background' | 'font' | null>(null);

  // Mirrors the checklistSnapshot prop into a ref so the type-conversion
  // effect below can read/update it synchronously without needing to be a
  // dependency (it only needs the freshest value, not to re-run on change).
  const checklistSnapshotRef = useRef<ChecklistItem[] | undefined>(checklistSnapshot);
  useEffect(() => {
    if (visible) checklistSnapshotRef.current = checklistSnapshot;
  }, [visible]);

  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const scrollRef = useRef<ScrollView | null>(null);
  const enterPressedRef = useRef(false);
  // Tracks whether an empty checklist item has already seen one Backspace press —
  // a second consecutive Backspace on a still-empty item deletes it.
  const backspacePendingRef = useRef<{ [id: string]: boolean }>({});

  const p = getNeuPalette(isDark);

  // Read-only note content is presented the same way as previewMode's
  // (non-editable) rendering — this just extends that same rendering path.
  const isReadOnlyContent = previewMode || viewOnly || styleEditorMode;

  // Swipe is enabled in View Only always, and in the normal editor only once
  // the styling bar is closed and the keyboard is down — i.e. exactly the
  // "just looking at the note" state.
  const swipeEnabled = !previewMode && (viewOnly || (!showStyling && !isKeyboardVisible));

  const items: ChecklistItem[] = Array.isArray(content) ? (content as ChecklistItem[]) : [];

  const FrameComponent = useSvgBackground && svgFrameId ? FRAME_COMPONENTS[svgFrameId] : null;
  // SVG frame wins if both happen to be set (matches the swatch-grid
  // disabling logic in the styling bar below).
  const resolvedBgImageUrl = !FrameComponent ? resolveImageUrl(backgroundImageUrl) : undefined;

  // Reset styling bar when modal closes
  useEffect(() => {
    if (!visible) {
      setShowStyling(false);
      setStylingSnapshot(null);
      setEditingItemId(null);
      editingSnapshotRef.current = null;
    }
  }, [visible]);

  // If used as a preview, optionally open the styling bar immediately
  useEffect(() => {
    if (visible && initialShowStyling && !viewOnly) setShowStyling(true);
  }, [visible, initialShowStyling, viewOnly]);

  // In style-editor mode the Styling bar is always visible — content is
  // read-only underneath it, and the note-level Confirm/Cancel buttons are
  // the only way out (there's no separate open/close step like the normal
  // 'v'/'✓' toggle).
  useEffect(() => {
    if (visible && styleEditorMode) setShowStyling(true);
  }, [visible, styleEditorMode]);

  // The styling bar and the keyboard should never be on screen together —
  // dismiss the keyboard any time the styling bar is opened. Also belt-and-
  // suspenders clear the focus-freeze lock (mirrors openStyling below).
  useEffect(() => {
    if (showStyling) {
      Keyboard.dismiss();
      setEditingItemId(null);
      editingSnapshotRef.current = null;
    }
  }, [showStyling]);

  // Track keyboard visibility for the swipe-enabled gate above.
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Convert content when type changes
  useEffect(() => {
    if (contentType === 'checklist' && !Array.isArray(content)) {
      const lines = (content as string).split('\n');
      const snapshot = restoreChecklistState ? checklistSnapshotRef.current : undefined;

      if (snapshot && snapshot.length > 0) {
        // Reconcile the typed text against the last-known checklist state:
        // any line whose text still matches a snapshot item gets that
        // item's id and completed status back (so it stays checked), in
        // whatever order the lines currently appear — which is unchanged
        // from the snapshot's own order if nothing was edited in between.
        // Lines with no match (new/edited text) become fresh unchecked items.
        const [titleLine, ...itemLines] = lines;
        const snapshotTitle = snapshot[0];
        const snapshotItems = snapshot.slice(1);
        const usedIds = new Set<string>();

        const takeMatch = (text: string): ChecklistItem | undefined => {
          const match = snapshotItems.find(it => !usedIds.has(it.id) && it.text === text);
          if (match) usedIds.add(match.id);
          return match;
        };

        const titleItem: ChecklistItem = snapshotTitle && snapshotTitle.text === (titleLine ?? '')
          ? { ...snapshotTitle, text: titleLine ?? '' }
          : { id: `${Date.now()}`, text: titleLine ?? '', completed: false };

        const restoredItems: ChecklistItem[] = itemLines.map((line, i) => {
          const match = takeMatch(line);
          return match ? { ...match, text: line } : { id: `${Date.now() + i + 1}`, text: line, completed: false };
        });

        onContentChange([titleItem, ...restoredItems]);
      } else {
        const converted: ChecklistItem[] = lines.map((line, i) => ({
          id: (Date.now() + i).toString(),
          text: line,
          completed: false,
        }));
        onContentChange(converted.length > 0 ? converted : [{ id: Date.now().toString(), text: '', completed: false }]);
      }
    } else if (contentType === 'text' && Array.isArray(content)) {
      const allItems = content as ChecklistItem[];
      // Remember the full checklist state (order + checked status) before
      // flattening to plain text, so switching back to checklist later —
      // even after saving and reopening the note — can restore it instead
      // of starting over.
      checklistSnapshotRef.current = allItems;
      onChecklistSnapshotChange?.(allItems);

      const title = allItems[0];
      const sorted = sortItems(allItems.slice(1));
      const ordered = title ? [title, ...sorted] : sorted;
      const lines = ordered.map(item => item.text).filter(t => t.trim());
      onContentChange(lines.join('\n'));
    }
  }, [contentType]);

  // ── Checklist helpers ────────────────────────────────────────────────────────

  const addItemAfter = (id: string) => {
    const newItem: ChecklistItem = { id: Date.now().toString(), text: '', completed: false };
    const next = [...items];
    const idx = next.findIndex(i => i.id === id);
    if (idx >= 0) next.splice(idx + 1, 0, newItem); else next.push(newItem);
    onContentChange(next);
    // Just focus the new item — RN's ScrollView already auto-scrolls just
    // enough to bring a newly-focused TextInput into view above the
    // keyboard. A forced scrollToEnd() here used to yank the view all the
    // way to the bottom of the list even when the new item was created in
    // the middle (e.g. pressing Enter on item #2 of a 20-item list).
    setTimeout(() => {
      inputRefs.current[newItem.id]?.focus();
    }, 60);
  };

  const updateItem = (id: string, text: string) =>
    onContentChange(items.map(i => i.id === id ? { ...i, text } : i));

  const toggleItem = (id: string) =>
    onContentChange(items.map(i => i.id === id ? { ...i, completed: !i.completed } : i));

  // Deletes a checklist item (called on the second consecutive Backspace press
  // while the item is empty) and moves focus to the previous visible item.
  const deleteItem = (id: string) => {
    const displayList = [items[0], ...sortItems(items.slice(1))].filter(Boolean) as ChecklistItem[];
    const idx = displayList.findIndex(i => i.id === id);
    const prevItem = idx > 0 ? displayList[idx - 1] : null;

    delete backspacePendingRef.current[id];
    onContentChange(items.filter(i => i.id !== id));

    if (prevItem) {
      setTimeout(() => {
        inputRefs.current[prevItem.id]?.focus();
      }, 60);
    }
  };

  const sortItems = (list: ChecklistItem[]): ChecklistItem[] => {
    // For the item currently being typed into, use the values it had at the
    // moment it gained focus (rather than its live, changing text/completed)
    // so its own position holds still while the user is mid-keystroke.
    const sortKeyOf = (it: ChecklistItem): ChecklistItem => {
      if (editingItemId && it.id === editingItemId && editingSnapshotRef.current?.id === it.id) {
        return editingSnapshotRef.current;
      }
      return it;
    };
    if (selectedChecklistSort === 'unchecked-first')
      return [...list].sort((a, b) => Number(sortKeyOf(a).completed) - Number(sortKeyOf(b).completed));
    if (selectedChecklistSort === 'alphabetical')
      return [...list].sort((a, b) => sortKeyOf(a).text.localeCompare(sortKeyOf(b).text));
    return list;
  };

  // The list actually rendered. Sorting is always applied — the currently
  // focused item (if any) just holds its position via the frozen sort key
  // above instead of the whole list falling back to insertion order.
  const displayedChecklistItems: ChecklistItem[] = (
    [items[0], ...sortItems(items.slice(1))]
  ).filter(Boolean) as ChecklistItem[];

  // ── Text style ───────────────────────────────────────────────────────────────

  const getTextStyle = (): any => {
    return {
      ...resolveFontStyle(selectedFont, selectedTextStyle),
      color: selectedTextColor,
      fontSize: selectedFontSize,
      lineHeight: selectedFontSize + selectedLineSpacing,
    };
  };

  // Called when ✕ is tapped — shows custom confirm or discards immediately
  const handleXPress = () => {
    if (!showDiscardConfirmation) {
      discardStyling();
      return;
    }
    setDontShowAgain(false);
    setShowDiscardConfirm(true);
  };

  const handleConfirmDiscard = () => {
    if (dontShowAgain) onDisableDiscardConfirmation();
    setShowDiscardConfirm(false);
    discardStyling();
  };

  const openStyling = () => {
    Keyboard.dismiss();
    setEditingItemId(null);
    setBarScrollX(0);
    setStylingSnapshot({
      contentType, content,
      selectedColor, selectedTextColor, selectedFont, selectedFontSize,
      selectedTextStyle, useSvgBackground, backgroundImageUrl, selectedMargins, selectedItemSpacing, selectedLineSpacing, selectedChecklistSort,
      selectedChecklistTextMode,
      selectedColSpan, selectedRowSpan,
      checklistSnapshot: checklistSnapshotRef.current,
    });
    setShowStyling(true);
  };

  const saveStyling = () => {
    setStylingSnapshot(null);
    setShowStyling(false);
  };

  const discardStyling = () => {
    if (stylingSnapshot) {
      // Batch all restores in the same event handler so useEffect sees consistent state
      onContentTypeChange(stylingSnapshot.contentType);
      onContentChange(stylingSnapshot.content);
      onColorChange(stylingSnapshot.selectedColor);
      onTextColorChange(stylingSnapshot.selectedTextColor);
      onFontChange(stylingSnapshot.selectedFont);
      onFontSizeChange(stylingSnapshot.selectedFontSize);
      onTextStyleChange(stylingSnapshot.selectedTextStyle);
      onUseSvgBackgroundChange(stylingSnapshot.useSvgBackground);
      onBackgroundImageUrlChange?.(stylingSnapshot.backgroundImageUrl || '');
      onMarginsChange(stylingSnapshot.selectedMargins);
      onItemSpacingChange(stylingSnapshot.selectedItemSpacing);
      onLineSpacingChange(stylingSnapshot.selectedLineSpacing);
      onChecklistSortChange(stylingSnapshot.selectedChecklistSort);
      onChecklistTextModeChange(stylingSnapshot.selectedChecklistTextMode);
      onColSpanChange(stylingSnapshot.selectedColSpan);
      onRowSpanChange(stylingSnapshot.selectedRowSpan);
      checklistSnapshotRef.current = stylingSnapshot.checklistSnapshot;
      if (stylingSnapshot.checklistSnapshot) onChecklistSnapshotChange?.(stylingSnapshot.checklistSnapshot);
    }
    setStylingSnapshot(null);
    setShowStyling(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => {}}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
        style={{ flex: 1 }}
      >
        {/* Screen-level swipe — enabled any time the modal is open with no
            keyboard and no styling bar showing (see swipeEnabled above), so
            swiping to trash/archive works from anywhere on screen, not just
            over the note's content area. */}
        <SwipeToAction enabled={swipeEnabled} onSwipeLeft={onSwipeDelete} onSwipeRight={onSwipeArchive}>

        {/* Semi-transparent backdrop — no longer dismisses on tap; the modal
            is only closed via the footer's Confirm/Cancel (or the ✕ in
            viewOnly mode). The Pressable still absorbs touches so they don't
            fall through to whatever is behind the modal. */}
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={() => {}} />

        {/* Note card — 50% height; when styling open, centers within the top 3/4 above the bar */}
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: showStyling ? STYLING_BAR_HEIGHT : 0 }}
          pointerEvents="box-none"
        >
          <NeuView isDark={isDark}
            radius={28}
            backgroundColor={(FrameComponent || resolvedBgImageUrl) ? 'transparent' : selectedColor}
            style={[s.card, { height: MODAL_HEIGHT }]}
            noShadow
          >
            {/* SVG frame background */}
            {FrameComponent && (
              <>
                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
                  <FrameComponent size={MODAL_WIDTH} />
                </View>
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.28)' }]} pointerEvents="none" />
              </>
            )}

            {/* Image background — only rendered when there's no SVG frame */}
            {resolvedBgImageUrl && (
              <>
                <Image
                  source={{ uri: resolvedBgImageUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.15)' }]} pointerEvents="none" />
              </>
            )}

            {/* Header */}
            <View style={s.topToolbar}>
              <Text style={s.headerLabel} numberOfLines={1}>{tabName}</Text>
              {viewOnly ? (
                <TouchableOpacity
                  onPress={onCancel}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={s.closeIconX}>✕</Text>
                </TouchableOpacity>
              ) : styleEditorMode ? null : showStyling ? (
                <View style={{ width: 24 }} />
              ) : (
                <TouchableOpacity
                  onPress={openStyling}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={s.arrowIconV}>v</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={s.dividerLine} />

            {/* Content area — locked from touches while the styling bar is open so
                tapping a text field underneath can't bring the keyboard back up.
                Swipe-to-action is applied at the screen level (see the
                SwipeToAction wrapper around the whole modal below), so
                swiping works anywhere on screen, not just over this area. */}
            <View style={{ flex: 1, position: 'relative' }} pointerEvents={showStyling ? 'none' : 'auto'}>
                {contentType === 'checklist' ? (
                <ScrollView
                  ref={scrollRef}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingTop: 10 + selectedMargins.top, paddingBottom: 10 + selectedMargins.bottom, paddingLeft: selectedMargins.left, paddingRight: selectedMargins.right }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {displayedChecklistItems.map((item, index) => {
                    if (isReadOnlyContent) {
                      if (index === 0) {
                        return (
                          <View key={item.id} style={clStyles.titleRow}>
                            <Text style={[clStyles.titleInput, getTextStyle(), { fontSize: Math.max(selectedFontSize + 4, 18) }]}>{item.text}</Text>
                          </View>
                        );
                      }
                      return (
                        <View key={item.id} style={[clStyles.row, { marginTop: selectedItemSpacing.top, marginBottom: selectedItemSpacing.bottom }]}>
                          {viewOnly ? (
                            <TouchableOpacity
                              style={clStyles.checkboxTouch}
                              onPress={() => toggleItem(item.id)}
                              activeOpacity={0.7}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <CheckboxIcon checked={item.completed} />
                            </TouchableOpacity>
                          ) : (
                            <View style={clStyles.checkboxTouch}>
                              <CheckboxIcon checked={item.completed} />
                            </View>
                          )}
                          <View style={clStyles.inputWrap}>
                            {selectedChecklistTextMode === 'single' && <BrushStroke index={index} />}
                            <Text style={[clStyles.input, getTextStyle(), { fontSize: selectedFontSize }, item.completed && clStyles.crossed]}>{item.text}</Text>
                          </View>
                        </View>
                      );
                    }
                    if (index === 0) {
                      return (
                        <View key={item.id} style={clStyles.titleRow}>
                          <TextInput
                            ref={el => { inputRefs.current[item.id] = el; }}
                            style={[clStyles.titleInput, getTextStyle(), { fontSize: Math.max(selectedFontSize + 4, 18) }]}
                            placeholder="Title..."
                            placeholderTextColor="#8E8E93"
                            value={item.text}
                            onChangeText={text => updateItem(item.id, text)}
                            blurOnSubmit={false}
                            onSubmitEditing={() => addItemAfter(item.id)}
                            underlineColorAndroid="transparent"
                          />
                        </View>
                      );
                    }
                    return (
                      <View key={item.id} style={[clStyles.row, { marginTop: selectedItemSpacing.top, marginBottom: selectedItemSpacing.bottom }]}>
                        <TouchableOpacity
                          style={clStyles.checkboxTouch}
                          onPress={() => toggleItem(item.id)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <CheckboxIcon checked={item.completed} />
                        </TouchableOpacity>
                        <View style={clStyles.inputWrap}>
                          {selectedChecklistTextMode === 'single' && <BrushStroke index={index} />}
                          <TextInput
                            ref={el => { inputRefs.current[item.id] = el; }}
                            style={[clStyles.input, getTextStyle(), { fontSize: selectedFontSize }, item.completed && clStyles.crossed]}
                            placeholder="List item..."
                            placeholderTextColor="transparent"
                            value={item.text}
                            onChangeText={text => {
                              // Any real edit cancels a pending "delete on next backspace" state.
                              backspacePendingRef.current[item.id] = false;
                              // Multi-line text can land here two different ways:
                              //   1. The user actually pressed Enter — onKeyPress below
                              //      already set enterPressedRef.current = true just
                              //      before this fires. Intent: split into a new item
                              //      below and move focus there (some platforms don't
                              //      emit onKeyPress for Enter in multiline inputs, so
                              //      this text-based check is still needed as a
                              //      fallback for that case).
                              //   2. The user pasted multi-line text — no Enter
                              //      keypress happened, so enterPressedRef.current is
                              //      still false here. This used to be treated the
                              //      same as #1 (strip newlines + addItemAfter + shift
                              //      focus), which sent the cursor to a brand-new item
                              //      at the bottom instead of just landing the pasted
                              //      text in the item being edited.
                              if (selectedChecklistTextMode === 'wrap' && text.includes('\n')) {
                                const sanitized = text.replace(/\n+/g, '');
                                updateItem(item.id, sanitized);
                                if (enterPressedRef.current) {
                                  // Real Enter press — create the next item and focus it.
                                  addItemAfter(item.id);
                                }
                                // Paste with embedded line breaks — keep it all in the
                                // current item; cursor stays right here.
                                enterPressedRef.current = false;
                                return;
                              }
                              if (enterPressedRef.current) {
                                // Remove any trailing newlines inserted by the Enter key
                                const sanitized = text.replace(/\n+$/, '');
                                updateItem(item.id, sanitized);
                                enterPressedRef.current = false;
                              } else {
                                updateItem(item.id, text);
                              }
                            }}
                            multiline={selectedChecklistTextMode === 'wrap'}
                            blurOnSubmit={false}
                            onFocus={() => {
                              editingSnapshotRef.current = item;
                              setEditingItemId(item.id);
                            }}
                            onBlur={() => {
                              setEditingItemId(prev => (prev === item.id ? null : prev));
                              if (editingSnapshotRef.current?.id === item.id) editingSnapshotRef.current = null;
                            }}
                            onSubmitEditing={() => addItemAfter(item.id)}
                            onKeyPress={({ nativeEvent }) => {
                              if (nativeEvent.key === 'Enter' && selectedChecklistTextMode === 'wrap') {
                                // Only flag that Enter (not a paste) caused the
                                // upcoming newline — onChangeText below is the
                                // single place that actually calls
                                // addItemAfter(). Previously this also called
                                // addItemAfter() directly, so both this handler
                                // and onChangeText's enterPressedRef check fired
                                // for the same keystroke, creating two blank
                                // items instead of one.
                                enterPressedRef.current = true;
                                return;
                              }
                              // Second consecutive Backspace while the item is empty deletes it.
                              if (nativeEvent.key === 'Backspace' && !item.text) {
                                if (backspacePendingRef.current[item.id]) {
                                  deleteItem(item.id);
                                } else {
                                  backspacePendingRef.current[item.id] = true;
                                }
                              }
                            }}
                            underlineColorAndroid="transparent"
                          />
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={{ flex: 1 }}>
                  {!isReadOnlyContent ? (
                    <TextInput
                      style={[s.textInput, getTextStyle(), {
                        paddingTop: 12 + selectedMargins.top,
                        paddingBottom: 12 + selectedMargins.bottom,
                        paddingLeft: selectedMargins.left,
                        paddingRight: selectedMargins.right,
                      }]}
                      placeholder="Start typing your note..."
                      placeholderTextColor="#AEAEB2"
                      multiline
                      value={typeof content === 'string' ? content : ''}
                      onChangeText={onContentChange}
                      textAlignVertical="top"
                      autoFocus={!isReadOnlyContent}
                      underlineColorAndroid="transparent"
                    />
                  ) : (
                    <ScrollView
                      style={{ flex: 1 }}
                      contentContainerStyle={{ paddingTop: 12 + selectedMargins.top, paddingBottom: 12 + selectedMargins.bottom, paddingLeft: selectedMargins.left, paddingRight: selectedMargins.right }}
                      showsVerticalScrollIndicator={false}
                    >
                      <Text style={[getTextStyle(), { color: selectedTextColor }]}>{typeof content === 'string' ? content : ''}</Text>
                    </ScrollView>
                  )}
                </View>
              )}
              </View>

            {/* Footer — hidden entirely in viewOnly mode; closing happens only via the ✕.
                Locked from touches (and visually dimmed) while the styling bar is open,
                so Cancel/Confirm read as inactive without washing out the note content
                underneath. */}
            {!viewOnly && (
              <View pointerEvents={showStyling ? 'none' : 'auto'} style={showStyling ? { opacity: 0.4 } : undefined}>
                <View style={s.dividerLine} />
                {styleEditorMode ? (
                  <View style={s.actionRow}>
                    <TouchableOpacity style={[s.btn, s.btnCancel]} onPress={onCancel} activeOpacity={0.8}>
                      <Text style={s.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.btn, s.btnConfirm]}
                      onPress={onConfirmStyle || onSave}
                      activeOpacity={0.8}
                    >
                      <Text style={s.confirmText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                ) : previewMode ? (
                  <View style={s.actionRow}>
                    <TouchableOpacity style={[s.btn, s.btnCancel]} onPress={onCancel} activeOpacity={0.8}>
                      <Text style={s.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.btn, s.btnConfirm]} onPress={onSave} activeOpacity={0.8}>
                      <Text style={s.confirmText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={s.actionRow}>
                    <TouchableOpacity style={[s.btn, s.btnCancel]} onPress={onCancel} activeOpacity={0.8}>
                      <Text style={s.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.btn, s.btnConfirm]} onPress={onSave} activeOpacity={0.8}>
                      <Text style={s.confirmText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

          </NeuView>
        </View>

        {/* Styling bar — bottom sheet, sibling to the card, inside the same Modal */}
        {showStyling && (
          <>
            <View style={barStyles.bottomSheet}>
              <NeuView isDark={isDark} radius={20} style={{ height: STYLING_BAR_HEIGHT, width: '100%' }}>
              <View style={barStyles.barHeader}>
                {!styleEditorMode ? (
                  <TouchableOpacity onPress={handleXPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={barStyles.barHeaderClose} numberOfLines={1}>Cancel</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={barStyles.barHeaderClose} numberOfLines={1}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <Text style={[barStyles.barHeaderTitle, { color: p.textSecondary }]}>Styling</Text>
                {!styleEditorMode ? (
                  <TouchableOpacity onPress={saveStyling} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={barStyles.barHeaderDone} numberOfLines={1}>Done</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={onConfirmStyle || onSave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={barStyles.barHeaderDone} numberOfLines={1}>Save</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={[barStyles.barHeaderDivider, { backgroundColor: `${p.darkShadow}55` }]} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={barStyles.scrollContent}
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="handled"
                onLayout={e => setBarViewportWidth(e.nativeEvent.layout.width)}
                onContentSizeChange={w => setBarContentWidth(w)}
                onScroll={e => setBarScrollX(e.nativeEvent.contentOffset.x)}
                scrollEventThrottle={32}
              >
              {/* ── Content Type ── */}
              <View style={[barStyles.section, { width: 116 }]}>
                <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Type</Text>
                {(['text', 'checklist'] as ContentType[]).map(type => (
                  <NeuPressable isDark={isDark}
                    key={type}
                    radius={9}
                    backgroundColor={contentType === type ? NEU_ACCENT : p.base}
                    style={{ paddingVertical: 11, alignItems: 'center', marginBottom: 8 }}
                    onPress={() => onContentTypeChange(type)}
                  >
                    <Text style={[barStyles.miniBtnText, { fontSize: 9.5, color: p.textPrimary }, contentType === type && barStyles.miniBtnTextActive]}>
                      {type === 'text' ? 'Text' : 'Checklist'}
                    </Text>
                  </NeuPressable>
                ))}
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Background ── */}
              <View style={[barStyles.section, { width: 176 }]}>
                <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Background</Text>
                <TouchableOpacity
                  style={[barStyles.svgToggle, !!resolvedBgImageUrl && barStyles.disabled]}
                  onPress={() => onUseSvgBackgroundChange(!useSvgBackground)}
                  disabled={!!resolvedBgImageUrl}
                >
                  <NeuView isDark={isDark} inset={!useSvgBackground} radius={5} backgroundColor={useSvgBackground ? NEU_ACCENT : p.insetBase} style={barStyles.miniCheck}>
                    {useSvgBackground && <Text style={barStyles.miniCheckMark}>✓</Text>}
                  </NeuView>
                  <Text style={[barStyles.svgToggleText, { color: p.textPrimary }]}>SVG Frame</Text>
                </TouchableOpacity>
                <View
                  style={[barStyles.swatchGrid, (useSvgBackground || !!backgroundImageUrl) && barStyles.disabled]}
                  pointerEvents={(useSvgBackground || !!backgroundImageUrl) ? 'none' : 'auto'}
                >
                  {COLORS.map(color => (
                    <TouchableOpacity key={color} onPress={() => onColorChange(color)}>
                      <NeuView isDark={isDark}
                        radius={7}
                        backgroundColor={color}
                        style={[
                          { width: MINI_SWATCH, height: MINI_SWATCH, alignItems: 'center', justifyContent: 'center' },
                          selectedColor === color && barStyles.swatchSel,
                        ]}
                      >
                        {selectedColor === color && <Text style={barStyles.swatchCheck}>✓</Text>}
                      </NeuView>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setColorPickerTarget('background')}>
                    <NeuView isDark={isDark}
                      radius={7}
                      backgroundColor={COLORS.includes(selectedColor) ? undefined : selectedColor}
                      style={{ width: MINI_SWATCH, height: MINI_SWATCH, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: p.textSecondary }}>+</Text>
                    </NeuView>
                  </TouchableOpacity>
                </View>
                <View
                  style={[useSvgBackground && barStyles.disabled, { marginTop: 8 }]}
                  pointerEvents={useSvgBackground ? 'none' : 'auto'}
                >
                  <Text style={[barStyles.imageUrlLabel, { color: p.textSecondary }]}>Image URL</Text>
                  <NeuView isDark={isDark} inset radius={7}>
                    <TextInput
                      style={[barStyles.imageUrlInput, { color: p.textPrimary }]}
                      placeholder="Google Drive link or image URL"
                      placeholderTextColor="#9099AC"
                      value={backgroundImageUrl || ''}
                      onChangeText={text => onBackgroundImageUrlChange?.(text)}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </NeuView>
                </View>
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Font Color ── */}
              <View style={[barStyles.section, { width: 165 }]}>
                <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Font Color</Text>
                <View style={barStyles.swatchGrid}>
                  {TEXT_COLORS.map(color => (
                    <TouchableOpacity key={color} onPress={() => onTextColorChange(color)}>
                      <NeuView isDark={isDark}
                        radius={7}
                        backgroundColor={color}
                        style={[
                          { width: MINI_SWATCH, height: MINI_SWATCH, alignItems: 'center', justifyContent: 'center' },
                          selectedTextColor === color && barStyles.swatchSel,
                        ]}
                      >
                        {selectedTextColor === color && <Text style={barStyles.swatchCheck}>✓</Text>}
                      </NeuView>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setColorPickerTarget('font')}>
                    <NeuView isDark={isDark}
                      radius={7}
                      backgroundColor={TEXT_COLORS.includes(selectedTextColor) ? undefined : selectedTextColor}
                      style={{ width: MINI_SWATCH, height: MINI_SWATCH, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: p.textSecondary }}>+</Text>
                    </NeuView>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Font ── */}
              <View style={[barStyles.section, { width: 174 }]}>
                <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Font</Text>
                <View>
                  {Array.from({ length: Math.ceil(FONTS.length / 2) }).map((_, rowIndex) => (
                    <View key={rowIndex} style={{ flexDirection: 'row', gap: MINI_GAP, marginBottom: MINI_GAP }}>
                      {FONTS.slice(rowIndex * 2, rowIndex * 2 + 2).map(font => (
                        <NeuPressable isDark={isDark}
                          key={font.value}
                          radius={7}
                          backgroundColor={selectedFont === font.value ? NEU_ACCENT : p.base}
                          style={[barStyles.fontChip]}
                          onPress={() => onFontChange(font.value)}
                        >
                          <Text style={[barStyles.fontChipText, { fontFamily: font.value, color: p.textPrimary }, selectedFont === font.value && barStyles.miniBtnTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                            {font.name}
                          </Text>
                        </NeuPressable>
                      ))}
                    </View>
                  ))}
                </View>
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Font Size ── */}
              <View style={[barStyles.section, { width: 112 }]}>
                <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Size</Text>
                <NeuView isDark={isDark} inset radius={9} style={barStyles.stepper}>
                  <TouchableOpacity style={barStyles.stepBtn} onPress={() => onFontSizeChange(Math.max(6, selectedFontSize - 2))}>
                    <Text style={barStyles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={[barStyles.stepVal, { color: p.textPrimary }]}>{selectedFontSize}</Text>
                  <TouchableOpacity style={barStyles.stepBtn} onPress={() => onFontSizeChange(Math.min(36, selectedFontSize + 2))}>
                    <Text style={barStyles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </NeuView>
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Text Style ── */}
              <View style={[barStyles.section, { width: 155 }]}>
                <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Style</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: MINI_GAP }}>
                  {(['normal', 'bold', 'italic', 'underline'] as TextStyle[]).map(style => (
                    <NeuPressable isDark={isDark}
                      key={style}
                      radius={7}
                      backgroundColor={selectedTextStyle === style ? NEU_ACCENT : p.base}
                      style={[barStyles.styleChip]}
                      onPress={() => onTextStyleChange(style)}
                    >
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        style={[
                        barStyles.styleChipText,
                        { color: p.textPrimary },
                        style === 'bold' && { fontWeight: 'bold' },
                        style === 'italic' && { fontStyle: 'italic' },
                        style === 'underline' && { textDecorationLine: 'underline' },
                        selectedTextStyle === style && barStyles.miniBtnTextActive,
                      ]}>
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </Text>
                    </NeuPressable>
                  ))}
                </View>
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Margins ── */}
              <View style={[barStyles.section, { width: 194 }]}>
                <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Margins</Text>
                {(['top', 'bottom', 'left', 'right'] as const).map(side => (
                  <View key={side} style={barStyles.marginRow}>
                    <Text style={[barStyles.marginLabel, { color: p.textPrimary }]}>{side.charAt(0).toUpperCase() + side.slice(1)}</Text>
                    <NeuView isDark={isDark} inset radius={9} style={barStyles.stepper}>
                      <TouchableOpacity
                        style={barStyles.stepBtn}
                        onPress={() => onMarginsChange({ ...selectedMargins, [side]: Math.max(0, selectedMargins[side] - 4) })}
                      >
                        <Text style={barStyles.stepBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={[barStyles.stepVal, { color: p.textPrimary }]}>{selectedMargins[side]}</Text>
                      <TouchableOpacity
                        style={barStyles.stepBtn}
                        onPress={() => onMarginsChange({ ...selectedMargins, [side]: Math.min(100, selectedMargins[side] + 4) })}
                      >
                        <Text style={barStyles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                    </NeuView>
                  </View>
                ))}
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Spacing (both types — checklist gets item gaps, text gets line spacing) ── */}
              <View style={[barStyles.section, { width: contentType === 'checklist' ? 154 : 122 }]}>
                <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>{contentType === 'checklist' ? 'Item Spacing' : 'Line Spacing'}</Text>
                {contentType === 'checklist' ? (
                  ([
                    { key: 'top', label: 'Above' },
                    { key: 'bottom', label: 'Below' },
                  ] as { key: keyof ItemSpacing; label: string }[]).map(({ key, label }) => (
                    <View key={key} style={barStyles.marginRow}>
                      <Text style={[barStyles.marginLabel, { color: p.textPrimary }]}>{label}</Text>
                      <NeuView isDark={isDark} inset radius={9} style={barStyles.stepper}>
                        <TouchableOpacity
                          style={barStyles.stepBtn}
                          onPress={() => onItemSpacingChange({ ...selectedItemSpacing, [key]: Math.max(0, selectedItemSpacing[key] - 2) })}
                        >
                          <Text style={barStyles.stepBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={[barStyles.stepVal, { color: p.textPrimary }]}>{selectedItemSpacing[key]}</Text>
                        <TouchableOpacity
                          style={barStyles.stepBtn}
                          onPress={() => onItemSpacingChange({ ...selectedItemSpacing, [key]: Math.min(48, selectedItemSpacing[key] + 2) })}
                        >
                          <Text style={barStyles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                      </NeuView>
                    </View>
                  ))
                ) : (
                  <NeuView isDark={isDark} inset radius={9} style={barStyles.stepper}>
                    <TouchableOpacity
                      style={barStyles.stepBtn}
                      onPress={() => onLineSpacingChange(Math.max(0, selectedLineSpacing - 2))}
                    >
                      <Text style={barStyles.stepBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={[barStyles.stepVal, { color: p.textPrimary }]}>{selectedLineSpacing}</Text>
                    <TouchableOpacity
                      style={barStyles.stepBtn}
                      onPress={() => onLineSpacingChange(Math.min(30, selectedLineSpacing + 2))}
                    >
                      <Text style={barStyles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </NeuView>
                )}
              </View>

              {/* ── Display / Order (checklist only) ── */}
              {contentType === 'checklist' && (
                <>
                  <View style={barStyles.vDivider} />
                  <View style={[barStyles.section, { width: 116 }]}>
                    <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Display</Text>
                    {([
                      { value: 'single', label: 'Line' },
                      { value: 'wrap', label: 'Wrap' },
                    ] as { value: ChecklistTextMode; label: string }[]).map(opt => (
                      <NeuPressable isDark={isDark}
                        key={opt.value}
                        radius={9}
                        backgroundColor={selectedChecklistTextMode === opt.value ? NEU_ACCENT : p.base}
                        style={{ paddingVertical: 11, alignItems: 'center', marginBottom: 8 }}
                        onPress={() => onChecklistTextModeChange(opt.value)}
                      >
                        <Text style={[barStyles.miniBtnText, { textAlign: 'center', color: p.textPrimary }, selectedChecklistTextMode === opt.value && barStyles.miniBtnTextActive]}>
                          {opt.label}
                        </Text>
                      </NeuPressable>
                    ))}
                  </View>
                  <View style={barStyles.vDivider} />
                  <View style={[barStyles.section, { width: 131 }]}>
                    <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Order</Text>
                    {([
                      { value: 'as-is', label: 'As Is' },
                      { value: 'unchecked-first', label: 'Pending First' },
                      { value: 'alphabetical', label: 'A → Z' },
                    ] as { value: ChecklistSort; label: string }[]).map(opt => (
                      <NeuPressable isDark={isDark}
                        key={opt.value}
                        radius={9}
                        backgroundColor={selectedChecklistSort === opt.value ? NEU_ACCENT : p.base}
                        style={{ paddingVertical: 11, alignItems: 'center', marginBottom: 8 }}
                        onPress={() => onChecklistSortChange(opt.value)}
                      >
                        <Text style={[barStyles.miniBtnText, { textAlign: 'center', color: p.textPrimary }, selectedChecklistSort === opt.value && barStyles.miniBtnTextActive]}>
                          {opt.label}
                        </Text>
                      </NeuPressable>
                    ))}
                  </View>
                </>
              )}

              {/* ── Grid Size (how many grid cells this note spans) ──
                  Always the rightmost section, regardless of content type.
                  Hidden in styleEditorMode: a StickieStyle is a reusable
                  look-and-feel template, not tied to any grid position. */}
              {!styleEditorMode && (
                <>
                  <View style={barStyles.vDivider} />
                  <View style={[barStyles.section, { width: 150 }]}>
                    <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Grid Size</Text>
                    <View style={barStyles.marginRow}>
                      <Text style={[barStyles.marginLabel, { color: p.textPrimary }]}>Columns</Text>
                      <NeuView isDark={isDark} inset radius={9} style={barStyles.stepper}>
                        <TouchableOpacity
                          style={barStyles.stepBtn}
                          onPress={() => onColSpanChange(Math.max(1, selectedColSpan - 1))}
                        >
                          <Text style={barStyles.stepBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={[barStyles.stepVal, { color: p.textPrimary }]}>{selectedColSpan}</Text>
                        <TouchableOpacity
                          style={barStyles.stepBtn}
                          onPress={() => onColSpanChange(Math.min(maxColSpan, selectedColSpan + 1))}
                        >
                          <Text style={barStyles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                      </NeuView>
                    </View>
                    <View style={barStyles.marginRow}>
                      <Text style={[barStyles.marginLabel, { color: p.textPrimary }]}>Rows</Text>
                      <NeuView isDark={isDark} inset radius={9} style={barStyles.stepper}>
                        <TouchableOpacity
                          style={barStyles.stepBtn}
                          onPress={() => onRowSpanChange(Math.max(1, selectedRowSpan - 1))}
                        >
                          <Text style={barStyles.stepBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={[barStyles.stepVal, { color: p.textPrimary }]}>{selectedRowSpan}</Text>
                        <TouchableOpacity
                          style={barStyles.stepBtn}
                          onPress={() => onRowSpanChange(Math.min(MAX_NOTE_ROW_SPAN, selectedRowSpan + 1))}
                        >
                          <Text style={barStyles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                      </NeuView>
                    </View>
                    <Text style={[barStyles.gridSizeHint, { color: p.textSecondary }]}>Only affects Grid view</Text>
                  </View>
                </>
              )}
            </ScrollView>
              <View style={barStyles.dotsRow}>
                {(() => {
                  const DOT_COUNT = 5;
                  const maxScroll = Math.max(1, barContentWidth - barViewportWidth);
                  const progress = Math.min(1, Math.max(0, barScrollX / maxScroll));
                  const activeDot = Math.min(DOT_COUNT - 1, Math.round(progress * (DOT_COUNT - 1)));
                  return Array.from({ length: DOT_COUNT }).map((_, i) => (
                    <View key={i} style={[barStyles.dot, i === activeDot && barStyles.dotActive]} />
                  ));
                })()}
              </View>
              {barScrollX < 4 && (
                <Text style={barStyles.swipeHint}>Swipe for Font · Size · Style · Margins · Spacing · Grid →</Text>
              )}
              </NeuView>
          </View>
          </>
        )}

        {/* Discard confirmation overlay — inline so it works inside the existing Modal on iOS */}
        {showDiscardConfirm && (
          <View style={[StyleSheet.absoluteFill, confirmStyles.backdrop]}>
            <View style={[confirmStyles.card, { backgroundColor: p.base }]}>
              <Text style={[confirmStyles.title, { color: p.textPrimary }]}>Discard Changes?</Text>
              <Text style={[confirmStyles.message, { color: p.textSecondary }]}>
                All styling changes made since opening the panel will be reverted.
              </Text>

              {/* Don't show again checkbox */}
              <TouchableOpacity
                style={confirmStyles.checkRow}
                onPress={() => setDontShowAgain(v => !v)}
                activeOpacity={0.7}
              >
                <View style={[confirmStyles.checkbox, { borderColor: p.darkShadow, backgroundColor: p.insetBase }, dontShowAgain && confirmStyles.checkboxChecked]}>
                  {dontShowAgain && <Text style={confirmStyles.checkMark}>✓</Text>}
                </View>
                <Text style={[confirmStyles.checkLabel, { color: p.textPrimary }]}>Don't show this again</Text>
              </TouchableOpacity>

              <View style={confirmStyles.btnRow}>
                <TouchableOpacity
                  style={[confirmStyles.btn, confirmStyles.btnKeep, { backgroundColor: p.insetBase }]}
                  onPress={() => setShowDiscardConfirm(false)}
                  activeOpacity={0.8}
                >
                  <Text style={confirmStyles.btnKeepText}>Keep Editing</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[confirmStyles.btn, confirmStyles.btnDiscard]}
                  onPress={handleConfirmDiscard}
                  activeOpacity={0.8}
                >
                  <Text style={confirmStyles.btnDiscardText}>Discard</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <NeuColorPickerModal
          visible={colorPickerTarget !== null}
          initialColor={colorPickerTarget === 'background' ? selectedColor : selectedTextColor}
          title={colorPickerTarget === 'background' ? 'Background color' : 'Font color'}
          isDark={isDark}
          onCancel={() => setColorPickerTarget(null)}
          onSave={(hex) => {
            if (colorPickerTarget === 'background') onColorChange(hex);
            else if (colorPickerTarget === 'font') onTextColorChange(hex);
            setColorPickerTarget(null);
          }}
        />

        </SwipeToAction>

      </KeyboardAvoidingView>
    </Modal>
  );
};

export default NoteModal;

// ── Card styles ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: MODAL_WIDTH,
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
    paddingTop: 24,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  topToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  headerLabel: { fontSize: 18, fontWeight: '600', color: '#8E8E93', flex: 1 },
  arrowIconV: {
    fontSize: 16, fontWeight: '600', color: '#000000',
    transform: [{ scaleX: 1.3 }],
  },
  closeIconX: {
    fontSize: 18, fontWeight: '700', color: '#1C1C1E',
  },
  dividerLine: { height: 1, backgroundColor: '#E5E5EA' },
  textInput: { flex: 1, padding: 0 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  btn: { flex: 0.47, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  // Plain View + manual shadow, not NeuPressable — NeuPressable only forwards
  // `style` to its inner NeuView, never the outer Pressable, so a flex:0.47
  // button here would never actually get that flex sizing (same reasoning
  // as TabModal's footer buttons).
  btnCancel: {
    backgroundColor: '#DEE4ED',
    borderWidth: 1.5,
    borderTopColor: 'rgba(0,0,0,0.15)',
    borderLeftColor: 'rgba(0,0,0,0.15)',
    borderBottomColor: 'rgba(255,255,255,0.7)',
    borderRightColor: 'rgba(255,255,255,0.7)',
  },
  btnConfirm: {
    backgroundColor: NEU_ACCENT,
    shadowColor: '#A6B0C3',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: NEU_DANGER },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

// ── Checklist styles ───────────────────────────────────────────────────────────

const clStyles = StyleSheet.create({
  titleRow: { width: '100%', marginVertical: 4, paddingBottom: 4 },
  titleInput: { fontWeight: '700', color: '#1C1C1E', paddingVertical: 6, paddingHorizontal: 0 },
  row: { flexDirection: 'row', alignItems: 'center' },
  checkboxTouch: { marginRight: ROW_GAP, alignItems: 'center', justifyContent: 'center' },
  inputWrap: { flex: 1, justifyContent: 'center', position: 'relative' },
  brushWrap: { position: 'absolute', left: 0, top: '50%', marginTop: -(BRUSH_HEIGHT / 2) },
  input: { flex: 1, color: '#3A3A3C', paddingVertical: 4, paddingHorizontal: 0 },
  crossed: { textDecorationLine: 'line-through', color: '#AEAEB2' },
});

// ── Styling bar styles ─────────────────────────────────────────────────────────

const barStyles = StyleSheet.create({
  bottomSheet: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    height: STYLING_BAR_HEIGHT,
    overflow: 'hidden',
  },
  barHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 3,
  },
  barHeaderClose: {
    fontSize: 10.5,
    fontWeight: '700',
    color: NEU_DANGER,
    width: 50,
  },
  barHeaderTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8891A5',
  },
  barHeaderDone: {
    fontSize: 11.5,
    fontWeight: '700',
    color: NEU_ACCENT,
    width: 50,
    textAlign: 'right',
  },
  barHeaderDivider: {
    height: 1,
    marginHorizontal: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  dot: {
    width: 5,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#C9D0DC',
  },
  dotActive: {
    width: 16,
    backgroundColor: NEU_ACCENT,
  },
  swipeHint: {
    fontSize: 9.5,
    color: '#8891A5',
    textAlign: 'center',
    paddingBottom: 8,
  },
  scrollContent: {
    paddingHorizontal: 13,
    paddingVertical: 16,
    alignItems: 'flex-start',
  },
  section: {
    paddingHorizontal: 10,
  },
  sLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8891A5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 11,
  },
  vDivider: {
    width: 1,
    backgroundColor: '#A6B0C3',
    opacity: 0.35,
    alignSelf: 'stretch',
    marginHorizontal: 7,
  },
  miniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EFEFEF',
    marginBottom: 5,
    alignItems: 'center',
  },
  miniBtnActive: { backgroundColor: '#007AFF' },
  miniBtnText: { fontSize: 11.5, fontWeight: '500', color: '#3A4358' },
  miniBtnTextActive: { color: '#FFFFFF', fontWeight: '700' },
  svgToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  miniCheck: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  miniCheckMark: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  svgToggleText: { fontSize: 11.5, color: '#3A4358', fontWeight: '500' },
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: MINI_GAP },
  disabled: { opacity: 0.35 },
  imageUrlLabel: { fontSize: 11.5, fontWeight: '600', color: '#8891A5', marginBottom: 4 },
  imageUrlInput: {
    height: 32,
    paddingHorizontal: 9,
    fontSize: 11.5,
    color: '#3A4358',
    width: 156,
  },
  swatch: {
    width: MINI_SWATCH,
    height: MINI_SWATCH,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSel: { borderWidth: 2, borderColor: '#3A4358' },
  swatchCheck: { fontSize: 10, fontWeight: '700', color: '#1C1C1E' },
  fontChip: {
    paddingHorizontal: 7,
    paddingVertical: 7,
    width: 75,
    alignItems: 'center',
  },
  fontChipText: { fontSize: 11.5, color: '#3A4358' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 7,
  },
  stepBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 19, fontWeight: '400', color: '#F5A623' },
  stepVal: { width: 32, textAlign: 'center', fontSize: 11.5, fontWeight: '600', color: '#3A4358' },
  styleChip: {
    paddingHorizontal: 7,
    paddingVertical: 7,
    width: 67,
    alignItems: 'center',
  },
  styleChipText: { fontSize: 11.5, color: '#3A4358' },
  marginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  marginLabel: { fontSize: 11.5, fontWeight: '500', color: '#3A4358', width: 42 },
  gridSizeHint: { fontSize: 10, color: '#8891A5', marginTop: 6, fontStyle: 'italic' },
});

// ── Discard confirmation overlay styles ───────────────────────────────────────

const confirmStyles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  card: {
    width: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#6C6C70',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkMark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checkLabel: {
    fontSize: 14,
    color: '#1C1C1E',
    flex: 1,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnKeep: {
    backgroundColor: '#F2F2F7',
  },
  btnKeepText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  btnDiscard: {
    backgroundColor: '#FF3B30',
  },
  btnDiscardText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});