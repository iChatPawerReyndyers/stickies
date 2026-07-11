import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
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
import Svg, { Path, Rect } from 'react-native-svg';
import { ChecklistItem, ContentType, TextStyle, NoteMargins, DEFAULT_MARGINS, ItemSpacing, ChecklistSort, ChecklistTextMode } from '../types';
import { COLORS, TEXT_COLORS, FONTS } from '../constants';
import { FRAME_COMPONENTS } from '../frames';
import SwipeToAction from '../components/SwipeToAction';
import { NeuView, NeuPressable } from '../components/Neumorphic';
import { NEU_ACCENT, NEU_DANGER, NEU_RADIUS, getNeuPalette } from '../theme/neumorphic';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.5;
const STYLING_BAR_HEIGHT = Math.round(SCREEN_HEIGHT * 0.25);
const MODAL_WIDTH = 320;
const CARD_HORIZONTAL_PADDING = 24;
const CHECKBOX_SIZE = 26;
const ROW_GAP = 14;
const UNDERLINE_HEIGHT = 3;
const AVAILABLE_TEXT_ROW_WIDTH =
  MODAL_WIDTH - CARD_HORIZONTAL_PADDING * 2 - CHECKBOX_SIZE - ROW_GAP;
const MINI_SWATCH = 26;
const MINI_GAP = 5;

// Width variety per row so the underline accents don't look mechanically
// identical — same idea as the old brush-stroke variants, just applied to
// a neumorphic inset groove instead of a painted highlighter mark.
const UNDERLINE_WIDTH_RATIOS = [0.95, 0.72, 0.93, 0.88, 0.65];

// ── SVG Checkbox ───────────────────────────────────────────────────────────────
// Unchecked = neutral outline in the palette's dark-shadow tone (reads as a
// carved-in placeholder); checked = solid accent fill with a white check,
// matching the rest of the app's raised/accent convention.

const CheckboxIcon: React.FC<{ checked: boolean; size?: number; isDark?: boolean }> = ({ checked, size = CHECKBOX_SIZE, isDark = false }) => {
  const p = getNeuPalette(isDark);
  const strokeColor = checked ? NEU_ACCENT : p.darkShadow;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Rect
        x={size * 0.08} y={size * 0.08}
        width={size * 0.84} height={size * 0.84}
        rx={size * 0.26} ry={size * 0.26}
        stroke={strokeColor} strokeWidth={size * 0.1}
        fill={checked ? NEU_ACCENT : 'transparent'}
      />
      {checked && (
        <Path
          d={`M${size * 0.27} ${size * 0.52} L${size * 0.42} ${size * 0.67} L${size * 0.75} ${size * 0.32}`}
          stroke="#FFFFFF" strokeWidth={size * 0.09}
          strokeLinecap="round" strokeLinejoin="round" fill="none"
        />
      )}
    </Svg>
  );
};

// ── Underline accent ────────────────────────────────────────────────────────────
// Replaces the old hand-drawn "brush stroke" highlighter with a thin
// neumorphic inset groove sitting under single-line checklist text — same
// carved-in language as text inputs and toggle tracks elsewhere in the app.

const UnderlineAccent: React.FC<{ index: number; isDark?: boolean }> = ({ index, isDark = false }) => {
  const p = getNeuPalette(isDark);
  const width = Math.round(AVAILABLE_TEXT_ROW_WIDTH * UNDERLINE_WIDTH_RATIOS[index % UNDERLINE_WIDTH_RATIOS.length]);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        bottom: 2,
        width,
        height: UNDERLINE_HEIGHT,
        borderRadius: UNDERLINE_HEIGHT / 2,
        backgroundColor: p.insetBase,
        borderWidth: 1,
        borderTopColor: p.darkShadow,
        borderLeftColor: p.darkShadow,
        borderBottomColor: p.lightShadow,
        borderRightColor: p.lightShadow,
        opacity: 0.7,
      }}
    />
  );
};

// ── Props ──────────────────────────────────────────────────────────────────────

