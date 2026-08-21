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
  PixelRatio,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ChecklistItem, ContentType, TextStyle, NoteMargins, DEFAULT_MARGINS, ItemSpacing, DEFAULT_ITEM_SPACING, DEFAULT_LINE_SPACING, ChecklistSort, ChecklistTextMode, DEFAULT_COL_SPAN, DEFAULT_ROW_SPAN, MAX_NOTE_ROW_SPAN, StickieStyle, Tab } from '../types';
import { COLORS, TEXT_COLORS, FONTS } from '../constants';
import { FRAME_COMPONENTS } from '../frames';
import SwipeToAction from '../components/SwipeToAction';
import { resolveImageUrl } from '../utils/googleDriveImage';
import { NeuView, NeuPressable, NeuToggle } from '../components/Neumorphic';
import NeuColorPickerModal from '../components/NeuColorPickerModal';
import StickieStyleNameModal from './StickieStyleNameModal';
import CheckboxIcon from '../components/CheckboxIcon';
import { resolveFontStyle } from '../utils/fontResolver';
import { NEU_RADIUS, NEU_ACCENT, NEU_DANGER, getNeuPalette } from '../theme/neumorphic';
import { CheckIcon } from '../../assets/CheckIcon';
import { XIcon } from '../../assets/XIcon';
// NOTE: requires the '@react-native-clipboard/clipboard' package — React
// Native's own Clipboard was removed from core. Add it to package.json
// (`npm install @react-native-clipboard/clipboard`) and run a native
// rebuild (pod install on iOS) since it includes native modules.
import Clipboard from '@react-native-clipboard/clipboard';
import RichText from '../components/RichText';
import TextSelectionToolbar from '../components/TextSelectionToolbar';
import { toggleMarkerOnSelection, MarkerKind } from '../utils/richText';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// PixelRatio.getFontScale() reflects the device's system text-size setting
// (e.g. iOS's "Larger Text" / Android's font scale) — 1 at the default
// size, higher when the person has bumped it up for accessibility. The
// styling bar and compact card below were sized as fixed fractions of
// SCREEN_HEIGHT with no regard for that setting, so at a large font scale
// the same fixed pixel box had to fit taller text/rows than it was sized
// for — the "styling and context card cut off" bug. Scaling these two
// heights by (a capped) FONT_SCALE gives that extra text the room it
// actually needs instead of clipping it. Capped at 1.4 rather than left
// unbounded — the tallest reported font-scale settings (~1.7-2 on some
// devices) would otherwise blow the card past a usable, on-screen size.
const FONT_SCALE = Math.min(PixelRatio.getFontScale(), 1.4);
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.5 * FONT_SCALE;
// IDLE_WIDTH/HEIGHT — 93% of screen width, 70% of screen height — is the
// "just looking at the note" size, matching ReadOnlyModal.tsx's own card
// exactly so a note doesn't visually jump in size going from
// Archived/Trash's read-only viewer into a normal editable note. Originally
// this was only used by the long-press "View Only" preview (viewOnly=true
// below, hence the old VIEW_ONLY_* naming); the normal create/edit flow now
// *also* opens at this size and only shrinks to the compact
// MODAL_WIDTH/MODAL_HEIGHT card once the person actually starts doing
// something that needs the smaller footprint — the keyboard coming up
// (typing) or the styling bar opening (see isCompactSize below).
const IDLE_WIDTH = SCREEN_WIDTH * 0.93;
const IDLE_HEIGHT = SCREEN_HEIGHT * 0.7;
const STYLING_BAR_HEIGHT = Math.round(SCREEN_HEIGHT * 0.285 * FONT_SCALE);
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

// ── Text-note list auto-continue ────────────────────────────────────────────
//
// Matches a bullet ("- " or "* ") or a numbered ("1. ", "2. ", …) prefix at
// the start of a line, capturing any leading indentation separately so it's
// preserved when the prefix is repeated/incremented on the next line.
const TEXT_BULLET_PREFIX_RE = /^(\s*)([-*])\s+/;
const TEXT_NUMBER_PREFIX_RE = /^(\s*)(\d+)\.\s+/;

// True when `line` is nothing but a bullet/number prefix with no real text
// after it — i.e. an "empty" list line, the trigger for exiting the list
// (see textEnterPressedRef/textBackspacePendingRef below).
const isEmptyListLine = (line: string): boolean => {
  const bulletMatch = line.match(TEXT_BULLET_PREFIX_RE);
  if (bulletMatch) return line.slice(bulletMatch[0].length).trim() === '';
  const numberMatch = line.match(TEXT_NUMBER_PREFIX_RE);
  if (numberMatch) return line.slice(numberMatch[0].length).trim() === '';
  return false;
};

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

// Tabs a note can actually be reassigned to from this dropdown — 'all' is a
// virtual aggregate (never a real owner), and Archived/Trash stay
// swipe-only moves (they carry their own archivedAt/deletedAt/previousTabId
// bookkeeping in MainScreen's handleSwipeAction) rather than a plain
// reassignment here.
const TAB_DROPDOWN_EXCLUDED_IDS = new Set(['all', 'archived', 'trash']);

// ── Props ──────────────────────────────────────────────────────────────────────

type NoteModalProps = {
  visible: boolean;
  tabName: string;
  // Identifies which note this is, so the undo/redo history (see the
  // "Undo/redo" section below) can be kept per-note and survive closing
  // and reopening the editor. undefined for a brand-new, not-yet-saved
  // note — that case always starts with fresh (session-only) history,
  // since there's no stable id to key persisted history against yet.
  noteId?: string;
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
  // Saved StickieStyles (settings.stickieStyles) the person can instantly
  // apply to the note being created/edited via the new dropdown above Type.
  // Only relevant to — and only rendered in — the normal create/edit flow:
  // hidden entirely in viewOnly and styleEditorMode, where "the current
  // styling" is the note/style itself being defined, not something to
  // overwrite from a preset. Also hidden if empty (nothing to pick from).
  stickieStyles?: StickieStyle[];
  // Fired (after onUseSvgBackgroundChange) when a StickieStyle is applied.
  // svgFrameId isn't covered by any of the onXChange props above — the
  // caller derives a *random* frame whenever useSvgBackground is toggled on
  // (see MainScreen) — so applying a saved style's own specific frame needs
  // its own setter, called last so the specific id wins over the random one.
  onSvgFrameIdChange?: (id: string | undefined) => void;
  // Full tab list — drives the owner-tab dropdown in the header (replaces
  // the old plain tabName label). Only rendered when this, selectedTabId,
  // and onTabIdChange are all provided, and never in viewOnly/
  // styleEditorMode (a View Only note isn't being reassigned, and a
  // StickieStyle template has no owner tab at all) — those callers can
  // keep passing just tabName and get the old plain-label header.
  tabs?: Tab[];
  selectedTabId?: string;
  onTabIdChange?: (id: string) => void;
  // Called when the person taps "Save as StickieStyle" in the styling bar
  // (see the button next to the "Use StickieStyle" toggle). Receives a
  // fully-formed StickieStyle (fresh id, whatever name they typed into the
  // naming modal, and the note's current live styling fields) — the caller
  // just appends it to settings.stickieStyles. Omitted entirely — same as
  // tabs/selectedTabId/onTabIdChange above — for viewOnly/styleEditorMode
  // callers, which never render the button in the first place.
  onSaveAsStickieStyle?: (style: StickieStyle) => void;
  // What to fall back to when the "Use StickieStyle" toggle turns off —
  // the caller's plain default color/font/etc. fields, same shape as this
  // file's own StyleFieldsSnapshot. Optional so styleEditorMode/viewOnly
  // callers, which never render the toggle, can omit it.
  defaultStyleFields?: StyleFieldsSnapshot;
};

// ── Snapshot type ──────────────────────────────────────────────────────────────

// Captures the field values a saved StickieStyle had *at the moment it was
// applied* — compared live against the note's current styling to tell
// "still exactly this style" apart from "used it as a starting point and
// then changed things" (see isStyleUnchangedFromApplied below, and the
// "Save as StickieStyle" button that reads it). id/name ride along too, so
// the "Apply style" trigger and its dropdown list can show which style is
// currently in use regardless of whether its fields still match exactly.
interface AppliedStyleSnapshot {
  id: string;
  name: string;
  color: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  textStyle: TextStyle;
  useSvgBackground: boolean;
  svgFrameId: string | undefined;
  backgroundImageUrl: string;
  margins: NoteMargins;
  itemSpacing: ItemSpacing;
  lineSpacing: number;
  checklistSort: ChecklistSort;
  checklistTextMode: ChecklistTextMode;
}

