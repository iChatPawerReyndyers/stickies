// components/StickieStyleSection.tsx
//
// Expandable settings section for managing StickieStyles:
//   - collapsed: just a header row you tap to expand
//   - expanded: read-only preview of the selected style, a dropdown of all
//     saved styles, and "Add New" / "Edit Current" buttons
//
// Tapping Add or Edit opens NoteModal in styleEditorMode (read-only content
// + Styling bar shown together, Confirm/Cancel footer). Confirming opens
// StickieStyleNameModal to name and persist the style.

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChecklistItem, ContentType, TextStyle, ChecklistSort, ChecklistTextMode, NoteMargins, ItemSpacing } from '../types';
import { StickieStyle, makeDefaultStickieStyle } from '../types/stickieStyle';
import { loadStickieStyles, upsertStickieStyle } from '../utils/stickieStyleStorage';
import StickieStylePreviewCard from './StickieStylePreviewCard';
import StickieStyleDropdown from './StickieStyleDropdown';
import StickieStyleNameModal from './StickieStyleNameModal';
import NoteModal from '../modals/NoteModal';
import { NeuPressable } from './Neumorphic';
import { getNeuPalette, NEU_ACCENT, NEU_RADIUS } from '../theme/neumorphic';

// Sample content used only to demonstrate how a style looks — never saved,
// never shown to the user as a real note.
const DEMO_CHECKLIST: ChecklistItem[] = [
  { id: 'demo-title', text: 'Sample Note', completed: false },
  { id: 'demo-1', text: 'First item', completed: false },
  { id: 'demo-2', text: 'Second item', completed: true },
  { id: 'demo-3', text: 'Third item', completed: false },
];

type StickieStyleSectionProps = {
  isDark?: boolean;
};

