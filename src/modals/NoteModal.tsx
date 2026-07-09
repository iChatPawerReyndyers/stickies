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
import { ChecklistItem, ContentType, TextStyle, NoteMargins, DEFAULT_MARGINS, ChecklistSort, ChecklistTextMode } from '../types';
import { COLORS, TEXT_COLORS, FONTS } from '../constants';
import { FRAME_COMPONENTS } from '../frames';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.5;
const STYLING_BAR_HEIGHT = Math.round(SCREEN_HEIGHT * 0.25);
const MODAL_WIDTH = 320;
const CARD_HORIZONTAL_PADDING = 24;
const CHECKBOX_SIZE = 26;
const ROW_GAP = 14;
const BRUSH_HEIGHT = 24;
const AVAILABLE_TEXT_ROW_WIDTH =
  MODAL_WIDTH - CARD_HORIZONTAL_PADDING * 2 - CHECKBOX_SIZE - ROW_GAP;
const MINI_SWATCH = 26;
const MINI_GAP = 5;

const CHECKBOX_STROKE_COLOR = '#1C1C1E';
const CHECKBOX_CHECKED_FILL = '#1C1C1E';
const BRUSH_STROKE_COLOR = '#E7C4B2';

// ── SVG Checkbox ───────────────────────────────────────────────────────────────

