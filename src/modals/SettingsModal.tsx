import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Share,
  Alert,
  TextInput,
  SafeAreaView,
  Pressable,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { AppSettings, AppTheme, SortOrder, Note, Tab, TextStyle, ContentType, ChecklistItem, DEFAULT_MARGINS, ChecklistSort, ChecklistTextMode, NoteMargins } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const STYLING_BAR_HEIGHT = Math.round(SCREEN_HEIGHT * 0.24);
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.5;
import { COLORS, TEXT_COLORS, FONTS } from '../constants';
import NoteModal from './NoteModal';
import { FRAME_IDS } from '../frames';
import { createStickieStyle } from '../utils/stickieStyles';

type SettingsModalProps = {
  visible: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  notes: Note[];
  tabs: Tab[];
  onImportNotes: (notes: Note[], tabs: Tab[]) => void;
};

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'manual',       label: 'Manual (drag order)' },
  { value: 'created-desc', label: 'Newest first' },
  { value: 'created-asc',  label: 'Oldest first' },
  { value: 'title-asc',    label: 'Title A → Z' },
  { value: 'title-desc',   label: 'Title Z → A' },
];

const SettingsModal = ({
  visible, onClose,
  settings, onUpdateSettings,
  notes, tabs, onImportNotes,
}: SettingsModalProps) => {
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  const [showStyleControls, setShowStyleControls] = useState(false);
  const [draftStyleName, setDraftStyleName] = useState('');
  const [draftColor, setDraftColor] = useState(settings.defaultColor);
  const [draftTextColor, setDraftTextColor] = useState(settings.defaultTextColor);
  const [draftFont, setDraftFont] = useState(settings.defaultFont);
  const [draftFontSize, setDraftFontSize] = useState(settings.defaultFontSize);
  const [draftTextStyle, setDraftTextStyle] = useState<TextStyle>('normal');
  const [draftContentType, setDraftContentType] = useState<ContentType>('text');
  const [draftUseSvgBackground, setDraftUseSvgBackground] = useState(false);
  const [draftMargins, setDraftMargins] = useState<NoteMargins>(DEFAULT_MARGINS);
  const [draftChecklistSort, setDraftChecklistSort] = useState<ChecklistSort>('as-is');
  const [draftChecklistTextMode, setDraftChecklistTextMode] = useState<ChecklistTextMode>('single');

  const isDark = settings.theme === 'dark';
  const bg   = isDark ? '#1C1C1E' : '#F2F2F7';
  const card = isDark ? '#2C2C2E' : '#FFFFFF';
  const text = isDark ? '#FFFFFF' : '#1C1C1E';
  const sub  = isDark ? '#8E8E93' : '#6C6C70';
  const sep  = isDark ? '#3C3C3E' : '#E5E5EA';

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    const payload = JSON.stringify({ notes, tabs }, null, 2);
    try {
      await Share.share({ message: payload, title: 'Stickies Backup' });
    } catch {
      Alert.alert('Export failed', 'Could not share the backup.');
    }
  };

  const handleImportConfirm = () => {
    try {
      const parsed = JSON.parse(importText);
      const importedNotes: Note[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.notes) ? parsed.notes : null;
      const importedTabs: Tab[] = Array.isArray(parsed.tabs) ? parsed.tabs : [];
      if (!importedNotes) throw new Error();
      Alert.alert(
        'Confirm Import',
        `This will merge ${importedNotes.length} note(s) into your current notes. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: () => {
              onImportNotes(importedNotes, importedTabs);
              setShowImport(false);
              setImportText('');
              Alert.alert('Done', `${importedNotes.length} notes imported.`);
            },
          },
        ]
      );
    } catch {
      Alert.alert('Invalid JSON', 'Could not parse the pasted content. Make sure it is a valid Stickies backup.');
    }
  };

  // ── Section / Row helpers ────────────────────────────────────────────────────

  const SectionHeader = ({ label }: { label: string }) => (
    <Text style={[s.sectionHeader, { color: sub }]}>{label}</Text>
  );

  const Row = ({ children, last }: { children: React.ReactNode; last?: boolean }) => (
    <View style={[s.row, { backgroundColor: card, borderBottomColor: sep }, last && { borderBottomWidth: 0 }]}>
      {children}
    </View>
  );

  const RowLabel = ({ label }: { label: string }) => (
    <Text style={[s.rowLabel, { color: text }]}>{label}</Text>
  );

  useEffect(() => {
    if (!visible) return;
    setDraftStyleName('');
    setShowStyleEditor(false);
    setShowStyleControls(false);
    setDraftColor(settings.defaultColor);
    setDraftTextColor(settings.defaultTextColor);
    setDraftFont(settings.defaultFont);
    setDraftFontSize(settings.defaultFontSize);
    setDraftTextStyle('normal');
    setDraftContentType('text');
    setDraftUseSvgBackground(false);
    setDraftMargins(DEFAULT_MARGINS);
    setDraftChecklistSort('as-is');
    setDraftChecklistTextMode('single');
  }, [visible, settings.defaultColor, settings.defaultTextColor, settings.defaultFont, settings.defaultFontSize]);

  const handleSaveStyle = () => {
    const trimmedName = draftStyleName.trim();
    if (!trimmedName) {
      Alert.alert('Style name needed', 'Please enter a name for your Stickie style before saving.');
      return;
    }

    const nextStyle = createStickieStyle({
      name: trimmedName,
      color: draftColor,
      textColor: draftTextColor,
      fontFamily: draftFont,
      fontSize: draftFontSize,
      textStyle: draftTextStyle,
      contentType: draftContentType,
      useSvgBackground: draftUseSvgBackground,
      margins: draftMargins,
      checklistSort: draftChecklistSort,
      checklistTextMode: draftChecklistTextMode,
    });

    onUpdateSettings({
      stickieStyles: [...(settings.stickieStyles || []), nextStyle],
      defaultStyleId: nextStyle.id,
      defaultColor: nextStyle.color,
      defaultTextColor: nextStyle.textColor,
      defaultFont: nextStyle.fontFamily,
      defaultFontSize: nextStyle.fontSize,
    });
    setDraftStyleName('');
    Alert.alert('Style saved', `Saved “${trimmedName}” to your Stickie styles.`);
  };

  const applyStyle = (style: NonNullable<AppSettings['stickieStyles']>[number]) => {
    onUpdateSettings({
      defaultStyleId: style.id,
      defaultColor: style.color,
      defaultTextColor: style.textColor,
      defaultFont: style.fontFamily,
      defaultFontSize: style.fontSize,
    });
    setDraftColor(style.color);
    setDraftTextColor(style.textColor);
    setDraftFont(style.fontFamily);
    setDraftFontSize(style.fontSize);
    setDraftTextStyle(style.textStyle);
    setDraftContentType(style.contentType);
    setDraftUseSvgBackground(style.useSvgBackground);
    setDraftMargins(style.margins || DEFAULT_MARGINS);
    setDraftChecklistSort(style.checklistSort || 'as-is');
    setDraftChecklistTextMode(style.checklistTextMode || 'single');
    Alert.alert('Style applied', `Using “${style.name}” for new notes.`);
  };

  const previewText = draftContentType === 'checklist'
    ? '• Checklist'
    : 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

  const previewContent: string | ChecklistItem[] = draftContentType === 'checklist'
    ? [
      { id: 'p1', text: 'Lorem ipsum dolor', completed: false },
      { id: 'p2', text: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ', completed: false },
      { id: 'p3', text: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.', completed: false },
    ]
    : previewText;

  const previewStyle: any = {
    fontFamily: draftFont,
    fontSize: Math.max(14, draftFontSize - 2),
    color: draftTextColor,
    fontWeight: draftTextStyle === 'bold' ? 'bold' : 'normal',
    fontStyle: draftTextStyle === 'italic' ? 'italic' : 'normal',
    textDecorationLine: draftTextStyle === 'underline' ? 'underline' : 'none',
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[s.container, { backgroundColor: bg }]}>

        {/* Header */}
        <View style={[s.header, { backgroundColor: card, borderBottomColor: sep }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={s.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={[s.title, { color: text }]}>Settings</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll}>

          {/* ── APPEARANCE ── */}
          <SectionHeader label="APPEARANCE" />
          <View style={[s.card, { backgroundColor: card }]}>
            <Row>
              <RowLabel label="Theme" />
              <View style={s.segmented}>
                {(['light', 'dark'] as AppTheme[]).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.seg, settings.theme === t && s.segActive]}
                    onPress={() => onUpdateSettings({ theme: t })}
                  >
                    <Text style={[s.segText, settings.theme === t && s.segTextActive]}>
                      {t === 'light' ? '☀️ Light' : '🌙 Dark'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Row>

            <Row>
              <View style={{ flex: 1 }}>
                <RowLabel label="Default Note Color" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                  {COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[s.swatch, { backgroundColor: color }, settings.defaultColor === color && s.swatchSel]}
                      onPress={() => onUpdateSettings({ defaultColor: color })}
                    >
                      {settings.defaultColor === color && <Text style={s.swatchCheck}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Row>

            <Row>
              <View style={{ flex: 1 }}>
                <RowLabel label="Default Text Color" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                  {TEXT_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[s.swatch, { backgroundColor: color }, settings.defaultTextColor === color && s.swatchSel]}
                      onPress={() => onUpdateSettings({ defaultTextColor: color })}
                    >
                      {settings.defaultTextColor === color && <Text style={[s.swatchCheck, { color: '#FFF' }]}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Row>

            <Row>
              <View style={{ flex: 1 }}>
                <RowLabel label="Default Font" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                  {FONTS.map(font => (
                    <TouchableOpacity
                      key={font.value}
                      style={[s.chip, settings.defaultFont === font.value && s.chipActive]}
                      onPress={() => onUpdateSettings({ defaultFont: font.value })}
                    >
                      <Text style={[s.chipText, { fontFamily: font.value }, settings.defaultFont === font.value && s.chipTextActive]}>
                        {font.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Row>

            <Row last>
              <RowLabel label="Default Font Size" />
              <View style={s.stepper}>
                <TouchableOpacity
                  style={s.stepBtn}
                  onPress={() => onUpdateSettings({ defaultFontSize: Math.max(10, settings.defaultFontSize - 2) })}
                >
                  <Text style={s.stepBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={[s.stepVal, { color: text }]}>{settings.defaultFontSize}</Text>
                <TouchableOpacity
                  style={s.stepBtn}
                  onPress={() => onUpdateSettings({ defaultFontSize: Math.min(36, settings.defaultFontSize + 2) })}
                >
                  <Text style={s.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </Row>
          </View>

          {/* ── LAYOUT ── */}
          <SectionHeader label="LAYOUT" />
          <View style={[s.card, { backgroundColor: card }]}>
            <Row last>
              <RowLabel label="Grid Columns" />
              <View style={s.segmented}>
                {([2, 3] as (2 | 3)[]).map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[s.seg, settings.gridColumns === n && s.segActive]}
                    onPress={() => onUpdateSettings({ gridColumns: n })}
                  >
                    <Text style={[s.segText, settings.gridColumns === n && s.segTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Row>
          </View>

          {/* ── SORT ── */}
          <SectionHeader label="SORT NOTES BY" />
          <View style={[s.card, { backgroundColor: card }]}>
            {SORT_OPTIONS.map((opt, i) => (
              <Row key={opt.value} last={i === SORT_OPTIONS.length - 1}>
                <RowLabel label={opt.label} />
                <View style={[s.radioOuter, settings.sortOrder === opt.value && s.radioOuterActive]}>
                  {settings.sortOrder === opt.value && <View style={s.radioInner} />}
                </View>
                <TouchableOpacity
                  style={StyleSheet.absoluteFill}
                  onPress={() => onUpdateSettings({ sortOrder: opt.value })}
                />
              </Row>
            ))}
          </View>

          {/* ── PREFERENCES ── */}
          <SectionHeader label="PREFERENCES" />
          <View style={[s.card, { backgroundColor: card }]}>
            <Row last>
              <View style={{ flex: 1 }}>
                <RowLabel label="Confirm style discards" />
                <Text style={[s.comingSoonText, { color: sub }]}>
                  Show confirmation when tapping ✕ in the styling bar
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onUpdateSettings({ showDiscardConfirmation: !settings.showDiscardConfirmation })}
                style={[s.toggle, settings.showDiscardConfirmation && s.toggleOn]}
              >
                <View style={[s.toggleThumb, settings.showDiscardConfirmation && s.toggleThumbOn]} />
              </TouchableOpacity>
            </Row>
          </View>

          {/* ── STICKIE STYLES ── */}
          <SectionHeader label="STICKIE STYLES" />
          <View style={[s.card, { backgroundColor: card }]}> 
            <Row>
              <View style={{ flex: 1 }}>
                <RowLabel label="Default Tab" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {tabs.map(tab => (
                    <TouchableOpacity
                      key={tab.id}
                      style={[s.tabChoice, settings.defaultTabId === tab.id && s.tabChoiceActive, { backgroundColor: tab.color }]}
                      onPress={() => onUpdateSettings({ defaultTabId: tab.id })}
                    >
                      <Text style={[s.tabChoiceText, { color: tab.textColor || '#fff' }]} numberOfLines={1}>{tab.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Row>
            <Row>
              <View style={{ flex: 1 }}>
                <RowLabel label="Style Preview" />
                <View style={[s.stylePreviewCard, { backgroundColor: draftColor, borderColor: sep }]}>
                  <Text style={[s.previewTitle, { color: draftTextColor, fontFamily: draftFont, fontWeight: draftTextStyle === 'bold' ? 'bold' : 'normal' }]}>Preview Note</Text>
                  <Text style={[s.previewBody, previewStyle]}>{previewText}</Text>
                </View>
              </View>
            </Row>

            <Row>
              <View style={{ flex: 1 }}>
                <RowLabel label="Style Name" />
                <TextInput
                  value={draftStyleName}
                  onChangeText={setDraftStyleName}
                  placeholder="My favorite style"
                  placeholderTextColor={sub}
                  style={[s.nameInput, { color: text, borderColor: sep, backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}
                />
              </View>
            </Row>

            <Row>
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => {
                  setShowStyleEditor(true);
                  setShowStyleControls(true);
                }}
              >
                <Text style={s.actionBtnText}>Add New StickieStyle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={handleSaveStyle}>
                <Text style={s.actionBtnText}>Save Style</Text>
              </TouchableOpacity>
            </Row>

            {(settings.stickieStyles || []).length > 0 && (
              <View>
                {settings.stickieStyles?.map(style => (
                  <View key={style.id} style={[s.savedStyleRow, { borderColor: sep }]}> 
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => applyStyle(style)}>
                      <Text style={[s.savedStyleName, { color: text }]}>{style.name}</Text>
                      <Text style={[s.savedStyleMeta, { color: sub }]}> {style.color} · {style.textColor}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.smallActionBtn, settings.defaultStyleId === style.id && s.smallActionBtnActive]}
                      onPress={() => applyStyle(style)}
                    >
                      <Text style={[s.smallActionBtnText, settings.defaultStyleId === style.id && { color: '#FFF' }]}>Use</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── DATA ── */}
          <SectionHeader label="DATA" />
          <View style={[s.card, { backgroundColor: card }]}>
            <Row>
              <RowLabel label="Export Notes (JSON)" />
              <TouchableOpacity style={s.actionBtn} onPress={handleExport}>
                <Text style={s.actionBtnText}>Export</Text>
              </TouchableOpacity>
            </Row>
            <Row>
              <RowLabel label="Import Notes (JSON)" />
              <TouchableOpacity style={s.actionBtn} onPress={() => setShowImport(true)}>
                <Text style={s.actionBtnText}>Import</Text>
              </TouchableOpacity>
            </Row>
            <Row last>
              <View style={{ flex: 1 }}>
                <RowLabel label="Import StickieStyle" />
                <Text style={[s.comingSoonText, { color: sub }]}>Details coming soon</Text>
              </View>
              <TouchableOpacity style={[s.actionBtn, s.actionBtnDisabled]} disabled>
                <Text style={[s.actionBtnText, { color: sub }]}>Import</Text>
              </TouchableOpacity>
            </Row>
          </View>

          {/* ── ACCOUNT ── */}
          <SectionHeader label="ACCOUNT" />
          <View style={[s.card, { backgroundColor: card }]}>
            <Row last>
              <View style={{ flex: 1 }}>
                <RowLabel label="Connect with Google" />
                <Text style={[s.comingSoonText, { color: sub }]}>Coming soon</Text>
              </View>
              <TouchableOpacity style={[s.actionBtn, s.actionBtnDisabled]} disabled>
                <Text style={[s.actionBtnText, { color: sub }]}>Connect</Text>
              </TouchableOpacity>
            </Row>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        <NoteModal
          visible={showStyleEditor}
          tabName="Preview"
          contentType={draftContentType}
          onContentTypeChange={setDraftContentType}
          content={previewContent}
          onContentChange={() => {}}
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
          svgFrameId={draftUseSvgBackground ? FRAME_IDS[0] : undefined}
          selectedMargins={draftMargins}
          onMarginsChange={setDraftMargins}
          selectedChecklistSort={draftChecklistSort}
          onChecklistSortChange={setDraftChecklistSort}
          selectedChecklistTextMode={draftChecklistTextMode}
          onChecklistTextModeChange={setDraftChecklistTextMode}
          onSave={() => { handleSaveStyle(); setShowStyleEditor(false); setShowStyleControls(false); }}
          onCancel={() => { setShowStyleEditor(false); setShowStyleControls(false); }}
          showDiscardConfirmation={settings.showDiscardConfirmation}
          onDisableDiscardConfirmation={() => onUpdateSettings({ showDiscardConfirmation: false })}
          previewMode={true}
          initialShowStyling={true}
        />

        {/* Import JSON overlay */}
        <Modal visible={showImport} animationType="slide" transparent onRequestClose={() => setShowImport(false)}>
          <View style={s.importOverlay}>
            <View style={[s.importCard, { backgroundColor: card }]}>
              <View style={s.importHeader}>
                <TouchableOpacity onPress={() => { setShowImport(false); setImportText(''); }}>
                  <Text style={s.backBtn}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[s.title, { color: text }]}>Import JSON</Text>
                <TouchableOpacity onPress={handleImportConfirm}>
                  <Text style={s.importDone}>Import</Text>
                </TouchableOpacity>
              </View>
              <Text style={[s.importHint, { color: sub }]}>
                Paste your Stickies backup JSON below. Notes will be merged with your existing data.
              </Text>
              <TextInput
                style={[s.importInput, { color: text, borderColor: sep }]}
                multiline
                value={importText}
                onChangeText={setImportText}
                placeholder='Paste JSON here…'
                placeholderTextColor={sub}
                textAlignVertical="top"
                autoFocus
              />
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </Modal>
  );
};

export default SettingsModal;

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { fontSize: 16, color: '#007AFF', fontWeight: '500' },
  title: { fontSize: 17, fontWeight: '600' },
  scroll: { padding: 16 },
  sectionHeader: {
    fontSize: 12, fontWeight: '600', letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: 8, marginLeft: 4, marginTop: 16,
  },
  card: { borderRadius: 12, overflow: 'hidden', marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flex: 1, fontSize: 15 },
  // Segmented control
  segmented: { flexDirection: 'row', backgroundColor: '#E5E5EA', borderRadius: 8, padding: 2 },
  seg: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  segActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 2, elevation: 2 },
  segText: { fontSize: 13, color: '#666' },
  segTextActive: { color: '#000', fontWeight: '600' },
  // Swatches
  swatch: { width: 34, height: 34, borderRadius: 8, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  swatchSel: { borderWidth: 2.5, borderColor: '#1C1C1E' },
  swatchCheck: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  // Font chips
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F2F2F7', marginRight: 8 },
  chipActive: { backgroundColor: '#007AFF' },
  chipText: { fontSize: 13, color: '#1C1C1E' },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7', borderRadius: 8, overflow: 'hidden' },
  stepBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 20, color: '#007AFF' },
  stepVal: { width: 36, textAlign: 'center', fontSize: 15, fontWeight: '600' },
  // Radio
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#C7C7CC',
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: '#007AFF' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#007AFF' },
  // Action buttons
  actionBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#007AFF', borderRadius: 8 },
  actionBtnDisabled: { backgroundColor: '#F2F2F7' },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  comingSoonText: { fontSize: 12, marginTop: 2 },
  toggle: {
    width: 51,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
    padding: 2,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: '#34C759',
  },
  toggleThumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    alignSelf: 'flex-start',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  stylePreviewCard: {
    marginTop: 10,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    minHeight: 110,
  },
  tabChoice: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabChoiceActive: {
    borderWidth: 2,
    borderColor: '#00000033',
  },
  tabChoiceText: { fontSize: 13, fontWeight: '600' },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  previewBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  nameInput: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  savedStyleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  savedStyleName: {
    fontSize: 14,
    fontWeight: '600',
  },
  savedStyleMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  smallActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  smallActionBtnActive: {
    backgroundColor: '#007AFF',
  },
  smallActionBtnText: {
    fontSize: 13,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  styleEditorOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  styleEditorBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  styleEditorCard: {
    width: '90%',
    maxWidth: 360,
    height: MODAL_HEIGHT,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 16,
    overflow: 'hidden',
  },
  styleEditorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  styleEditorHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  styleEditorTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  styleEditorAction: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  styleEditorCanvas: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  styleEditorNote: {
    width: '100%',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    minHeight: 220,
  },
  styleEditorNoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  styleEditorNoteTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  styleEditorNoteBadge: {
    fontSize: 14,
    fontWeight: '700',
  },
  styleEditorNoteText: {
    fontSize: 14,
    lineHeight: 20,
  },
  styleEditorBottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: STYLING_BAR_HEIGHT,
    backgroundColor: '#F2F2F7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  styleEditorBottomSheetContent: {
    paddingRight: 12,
    paddingBottom: 8,
  },
  styleEditorSection: {
    marginRight: 10,
  },
  styleEditorSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  styleEditorMiniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    alignItems: 'center',
  },
  styleEditorMiniBtnActive: {
    backgroundColor: '#007AFF',
  },
  styleEditorMiniBtnText: {
    fontSize: 12,
    color: '#3A3A3C',
    fontWeight: '500',
  },
  styleEditorMiniBtnTextActive: {
    color: '#FFFFFF',
  },
  styleEditorDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#D1D1D6',
    marginRight: 10,
  },
  styleEditorSvgToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  styleEditorMiniCheck: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  styleEditorMiniCheckOn: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  styleEditorMiniCheckMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  styleEditorSvgToggleText: {
    fontSize: 12,
    color: '#1C1C1E',
  },
  styleEditorSwatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  styleEditorDisabled: {
    opacity: 0.35,
  },
  styleEditorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleEditorSwatchSelected: {
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  styleEditorSwatchCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  styleEditorFontChip: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    minWidth: 70,
    marginBottom: 6,
    alignItems: 'center',
  },
  styleEditorFontChipText: {
    fontSize: 11,
    color: '#1C1C1E',
  },
  styleEditorStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  styleEditorStepBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleEditorStepBtnText: {
    fontSize: 16,
    color: '#007AFF',
  },
  styleEditorStepVal: {
    width: 24,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  styleEditorStyleChip: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    minWidth: 56,
    marginBottom: 6,
    alignItems: 'center',
  },
  styleEditorStyleChipText: {
    fontSize: 11,
    color: '#1C1C1E',
  },
  // Import modal
  importOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  importCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '70%' },
  importHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  importDone: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  importHint: { fontSize: 13, marginBottom: 12, lineHeight: 18 },
  importInput: {
    flex: 1, borderWidth: 1, borderRadius: 10, padding: 12,
    fontSize: 13, fontFamily: 'monospace',
  },
});