// Same shape as AppliedStyleSnapshot minus id/name — it's not describing a
// saved StickieStyle, just a point-in-time capture of the note's own live
// styling fields (see preStickieStyleFields below).
type StyleFieldsSnapshot = Omit<AppliedStyleSnapshot, 'id' | 'name'>;

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
  noteId,
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
  selectedMargins = DEFAULT_MARGINS, onMarginsChange,
  selectedItemSpacing = DEFAULT_ITEM_SPACING, onItemSpacingChange,
  selectedLineSpacing = DEFAULT_LINE_SPACING, onLineSpacingChange,
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
  stickieStyles = [],
  onSvgFrameIdChange,
  tabs,
  selectedTabId,
  onTabIdChange,
  onSaveAsStickieStyle,
  defaultStyleFields,
}: NoteModalProps) => {
  const [showStyling, setShowStyling] = useState(false);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  // Owner-tab dropdown in the header — see TAB_DROPDOWN_EXCLUDED_IDS above.
  // Only ever opened when the trigger itself is shown (see the render
  // logic below), but kept as its own flag rather than reusing
  // showStyleDropdown since the two can't ever be open at the same time
  // anyway (styling bar isn't visible while this header row is active) but
  // conflating them would be a landmine the moment that assumption changes.
  const [showTabDropdown, setShowTabDropdown] = useState(false);
  // Controls whether the StickieStyle picker section (leftmost in the
  // styling bar) is shown at all. Starts false every time the modal opens
  // (see the reset effect below) — the person opts in per note rather than
  // this carrying over from whatever they last did.
  const [useStickieStyleToggle, setUseStickieStyleToggle] = useState(false);
  // Set whenever a saved StickieStyle is actually applied (see
  // applyStickieStyle below); cleared when the toggle turns off or the
  // modal closes. Comparing this against the note's live styling fields is
  // how the "Save as StickieStyle" button decides whether the person is
  // still using the style as-is (button hidden — saving would just
  // duplicate it) or has changed something since (button shown — they're
  // using it "as inspo").
  const [appliedStickieStyleSnapshot, setAppliedStickieStyleSnapshot] = useState<AppliedStyleSnapshot | null>(null);
  // Captured once, the moment useStickieStyleToggle flips from off to on —
  // the note's own live styling fields *before* any StickieStyle gets
  // applied this session. Turning the toggle back off restores exactly
  // this, regardless of how many different styles were tried via the
  // dropdown in between (see handleUseStickieStyleToggleChange below).
  const [preStickieStyleFields, setPreStickieStyleFields] = useState<StyleFieldsSnapshot | null>(null);
  // Naming modal for "Save as StickieStyle" — same StickieStyleNameModal
  // Settings' own Add New/Edit Current flow uses.
  const [showSaveStyleNameModal, setShowSaveStyleNameModal] = useState(false);
  // Measured height of the "StickieStyle" label + trigger block (see
  // onLayout below), used to anchor the floating dropdown list right under
  // the trigger. A hardcoded pixel guess here previously left a large gap
  // and pushed the list down toward the card's bottom edge — measuring the
  // real height self-corrects for any font-scaling/layout differences.
  const [stickieStyleTriggerHeight, setStickieStyleTriggerHeight] = useState(60);
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
  // The keyboard's real on-screen height (0 when hidden) — used to center
  // the card in whatever space is actually left above it (see the
  // centering View below) instead of leaning on KeyboardAvoidingView's
  // generic padding behavior, which pads the whole screen rather than
  // re-centering just the card within the remaining room.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
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

  // Color vs Image mode for the Background section — mirrors TabModal's
  // own Label/Tab background toggles. Starts on whichever the note
  // actually has, and re-syncs every time the modal opens (same per-open
  // reset pattern the rest of this file already uses), so it never opens
  // showing "Color" selected while an image is actually still active.
  const [bgMode, setBgMode] = useState<'color' | 'image'>(backgroundImageUrl ? 'image' : 'color');
  useEffect(() => {
    if (visible) setBgMode(backgroundImageUrl ? 'image' : 'color');
  }, [visible]);

  // Free-typed hex value for the Background section's quick hex input —
  // kept as its own local buffer (rather than deriving straight from
  // selectedColor) so a partial, not-yet-valid string the user is still
  // typing isn't stomped by the synced-from-prop effect below on every
  // keystroke. Only committed to onColorChange once it's a full 6-digit hex.
  const [bgHexInput, setBgHexInput] = useState(
    (selectedColor || '').replace('#', '').toUpperCase().slice(0, 6)
  );
  useEffect(() => {
    setBgHexInput((selectedColor || '').replace('#', '').toUpperCase().slice(0, 6));
  }, [selectedColor]);
  // Same pattern as bgHexInput above, for the Font Color section's own quick
  // hex input.
  const [fontHexInput, setFontHexInput] = useState(
    (selectedTextColor || '').replace('#', '').toUpperCase().slice(0, 6)
  );
  useEffect(() => {
    setFontHexInput((selectedTextColor || '').replace('#', '').toUpperCase().slice(0, 6));
  }, [selectedTextColor]);
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
  // Same Enter/Backspace tracking pattern as the checklist's own
  // enterPressedRef/backspacePendingRef above, applied to the plain-text
  // note's single TextInput instead of one ref per checklist item — see
  // handleTextContentChange/handleTextContentKeyPress below. Both are
  // heuristics that assume the person is typing at the end of the current
  // line (true for normal top-to-bottom note-taking); editing a list line
  // buried earlier in a long note won't trigger auto-continue/-exit, it'll
  // just insert a plain newline like today.
  const textEnterPressedRef = useRef(false);
  const textBackspacePendingRef = useRef(false);

  const p = getNeuPalette(isDark);

  // Falls back to the first FONTS entry (System) whenever selectedFont is
  // empty/unset or doesn't match any known font value — otherwise a note
  // that's never had a font explicitly chosen would render with no chip
  // highlighted in the Font section, and resolveFontStyle would be handed
  // a value it can't resolve.
  const effectiveFont = FONTS.some(f => f.value === selectedFont) ? selectedFont : FONTS[0].value;

  // Header owner-tab dropdown — only enabled when the caller wired up all
  // three of tabs/selectedTabId/onTabIdChange, and never in viewOnly or
  // styleEditorMode (see the prop comment above). MainScreen's own
  // viewOnly/styleEditorMode NoteModal instances simply don't pass these,
  // so they fall back to the old plain tabName label automatically.
  const canPickOwnerTab = !viewOnly && !styleEditorMode && !!tabs && !!onTabIdChange;
  const ownerTabOptions = canPickOwnerTab
    ? (tabs as Tab[]).filter(t => !TAB_DROPDOWN_EXCLUDED_IDS.has(t.id))
    : [];
  const displayedTabName = canPickOwnerTab
    ? (ownerTabOptions.find(t => t.id === selectedTabId)?.name || tabName)
    : tabName;

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
      setShowStyleDropdown(false);
      setShowTabDropdown(false);
      setUseStickieStyleToggle(false);
      setAppliedStickieStyleSnapshot(null);
      setPreStickieStyleFields(null);
      setShowSaveStyleNameModal(false);
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

  // Real keyboard height for the centering logic below. 'Will' events fire
  // earlier on iOS (in step with its own show/hide animation) — falling
  // back to the 'Did' variant on Android, which doesn't emit 'Will' events
  // at all. endCoordinates.height is the actual keyboard height for this
  // device/orientation, not a hardcoded guess.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates?.height || 0));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
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

  // ── Undo/redo (content only) ─────────────────────────────────────────────────
  //
  // Scope: text/checklist content only — not styling, not tab/grid
  // placement. History is kept per-note (keyed by noteId) in a ref, so it
  // survives this same NoteModal instance being reused for a different note
  // and then reopened for this one again (MainScreen renders one NoteModal
  // and just toggles its `visible`/content props rather than
  // mounting/unmounting it — see the ref below). A brand-new, unsaved note
  // (noteId undefined) always starts fresh each time, since there's no
  // stable id to persist against yet.
  //
  // Rapid typing coalesces into one undo step per word/line (a step only
  // commits when the character that was just typed is whitespace or
  // sentence punctuation, or when the edit isn't a simple single-character
  // append/removal at all — e.g. a paste). Checklist edits use the same
  // rule per-item; adding/deleting/reordering/checking an item is always
  // its own immediate step since those are already discrete actions, not
  // continuous typing.
  type ContentSnapshot = { contentType: ContentType; content: string | ChecklistItem[] };
  type ContentHistoryState = { entries: ContentSnapshot[]; index: number };

  const contentHistoryStoreRef = useRef<Record<string, ContentHistoryState>>({});
  // Mutating contentHistoryStoreRef.current doesn't itself trigger a
  // re-render — bumping this after every meaningful mutation is what makes
  // the Undo/Redo buttons' enabled state actually refresh, rather than
  // lagging a keystroke behind whatever the ref currently holds.
  const [, bumpHistoryVersion] = useState(0);
  const lastRecordedSnapshotRef = useRef<ContentSnapshot | null>(null);
  // Set right before an undo/redo action calls onContentTypeChange/
  // onContentChange, so the recording effect below recognizes the resulting
  // prop update as coming from us (and skips it) rather than as a new edit
  // to record. Relies on React batching both calls into a single commit —
  // same assumption discardStyling's own restore block above already makes
  // ("Batch all restores in the same event handler so useEffect sees
  // consistent state").
  const isApplyingContentHistoryRef = useRef(false);

  const historyKey = noteId || '__new_note__';

  const contentSnapshotsEqual = (a: ContentSnapshot, b: ContentSnapshot): boolean => {
    if (a.contentType !== b.contentType) return false;
    if (typeof a.content === 'string' || typeof b.content === 'string') return a.content === b.content;
    const aItems = a.content, bItems = b.content;
    if (aItems.length !== bItems.length) return false;
    return aItems.every((item, i) => item.id === bItems[i].id && item.text === bItems[i].text && item.completed === bItems[i].completed);
  };

  const isBoundaryChar = (ch: string) => /[\s.,!?;:]/.test(ch);

  // 'continue' = coalesce into the in-progress burst (don't commit a new
  // step yet); 'commit' = this edit ends a burst (or isn't a burst at all,
  // e.g. a paste) and becomes its own step; 'none' = no real change.
  const classifyContentEdit = (prev: ContentSnapshot, next: ContentSnapshot): 'continue' | 'commit' | 'none' => {
    if (prev.contentType !== next.contentType) return 'commit';

    const classifyText = (prevText: string, nextText: string): 'continue' | 'commit' | 'none' => {
      if (prevText === nextText) return 'none';
      if (nextText.length === prevText.length + 1 && nextText.startsWith(prevText)) {
        return isBoundaryChar(nextText[nextText.length - 1]) ? 'commit' : 'continue';
      }
      if (nextText.length === prevText.length - 1 && prevText.startsWith(nextText)) return 'continue';
      return 'commit';
    };

    if (typeof next.content === 'string') {
      return classifyText(typeof prev.content === 'string' ? prev.content : '', next.content);
    }

    const prevItems = Array.isArray(prev.content) ? prev.content : [];
    const nextItems = next.content;
    if (prevItems.length !== nextItems.length) return 'commit';
    let diffIndex = -1;
    for (let i = 0; i < nextItems.length; i++) {
      const a = prevItems[i], b = nextItems[i];
      if (!a || a.id !== b.id || a.completed !== b.completed) return 'commit';
      if (a.text !== b.text) {
        if (diffIndex !== -1) return 'commit'; // more than one item changed at once
        diffIndex = i;
      }
    }
    if (diffIndex === -1) return 'none';
    return classifyText(prevItems[diffIndex].text, nextItems[diffIndex].text);
  };

  // (Re)seeds this note's history on open. Reuses whatever's already
  // stored for this noteId if it's still consistent with the content the
  // modal is actually opening with — that's what makes history survive a
  // normal close/reopen. If they've drifted apart (e.g. the last session's
  // edits were never saved and the note reverted), starts fresh instead of
  // offering undo/redo steps that no longer correspond to anything real.
  useEffect(() => {
    if (!visible) return;
    const current: ContentSnapshot = { contentType, content };
    const existing = contentHistoryStoreRef.current[historyKey];
    if (!noteId || !existing || !contentSnapshotsEqual(existing.entries[existing.index], current)) {
      contentHistoryStoreRef.current[historyKey] = { entries: [current], index: 0 };
    }
    const seeded = contentHistoryStoreRef.current[historyKey];
    lastRecordedSnapshotRef.current = seeded.entries[seeded.index];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Records every real content/contentType change into this note's history
  // — either coalesced into the current in-progress step or committed as a
  // new one (see classifyContentEdit above).
  useEffect(() => {
    if (!visible) return;
    if (isApplyingContentHistoryRef.current) {
      isApplyingContentHistoryRef.current = false;
      return;
    }
    const hist = contentHistoryStoreRef.current[historyKey];
    if (!hist) return;
    const prev = lastRecordedSnapshotRef.current;
    const next: ContentSnapshot = { contentType, content };
    if (!prev) {
      lastRecordedSnapshotRef.current = next;
      return;
    }
    const verdict = classifyContentEdit(prev, next);
    if (verdict === 'none') return;
    if (verdict === 'continue' && hist.index === hist.entries.length - 1) {
      hist.entries[hist.index] = next;
    } else {
      hist.entries = hist.entries.slice(0, hist.index + 1);
      hist.entries.push(next);
      hist.index += 1;
      // Only a 'commit' actually moves hist.index (a 'continue' just
      // replaces the in-progress entry in place), so only a commit can
      // change what canUndo/canRedo should show — that's the only case
      // that needs a forced refresh.
      bumpHistoryVersion(v => v + 1);
    }
    lastRecordedSnapshotRef.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, contentType]);

  const canUndoContent = (contentHistoryStoreRef.current[historyKey]?.index ?? 0) > 0;
  const canRedoContent = (() => {
    const hist = contentHistoryStoreRef.current[historyKey];
    return !!hist && hist.index < hist.entries.length - 1;
  })();

  const applyContentHistoryEntry = (snap: ContentSnapshot) => {
    isApplyingContentHistoryRef.current = true;
    lastRecordedSnapshotRef.current = snap;
    onContentTypeChange(snap.contentType);
    onContentChange(snap.content);
  };

  const handleUndoContent = () => {
    const hist = contentHistoryStoreRef.current[historyKey];
    if (!hist || hist.index <= 0) return;
    hist.index -= 1;
    applyContentHistoryEntry(hist.entries[hist.index]);
  };

  const handleRedoContent = () => {
    const hist = contentHistoryStoreRef.current[historyKey];
    if (!hist || hist.index >= hist.entries.length - 1) return;
    hist.index += 1;
    applyContentHistoryEntry(hist.entries[hist.index]);
  };

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

  // ── Custom text-selection toolbar state ──────────────────────────────────────
  //
  // "Active" tracks whichever single editable field currently has focus —
  // the text-note TextInput, or one specific checklist item's TextInput
  // (title row included, it's items[0] like any other item). Only one of
  // these can realistically be focused at a time, so one shared piece of
  // state is enough instead of duplicating it per-field.
  //
  // NOTE: placed here (rather than up with the modal's other useState calls)
  // deliberately — it needs `items`/`updateItem`/`isReadOnlyContent` to
  // already be defined, and those are declared further down this same
  // function body. That's still perfectly valid for React's rules of hooks
  // (the useState calls below are unconditional and run in the same order
  // every render, which is all React requires) — it just means this block
  // has to sit after its own dependencies rather than up top with the rest
  // of the state.
  type SelectionTarget = { kind: 'text' } | { kind: 'checklist'; itemId: string };
  const [activeSelectionTarget, setActiveSelectionTarget] = useState<SelectionTarget | null>(null);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  // Only set for exactly one render right after a toolbar action changes the
  // text — passed to the focused TextInput's `selection` prop so the native
  // side re-lands the cursor/selection where the action left it, then
  // cleared back to undefined (see onSelectionChangeFor below) so normal
  // typing goes back to fully native/uncontrolled selection behavior.
  const [forcedSelectionRange, setForcedSelectionRange] = useState<{ start: number; end: number } | undefined>(undefined);

  const showSelectionToolbar =
    !!activeSelectionTarget && selectionRange.end > selectionRange.start && !isReadOnlyContent && !showStyling;

  const getActiveSelectionText = (): string => {
    if (!activeSelectionTarget) return '';
    if (activeSelectionTarget.kind === 'text') return typeof content === 'string' ? content : '';
    return items.find(i => i.id === activeSelectionTarget.itemId)?.text || '';
  };

  const applyActiveSelectionText = (newText: string, newStart: number, newEnd: number) => {
    if (!activeSelectionTarget) return;
    if (activeSelectionTarget.kind === 'text') {
      onContentChange(newText);
    } else {
      updateItem(activeSelectionTarget.itemId, newText);
    }
    setSelectionRange({ start: newStart, end: newEnd });
    setForcedSelectionRange({ start: newStart, end: newEnd });
  };

  const onSelectionChangeFor = (target: SelectionTarget) => (e: { nativeEvent: { selection: { start: number; end: number } } }) => {
    setActiveSelectionTarget(target);
    setSelectionRange(e.nativeEvent.selection);
    if (forcedSelectionRange) setForcedSelectionRange(undefined);
  };

  // Selection state is no longer cleared from any individual TextInput's
  // onBlur — a text-selection drag can itself cause transient blur/refocus
  // blips on some platforms, and clearing there was wiping the highlight
  // and handles the instant the finger lifted (see the file's toolbar
  // mounting fix above for the other half of this same bug). Instead,
  // selection is only ever reassigned when a *different* field's
  // onSelectionChange actually claims it (see onSelectionChangeFor), or
  // reset here when the keyboard fully closes — a real "I'm done editing"
  // signal that isn't sensitive to a selection gesture's own timing.
  useEffect(() => {
    if (!isKeyboardVisible) {
      setActiveSelectionTarget(null);
      setSelectionRange({ start: 0, end: 0 });
    }
  }, [isKeyboardVisible]);

  const handleToolbarMarker = (kind: MarkerKind) => {
    const text = getActiveSelectionText();
    const result = toggleMarkerOnSelection(text, selectionRange.start, selectionRange.end, kind);
    applyActiveSelectionText(result.text, result.selectionStart, result.selectionEnd);
  };

  const handleToolbarCopy = async () => {
    const text = getActiveSelectionText();
    const selected = text.slice(selectionRange.start, selectionRange.end);
    if (!selected) return;
    try {
      await Clipboard.setString(selected);
    } catch {
      // Clipboard write failed — no-op, same as elsewhere in this file.
    }
  };

  const handleToolbarPaste = async () => {
    try {
      const clip = await Clipboard.getString();
      if (!clip) return;
      const text = getActiveSelectionText();
      const newText = text.slice(0, selectionRange.start) + clip + text.slice(selectionRange.end);
      const cursor = selectionRange.start + clip.length;
      applyActiveSelectionText(newText, cursor, cursor);
    } catch {
      // Clipboard read failed — no-op.
    }
  };

  const handleToolbarSelectAll = () => {
    const text = getActiveSelectionText();
    setSelectionRange({ start: 0, end: text.length });
    setForcedSelectionRange({ start: 0, end: text.length });
  };

  // ── Text-note list auto-continue ─────────────────────────────────────────────
  //
  // onKeyPress fires (and sets textEnterPressedRef) *before* onChangeText
  // sees the resulting value — same ordering the checklist's wrap-mode
  // Enter handling above already relies on — so by the time onChangeText
  // runs we know whether the just-inserted '\n' came from a real Enter
  // press. Backspace deliberately ISN'T handled here: RN's TextInput has no
  // way to stop the native character deletion a Backspace keypress already
  // triggers, so intercepting it in onKeyPress can't actually prevent
  // anything — handleTextContentChange below instead diffs the old/new text
  // directly to recognize a Backspace after the fact.
  const handleTextContentKeyPress = ({ nativeEvent }: { nativeEvent: { key: string } }) => {
    if (nativeEvent.key === 'Enter') textEnterPressedRef.current = true;
  };

  const handleTextContentChange = (text: string) => {
    const oldText = typeof content === 'string' ? content : '';

    // ── Enter: continue or exit the list ──
    if (textEnterPressedRef.current) {
      textEnterPressedRef.current = false;
      textBackspacePendingRef.current = false;

      const lines = text.split('\n');
      if (lines.length < 2) {
        onContentChange(text);
        return;
      }
      // The line that was just completed by this Enter press, and the
      // fresh (still-empty) line it created.
      const completedLineIndex = lines.length - 2;
      const newLineIndex = lines.length - 1;
      const completedLine = lines[completedLineIndex];

      const bulletMatch = completedLine.match(TEXT_BULLET_PREFIX_RE);
      const numberMatch = !bulletMatch ? completedLine.match(TEXT_NUMBER_PREFIX_RE) : null;

      if (bulletMatch || numberMatch) {
        if (isEmptyListLine(completedLine)) {
          // Second Enter on an empty bullet/number line — drop the prefix
          // and leave a single plain empty line rather than continuing the
          // list onto yet another line.
          lines[completedLineIndex] = '';
          lines.splice(newLineIndex, 1);
          onContentChange(lines.join('\n'));
          return;
        }
        lines[newLineIndex] = bulletMatch
          ? `${bulletMatch[1]}${bulletMatch[2]} `
          : `${numberMatch![1]}${parseInt(numberMatch![2], 10) + 1}. `;
        onContentChange(lines.join('\n'));
        return;
      }

      onContentChange(text);
      return;
    }

    // ── Backspace: recognize a single character removed from the last
    // line, since that's the only shape of edit this feature cares about
    // (typing normally, or backspacing from the end, matches the same
    // "editing at the end" assumption the Enter handling above makes). ──
    const oldLines = oldText.split('\n');
    const newLines = text.split('\n');
    const isSingleLineBackspace =
      oldLines.length === newLines.length &&
      oldLines.slice(0, -1).join('\n') === newLines.slice(0, -1).join('\n') &&
      newLines[newLines.length - 1] === oldLines[oldLines.length - 1].slice(0, -1);

    if (isSingleLineBackspace) {
      const oldLastLine = oldLines[oldLines.length - 1];
      if (isEmptyListLine(oldLastLine)) {
        // First Backspace landing on an untouched, empty bullet/number
        // line — let this single-character deletion go through as normal,
        // but remember that the *next* Backspace (if it immediately
        // follows) should clear the rest of the prefix in one go.
        textBackspacePendingRef.current = true;
        onContentChange(text);
        return;
      }
      if (textBackspacePendingRef.current) {
        // Second consecutive Backspace still shrinking that same prefix —
        // clear whatever's left of it entirely instead of removing just
        // one more character.
        newLines[newLines.length - 1] = '';
        textBackspacePendingRef.current = false;
        onContentChange(newLines.join('\n'));
        return;
      }
    }

    textBackspacePendingRef.current = false;
    onContentChange(text);
  };

  // ── Text style ───────────────────────────────────────────────────────────────

  const getTextStyle = (): any => {
    return {
      ...resolveFontStyle(effectiveFont, selectedTextStyle),
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
    setShowTabDropdown(false);
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

  // Point-in-time capture/restore of just the style-relevant fields (the
  // same set a StickieStyle itself carries) — used to remember and later
  // restore the note's own styling from before StickieStyle mode was
  // turned on. Deliberately excludes contentType/content/colSpan/rowSpan,
  // same as applyStickieStyle below never touching those.
  const captureStyleFields = (): StyleFieldsSnapshot => ({
    color: selectedColor,
    textColor: selectedTextColor,
    fontFamily: selectedFont,
    fontSize: selectedFontSize,
    textStyle: selectedTextStyle,
    useSvgBackground,
    svgFrameId,
    backgroundImageUrl: backgroundImageUrl || '',
    margins: selectedMargins,
    itemSpacing: selectedItemSpacing,
    lineSpacing: selectedLineSpacing,
    checklistSort: selectedChecklistSort,
    checklistTextMode: selectedChecklistTextMode,
  });

  // Same defaulting rules applyStickieStyle already applies when copying a
  // saved StickieStyle onto the note — kept as one function so a style's
  // fields are normalized identically whether they're being applied or
  // just compared against.
  const styleToFields = (style: StickieStyle): StyleFieldsSnapshot => ({
    color: style.color,
    textColor: style.textColor,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    textStyle: style.textStyle,
    useSvgBackground: style.useSvgBackground,
    svgFrameId: style.useSvgBackground ? style.svgFrameId : undefined,
    backgroundImageUrl: style.backgroundImageUrl || '',
    margins: style.margins || DEFAULT_MARGINS,
    itemSpacing: style.itemSpacing || DEFAULT_ITEM_SPACING,
    lineSpacing: style.lineSpacing ?? DEFAULT_LINE_SPACING,
    checklistSort: style.checklistSort || 'as-is',
    checklistTextMode: style.checklistTextMode || 'single',
  });

  const styleFieldsEqual = (a: StyleFieldsSnapshot, b: StyleFieldsSnapshot): boolean =>
    a.color === b.color &&
    a.textColor === b.textColor &&
    a.fontFamily === b.fontFamily &&
    a.fontSize === b.fontSize &&
    a.textStyle === b.textStyle &&
    a.useSvgBackground === b.useSvgBackground &&
    (a.svgFrameId || undefined) === (b.svgFrameId || undefined) &&
    a.backgroundImageUrl === b.backgroundImageUrl &&
    a.margins.top === b.margins.top &&
    a.margins.bottom === b.margins.bottom &&
    a.margins.left === b.margins.left &&
    a.margins.right === b.margins.right &&
    a.itemSpacing.top === b.itemSpacing.top &&
    a.itemSpacing.bottom === b.itemSpacing.bottom &&
    a.lineSpacing === b.lineSpacing &&
    a.checklistSort === b.checklistSort &&
    a.checklistTextMode === b.checklistTextMode;

  const restoreStyleFields = (snap: StyleFieldsSnapshot) => {
    onColorChange(snap.color);
    onTextColorChange(snap.textColor);
    onFontChange(snap.fontFamily);
    onFontSizeChange(snap.fontSize);
    onTextStyleChange(snap.textStyle);
    onUseSvgBackgroundChange(snap.useSvgBackground);
    onSvgFrameIdChange?.(snap.useSvgBackground ? snap.svgFrameId : undefined);
    onBackgroundImageUrlChange?.(snap.backgroundImageUrl);
    onMarginsChange(snap.margins);
    onItemSpacingChange(snap.itemSpacing);
    onLineSpacingChange(snap.lineSpacing);
    onChecklistSortChange(snap.checklistSort);
    onChecklistTextModeChange(snap.checklistTextMode);
  };

  // Wired to the "Use StickieStyle" toggle below. Turning it ON captures
  // the note's current styling as the restore point; turning it OFF puts
  // that exact styling back, regardless of how many different saved
  // styles were tried via the dropdown while it was on.
  const handleUseStickieStyleToggleChange = (value: boolean) => {
    if (value) {
      setPreStickieStyleFields(captureStyleFields());
    } else {
      // Always the plain Settings default here — random-pick is reserved
      // for brand-new note creation (see MainScreen.createNewNote). Turning
      // an existing note's toggle off is a deliberate "go back to the
      // default look" action, not "give me another random one".
      if (defaultStyleFields) {
        restoreStyleFields(defaultStyleFields);
        setAppliedStickieStyleSnapshot(null);
      } else if (preStickieStyleFields) {
        restoreStyleFields(preStickieStyleFields);
        setAppliedStickieStyleSnapshot(null);
      }
      setPreStickieStyleFields(null);
    }
    setUseStickieStyleToggle(value);
  };

  // Applies a saved StickieStyle's fields onto the note currently being
  // created/edited. Deliberately leaves contentType/content untouched — a
  // saved style describes look, not the note's own text/checklist content,
  // so applying one never disturbs what's already been typed.
  const applyStickieStyle = (style: StickieStyle) => {
    const fields = styleToFields(style);
    onColorChange(fields.color);
    onTextColorChange(fields.textColor);
    onFontChange(fields.fontFamily);
    onFontSizeChange(fields.fontSize);
    onTextStyleChange(fields.textStyle);
    onUseSvgBackgroundChange(fields.useSvgBackground);
    // Called after onUseSvgBackgroundChange above so this specific frame id
    // wins over the random one MainScreen's own toggle handler assigns.
    onSvgFrameIdChange?.(fields.svgFrameId);
    onBackgroundImageUrlChange?.(fields.backgroundImageUrl);
    onMarginsChange(fields.margins);
    onItemSpacingChange(fields.itemSpacing);
    onLineSpacingChange(fields.lineSpacing);
    onChecklistSortChange(fields.checklistSort);
    onChecklistTextModeChange(fields.checklistTextMode);
    setAppliedStickieStyleSnapshot({ id: style.id, name: style.name, ...fields });
    setShowStyleDropdown(false);
  };

  // True once a saved StickieStyle has been applied AND every field it set
  // still matches the note's current live styling exactly — i.e. nothing's
  // been touched since. False the moment anything diverges (color tweaked,
  // font changed, margins nudged, etc.), which is exactly the "using it as
  // inspo rather than keeping it as-is" signal the save button reads.
  const isStyleUnchangedFromApplied = (): boolean => {
    const snap = appliedStickieStyleSnapshot;
    if (!snap) return false;
    const { id, name, ...snapFields } = snap;
    return styleFieldsEqual(snapFields, captureStyleFields());
  };

  // Auto-detects whether the note's current styling — whatever it already
  // is, whether from a previous session, from applying a style that then
  // got edited elsewhere, or from having just matched one by coincidence —
  // exactly matches one of the saved StickieStyles, and if so reflects that
  // as "applied" (toggle on, status label showing) instead of requiring the
  // person to have applied it via the dropdown *this session* for it to be
  // recognized. Runs once each time the modal opens (the [visible]
  // dependency), which is also what makes it survive close/reopen — e.g.
  // saving a note's styling as a brand new StickieStyle, closing the
  // editor, then reopening the same note later still shows it as applied,
  // since the note's fields still match that style.
  useEffect(() => {
    if (!visible || viewOnly || styleEditorMode || stickieStyles.length === 0) return;
    const fields = captureStyleFields();
    const match = stickieStyles.find(style => styleFieldsEqual(fields, styleToFields(style)));
    if (match) {
      setAppliedStickieStyleSnapshot({ id: match.id, name: match.name, ...fields });
      setPreStickieStyleFields(fields);
      setUseStickieStyleToggle(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // "Save as StickieStyle" button visibility — see the prop comment on
  // onSaveAsStickieStyle. Shown whenever the toggle is off, or it's on but
  // the applied style's been used as a starting point rather than kept
  // exactly (or nothing's actually been applied yet this session).
  const canSaveAsStickieStyle =
    !viewOnly && !styleEditorMode && !!onSaveAsStickieStyle &&
    (!useStickieStyleToggle || !isStyleUnchangedFromApplied());

  const handleSaveAsStickieStyleName = (name: string) => {
    const style: StickieStyle = {
      id: Date.now().toString(),
      name,
      color: selectedColor,
      textColor: selectedTextColor,
      fontFamily: effectiveFont,
      fontSize: selectedFontSize,
      textStyle: selectedTextStyle,
      contentType,
      useSvgBackground,
      svgFrameId: useSvgBackground ? svgFrameId : undefined,
      backgroundImageUrl,
      margins: selectedMargins,
      itemSpacing: selectedItemSpacing,
      lineSpacing: selectedLineSpacing,
      checklistSort: selectedChecklistSort,
      checklistTextMode: selectedChecklistTextMode,
    };
    onSaveAsStickieStyle?.(style);
    // The note's current styling *is* this new style by definition — mark
    // it in-use immediately (same snapshot shape applyStickieStyle sets)
    // and flip the toggle on so "Apply style" reflects reality right away
    // instead of showing its off/placeholder state right after a save.
    setAppliedStickieStyleSnapshot({ id: style.id, name: style.name, ...styleToFields(style) });
    // Only set the restore baseline if StickieStyle mode wasn't already
    // on this session — if it was (the person had already applied/tried a
    // different saved style before saving this one), preStickieStyleFields
    // still correctly points at the styling from *before any of that*
    // started, and turning the toggle off later should go back to that,
    // not to this just-saved state.
    if (!preStickieStyleFields) setPreStickieStyleFields(captureStyleFields());
    setUseStickieStyleToggle(true);
    setShowSaveStyleNameModal(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  // True once anything's actually happening that needs the smaller
  // footprint — typing (keyboard up) or the styling bar open. viewOnly
  // never shrinks (it has no keyboard or styling bar of its own); every
  // other mode — including styleEditorMode, which forces showStyling true
  // for its whole lifetime via the effect above — sizes off this flag.
  const isCompactSize = showStyling || isKeyboardVisible;
  const cardWidth = viewOnly ? IDLE_WIDTH : (isCompactSize ? MODAL_WIDTH : IDLE_WIDTH);
  const cardHeight = viewOnly ? IDLE_HEIGHT : (isCompactSize ? MODAL_HEIGHT : IDLE_HEIGHT);
  // Space reserved below the centering row — the styling bottom sheet's
  // own height while it's open, or the keyboard's real measured height
  // while it's up (see the keyboardHeight listener above). The two never
  // overlap in practice (opening the styling bar dismisses the keyboard —
  // see the effect above), so only one is ever non-zero at a time. Using
  // the keyboard's actual height here — rather than KeyboardAvoidingView's
  // generic screen-wide padding — is what lets the card center itself
  // within whatever room is genuinely left above the keyboard instead of
  // just being pushed upward by a fixed amount.
  const reservedBottomSpace = showStyling ? STYLING_BAR_HEIGHT : keyboardHeight;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => {}}>
      <KeyboardAvoidingView
        behavior={undefined}
        enabled={false}
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

        {/* Note card — idle at IDLE_WIDTH/HEIGHT (matches ReadOnlyModal);
            shrinks to the compact MODAL_WIDTH/HEIGHT the moment the
            keyboard or styling bar takes over the bottom of the screen,
            and centers in whatever's left above reservedBottomSpace. */}
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: reservedBottomSpace }}
          pointerEvents="box-none"
        >
          <NeuView isDark={isDark}
            radius={28}
            backgroundColor={(FrameComponent || resolvedBgImageUrl) ? 'transparent' : selectedColor}
            style={[s.card, { width: cardWidth, height: cardHeight }]}
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
              {canPickOwnerTab ? (
                <View style={{ position: 'relative', flex: 1 }}>
                  <TouchableOpacity
                    style={s.tabTrigger}
                    onPress={() => setShowTabDropdown(v => !v)}
                    activeOpacity={0.75}
                    hitSlop={{ top: 8, bottom: 8, right: 8 }}
                  >
                    <Text style={s.tabTriggerText} numberOfLines={1}>{displayedTabName}</Text>
                    <Text style={s.tabTriggerChevron}>{showTabDropdown ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {showTabDropdown && (
                    <View style={s.tabDropdownWrap}>
                      <View style={s.tabDropdownList}>
                        <ScrollView style={{ maxHeight: 168 }} nestedScrollEnabled showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                          {ownerTabOptions.map(t => (
                            <TouchableOpacity
                              key={t.id}
                              style={s.tabDropdownItem}
                              onPress={() => {
                                onTabIdChange!(t.id);
                                setShowTabDropdown(false);
                              }}
                            >
                              <View style={[s.tabDropdownSwatch, { backgroundColor: t.color }]} />
                              <Text
                                style={[s.tabDropdownText, t.id === selectedTabId && s.tabDropdownTextActive]}
                                numberOfLines={1}
                              >
                                {t.name}
                              </Text>
                              {t.id === selectedTabId && <Text style={s.tabDropdownCheck}>✓</Text>}
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={s.headerLabel} numberOfLines={1}>{tabName}</Text>
              )}
              {viewOnly ? (
                <TouchableOpacity
                  onPress={onCancel}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={s.closeIconX}>✕</Text>
                </TouchableOpacity>
              ) : styleEditorMode ? null : (
                <View style={s.headerRightRow}>
                  <TouchableOpacity
                    onPress={handleUndoContent}
                    disabled={!canUndoContent}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                  >
                    <Text style={[s.undoRedoIcon, !canUndoContent && s.undoRedoIconDisabled]}>↺</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleRedoContent}
                    disabled={!canRedoContent}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                  >
                    <Text style={[s.undoRedoIcon, !canRedoContent && s.undoRedoIconDisabled]}>↻</Text>
                  </TouchableOpacity>
                  {showStyling ? (
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
              )}
            </View>

            <View style={s.dividerLine} />

            {/* Content area — locked from touches while the styling bar is open so
                tapping a text field underneath can't bring the keyboard back up.
                Swipe-to-action is applied at the screen level (see the
                SwipeToAction wrapper around the whole modal below), so
                swiping works anywhere on screen, not just over this area. */}
            <View style={{ flex: 1, position: 'relative' }} pointerEvents={showStyling ? 'none' : 'auto'}>
                {/* Always mounted (never conditionally inserted/removed from the
                    tree) — visibility is purely a style toggle. Selection can
                    still be actively growing (via a dragged handle) at the
                    exact moment showSelectionToolbar flips true; mounting a
                    new sibling view into the layout in the middle of that
                    native gesture was corrupting the OS's touch tracking,
                    which is what made the selection/handles collapse the
                    instant the finger lifted. Same "don't mutate the tree
                    mid-gesture" lesson JiggleWrapper.tsx already documents
                    for its own crash fix. */}
                <View
                  pointerEvents={showSelectionToolbar ? 'box-none' : 'none'}
                  style={{ opacity: showSelectionToolbar ? 1 : 0 }}
                >
                  <TextSelectionToolbar
                    onMarker={handleToolbarMarker}
                    onCopy={handleToolbarCopy}
                    onPaste={handleToolbarPaste}
                    onSelectAll={handleToolbarSelectAll}
                  />
                </View>
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
                            <RichText text={item.text} style={[clStyles.titleInput, getTextStyle(), { fontSize: Math.max(selectedFontSize + 4, 18) }]} />
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
                            <RichText
                              text={item.text}
                              style={[clStyles.input, getTextStyle(), { fontSize: selectedFontSize }, item.completed && clStyles.crossed]}
                            />
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
                            // contextMenuHidden intentionally removed — on Android it
                            // blocks the native ActionMode from starting at all, and
                            // that ActionMode is what keeps a selection persisted (with
                            // its handles/highlight) after the finger lifts. Without it,
                            // the drag itself still visually showed a selection, but
                            // nothing was left to hold it open on release — matching the
                            // exact "gone the instant I lift my finger" symptom. The
                            // custom TextSelectionToolbar and Android's own native
                            // copy/paste bubble can both appear now; see the file header
                            // comment on TextSelectionToolbar.tsx for the follow-up if
                            // that overlap needs addressing.
                            {...(activeSelectionTarget?.kind === 'checklist' &&
                              activeSelectionTarget.itemId === item.id &&
                              forcedSelectionRange
                                ? { selection: forcedSelectionRange }
                                : {})}
                            onSelectionChange={onSelectionChangeFor({ kind: 'checklist', itemId: item.id })}
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
                            // contextMenuHidden intentionally removed — on Android it
                            // blocks the native ActionMode from starting at all, and
                            // that ActionMode is what keeps a selection persisted (with
                            // its handles/highlight) after the finger lifts. Without it,
                            // the drag itself still visually showed a selection, but
                            // nothing was left to hold it open on release — matching the
                            // exact "gone the instant I lift my finger" symptom. The
                            // custom TextSelectionToolbar and Android's own native
                            // copy/paste bubble can both appear now; see the file header
                            // comment on TextSelectionToolbar.tsx for the follow-up if
                            // that overlap needs addressing.
                            {...(activeSelectionTarget?.kind === 'checklist' &&
                              activeSelectionTarget.itemId === item.id &&
                              forcedSelectionRange
                                ? { selection: forcedSelectionRange }
                                : {})}
                            onSelectionChange={onSelectionChangeFor({ kind: 'checklist', itemId: item.id })}
                          />
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={{ flex: 1, position: 'relative' }}>
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
                      onChangeText={handleTextContentChange}
                      onKeyPress={handleTextContentKeyPress}
                      textAlignVertical="top"
                      autoFocus={!isReadOnlyContent}
                      underlineColorAndroid="transparent"
                      // contextMenuHidden intentionally removed — see the comment on
                      // the checklist TextInputs above for why.
                      {...(activeSelectionTarget?.kind === 'text' && forcedSelectionRange ? { selection: forcedSelectionRange } : {})}
                      onSelectionChange={onSelectionChangeFor({ kind: 'text' })}
                    />
                  ) : (
                    <ScrollView
                      style={{ flex: 1 }}
                      contentContainerStyle={{ paddingTop: 12 + selectedMargins.top, paddingBottom: 12 + selectedMargins.bottom, paddingLeft: selectedMargins.left, paddingRight: selectedMargins.right }}
                      showsVerticalScrollIndicator={false}
                    >
                      <RichText text={typeof content === 'string' ? content : ''} style={[getTextStyle(), { color: selectedTextColor }]} />
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
                <Text style={[barStyles.barHeaderTitle, { color: p.textPrimary }]} numberOfLines={1}>Styling</Text>
                <View style={[barStyles.headerActionCapsule, { backgroundColor: p.insetBase }]}>
                  <TouchableOpacity
                    onPress={!styleEditorMode ? handleXPress : onCancel}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={barStyles.headerActionBtn}
                  >
                    <XIcon size={15} color={NEU_DANGER} />
                    {/* <Text style={barStyles.headerActionCancelText}>✕</Text> */}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={!styleEditorMode ? saveStyling : (onConfirmStyle || onSave)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    style={[barStyles.headerActionBtn, barStyles.headerActionConfirmBtn]}
                  >
                    <CheckIcon size={15} color="#000000" />
                    {/* <Text style={barStyles.headerActionConfirmText}>✓</Text> */}
                  </TouchableOpacity>
                </View>
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
              {/* ── StickieStyle — leftmost section in the strip, so it's
                  the first thing visible with no swiping needed. Only shown
                  in the normal create/edit flow, and only when there's at
                  least one saved style to pick from. The open list is
                  absolutely positioned so it floats over the rest of the
                  strip instead of growing this section's height (which a
                  horizontal ScrollView can't accommodate — it only scrolls
                  on its own axis), and scrolls on its own (capped height)
                  once it's taller than that. ── */}
              {!viewOnly && !styleEditorMode && stickieStyles.length > 0 && useStickieStyleToggle && (
                <>
                  <View style={[barStyles.section, { width: 176, position: 'relative', zIndex: 20 }]}>
                    <View onLayout={e => setStickieStyleTriggerHeight(e.nativeEvent.layout.height)}>
                      <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>StickieStyle</Text>
                      <NeuView isDark={isDark} inset={!showStyleDropdown} radius={9} backgroundColor={showStyleDropdown ? p.base : undefined}>
                        <TouchableOpacity
                          style={barStyles.stickieStyleTrigger}
                          onPress={() => setShowStyleDropdown(prev => !prev)}
                          activeOpacity={0.8}
                        >
                          <Text style={[barStyles.stickieStyleTriggerText, { color: p.textPrimary }]} numberOfLines={1}>
                            {appliedStickieStyleSnapshot ? appliedStickieStyleSnapshot.name : 'Apply style'}
                          </Text>
                          <Text style={[barStyles.dropdownArrow, { color: p.textSecondary }]}>{showStyleDropdown ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                      </NeuView>
                    </View>
                    {showStyleDropdown && (
                      <View style={[barStyles.stickieStyleOptionsFloatWrap, { top: stickieStyleTriggerHeight + 6 }]}>
                        <NeuView isDark={isDark} radius={9} style={barStyles.stickieStyleOptionsFloat}>
                          <ScrollView
                            style={{ maxHeight: Math.max(80, STYLING_BAR_HEIGHT - (stickieStyleTriggerHeight + 6) - 40) }}
                            nestedScrollEnabled
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                          >
                            {stickieStyles.map(style => {
                              const inUse = appliedStickieStyleSnapshot?.id === style.id;
                              return (
                                <TouchableOpacity
                                  key={style.id}
                                  style={[barStyles.stickieStyleOptionRow, { borderColor: `${p.darkShadow}40` }]}
                                  onPress={() => applyStickieStyle(style)}
                                >
                                  <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: style.color }} />
                                  <Text
                                    style={[
                                      barStyles.stickieStyleOptionText,
                                      { color: p.textPrimary },
                                      inUse && barStyles.stickieStyleOptionTextActive,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {style.name}
                                  </Text>
                                  {inUse && <Text style={barStyles.stickieStyleOptionCheck}>✓</Text>}
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </NeuView>
                      </View>
                    )}
                    {/* Bottom-of-section status label — "applied" once the
                        note's live styling matches the picked style exactly
                        (including right after "Save as StickieStyle",
                        since the just-saved style trivially matches);
                        "inspo" the moment anything's been nudged since. */}
                    {appliedStickieStyleSnapshot && (
                      <Text
                        style={[
                          barStyles.stickieStyleStatusLabel,
                          { color: isStyleUnchangedFromApplied() ? NEU_ACCENT : p.textSecondary },
                        ]}
                        numberOfLines={2}
                      >
                        {isStyleUnchangedFromApplied() ? 'Styling applied: ' : 'Styling inspo: '}
                        <Text style={barStyles.stickieStyleStatusLabelName}>{appliedStickieStyleSnapshot.name}</Text>
                      </Text>
                    )}
                  </View>
                  <View style={barStyles.vDivider} />
                </>
              )}

              {/* ── Content Type ── */}
              <View style={[barStyles.section, { width: 176 }]}>
                {/* Use StickieStyle toggle — only shown at all when there's
                    at least one saved style to apply (same gate the
                    StickieStyle section itself uses). Off by default every
                    time the modal opens (see the reset effect above); when
                    off, the StickieStyle section to the left stays hidden
                    entirely rather than just being empty. */}
                {!viewOnly && !styleEditorMode && stickieStyles.length > 0 && (
                  <View style={barStyles.stickieToggleRow}>
                    <Text style={[barStyles.stickieToggleLabel, { color: p.textSecondary }]} numberOfLines={1}>
                      Use StickieStyle
                    </Text>
                    <NeuToggle
                      value={useStickieStyleToggle}
                      onValueChange={handleUseStickieStyleToggleChange}
                      isDark={isDark}
                    />
                  </View>
                )}
                {canSaveAsStickieStyle && (
                  <TouchableOpacity
                    style={[barStyles.saveStyleButton, { borderColor: NEU_ACCENT }]}
                    activeOpacity={0.8}
                    onPress={() => setShowSaveStyleNameModal(true)}
                  >
                    <Text style={barStyles.saveStyleButtonText} numberOfLines={1}>+ Save as StickieStyle</Text>
                  </TouchableOpacity>
                )}
                <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Type</Text>

                {/* Stacked (Text above Checklist) rather than side by side —
                    same chip size/style/colors as before, just reordered
                    vertically instead of horizontally. */}
                <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: MINI_GAP }}>
                  {(['text', 'checklist'] as ContentType[]).map(type => (
                    <NeuPressable isDark={isDark}
                      key={type}
                      radius={8}
                      backgroundColor={contentType === type ? NEU_ACCENT : p.base}
                      style={barStyles.fontChip}
                      onPress={() => onContentTypeChange(type)}
                    >
                      <Text
                        style={[barStyles.miniBtnText, { fontSize: 9.5, color: p.textPrimary }, contentType === type && barStyles.miniBtnTextActive]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {type === 'text' ? 'Text' : 'Checklist'}
                      </Text>
                    </NeuPressable>
                  ))}
                </View>
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Background ── */}
              <View style={[barStyles.section, { width: 176 }]}>
                <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Background</Text>
                <View
                  style={useSvgBackground ? barStyles.disabled : undefined}
                  pointerEvents={useSvgBackground ? 'none' : 'auto'}
                >
                  {/* Color / Image mode toggle — same pattern as TabModal's
                      own Label/Tab background toggles. Switching to Color
                      clears any set backgroundImageUrl so the picked color
                      actually takes effect: NoteCard/NoteModal both prefer
                      backgroundImageUrl over the flat color whenever a URL
                      is present, regardless of which mode is showing here —
                      this toggle only controls which input is visible. */}
                  <NeuView isDark={isDark} inset radius={9} style={barStyles.bgModeToggleTrack}>
                    {(['color', 'image'] as const).map(mode => {
                      const active = bgMode === mode;
                      return (
                        <TouchableOpacity
                          key={mode}
                          activeOpacity={0.8}
                          style={[barStyles.bgModeToggleBtn, active && { backgroundColor: NEU_ACCENT }]}
                          onPress={() => {
                            if (mode === 'color') onBackgroundImageUrlChange?.('');
                            setBgMode(mode);
                          }}
                        >
                          <Text style={[barStyles.bgModeToggleText, { color: active ? '#FFFFFF' : p.textSecondary, fontWeight: active ? '700' : '500' }]}>
                            {mode === 'color' ? 'Color' : 'Image'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </NeuView>

                  {bgMode === 'color' ? (
                    <>
                      <View style={[barStyles.swatchGrid, { marginTop: 10 }]}>
                        {COLORS.slice(0, 5).map(color => (
                          <TouchableOpacity key={color} onPress={() => onColorChange(color)}>
                            <NeuView isDark={isDark}
                              radius={8}
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
                      </View>
                      <View style={{ marginTop: 8 }}>
                        <Text style={[barStyles.imageUrlLabel, { color: p.textSecondary }]}>Hex Color</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: MINI_GAP }}>
                          {/* Preview swatch of the current background color —
                              tap to open the full color picker. The hex
                              field beside it is now display-only (see
                              hexReadOnly) — a custom color is only entered
                              through the picker's own sliders/hex field, not
                              typed directly here. */}
                          <TouchableOpacity onPress={() => setColorPickerTarget('background')}>
                            <NeuView isDark={isDark}
                              radius={7}
                              backgroundColor={selectedColor}
                              style={{ width: 32, height: 32 }}
                            />
                          </TouchableOpacity>
                          <NeuView isDark={isDark} inset radius={7} style={[barStyles.hexInputWrap, barStyles.hexReadOnly, { flex: 1, width: undefined }]}>
                            <Text style={[barStyles.hexInput, { color: p.textSecondary }]} numberOfLines={1} ellipsizeMode="clip">{`#${bgHexInput}`}</Text>
                          </NeuView>
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={{ marginTop: 10 }}>
                      {/* Only entry point for the image URL now — no manual
                          typing. Reads whatever's on the clipboard (a
                          Google Drive share link or a direct image URL, the
                          same two formats the old text field accepted) and
                          applies it as-is. */}
                      <TouchableOpacity
                        style={[barStyles.pasteButton, { backgroundColor: p.base, shadowColor: p.darkShadow }]}
                        activeOpacity={0.8}
                        onPress={async () => {
                          try {
                            const text = await Clipboard.getString();
                            if (text && text.trim()) onBackgroundImageUrlChange?.(text.trim());
                          } catch {
                            // Clipboard read failed (permissions, empty
                            // clipboard, etc.) — no-op, same as leaving the
                            // image unset.
                          }
                        }}
                      >
                        <Text style={[barStyles.pasteButtonText, { color: p.textPrimary }]}>Paste from Clipboard</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Font Color ── */}
              <View style={[barStyles.section, { width: 176 }]}>
                <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Font Color</Text>
                <View style={barStyles.swatchGrid}>
                  {TEXT_COLORS.map(color => (
                    <TouchableOpacity key={color} onPress={() => onTextColorChange(color)}>
                      <NeuView isDark={isDark}
                        radius={8}
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
                </View>
                <View style={{ marginTop: 8 }}>
                  <Text style={[barStyles.imageUrlLabel, { color: p.textSecondary }]}>Hex Color</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: MINI_GAP }}>
                    {/* Preview swatch of the current font color — tap to
                        open the full color picker. Font color has no
                        Image mode (it's always a flat color), so unlike
                        Background this section keeps no toggle — just the
                        same read-only hex field treatment. */}
                    <TouchableOpacity onPress={() => setColorPickerTarget('font')}>
                      <NeuView isDark={isDark}
                        radius={7}
                        backgroundColor={selectedTextColor}
                        style={{ width: 32, height: 32 }}
                      />
                    </TouchableOpacity>
                    <NeuView isDark={isDark} inset radius={7} style={[barStyles.hexInputWrap, barStyles.hexReadOnly, { flex: 1, width: undefined }]}>
                      <Text style={[barStyles.hexInput, { color: p.textSecondary }]} numberOfLines={1} ellipsizeMode="clip">{`#${fontHexInput}`}</Text>
                    </NeuView>
                  </View>
                </View>
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Font ── */}
              <View style={[barStyles.section, { width: 176 }]}>
                <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Font</Text>
                <View>
                  {Array.from({ length: Math.ceil(FONTS.length / 2) }).map((_, rowIndex) => {
                    const rowFonts = FONTS.slice(rowIndex * 2, rowIndex * 2 + 2);
                    // A trailing row with just one font (e.g. Times New Roman,
                    // the odd one out when FONTS.length is odd) spans the full
                    // row width instead of sitting in a single 75px column —
                    // gives it enough room to render at the same 10.5px as
                    // every other font name, on one line, no auto-shrinking.
                    const isSingle = rowFonts.length === 1;
                    return (
                    <View key={rowIndex} style={{ flexDirection: 'row', gap: MINI_GAP, marginBottom: MINI_GAP }}>
                      {rowFonts.map(font => (
                        <NeuPressable isDark={isDark}
                          key={font.value}
                          radius={8}
                          backgroundColor={effectiveFont === font.value ? NEU_ACCENT : p.base}
                          style={isSingle ? barStyles.fontChipFull : barStyles.fontChip}
                          onPress={() => onFontChange(font.value)}
                        >
                          <Text style={[barStyles.fontChipText, { fontFamily: font.value, color: p.textPrimary }, effectiveFont === font.value && barStyles.miniBtnTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                            {font.name}
                          </Text>
                        </NeuPressable>
                      ))}
                    </View>
                    );
                  })}
                </View>
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Size / Style — merged section, Size's stepper sits above
                  Style's chip grid, sharing one section/divider instead of
                  two side by side (same pattern as the Order/Display merge
                  above). ── */}
              <View style={[barStyles.section, { width: 176 }]}>
                <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Size</Text>
                <NeuView isDark={isDark} inset radius={9} style={[barStyles.stepper, { alignSelf: 'flex-start', marginBottom: 14 }]}>
                  <TouchableOpacity style={barStyles.stepBtn} onPress={() => onFontSizeChange(Math.max(6, selectedFontSize - 2))} hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}>
                    <Text style={barStyles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={[barStyles.stepVal, { color: p.textPrimary }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{selectedFontSize}</Text>
                  <TouchableOpacity style={barStyles.stepBtn} onPress={() => onFontSizeChange(Math.min(36, selectedFontSize + 2))} hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}>
                    <Text style={barStyles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </NeuView>

                <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Style</Text>
                <View>
                  {Array.from({ length: 2 }).map((_, rowIndex) => (
                    <View key={rowIndex} style={{ flexDirection: 'row', gap: MINI_GAP, marginBottom: MINI_GAP }}>
                      {(['normal', 'bold', 'italic', 'underline'] as TextStyle[]).slice(rowIndex * 2, rowIndex * 2 + 2).map(style => (
                    <NeuPressable isDark={isDark}
                      key={style}
                      radius={8}
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
                  ))}
                </View>
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Margins ── */}
              <View style={[barStyles.section, { width: 194 }]}>
                <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Margins</Text>
                {(['top', 'bottom', 'left', 'right'] as const).map(side => {
                  // Top/Bottom ("above and below") get a finer 2-unit step —
                  // the previous 4-unit step felt too coarse for those two.
                  // Left/Right keep the original 4-unit step.
                  const step = side === 'top' || side === 'bottom' ? 2 : 4;
                  return (
                  <View key={side} style={[barStyles.marginRow, { marginBottom: 3 }]}>
                    <Text style={[barStyles.marginLabel, { color: p.textPrimary }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{side.charAt(0).toUpperCase() + side.slice(1)}</Text>
                    <NeuView isDark={isDark} inset radius={9} style={[barStyles.stepper, { marginTop: 3 }]}>
                      <TouchableOpacity
                        style={barStyles.stepBtn}
                        onPress={() => onMarginsChange({ ...selectedMargins, [side]: Math.max(0, selectedMargins[side] - step) })}
                        hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                      >
                        <Text style={barStyles.stepBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={[barStyles.stepVal, { color: p.textPrimary }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{selectedMargins[side]}</Text>
                      <TouchableOpacity
                        style={barStyles.stepBtn}
                        onPress={() => onMarginsChange({ ...selectedMargins, [side]: Math.min(100, selectedMargins[side] + step) })}
                        hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                      >
                        <Text style={barStyles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                    </NeuView>
                  </View>
                  );
                })}
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
                      <Text style={[barStyles.marginLabel, { color: p.textPrimary }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{label}</Text>
                      <NeuView isDark={isDark} inset radius={9} style={barStyles.stepper}>
                        <TouchableOpacity
                          style={barStyles.stepBtn}
                          onPress={() => onItemSpacingChange({ ...selectedItemSpacing, [key]: Math.max(0, selectedItemSpacing[key] - 2) })}
                          hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                        >
                          <Text style={barStyles.stepBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={[barStyles.stepVal, { color: p.textPrimary }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{selectedItemSpacing[key]}</Text>
                        <TouchableOpacity
                          style={barStyles.stepBtn}
                          onPress={() => onItemSpacingChange({ ...selectedItemSpacing, [key]: Math.min(48, selectedItemSpacing[key] + 2) })}
                          hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
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
                      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                    >
                      <Text style={barStyles.stepBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={[barStyles.stepVal, { color: p.textPrimary }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{selectedLineSpacing}</Text>
                    <TouchableOpacity
                      style={barStyles.stepBtn}
                      onPress={() => onLineSpacingChange(Math.min(30, selectedLineSpacing + 2))}
                      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                    >
                      <Text style={barStyles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </NeuView>
                )}
              </View>

              {/* ── Order / Display (checklist only) — one merged section,
                  Order's three chips on top, Display's Line/Wrap chips
                  below their own sub-label, so both controls share a
                  single section/divider instead of two side by side. ── */}
              {contentType === 'checklist' && (
                <>
                  <View style={barStyles.vDivider} />
                  <View style={[barStyles.section, { width: 176 }]}>
                    <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Order</Text>
                    {/* "As Is" and "A → Z" pair up on the top row; "Pending
                        First" spans both columns alone on the row below —
                        same lone-trailing-item treatment the Font section
                        uses (see fontChipFull), just applied to the second
                        row instead of the first. */}
                    <View style={{ flexDirection: 'row', gap: MINI_GAP, marginBottom: MINI_GAP }}>
                      {([
                        { value: 'as-is', label: 'As Is' },
                        { value: 'alphabetical', label: 'A → Z' },
                      ] as { value: ChecklistSort; label: string }[]).map(opt => (
                        <NeuPressable isDark={isDark}
                          key={opt.value}
                          radius={8}
                          backgroundColor={selectedChecklistSort === opt.value ? NEU_ACCENT : p.base}
                          style={barStyles.fontChip}
                          onPress={() => onChecklistSortChange(opt.value)}
                        >
                          <Text
                            style={[barStyles.miniBtnText, { textAlign: 'center', color: p.textPrimary }, selectedChecklistSort === opt.value && barStyles.miniBtnTextActive]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                          >
                            {opt.label}
                          </Text>
                        </NeuPressable>
                      ))}
                    </View>
                    <NeuPressable isDark={isDark}
                      radius={8}
                      backgroundColor={selectedChecklistSort === 'unchecked-first' ? NEU_ACCENT : p.base}
                      style={barStyles.fontChipFull}
                      onPress={() => onChecklistSortChange('unchecked-first')}
                    >
                      <Text style={[barStyles.miniBtnText, { textAlign: 'center', color: p.textPrimary }, selectedChecklistSort === 'unchecked-first' && barStyles.miniBtnTextActive]}>
                        Pending First
                      </Text>
                    </NeuPressable>

                    <Text style={[barStyles.sLabel, { color: p.textSecondary, marginTop: 14 }]}>Display</Text>
                    <View style={{ flexDirection: 'row', gap: MINI_GAP }}>
                      {([
                        { value: 'single', label: 'Line' },
                        { value: 'wrap', label: 'Wrap' },
                      ] as { value: ChecklistTextMode; label: string }[]).map(opt => (
                        <NeuPressable isDark={isDark}
                          key={opt.value}
                          radius={8}
                          backgroundColor={selectedChecklistTextMode === opt.value ? NEU_ACCENT : p.base}
                          style={barStyles.fontChip}
                          onPress={() => onChecklistTextModeChange(opt.value)}
                        >
                          <Text
                            style={[barStyles.miniBtnText, { textAlign: 'center', color: p.textPrimary }, selectedChecklistTextMode === opt.value && barStyles.miniBtnTextActive]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                          >
                            {opt.label}
                          </Text>
                        </NeuPressable>
                      ))}
                    </View>
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
                  <View style={[barStyles.section, { width: 170 }]}>
                    <Text style={[barStyles.sLabel, { color: p.textSecondary }]}>Grid Size</Text>
                    <View style={barStyles.marginRow}>
                      <Text style={[barStyles.marginLabel, { color: p.textPrimary, width: 62 }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>Columns</Text>
                      <NeuView isDark={isDark} inset radius={9} style={barStyles.stepper}>
                        <TouchableOpacity
                          style={barStyles.stepBtn}
                          onPress={() => onColSpanChange(Math.max(1, selectedColSpan - 1))}
                          hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                        >
                          <Text style={barStyles.stepBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={[barStyles.stepVal, { color: p.textPrimary }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{selectedColSpan}</Text>
                        <TouchableOpacity
                          style={barStyles.stepBtn}
                          onPress={() => onColSpanChange(Math.min(maxColSpan, selectedColSpan + 1))}
                          hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                        >
                          <Text style={barStyles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                      </NeuView>
                    </View>
                    <View style={barStyles.marginRow}>
                      <Text style={[barStyles.marginLabel, { color: p.textPrimary, width: 62 }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>Rows</Text>
                      <NeuView isDark={isDark} inset radius={9} style={barStyles.stepper}>
                        <TouchableOpacity
                          style={barStyles.stepBtn}
                          onPress={() => onRowSpanChange(Math.max(1, selectedRowSpan - 1))}
                          hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                        >
                          <Text style={barStyles.stepBtnText}>−</Text>
                        </TouchableOpacity>
                        <Text style={[barStyles.stepVal, { color: p.textPrimary }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>{selectedRowSpan}</Text>
                        <TouchableOpacity
                          style={barStyles.stepBtn}
                          onPress={() => onRowSpanChange(Math.min(MAX_NOTE_ROW_SPAN, selectedRowSpan + 1))}
                          hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
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

        {/* "Save as StickieStyle" naming step — same modal Settings' own
            Add New/Edit Current flow uses (see
            components/StickieStyleSection.tsx). */}
        <StickieStyleNameModal
          visible={showSaveStyleNameModal}
          isDark={isDark}
          onCancel={() => setShowSaveStyleNameModal(false)}
          onSave={handleSaveAsStickieStyleName}
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
  // Owner-tab dropdown trigger — same font size/weight as the old plain
  // headerLabel so swapping one for the other doesn't shift the header's
  // overall height, just adds the chevron.
  tabTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    maxWidth: '90%',
  },
  tabTriggerText: { fontSize: 18, fontWeight: '600', color: '#8E8E93' },
  tabTriggerChevron: { fontSize: 11, fontWeight: '700', color: '#8E8E93' },
  // Floats below the trigger rather than pushing the header taller — the
  // card's own overflow:hidden (see `card` below) still clips it if the
  // list runs past the card's bottom edge, which is why the list itself is
  // capped at maxHeight 168 with its own scroll instead of growing freely.
  tabDropdownWrap: {
    position: 'absolute',
    top: 32,
    left: 0,
    width: 190,
    zIndex: 40,
  },
  tabDropdownList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  tabDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  tabDropdownSwatch: { width: 12, height: 12, borderRadius: 3 },
  tabDropdownText: { fontSize: 13.5, color: '#3A3A3C', flex: 1 },
  tabDropdownTextActive: { color: '#F5A623', fontWeight: '700' },
  tabDropdownCheck: { fontSize: 12, fontWeight: '700', color: '#F5A623' },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  undoRedoIcon: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  undoRedoIconDisabled: {
    opacity: 0.25,
  },
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
    paddingLeft: 18,
    paddingRight: 4,
    height: 40,
  },
  barHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8891A5',
  },
  // Grouped capsule holding the Cancel (✕) / Confirm (✓) icon buttons —
  // replaces the old separate "Cancel"/"Done" text buttons flanking a
  // centered title. p.insetBase (passed inline at the call site) gives it
  // the same carved-in neutral tone as other inset surfaces in the app.
  headerActionCapsule: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 3,
  },
  headerActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionConfirmBtn: {
    backgroundColor: NEU_ACCENT,
  },
  headerActionCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: NEU_DANGER,
  },
  headerActionConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  barHeaderDivider: {
    height: 1,
    marginHorizontal: 18,
  },
  stickieStyleTrigger: {
    height: 32,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stickieStyleTriggerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 10,
  },
  // NeuView's "raised" mode (see components/Neumorphic.tsx) only forwards
  // the `style` prop to its *inner* content box — the outer box that
  // actually participates in layout stays plain `position: 'relative'`
  // with no absolute positioning of its own. Passing position:'absolute'
  // straight to a NeuView's style (as an earlier version of this did)
  // therefore doesn't take it out of normal flow at all: it still occupies
  // space in-line, then gets *additionally* offset by `top` on top of that,
  // compounding into a large, wrong gap. Splitting the two fixes it — this
  // wrapper (a plain View) does the actual absolute positioning, and
  // NeuView goes inside it doing nothing but its usual visual styling.
  stickieStyleOptionsFloatWrap: {
    position: 'absolute',
    left: 0,
    // Matches the section's own content width (176px section, 10px padding
    // each side) — previously wider (220) for readability, but that spilled
    // past the section's right edge into the divider and Type's space when
    // open.
    width: 156,
    zIndex: 30,
  },
  // Floats over the rest of the horizontal strip instead of growing this
  // section's height (which the strip, being a horizontal-only ScrollView,
  // can't accommodate) — anchored just under the trigger, capped height
  // with its own ScrollView (see the render code) so a long list of saved
  // styles never grows the bar itself. Matches the section's own content
  // width rather than exceeding it, so it doesn't spill into the divider
  // and Type's space beside it.
  stickieStyleOptionsFloat: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  stickieStyleOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stickieStyleOptionText: {
    fontSize: 11.5,
    flex: 1,
  },
  stickieStyleOptionTextActive: {
    color: NEU_ACCENT,
    fontWeight: '700',
  },
  stickieStyleOptionCheck: {
    color: NEU_ACCENT,
    fontSize: 12,
    fontWeight: '700',
  },
  stickieStyleStatusLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 10,
    lineHeight: 13,
  },
  stickieStyleStatusLabelName: {
    fontWeight: '700',
  },
  stickieToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  stickieToggleLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    flexShrink: 1,
    marginRight: 6,
  },
  // "Save as StickieStyle" — dashed accent-outline pill, same visual family
  // as StickieStyleSection's own "+ Add New" affordance but flatter (no
  // solid fill) so it reads as a secondary action next to the Type chips
  // rather than competing with them.
  saveStyleButton: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginBottom: 11,
  },
  saveStyleButtonText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: NEU_ACCENT,
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
  hexInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 9,
    width: 156,
  },
  hexInput: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1,
    padding: 0,
    height: 32,
  },
  swatch: {
    width: MINI_SWATCH,
    height: MINI_SWATCH,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Background section's Color/Image switch — same shape/sizing family as
  // TabModal's modeToggleTrack/modeToggleBtn, just scaled down to fit this
  // 176px-wide styling-bar section.
  bgModeToggleTrack: {
    flexDirection: 'row',
    padding: 3,
  },
  bgModeToggleBtn: {
    flex: 1,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  bgModeToggleText: {
    fontSize: 12,
  },
  // Dims the hex value text to signal it's display-only — color/font-color
  // hex codes are now set exclusively via the swatch → NeuColorPickerModal
  // flow, never typed directly into this field.
  hexReadOnly: {
    opacity: 0.55,
  },
  pasteButton: {
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  pasteButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  swatchSel: { borderWidth: 2, borderColor: '#3A4358' },
  swatchCheck: { fontSize: 10, fontWeight: '700', color: '#1C1C1E' },
  fontChip: {
    paddingHorizontal: 7,
    paddingVertical: 7,
    width: 75,
    alignItems: 'center',
  },
  // Full row width (2 chips + the gap between them) — used for a lone
  // trailing font chip (see the Font section render logic above) so it
  // spans both columns instead of being squeezed into a single 75px one.
  fontChipFull: {
    paddingHorizontal: 7,
    paddingVertical: 7,
    width: 75 * 2 + MINI_GAP,
    alignItems: 'center',
  },
  fontChipText: { fontSize: 11.5, color: '#3A4358' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginTop: 7,
  },
  stepBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 18, fontWeight: '400', color: '#F5A623' },
  stepVal: { width: 30, textAlign: 'center', fontSize: 11.5, fontWeight: '600', color: '#3A4358' },
  styleChip: {
    paddingHorizontal: 7,
    paddingVertical: 7,
    width: 75,
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