type NoteModalProps = {
  visible: boolean;
  tabName: string;
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
  // Swipe-to-action — only wired up when the caller actually has a real,
  // already-saved note to act on (undefined disables swipe silently).
  onSwipeDelete?: () => void;
  onSwipeArchive?: () => void;
  isDark?: boolean;
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
  selectedMargins: NoteMargins;
  selectedItemSpacing: ItemSpacing;
  selectedLineSpacing: number;
  selectedChecklistSort: ChecklistSort;
  selectedChecklistTextMode: ChecklistTextMode;
}

// ── Component ──────────────────────────────────────────────────────────────────

const NoteModal = ({
  visible, tabName,
  contentType, onContentTypeChange,
  content, onContentChange,
  selectedColor, onColorChange,
  selectedTextColor, onTextColorChange,
  selectedFont, onFontChange,
  selectedFontSize, onFontSizeChange,
  selectedTextStyle, onTextStyleChange,
  useSvgBackground, onUseSvgBackgroundChange,
  svgFrameId,
  selectedMargins, onMarginsChange,
  selectedItemSpacing, onItemSpacingChange,
  selectedLineSpacing, onLineSpacingChange,
  selectedChecklistSort, onChecklistSortChange,
  selectedChecklistTextMode, onChecklistTextModeChange,
  onSave, onCancel,
  showDiscardConfirmation, onDisableDiscardConfirmation,
  previewMode = false,
  initialShowStyling = false,
  viewOnly = false,
  onSwipeDelete,
  onSwipeArchive,
  isDark = false,
}: NoteModalProps) => {
  const [showStyling, setShowStyling] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [stylingSnapshot, setStylingSnapshot] = useState<StylingSnapshot | null>(null);
  // Which checklist item (if any) currently has keyboard focus. While an item
  // is focused we skip live re-sorting so the row doesn't jump under the user's
  // finger/cursor as they type (e.g. under alphabetical sort).
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  // Tracked so swipe-to-delete/archive only engages once the keyboard is
  // dismissed — otherwise a horizontal drag on the text input would fight
  // with cursor placement / text selection.
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const scrollRef = useRef<ScrollView | null>(null);
  const enterPressedRef = useRef(false);
  // Tracks whether an empty checklist item has already seen one Backspace press —
  // a second consecutive Backspace on a still-empty item deletes it.
  const backspacePendingRef = useRef<{ [id: string]: boolean }>({});

  const p = getNeuPalette(isDark);
  const text = p.textPrimary;
  const sub = p.textSecondary;

  // Read-only note content is presented the same way as previewMode's
  // (non-editable) rendering — this just extends that same rendering path.
  const isReadOnlyContent = previewMode || viewOnly;

  // Swipe is enabled in View Only always, and in the normal editor only once
  // the styling bar is closed and the keyboard is down — i.e. exactly the
  // "just looking at the note" state.
  const swipeEnabled = !previewMode && (viewOnly || (!showStyling && !isKeyboardVisible));

  const items: ChecklistItem[] = Array.isArray(content) ? (content as ChecklistItem[]) : [];

  const FrameComponent = useSvgBackground && svgFrameId ? FRAME_COMPONENTS[svgFrameId] : null;

  // Reset styling bar when modal closes
  useEffect(() => {
    if (!visible) {
      setShowStyling(false);
      setStylingSnapshot(null);
      setEditingItemId(null);
    }
  }, [visible]);

  // If used as a preview, optionally open the styling bar immediately
  useEffect(() => {
    if (visible && initialShowStyling && !viewOnly) setShowStyling(true);
  }, [visible, initialShowStyling, viewOnly]);

  // The styling bar and the keyboard should never be on screen together —
  // dismiss the keyboard any time the styling bar is opened.
  useEffect(() => {
    if (showStyling) Keyboard.dismiss();
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
      const converted: ChecklistItem[] = lines.map((line, i) => ({
        id: (Date.now() + i).toString(),
        text: line,
        completed: false,
      }));
      onContentChange(converted.length > 0 ? converted : [{ id: Date.now().toString(), text: '', completed: false }]);
    } else if (contentType === 'text' && Array.isArray(content)) {
      const allItems = content as ChecklistItem[];
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
    setTimeout(() => {
      inputRefs.current[newItem.id]?.focus();
      scrollRef.current?.scrollToEnd({ animated: true });
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
    if (selectedChecklistSort === 'unchecked-first')
      return [...list].sort((a, b) => Number(a.completed) - Number(b.completed));
    if (selectedChecklistSort === 'alphabetical')
      return [...list].sort((a, b) => a.text.localeCompare(b.text));
    return list;
  };

  // The list actually rendered: while an item is being typed into, keep items
  // in their natural (insertion) order so the row doesn't reshuffle mid-keystroke.
  // Once nothing is focused, fall back to the user's chosen sort order.
  const displayedChecklistItems: ChecklistItem[] = (editingItemId
    ? [items[0], ...items.slice(1)]
    : [items[0], ...sortItems(items.slice(1))]
  ).filter(Boolean) as ChecklistItem[];

  // ── Text style ───────────────────────────────────────────────────────────────

  const getTextStyle = (): any => {
    const base: any = {
      fontFamily: selectedFont,
      color: selectedTextColor,
      fontSize: selectedFontSize,
      lineHeight: selectedFontSize + selectedLineSpacing,
    };
    if (selectedTextStyle === 'bold') base.fontWeight = 'bold';
    else if (selectedTextStyle === 'italic') base.fontStyle = 'italic';
    else if (selectedTextStyle === 'underline') base.textDecorationLine = 'underline';
    return base;
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
    setStylingSnapshot({
      contentType, content,
      selectedColor, selectedTextColor, selectedFont, selectedFontSize,
      selectedTextStyle, useSvgBackground, selectedMargins, selectedItemSpacing, selectedLineSpacing, selectedChecklistSort,
      selectedChecklistTextMode,
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
      onMarginsChange(stylingSnapshot.selectedMargins);
      onItemSpacingChange(stylingSnapshot.selectedItemSpacing);
      onLineSpacingChange(stylingSnapshot.selectedLineSpacing);
      onChecklistSortChange(stylingSnapshot.selectedChecklistSort);
      onChecklistTextModeChange(stylingSnapshot.selectedChecklistTextMode);
    }
    setStylingSnapshot(null);
    setShowStyling(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
        style={{ flex: 1 }}
      >

        {/* Semi-transparent backdrop — tapping it dismisses the modal */}
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={onCancel} />

        {/* Note card — 50% height; when styling open, centers within the top 3/4 above the bar */}
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: showStyling ? STYLING_BAR_HEIGHT : 0 }}
          pointerEvents="box-none"
        >
          <NeuView
            isDark={isDark}
            radius={NEU_RADIUS.xl}
            backgroundColor={FrameComponent ? 'transparent' : selectedColor}
            style={{ width: MODAL_WIDTH, height: MODAL_HEIGHT, paddingHorizontal: CARD_HORIZONTAL_PADDING, paddingTop: 24, paddingBottom: 24, overflow: 'hidden' }}
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

            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: sub, flex: 1 }} numberOfLines={1}>{tabName}</Text>
              {viewOnly ? (
                <TouchableOpacity
                  onPress={onCancel}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '700', color: text }}>✕</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={showStyling ? saveStyling : openStyling}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: showStyling ? NEU_ACCENT : text, transform: [{ scaleX: 1.3 }] }}>
                    {showStyling ? '✓' : 'v'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ height: 1, backgroundColor: p.darkShadow, opacity: 0.25 }} />

            {/* Content area — locked from touches while the styling bar is open so
                tapping a text field underneath can't bring the keyboard back up.
                Wrapped in SwipeToAction so swiping left/right here trashes or
                archives the note (see swipeEnabled gate above). */}
            <SwipeToAction enabled={swipeEnabled} onSwipeLeft={onSwipeDelete} onSwipeRight={onSwipeArchive}>
              <View style={{ flex: 1 }} pointerEvents={showStyling ? 'none' : 'auto'}>
                {contentType === 'checklist' ? (
                <ScrollView
                  ref={scrollRef}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingTop: 10 + selectedMargins.top, paddingBottom: 10 + selectedMargins.bottom, paddingLeft: selectedMargins.left, paddingRight: selectedMargins.right }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
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
                          <View style={clStyles.checkboxTouch}>
                            <CheckboxIcon checked={item.completed} isDark={isDark} />
                          </View>
                          <View style={clStyles.inputWrap}>
                            {selectedChecklistTextMode === 'single' && <UnderlineAccent index={index} isDark={isDark} />}
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
                          <CheckboxIcon checked={item.completed} isDark={isDark} />
                        </TouchableOpacity>
                        <View style={clStyles.inputWrap}>
                          {selectedChecklistTextMode === 'single' && <UnderlineAccent index={index} isDark={isDark} />}
                          <TextInput
                            ref={el => { inputRefs.current[item.id] = el; }}
                            style={[clStyles.input, getTextStyle(), { fontSize: selectedFontSize }, item.completed && clStyles.crossed]}
                            placeholder="List item..."
                            placeholderTextColor="transparent"
                            value={item.text}
                            onChangeText={text => {
                              // Any real edit cancels a pending "delete on next backspace" state.
                              backspacePendingRef.current[item.id] = false;
                              // Some platforms don't emit onKeyPress for Enter in multiline inputs.
                              // Detect newline characters in the text as a fallback and create a new item.
                              if (selectedChecklistTextMode === 'wrap' && text.includes('\n')) {
                                const sanitized = text.replace(/\n+/g, '');
                                updateItem(item.id, sanitized);
                                // Create the next item and focus it
                                addItemAfter(item.id);
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
                            onFocus={() => setEditingItemId(item.id)}
                            onBlur={() => setEditingItemId(prev => (prev === item.id ? null : prev))}
                            onSubmitEditing={() => addItemAfter(item.id)}
                            onKeyPress={({ nativeEvent }) => {
                              if (nativeEvent.key === 'Enter' && selectedChecklistTextMode === 'wrap') {
                                enterPressedRef.current = true;
                                addItemAfter(item.id);
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
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 12 + selectedMargins.top, paddingBottom: 12 + selectedMargins.bottom, paddingLeft: selectedMargins.left, paddingRight: selectedMargins.right }}>
                      <Text style={[getTextStyle(), { color: selectedTextColor }]}>{typeof content === 'string' ? content : ''}</Text>
                    </ScrollView>
                  )}
                </View>
              )}
              </View>
            </SwipeToAction>

            {/* Footer — hidden entirely in viewOnly mode; closing happens only via the ✕ */}
            {!viewOnly && (
              <>
                <View style={{ height: 1, backgroundColor: p.darkShadow, opacity: 0.25 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, gap: 10 }}>
                  <NeuPressable isDark={isDark} radius={NEU_RADIUS.md} style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' }} onPress={onCancel}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: NEU_DANGER }}>Cancel</Text>
                  </NeuPressable>
                  <NeuPressable isDark={isDark} radius={NEU_RADIUS.md} backgroundColor={NEU_ACCENT} style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' }} onPress={onSave}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFFFFF' }}>{previewMode ? 'Save' : 'Confirm'}</Text>
                  </NeuPressable>
                </View>
              </>
            )}

          </NeuView>
        </View>

        {/* Styling bar — bottom sheet, sibling to the card, inside the same Modal */}
        {showStyling && (
          <>
            <NeuView isDark={isDark} radius={NEU_RADIUS.lg} style={{ position: 'absolute', bottom: 24, left: 24, right: 24, height: STYLING_BAR_HEIGHT, overflow: 'hidden' }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 12, alignItems: 'flex-start' }}
                keyboardShouldPersistTaps="handled"
              >
              {/* ── Content Type ── */}
              <View style={[barStyles.section, { width: 110 }]}>
                <Text style={[barStyles.sLabel, { color: sub }]}>Type</Text>
                {(['text', 'checklist'] as ContentType[]).map(type => (
                  <NeuPressable
                    key={type}
                    isDark={isDark}
                    radius={8}
                    backgroundColor={contentType === type ? NEU_ACCENT : undefined}
                    style={{ paddingHorizontal: 10, paddingVertical: 8, marginBottom: 5, alignItems: 'center' }}
                    onPress={() => onContentTypeChange(type)}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '500', color: contentType === type ? '#FFFFFF' : sub }}>
                      {type === 'text' ? 'Text' : 'Checklist'}
                    </Text>
                  </NeuPressable>
                ))}
              </View>

              <View style={[barStyles.vDivider, { backgroundColor: p.darkShadow, opacity: 0.25 }]} />

              {/* ── Background ── */}
              <View style={[barStyles.section, { width: 138 }]}>
                <Text style={[barStyles.sLabel, { color: sub }]}>Background</Text>
                <TouchableOpacity style={barStyles.svgToggle} onPress={() => onUseSvgBackgroundChange(!useSvgBackground)}>
                  <NeuView
                    isDark={isDark}
                    inset={!useSvgBackground}
                    radius={4}
                    backgroundColor={useSvgBackground ? NEU_ACCENT : undefined}
                    style={{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center', marginRight: 5 }}
                  >
                    {useSvgBackground && <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFFFFF' }}>✓</Text>}
                  </NeuView>
                  <Text style={{ fontSize: 14, color: text, fontWeight: '500' }}>SVG Frame</Text>
                </TouchableOpacity>
                <View
                  style={[barStyles.swatchGrid, useSvgBackground && barStyles.disabled]}
                  pointerEvents={useSvgBackground ? 'none' : 'auto'}
                >
                  {COLORS.map(color => (
                    <TouchableOpacity key={color} onPress={() => onColorChange(color)}>
                      <NeuView
                        isDark={isDark}
                        radius={6}
                        backgroundColor={color}
                        style={[
                          { width: MINI_SWATCH, height: MINI_SWATCH, alignItems: 'center', justifyContent: 'center' },
                          selectedColor === color && { borderWidth: 2, borderColor: text },
                        ]}
                      >
                        {selectedColor === color && <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>✓</Text>}
                      </NeuView>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[barStyles.vDivider, { backgroundColor: p.darkShadow, opacity: 0.25 }]} />

              {/* ── Font Color ── */}
              <View style={[barStyles.section, { width: 148 }]}>
                <Text style={[barStyles.sLabel, { color: sub }]}>Font Color</Text>
                <View style={barStyles.swatchGrid}>
                  {TEXT_COLORS.map(color => (
                    <TouchableOpacity key={color} onPress={() => onTextColorChange(color)}>
                      <NeuView
                        isDark={isDark}
                        radius={6}
                        backgroundColor={color}
                        style={[
                          { width: MINI_SWATCH, height: MINI_SWATCH, alignItems: 'center', justifyContent: 'center' },
                          selectedTextColor === color && { borderWidth: 2, borderColor: NEU_ACCENT },
                        ]}
                      >
                        {selectedTextColor === color && <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}>✓</Text>}
                      </NeuView>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[barStyles.vDivider, { backgroundColor: p.darkShadow, opacity: 0.25 }]} />

              {/* ── Font ── kept horizontally scrollable */}
              <View style={[barStyles.section, { width: 156 }]}>
                <Text style={[barStyles.sLabel, { color: sub }]}>Font</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: MINI_GAP }}>
                  {FONTS.map(font => (
                    <NeuPressable
                      key={font.value}
                      isDark={isDark}
                      radius={7}
                      backgroundColor={selectedFont === font.value ? NEU_ACCENT : undefined}
                      style={{ paddingHorizontal: 6, paddingVertical: 5, width: 70, alignItems: 'center' }}
                      onPress={() => onFontChange(font.value)}
                    >
                      <Text style={{ fontSize: 15, color: selectedFont === font.value ? '#FFFFFF' : text, fontFamily: font.value }} numberOfLines={1} adjustsFontSizeToFit>
                        {font.name}
                      </Text>
                    </NeuPressable>
                  ))}
                </View>
              </View>

              <View style={[barStyles.vDivider, { backgroundColor: p.darkShadow, opacity: 0.25 }]} />

              {/* ── Font Size ── */}
              <View style={[barStyles.section, { width: 106 }]}>
                <Text style={[barStyles.sLabel, { color: sub }]}>Size</Text>
                <NeuView isDark={isDark} inset radius={8} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity style={barStyles.stepBtn} onPress={() => onFontSizeChange(Math.max(6, selectedFontSize - 2))}>
                    <Text style={{ fontSize: 18, fontWeight: '400', color: NEU_ACCENT }}>−</Text>
                  </TouchableOpacity>
                  <Text style={{ width: 30, textAlign: 'center', fontSize: 15, fontWeight: '600', color: text }}>{selectedFontSize}</Text>
                  <TouchableOpacity style={barStyles.stepBtn} onPress={() => onFontSizeChange(Math.min(36, selectedFontSize + 2))}>
                    <Text style={{ fontSize: 18, fontWeight: '400', color: NEU_ACCENT }}>+</Text>
                  </TouchableOpacity>
                </NeuView>
              </View>

              <View style={[barStyles.vDivider, { backgroundColor: p.darkShadow, opacity: 0.25 }]} />

              {/* ── Text Style ── */}
              <View style={[barStyles.section, { width: 138 }]}>
                <Text style={[barStyles.sLabel, { color: sub }]}>Style</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: MINI_GAP }}>
                  {(['normal', 'bold', 'italic', 'underline'] as TextStyle[]).map(style => (
                    <NeuPressable
                      key={style}
                      isDark={isDark}
                      radius={7}
                      backgroundColor={selectedTextStyle === style ? NEU_ACCENT : undefined}
                      style={{ paddingHorizontal: 6, paddingVertical: 5, width: 62, alignItems: 'center' }}
                      onPress={() => onTextStyleChange(style)}
                    >
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        style={[
                        { fontSize: 15, color: selectedTextStyle === style ? '#FFFFFF' : text },
                        style === 'bold' && { fontWeight: 'bold' },
                        style === 'italic' && { fontStyle: 'italic' },
                        style === 'underline' && { textDecorationLine: 'underline' },
                      ]}>
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </Text>
                    </NeuPressable>
                  ))}
                </View>
              </View>

              <View style={[barStyles.vDivider, { backgroundColor: p.darkShadow, opacity: 0.25 }]} />

              {/* ── Margins ── */}
              <View style={[barStyles.section, { width: 180 }]}>
                <Text style={[barStyles.sLabel, { color: sub }]}>Margins</Text>
                {(['top', 'bottom', 'left', 'right'] as const).map(side => (
                  <View key={side} style={barStyles.marginRow}>
                    <Text style={{ fontSize: 15, fontWeight: '500', color: text, width: 42 }}>{side.charAt(0).toUpperCase() + side.slice(1)}</Text>
                    <NeuView isDark={isDark} inset radius={8} style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity
                        style={barStyles.stepBtn}
                        onPress={() => onMarginsChange({ ...selectedMargins, [side]: Math.max(0, selectedMargins[side] - 4) })}
                      >
                        <Text style={{ fontSize: 18, fontWeight: '400', color: NEU_ACCENT }}>−</Text>
                      </TouchableOpacity>
                      <Text style={{ width: 30, textAlign: 'center', fontSize: 15, fontWeight: '600', color: text }}>{selectedMargins[side]}</Text>
                      <TouchableOpacity
                        style={barStyles.stepBtn}
                        onPress={() => onMarginsChange({ ...selectedMargins, [side]: Math.min(100, selectedMargins[side] + 4) })}
                      >
                        <Text style={{ fontSize: 18, fontWeight: '400', color: NEU_ACCENT }}>+</Text>
                      </TouchableOpacity>
                    </NeuView>
                  </View>
                ))}
              </View>

              <View style={[barStyles.vDivider, { backgroundColor: p.darkShadow, opacity: 0.25 }]} />

              {/* ── Spacing (both types — checklist gets item gaps, text gets line spacing) ── */}
              <View style={[barStyles.section, { width: contentType === 'checklist' ? 140 : 110 }]}>
                <Text style={[barStyles.sLabel, { color: sub }]}>{contentType === 'checklist' ? 'Item Spacing' : 'Line Spacing'}</Text>
                {contentType === 'checklist' ? (
                  ([
                    { key: 'top', label: 'Above' },
                    { key: 'bottom', label: 'Below' },
                  ] as { key: keyof ItemSpacing; label: string }[]).map(({ key, label }) => (
                    <View key={key} style={barStyles.marginRow}>
                      <Text style={{ fontSize: 15, fontWeight: '500', color: text, width: 42 }}>{label}</Text>
                      <NeuView isDark={isDark} inset radius={8} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                          style={barStyles.stepBtn}
                          onPress={() => onItemSpacingChange({ ...selectedItemSpacing, [key]: Math.max(0, selectedItemSpacing[key] - 2) })}
                        >
                          <Text style={{ fontSize: 18, fontWeight: '400', color: NEU_ACCENT }}>−</Text>
                        </TouchableOpacity>
                        <Text style={{ width: 30, textAlign: 'center', fontSize: 15, fontWeight: '600', color: text }}>{selectedItemSpacing[key]}</Text>
                        <TouchableOpacity
                          style={barStyles.stepBtn}
                          onPress={() => onItemSpacingChange({ ...selectedItemSpacing, [key]: Math.min(48, selectedItemSpacing[key] + 2) })}
                        >
                          <Text style={{ fontSize: 18, fontWeight: '400', color: NEU_ACCENT }}>+</Text>
                        </TouchableOpacity>
                      </NeuView>
                    </View>
                  ))
                ) : (
                  <NeuView isDark={isDark} inset radius={8} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      style={barStyles.stepBtn}
                      onPress={() => onLineSpacingChange(Math.max(0, selectedLineSpacing - 2))}
                    >
                      <Text style={{ fontSize: 18, fontWeight: '400', color: NEU_ACCENT }}>−</Text>
                    </TouchableOpacity>
                    <Text style={{ width: 30, textAlign: 'center', fontSize: 15, fontWeight: '600', color: text }}>{selectedLineSpacing}</Text>
                    <TouchableOpacity
                      style={barStyles.stepBtn}
                      onPress={() => onLineSpacingChange(Math.min(30, selectedLineSpacing + 2))}
                    >
                      <Text style={{ fontSize: 18, fontWeight: '400', color: NEU_ACCENT }}>+</Text>
                    </TouchableOpacity>
                  </NeuView>
                )}
              </View>

              {/* ── Display / Order (checklist only) ── */}
              {contentType === 'checklist' && (
                <>
                  <View style={[barStyles.vDivider, { backgroundColor: p.darkShadow, opacity: 0.25 }]} />
                  <View style={[barStyles.section, { width: 110 }]}>
                    <Text style={[barStyles.sLabel, { color: sub }]}>Display</Text>
                    {([
                      { value: 'single', label: 'Line' },
                      { value: 'wrap', label: 'Wrap' },
                    ] as { value: ChecklistTextMode; label: string }[]).map(opt => (
                      <NeuPressable
                        key={opt.value}
                        isDark={isDark}
                        radius={8}
                        backgroundColor={selectedChecklistTextMode === opt.value ? NEU_ACCENT : undefined}
                        style={{ paddingHorizontal: 10, paddingVertical: 8, marginBottom: 5, alignItems: 'center' }}
                        onPress={() => onChecklistTextModeChange(opt.value)}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '500', textAlign: 'center', color: selectedChecklistTextMode === opt.value ? '#FFFFFF' : sub }}>
                          {opt.label}
                        </Text>
                      </NeuPressable>
                    ))}
                  </View>
                  <View style={[barStyles.vDivider, { backgroundColor: p.darkShadow, opacity: 0.25 }]} />
                  <View style={[barStyles.section, { width: 124 }]}>
                    <Text style={[barStyles.sLabel, { color: sub }]}>Order</Text>
                    {([
                      { value: 'as-is', label: 'As Is' },
                      { value: 'unchecked-first', label: 'Pending First' },
                      { value: 'alphabetical', label: 'A → Z' },
                    ] as { value: ChecklistSort; label: string }[]).map(opt => (
                      <NeuPressable
                        key={opt.value}
                        isDark={isDark}
                        radius={8}
                        backgroundColor={selectedChecklistSort === opt.value ? NEU_ACCENT : undefined}
                        style={{ paddingHorizontal: 10, paddingVertical: 8, marginBottom: 5, alignItems: 'center' }}
                        onPress={() => onChecklistSortChange(opt.value)}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '500', textAlign: 'center', color: selectedChecklistSort === opt.value ? '#FFFFFF' : sub }}>
                          {opt.label}
                        </Text>
                      </NeuPressable>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          </NeuView>

          {/* ✕ floats at the top-right corner of the bar, outside the scroll area */}
          <NeuPressable
            isDark={isDark}
            radius={18}
            backgroundColor={NEU_DANGER}
            style={{ position: 'absolute', bottom: 24 + STYLING_BAR_HEIGHT - 18, right: 14, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
            onPress={handleXPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 14, color: '#FFFFFF', fontWeight: '700' }}>✕</Text>
          </NeuPressable>
          </>
        )}

        {/* Discard confirmation overlay — inline so it works inside the existing Modal on iOS */}
        {showDiscardConfirm && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', zIndex: 100 }]}>
            <NeuView isDark={isDark} radius={NEU_RADIUS.lg} style={{ width: 300, padding: 24 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: text, marginBottom: 8, textAlign: 'center' }}>Discard Changes?</Text>
              <Text style={{ fontSize: 14, color: sub, lineHeight: 20, textAlign: 'center', marginBottom: 20 }}>
                All styling changes made since opening the panel will be reverted.
              </Text>

              {/* Don't show again checkbox */}
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}
                onPress={() => setDontShowAgain(v => !v)}
                activeOpacity={0.7}
              >
                <NeuView
                  isDark={isDark}
                  inset={!dontShowAgain}
                  radius={6}
                  backgroundColor={dontShowAgain ? NEU_ACCENT : undefined}
                  style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}
                >
                  {dontShowAgain && <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>✓</Text>}
                </NeuView>
                <Text style={{ fontSize: 14, color: text, flex: 1 }}>Don't show this again</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <NeuPressable
                  isDark={isDark}
                  radius={NEU_RADIUS.sm}
                  style={{ flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => setShowDiscardConfirm(false)}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: NEU_ACCENT }}>Keep Editing</Text>
                </NeuPressable>
                <NeuPressable
                  isDark={isDark}
                  radius={NEU_RADIUS.sm}
                  backgroundColor={NEU_DANGER}
                  style={{ flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' }}
                  onPress={handleConfirmDiscard}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>Discard</Text>
                </NeuPressable>
              </View>
            </NeuView>
          </View>
        )}

      </KeyboardAvoidingView>
    </Modal>
  );
};

export default NoteModal;

// ── Card styles ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  textInput: { flex: 1, padding: 0 },
});

// ── Checklist styles ───────────────────────────────────────────────────────────

const clStyles = StyleSheet.create({
  titleRow: { width: '100%', marginVertical: 4, paddingBottom: 4 },
  titleInput: { fontWeight: '700', color: '#1C1C1E', paddingVertical: 6, paddingHorizontal: 0 },
  row: { flexDirection: 'row', alignItems: 'center' },
  checkboxTouch: { marginRight: ROW_GAP, alignItems: 'center', justifyContent: 'center' },
  inputWrap: { flex: 1, justifyContent: 'center', position: 'relative' },
  input: { flex: 1, color: '#3A3A3C', paddingVertical: 4, paddingHorizontal: 0 },
  crossed: { textDecorationLine: 'line-through', color: '#AEAEB2' },
});

// ── Styling bar styles ─────────────────────────────────────────────────────────

const barStyles = StyleSheet.create({
  section: {
    paddingHorizontal: 8,
  },
  sLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  vDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 3,
  },
  svgToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: MINI_GAP },
  disabled: { opacity: 0.35 },
  stepBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  marginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
});