const CheckboxIcon: React.FC<{ checked: boolean; size?: number }> = ({ checked, size = CHECKBOX_SIZE }) => (
  <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    <Rect
      x={size * 0.08} y={size * 0.08}
      width={size * 0.84} height={size * 0.84}
      rx={size * 0.26} ry={size * 0.26}
      stroke={CHECKBOX_STROKE_COLOR} strokeWidth={size * 0.1}
      fill={checked ? CHECKBOX_CHECKED_FILL : 'transparent'}
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
  selectedChecklistSort, onChecklistSortChange,
  selectedChecklistTextMode, onChecklistTextModeChange,
  onSave, onCancel,
  showDiscardConfirmation, onDisableDiscardConfirmation,
  previewMode = false,
  initialShowStyling = false,
}: NoteModalProps) => {
  const [showStyling, setShowStyling] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [stylingSnapshot, setStylingSnapshot] = useState<StylingSnapshot | null>(null);
  // Which checklist item (if any) currently has keyboard focus. While an item
  // is focused we skip live re-sorting so the row doesn't jump under the user's
  // finger/cursor as they type (e.g. under alphabetical sort).
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const scrollRef = useRef<ScrollView | null>(null);
  const enterPressedRef = useRef(false);
  // Tracks whether an empty checklist item has already seen one Backspace press —
  // a second consecutive Backspace on a still-empty item deletes it.
  const backspacePendingRef = useRef<{ [id: string]: boolean }>({});

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
    if (visible && initialShowStyling) setShowStyling(true);
  }, [visible, initialShowStyling]);

  // The styling bar and the keyboard should never be on screen together —
  // dismiss the keyboard any time the styling bar is opened.
  useEffect(() => {
    if (showStyling) Keyboard.dismiss();
  }, [showStyling]);

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
    const base: any = { fontFamily: selectedFont, color: selectedTextColor, fontSize: selectedFontSize };
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
      selectedTextStyle, useSvgBackground, selectedMargins, selectedChecklistSort,
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
      onChecklistSortChange(stylingSnapshot.selectedChecklistSort);
      onChecklistTextModeChange(stylingSnapshot.selectedChecklistTextMode);
    }
    setStylingSnapshot(null);
    setShowStyling(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* Semi-transparent backdrop — tapping it dismisses the modal */}
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={onCancel} />

        {/* Note card — 50% height; when styling open, centers within the top 3/4 above the bar */}
        <View
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: showStyling ? STYLING_BAR_HEIGHT : 0 }}
          pointerEvents="box-none"
        >
          <View
            style={[
              s.card,
              { backgroundColor: FrameComponent ? 'transparent' : selectedColor },
              { height: MODAL_HEIGHT },
            ]}
            onStartShouldSetResponder={() => true}
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
            <View style={s.topToolbar}>
              <Text style={s.headerLabel} numberOfLines={1}>{tabName}</Text>
              <TouchableOpacity
                onPress={showStyling ? saveStyling : openStyling}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={[s.arrowIconV, showStyling && { color: '#007AFF' }]}>
                  {showStyling ? '✓' : 'v'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={s.dividerLine} />

            {/* Content area — locked from touches while the styling bar is open so
                tapping a text field underneath can't bring the keyboard back up */}
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
                  if (previewMode) {
                    if (index === 0) {
                      return (
                        <View key={item.id} style={clStyles.titleRow}>
                          <Text style={[clStyles.titleInput, { fontSize: Math.max(selectedFontSize + 4, 18) }]}>{item.text}</Text>
                        </View>
                      );
                    }
                    return (
                      <View key={item.id} style={clStyles.row}>
                        <View style={clStyles.checkboxTouch}>
                          <CheckboxIcon checked={item.completed} />
                        </View>
                        <View style={clStyles.inputWrap}>
                          {selectedChecklistTextMode === 'single' && <BrushStroke index={index} />}
                          <Text style={[clStyles.input, { fontSize: selectedFontSize }, item.completed && clStyles.crossed]}>{item.text}</Text>
                        </View>
                      </View>
                    );
                  }
                  if (index === 0) {
                    return (
                      <View key={item.id} style={clStyles.titleRow}>
                        <TextInput
                          ref={el => { inputRefs.current[item.id] = el; }}
                          style={[clStyles.titleInput, { fontSize: Math.max(selectedFontSize + 4, 18) }]}
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
                    <View key={item.id} style={clStyles.row}>
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
                          style={[clStyles.input, { fontSize: selectedFontSize }, item.completed && clStyles.crossed]}
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
                {!previewMode ? (
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
                    autoFocus={!previewMode}
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

            <View style={s.dividerLine} />

            {/* Footer */}
            {previewMode ? (
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
        </View>

        {/* Styling bar — bottom sheet, sibling to the card, inside the same Modal */}
        {showStyling && (
          <>
            <View style={barStyles.bottomSheet}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={barStyles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
              {/* ── Content Type ── */}
              <View style={[barStyles.section, { width: 110 }]}>
                <Text style={barStyles.sLabel}>Type</Text>
                {(['text', 'checklist'] as ContentType[]).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[barStyles.miniBtn, contentType === type && barStyles.miniBtnActive]}
                    onPress={() => onContentTypeChange(type)}
                  >
                    <Text style={[barStyles.miniBtnText, contentType === type && barStyles.miniBtnTextActive]}>
                      {type === 'text' ? 'Text' : 'Checklist'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Background ── */}
              <View style={[barStyles.section, { width: 138 }]}>
                <Text style={barStyles.sLabel}>Background</Text>
                <TouchableOpacity style={barStyles.svgToggle} onPress={() => onUseSvgBackgroundChange(!useSvgBackground)}>
                  <View style={[barStyles.miniCheck, useSvgBackground && barStyles.miniCheckOn]}>
                    {useSvgBackground && <Text style={barStyles.miniCheckMark}>✓</Text>}
                  </View>
                  <Text style={barStyles.svgToggleText}>SVG Frame</Text>
                </TouchableOpacity>
                <View
                  style={[barStyles.swatchGrid, useSvgBackground && barStyles.disabled]}
                  pointerEvents={useSvgBackground ? 'none' : 'auto'}
                >
                  {COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[barStyles.swatch, { backgroundColor: color }, selectedColor === color && barStyles.swatchSel]}
                      onPress={() => onColorChange(color)}
                    >
                      {selectedColor === color && <Text style={barStyles.swatchCheck}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Font Color ── */}
              <View style={[barStyles.section, { width: 148 }]}>
                <Text style={barStyles.sLabel}>Font Color</Text>
                <View style={barStyles.swatchGrid}>
                  {TEXT_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[barStyles.swatch, { backgroundColor: color }, selectedTextColor === color && barStyles.swatchSel]}
                      onPress={() => onTextColorChange(color)}
                    >
                      {selectedTextColor === color && <Text style={barStyles.swatchCheck}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Font ── */}
              <View style={[barStyles.section, { width: 156 }]}>
                <Text style={barStyles.sLabel}>Font</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: MINI_GAP }}>
                  {FONTS.map(font => (
                    <TouchableOpacity
                      key={font.value}
                      style={[barStyles.fontChip, selectedFont === font.value && barStyles.miniBtnActive]}
                      onPress={() => onFontChange(font.value)}
                    >
                      <Text style={[barStyles.fontChipText, { fontFamily: font.value }, selectedFont === font.value && barStyles.miniBtnTextActive]} numberOfLines={1} adjustsFontSizeToFit>
                        {font.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Font Size ── */}
              <View style={[barStyles.section, { width: 106 }]}>
                <Text style={barStyles.sLabel}>Size</Text>
                <View style={barStyles.stepper}>
                  <TouchableOpacity style={barStyles.stepBtn} onPress={() => onFontSizeChange(Math.max(10, selectedFontSize - 2))}>
                    <Text style={barStyles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={barStyles.stepVal}>{selectedFontSize}</Text>
                  <TouchableOpacity style={barStyles.stepBtn} onPress={() => onFontSizeChange(Math.min(36, selectedFontSize + 2))}>
                    <Text style={barStyles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Text Style ── */}
              <View style={[barStyles.section, { width: 138 }]}>
                <Text style={barStyles.sLabel}>Style</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: MINI_GAP }}>
                  {(['normal', 'bold', 'italic', 'underline'] as TextStyle[]).map(style => (
                    <TouchableOpacity
                      key={style}
                      style={[barStyles.styleChip, selectedTextStyle === style && barStyles.miniBtnActive]}
                      onPress={() => onTextStyleChange(style)}
                    >
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        style={[
                        barStyles.styleChipText,
                        style === 'bold' && { fontWeight: 'bold' },
                        style === 'italic' && { fontStyle: 'italic' },
                        style === 'underline' && { textDecorationLine: 'underline' },
                        selectedTextStyle === style && barStyles.miniBtnTextActive,
                      ]}>
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={barStyles.vDivider} />

              {/* ── Margins ── */}
              <View style={[barStyles.section, { width: 180 }]}>
                <Text style={barStyles.sLabel}>Margins</Text>
                {(['top', 'bottom', 'left', 'right'] as const).map(side => (
                  <View key={side} style={barStyles.marginRow}>
                    <Text style={barStyles.marginLabel}>{side.charAt(0).toUpperCase() + side.slice(1)}</Text>
                    <View style={barStyles.stepper}>
                      <TouchableOpacity
                        style={barStyles.stepBtn}
                        onPress={() => onMarginsChange({ ...selectedMargins, [side]: Math.max(0, selectedMargins[side] - 4) })}
                      >
                        <Text style={barStyles.stepBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={barStyles.stepVal}>{selectedMargins[side]}</Text>
                      <TouchableOpacity
                        style={barStyles.stepBtn}
                        onPress={() => onMarginsChange({ ...selectedMargins, [side]: Math.min(100, selectedMargins[side] + 4) })}
                      >
                        <Text style={barStyles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {/* ── Order (checklist only) ── */}
              {contentType === 'checklist' && (
                <>
                  <View style={barStyles.vDivider} />
                  <View style={[barStyles.section, { width: 110 }]}>
                    <Text style={barStyles.sLabel}>Display</Text>
                    {([
                      { value: 'single', label: 'Line' },
                      { value: 'wrap', label: 'Wrap' },
                    ] as { value: ChecklistTextMode; label: string }[]).map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[barStyles.miniBtn, selectedChecklistTextMode === opt.value && barStyles.miniBtnActive]}
                        onPress={() => onChecklistTextModeChange(opt.value)}
                      >
                        <Text style={[barStyles.miniBtnText, { textAlign: 'center' }, selectedChecklistTextMode === opt.value && barStyles.miniBtnTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={barStyles.vDivider} />
                  <View style={[barStyles.section, { width: 124 }]}>
                    <Text style={barStyles.sLabel}>Order</Text>
                    {([
                      { value: 'as-is', label: 'As Is' },
                      { value: 'unchecked-first', label: 'Pending First' },
                      { value: 'alphabetical', label: 'A → Z' },
                    ] as { value: ChecklistSort; label: string }[]).map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[barStyles.miniBtn, selectedChecklistSort === opt.value && barStyles.miniBtnActive]}
                        onPress={() => onChecklistSortChange(opt.value)}
                      >
                        <Text style={[barStyles.miniBtnText, { textAlign: 'center' }, selectedChecklistSort === opt.value && barStyles.miniBtnTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          </View>

          {/* ✕ floats at the top-right corner of the bar, outside the scroll area */}
          <TouchableOpacity
            style={barStyles.discardBtn}
            onPress={handleXPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={barStyles.discardText}>✕</Text>
          </TouchableOpacity>
          </>
        )}

        {/* Discard confirmation overlay — inline so it works inside the existing Modal on iOS */}
        {showDiscardConfirm && (
          <View style={[StyleSheet.absoluteFill, confirmStyles.backdrop]}>
            <View style={confirmStyles.card}>
              <Text style={confirmStyles.title}>Discard Changes?</Text>
              <Text style={confirmStyles.message}>
                All styling changes made since opening the panel will be reverted.
              </Text>

              {/* Don't show again checkbox */}
              <TouchableOpacity
                style={confirmStyles.checkRow}
                onPress={() => setDontShowAgain(v => !v)}
                activeOpacity={0.7}
              >
                <View style={[confirmStyles.checkbox, dontShowAgain && confirmStyles.checkboxChecked]}>
                  {dontShowAgain && <Text style={confirmStyles.checkMark}>✓</Text>}
                </View>
                <Text style={confirmStyles.checkLabel}>Don't show this again</Text>
              </TouchableOpacity>

              <View style={confirmStyles.btnRow}>
                <TouchableOpacity
                  style={[confirmStyles.btn, confirmStyles.btnKeep]}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
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
  dividerLine: { height: 1, backgroundColor: '#E5E5EA' },
  textInput: { flex: 1, fontSize: 16, lineHeight: 22, padding: 0 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  btn: { flex: 0.47, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnCancel: { backgroundColor: '#F2F2F7' },
  btnConfirm: { backgroundColor: '#007AFF' },
  cancelText: { fontSize: 15, fontWeight: '700', color: '#FF3B30' },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

// ── Checklist styles ───────────────────────────────────────────────────────────

const clStyles = StyleSheet.create({
  titleRow: { width: '100%', marginVertical: 4, paddingBottom: 4 },
  titleInput: { fontWeight: '700', color: '#1C1C1E', paddingVertical: 6, paddingHorizontal: 0 },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
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
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  discardBtn: {
    position: 'absolute',
    bottom: 24 + STYLING_BAR_HEIGHT - 18,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  discardText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  section: {
    paddingHorizontal: 8,
  },
  sLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  vDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
    alignSelf: 'stretch',
    marginHorizontal: 3,
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
  miniBtnText: { fontSize: 14, fontWeight: '500', color: '#3A3A3C' },
  miniBtnTextActive: { color: '#FFFFFF' },
  svgToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  miniCheck: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    marginRight: 5,
  },
  miniCheckOn: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  miniCheckMark: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  svgToggleText: { fontSize: 14, color: '#1C1C1E', fontWeight: '500' },
  swatchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: MINI_GAP },
  disabled: { opacity: 0.35 },
  swatch: {
    width: MINI_SWATCH,
    height: MINI_SWATCH,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSel: { borderWidth: 2, borderColor: '#1C1C1E' },
  swatchCheck: { fontSize: 10, fontWeight: '700', color: '#1C1C1E' },
  fontChip: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: '#EFEFEF',
    width: 70,
    alignItems: 'center',
  },
  fontChipText: { fontSize: 15, color: '#3A3A3C' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 5,
  },
  stepBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 18, fontWeight: '400', color: '#007AFF' },
  stepVal: { width: 30, textAlign: 'center', fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  styleChip: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: '#EFEFEF',
    width: 62,
    alignItems: 'center',
  },
  styleChipText: { fontSize: 15, color: '#3A3A3C' },
  marginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  marginLabel: { fontSize: 15, fontWeight: '500', color: '#3A3A3C', width: 42 },
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