const StickieStyleSection: React.FC<StickieStyleSectionProps> = ({ isDark = false }) => {
  const p = getNeuPalette(isDark);

  const [expanded, setExpanded] = useState(false);
  const [styles, setStyles] = useState<StickieStyle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Style-editor (NoteModal) state
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorMode, setEditorMode] = useState<'add' | 'edit' | null>(null);
  const [nameModalVisible, setNameModalVisible] = useState(false);

  // Draft fields mirror exactly what NoteModal expects — same pattern your
  // main note editor already uses to drive NoteModal's individual props.
  const [draftContentType, setDraftContentType] = useState<ContentType>('checklist');
  const [draftContent, setDraftContent] = useState<string | ChecklistItem[]>(DEMO_CHECKLIST);
  const [draftColor, setDraftColor] = useState('#FBDDA6');
  const [draftTextColor, setDraftTextColor] = useState('#3A3F4B');
  const [draftFont, setDraftFont] = useState('System');
  const [draftFontSize, setDraftFontSize] = useState(15);
  const [draftTextStyle, setDraftTextStyle] = useState<TextStyle>('normal');
  const [draftUseSvgBackground, setDraftUseSvgBackground] = useState(false);
  const [draftSvgFrameId, setDraftSvgFrameId] = useState<string | undefined>(undefined);
  const [draftBackgroundImageUrl, setDraftBackgroundImageUrl] = useState('');
  const [draftMargins, setDraftMargins] = useState<NoteMargins>({ top: 0, bottom: 0, left: 0, right: 0 });
  const [draftItemSpacing, setDraftItemSpacing] = useState<ItemSpacing>({ top: 4, bottom: 4 });
  const [draftLineSpacing, setDraftLineSpacing] = useState(4);
  const [draftChecklistSort, setDraftChecklistSort] = useState<ChecklistSort>('as-is');
  const [draftChecklistTextMode, setDraftChecklistTextMode] = useState<ChecklistTextMode>('single');

  useEffect(() => {
    (async () => {
      const loaded = await loadStickieStyles();
      setStyles(loaded);
      if (loaded.length > 0) setSelectedId(loaded[0].id);
    })();
  }, []);

  const selectedStyle = useMemo(
    () => styles.find(s => s.id === selectedId) || null,
    [styles, selectedId]
  );

  const loadDraftFrom = (style: StickieStyle) => {
    setDraftColor(style.color);
    setDraftTextColor(style.textColor);
    setDraftFont(style.font);
    setDraftFontSize(style.fontSize);
    setDraftTextStyle(style.textStyle);
    setDraftUseSvgBackground(style.useSvgBackground);
    setDraftSvgFrameId(style.svgFrameId);
    setDraftBackgroundImageUrl(style.backgroundImageUrl || '');
    setDraftMargins(style.margins);
    setDraftItemSpacing(style.itemSpacing);
    setDraftLineSpacing(style.lineSpacing);
    setDraftChecklistSort(style.checklistSort);
    setDraftChecklistTextMode(style.checklistTextMode);
  };

  const resetDraftToDefault = () => {
    const d = makeDefaultStickieStyle();
    setDraftColor(d.color);
    setDraftTextColor(d.textColor);
    setDraftFont(d.font);
    setDraftFontSize(d.fontSize);
    setDraftTextStyle(d.textStyle);
    setDraftUseSvgBackground(d.useSvgBackground);
    setDraftSvgFrameId(d.svgFrameId);
    setDraftBackgroundImageUrl(d.backgroundImageUrl || '');
    setDraftMargins(d.margins);
    setDraftItemSpacing(d.itemSpacing);
    setDraftLineSpacing(d.lineSpacing);
    setDraftChecklistSort(d.checklistSort);
    setDraftChecklistTextMode(d.checklistTextMode);
  };

  const openAddEditor = () => {
    resetDraftToDefault();
    setDraftContentType('checklist');
    setDraftContent(DEMO_CHECKLIST);
    setEditorMode('add');
    setEditorVisible(true);
  };

  const openEditEditor = () => {
    if (!selectedStyle) return;
    loadDraftFrom(selectedStyle);
    setDraftContentType('checklist');
    setDraftContent(DEMO_CHECKLIST);
    setEditorMode('edit');
    setEditorVisible(true);
  };

  const handleCancelEditor = () => {
    setEditorVisible(false);
    setEditorMode(null);
  };

  const handleConfirmEditor = () => {
    // Content isn't editable in style-editor mode — just close the note
    // preview/styling combo and ask for a name next.
    setEditorVisible(false);
    setNameModalVisible(true);
  };

  const handleSaveName = async (name: string) => {
    const id = editorMode === 'edit' && selectedStyle ? selectedStyle.id : Date.now().toString();
    const style: StickieStyle = {
      id,
      name,
      color: draftColor,
      useSvgBackground: draftUseSvgBackground,
      svgFrameId: draftSvgFrameId,
      backgroundImageUrl: draftBackgroundImageUrl,
      textColor: draftTextColor,
      font: draftFont,
      fontSize: draftFontSize,
      textStyle: draftTextStyle,
      lineSpacing: draftLineSpacing,
      margins: draftMargins,
      itemSpacing: draftItemSpacing,
      checklistSort: draftChecklistSort,
      checklistTextMode: draftChecklistTextMode,
    };
    const updated = await upsertStickieStyle(style);
    setStyles(updated);
    setSelectedId(id);
    setNameModalVisible(false);
    setEditorMode(null);
  };

  return (
    <View style={styles_.wrap}>
      <TouchableOpacity style={styles_.header} onPress={() => setExpanded(v => !v)} activeOpacity={0.7}>
        <Text style={[styles_.headerText, { color: p.textPrimary }]}>Stickie Styles</Text>
        <Text style={[styles_.chevron, { color: p.textSecondary }]}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles_.body}>
          <View style={styles_.previewWrap}>
            {selectedStyle ? (
              <StickieStylePreviewCard
                style={selectedStyle}
                contentType="checklist"
                content={DEMO_CHECKLIST}
              />
            ) : (
              <View style={styles_.emptyPreview}>
                <Text style={{ color: p.textSecondary, fontSize: 13 }}>No style selected</Text>
              </View>
            )}
          </View>

          <StickieStyleDropdown
            styles={styles}
            selectedId={selectedId}
            onSelect={setSelectedId}
            isDark={isDark}
          />

          <View style={styles_.btnRow}>
            <NeuPressable
              isDark={isDark}
              radius={NEU_RADIUS.md}
              backgroundColor={NEU_ACCENT}
              style={styles_.actionBtn}
              onPress={openAddEditor}
            >
              <Text style={styles_.actionBtnText}>+ Add New</Text>
            </NeuPressable>
            <NeuPressable
              isDark={isDark}
              radius={NEU_RADIUS.md}
              style={[styles_.actionBtn, !selectedStyle && styles_.actionBtnDisabled]}
              onPress={openEditEditor}
              disabled={!selectedStyle}
            >
              <Text style={[styles_.actionBtnTextSecondary, { color: p.textPrimary }]}>Edit Current</Text>
            </NeuPressable>
          </View>
        </View>
      )}

      {/* Read-only note preview + Styling bar, shown together via styleEditorMode */}
      <NoteModal
        visible={editorVisible}
        tabName={editorMode === 'edit' && selectedStyle ? selectedStyle.name : 'New Style'}
        contentType={draftContentType}
        onContentTypeChange={setDraftContentType}
        content={draftContent}
        onContentChange={setDraftContent}
        selectedColor={draftColor}
        onColorChange={setDraftColor}
        selectedTextColor={draftTextColor}
        onTextColorChange={setDraftTextColor}
        selectedFont={draftFont}
        onFontChange={setDraftFont}
        selectedFontSize={draftFontSize}
        onFontSizeChange={setDraftFontSize}
        selectedTextStyle={draftTextStyle}
        onTextStyleChange={setDraftTextStyle}
        useSvgBackground={draftUseSvgBackground}
        onUseSvgBackgroundChange={setDraftUseSvgBackground}
        svgFrameId={draftSvgFrameId}
        backgroundImageUrl={draftBackgroundImageUrl}
        onBackgroundImageUrlChange={setDraftBackgroundImageUrl}
        selectedMargins={draftMargins}
        onMarginsChange={setDraftMargins}
        selectedItemSpacing={draftItemSpacing}
        onItemSpacingChange={setDraftItemSpacing}
        selectedLineSpacing={draftLineSpacing}
        onLineSpacingChange={setDraftLineSpacing}
        selectedChecklistSort={draftChecklistSort}
        onChecklistSortChange={setDraftChecklistSort}
        selectedChecklistTextMode={draftChecklistTextMode}
        onChecklistTextModeChange={setDraftChecklistTextMode}
        onSave={handleConfirmEditor}
        onCancel={handleCancelEditor}
        showDiscardConfirmation={false}
        onDisableDiscardConfirmation={() => {}}
        initialShowStyling
        styleEditorMode
        onConfirmStyle={handleConfirmEditor}
      />

      <StickieStyleNameModal
        visible={nameModalVisible}
        initialName={editorMode === 'edit' && selectedStyle ? selectedStyle.name : ''}
        isDark={isDark}
        onCancel={() => setNameModalVisible(false)}
        onSave={handleSaveName}
      />
    </View>
  );
};

export default StickieStyleSection;

const styles_ = StyleSheet.create({
  wrap: { marginBottom: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  headerText: { fontSize: 15, fontWeight: '700' },
  chevron: { fontSize: 12 },
  body: { paddingTop: 4, paddingBottom: 8 },
  previewWrap: { alignItems: 'center', marginBottom: 14 },
  emptyPreview: {
    width: 260, height: 170,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C9D0DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { fontSize: 13.5, fontWeight: '700', color: '#FFFFFF' },
  actionBtnTextSecondary: { fontSize: 13.5, fontWeight: '700' },
});