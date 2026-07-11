import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
  TextInput,
  SafeAreaView,
  Pressable,
  Dimensions,
} from 'react-native';
import { AppSettings, AppTheme, SortOrder, Note, Tab, TextStyle, ContentType, ChecklistItem, DEFAULT_MARGINS, ItemSpacing, DEFAULT_ITEM_SPACING, DEFAULT_LINE_SPACING, ChecklistSort, ChecklistTextMode, NoteMargins } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.5;
import { COLORS, TEXT_COLORS, FONTS } from '../constants';
import NoteModal from './NoteModal';
import { FRAME_IDS } from '../frames';
import { createStickieStyle } from '../utils/stickieStyles';
import { NeuView, NeuPressable, NeuToggle, NeuRadio } from '../components/Neumorphic';
import { NEU_BASE, NEU_ACCENT, NEU_DANGER, NEU_TEXT_PRIMARY, NEU_TEXT_SECONDARY, NEU_RADIUS, getNeuPalette } from '../theme/neumorphic';

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
  const [draftStyleName, setDraftStyleName] = useState('');
  const [draftColor, setDraftColor] = useState(settings.defaultColor);
  const [draftTextColor, setDraftTextColor] = useState(settings.defaultTextColor);
  const [draftFont, setDraftFont] = useState(settings.defaultFont);
  const [draftFontSize, setDraftFontSize] = useState(settings.defaultFontSize);
  const [draftTextStyle, setDraftTextStyle] = useState<TextStyle>('normal');
  const [draftContentType, setDraftContentType] = useState<ContentType>('text');
  const [draftUseSvgBackground, setDraftUseSvgBackground] = useState(false);
  const [draftMargins, setDraftMargins] = useState<NoteMargins>(DEFAULT_MARGINS);
  const [draftItemSpacing, setDraftItemSpacing] = useState<ItemSpacing>(DEFAULT_ITEM_SPACING);
  const [draftLineSpacing, setDraftLineSpacing] = useState<number>(DEFAULT_LINE_SPACING);
  const [draftChecklistSort, setDraftChecklistSort] = useState<ChecklistSort>('as-is');
  const [draftChecklistTextMode, setDraftChecklistTextMode] = useState<ChecklistTextMode>('single');

  const isDark = settings.theme === 'dark';
  const p = getNeuPalette(isDark);
  const text = p.textPrimary;
  const sub = p.textSecondary;

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

  useEffect(() => {
    if (!visible) return;
    setDraftStyleName('');
    setShowStyleEditor(false);
    setDraftColor(settings.defaultColor);
    setDraftTextColor(settings.defaultTextColor);
    setDraftFont(settings.defaultFont);
    setDraftFontSize(settings.defaultFontSize);
    setDraftTextStyle('normal');
    setDraftContentType('text');
    setDraftUseSvgBackground(false);
    setDraftMargins(DEFAULT_MARGINS);
    setDraftItemSpacing(DEFAULT_ITEM_SPACING);
    setDraftLineSpacing(DEFAULT_LINE_SPACING);
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
      itemSpacing: draftItemSpacing,
      lineSpacing: draftLineSpacing,
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
    setDraftItemSpacing(style.itemSpacing || DEFAULT_ITEM_SPACING);
    setDraftLineSpacing(style.lineSpacing ?? DEFAULT_LINE_SPACING);
    setDraftChecklistSort(style.checklistSort || 'as-is');
    setDraftChecklistTextMode(style.checklistTextMode || 'single');
    Alert.alert('Style applied', `Using “${style.name}” for new notes.`);
  };

  const previewText = draftContentType === 'checklist'
    ? '• Checklist'
    : 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

  const previewContent: string | ChecklistItem[] = draftContentType === 'checklist'
    ? [
      { id: 'p1', text: 'Lorem ipsum dolor', completed: false },
      { id: 'p2', text: 'Ut enim ad minim veniam, quis nostrud exercitation.', completed: false },
      { id: 'p3', text: 'Duis aute irure dolor in reprehenderit.', completed: false },
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

  // ── Small building blocks ────────────────────────────────────────────────────

  const SectionHeader = ({ label }: { label: string }) => (
    <Text style={{ fontSize: 10, fontWeight: '700', color: sub, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 18, marginBottom: 8, marginLeft: 4 }}>
      {label}
    </Text>
  );

  const SectionCard = ({ children }: { children: React.ReactNode }) => (
    <NeuView isDark={isDark} radius={NEU_RADIUS.lg} style={{ padding: 14 }}>
      {children}
    </NeuView>
  );

  const Row = ({ children, last }: { children: React.ReactNode; last?: boolean }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: last ? 0 : 1, borderBottomColor: `${p.darkShadow}30` }}>
      {children}
    </View>
  );

  const RowLabel = ({ label, hint }: { label: string; hint?: string }) => (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 13, color: text, fontWeight: '500' }}>{label}</Text>
      {hint && <Text style={{ fontSize: 10, color: sub, marginTop: 2 }}>{hint}</Text>}
    </View>
  );

  const NeuChip = ({ label, active, onPress, small }: { label: string; active: boolean; onPress: () => void; small?: boolean }) => (
    <NeuPressable
      isDark={isDark}
      radius={9}
      backgroundColor={active ? NEU_ACCENT : undefined}
      style={{ paddingHorizontal: small ? 10 : 12, paddingVertical: small ? 6 : 7 }}
      onPress={onPress}
    >
      <Text style={{ fontSize: 11, fontWeight: active ? '700' : '500', color: active ? '#FFFFFF' : sub }}>{label}</Text>
    </NeuPressable>
  );

  const NeuStepper = ({ value, onDecrement, onIncrement }: { value: number | string; onDecrement: () => void; onIncrement: () => void }) => (
    <NeuView isDark={isDark} inset radius={9} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }} onPress={onDecrement}>
        <Text style={{ fontSize: 16, color: NEU_ACCENT }}>−</Text>
      </TouchableOpacity>
      <Text style={{ width: 30, textAlign: 'center', fontSize: 12, fontWeight: '700', color: text }}>{value}</Text>
      <TouchableOpacity style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }} onPress={onIncrement}>
        <Text style={{ fontSize: 16, color: NEU_ACCENT }}>+</Text>
      </TouchableOpacity>
    </NeuView>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: p.base }}>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: text }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '700', color: text }}>Settings</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>

          {/* ── APPEARANCE ── */}
          <SectionHeader label="Appearance" />
          <SectionCard>
            <Row>
              <RowLabel label="Theme" />
              <NeuView isDark={isDark} inset radius={10} style={{ flexDirection: 'row', padding: 3 }}>
                {(['light', 'dark'] as AppTheme[]).map(t => (
                  <NeuPressable
                    key={t}
                    isDark={isDark}
                    radius={8}
                    backgroundColor={settings.theme === t ? p.base : undefined}
                    style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                    onPress={() => onUpdateSettings({ theme: t })}
                  >
                    <Text style={{ fontSize: 11, fontWeight: settings.theme === t ? '700' : '400', color: settings.theme === t ? text : sub }}>
                      {t === 'light' ? 'Light' : 'Dark'}
                    </Text>
                  </NeuPressable>
                ))}
              </NeuView>
            </Row>

            <Row>
              <View style={{ flex: 1 }}>
                <RowLabel label="Default note color" />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  {COLORS.map(color => (
                    <TouchableOpacity key={color} onPress={() => onUpdateSettings({ defaultColor: color })}>
                      <NeuView
                        isDark={isDark}
                        radius={9}
                        backgroundColor={color}
                        style={[
                          { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
                          settings.defaultColor === color && { borderWidth: 2, borderColor: text },
                        ]}
                      >
                        {settings.defaultColor === color && <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>✓</Text>}
                      </NeuView>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Row>

            <Row>
              <View style={{ flex: 1 }}>
                <RowLabel label="Default text color" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {TEXT_COLORS.map(color => (
                    <TouchableOpacity key={color} onPress={() => onUpdateSettings({ defaultTextColor: color })}>
                      <NeuView
                        isDark={isDark}
                        radius={9}
                        backgroundColor={color}
                        style={[
                          { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
                          settings.defaultTextColor === color && { borderWidth: 2, borderColor: NEU_ACCENT },
                        ]}
                      >
                        {settings.defaultTextColor === color && <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFF' }}>✓</Text>}
                      </NeuView>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Row>

            <Row>
              <View style={{ flex: 1 }}>
                <RowLabel label="Default font" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }} contentContainerStyle={{ gap: 8 }}>
                  {FONTS.map(font => (
                    <NeuChip
                      key={font.value}
                      label={font.name}
                      active={settings.defaultFont === font.value}
                      onPress={() => onUpdateSettings({ defaultFont: font.value })}
                    />
                  ))}
                </ScrollView>
              </View>
            </Row>

            <Row last>
              <RowLabel label="Default font size" />
              <NeuStepper
                value={settings.defaultFontSize}
                onDecrement={() => onUpdateSettings({ defaultFontSize: Math.max(6, settings.defaultFontSize - 2) })}
                onIncrement={() => onUpdateSettings({ defaultFontSize: Math.min(36, settings.defaultFontSize + 2) })}
              />
            </Row>
          </SectionCard>

          {/* ── LAYOUT ── */}
          <SectionHeader label="Layout" />
          <SectionCard>
            <Row last>
              <RowLabel label="Grid columns" />
              <NeuView isDark={isDark} inset radius={10} style={{ flexDirection: 'row', padding: 3 }}>
                {([2, 3] as (2 | 3)[]).map(n => (
                  <NeuPressable
                    key={n}
                    isDark={isDark}
                    radius={8}
                    backgroundColor={settings.gridColumns === n ? p.base : undefined}
                    style={{ paddingHorizontal: 14, paddingVertical: 6 }}
                    onPress={() => onUpdateSettings({ gridColumns: n })}
                  >
                    <Text style={{ fontSize: 12, fontWeight: settings.gridColumns === n ? '700' : '400', color: settings.gridColumns === n ? text : sub }}>{n}</Text>
                  </NeuPressable>
                ))}
              </NeuView>
            </Row>
          </SectionCard>

          {/* ── SORT ── */}
          <SectionHeader label="Sort notes by" />
          <SectionCard>
            {SORT_OPTIONS.map((opt, i) => (
              <TouchableOpacity key={opt.value} onPress={() => onUpdateSettings({ sortOrder: opt.value })}>
                <Row last={i === SORT_OPTIONS.length - 1}>
                  <RowLabel label={opt.label} />
                  <NeuRadio selected={settings.sortOrder === opt.value} isDark={isDark} />
                </Row>
              </TouchableOpacity>
            ))}
          </SectionCard>

          {/* ── PREFERENCES ── */}
          <SectionHeader label="Preferences" />
          <SectionCard>
            <Row last>
              <RowLabel label="Confirm style discards" hint="Show confirmation when tapping ✕ in the styling bar" />
              <NeuToggle
                value={settings.showDiscardConfirmation}
                onValueChange={(v) => onUpdateSettings({ showDiscardConfirmation: v })}
                isDark={isDark}
              />
            </Row>
          </SectionCard>

          {/* ── STICKIE STYLES ── */}
          <SectionHeader label="Stickie styles" />
          <SectionCard>
            <Row>
              <View style={{ flex: 1 }}>
                <RowLabel label="Default tab" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={{ gap: 8 }}>
                  {tabs.map(tab => (
                    <TouchableOpacity key={tab.id} onPress={() => onUpdateSettings({ defaultTabId: tab.id })}>
                      <NeuView
                        isDark={isDark}
                        radius={10}
                        backgroundColor={tab.color}
                        style={[
                          { paddingHorizontal: 12, paddingVertical: 8, minWidth: 70, alignItems: 'center' },
                          settings.defaultTabId === tab.id && { borderWidth: 2, borderColor: text },
                        ]}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: tab.textColor || '#fff' }} numberOfLines={1}>{tab.name}</Text>
                      </NeuView>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Row>

            <Row>
              <View style={{ flex: 1 }}>
                <RowLabel label="Style preview" />
                <NeuView isDark={isDark} radius={NEU_RADIUS.md} backgroundColor={draftColor} style={{ marginTop: 10, padding: 14, minHeight: 100 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: draftTextColor, fontFamily: draftFont, marginBottom: 6 }}>Preview Note</Text>
                  <Text style={[{ fontSize: 12, lineHeight: 17 }, previewStyle]}>{previewText}</Text>
                </NeuView>
              </View>
            </Row>

            <Row>
              <View style={{ flex: 1 }}>
                <RowLabel label="Style name" />
                <NeuView isDark={isDark} inset radius={10} style={{ marginTop: 8 }}>
                  <TextInput
                    value={draftStyleName}
                    onChangeText={setDraftStyleName}
                    placeholder="My favorite style"
                    placeholderTextColor={sub}
                    style={{ paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: text }}
                  />
                </NeuView>
              </View>
            </Row>

            <Row>
              {/* Secondary (raised, base-colored) vs Primary (accent) — mirrors the
                  Cancel/Save pairing in the neumorphic component gallery rather than
                  showing two identical accent buttons side by side. */}
              <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
                <NeuPressable isDark={isDark} radius={NEU_RADIUS.sm} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }} onPress={() => setShowStyleEditor(true)}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: text }}>Add New Style</Text>
                </NeuPressable>
                <NeuPressable isDark={isDark} radius={NEU_RADIUS.sm} backgroundColor={NEU_ACCENT} style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }} onPress={handleSaveStyle}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Save Style</Text>
                </NeuPressable>
              </View>
            </Row>

            {(settings.stickieStyles || []).length > 0 && (
              <View style={{ gap: 8, marginTop: 8 }}>
                {settings.stickieStyles?.map(style => (
                  <View key={style.id} style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: `${p.darkShadow}30` }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => applyStyle(style)}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: text }}>{style.name}</Text>
                      <Text style={{ fontSize: 10, color: sub, marginTop: 2 }}>{style.color} · {style.textColor}</Text>
                    </TouchableOpacity>
                    <NeuPressable
                      isDark={isDark}
                      radius={9}
                      backgroundColor={settings.defaultStyleId === style.id ? NEU_ACCENT : undefined}
                      style={{ paddingHorizontal: 12, paddingVertical: 8 }}
                      onPress={() => applyStyle(style)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: settings.defaultStyleId === style.id ? '#fff' : sub }}>Use</Text>
                    </NeuPressable>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>

          {/* ── DATA ── */}
          <SectionHeader label="Data" />
          <SectionCard>
            <Row>
              <RowLabel label="Export notes (JSON)" />
              <NeuPressable isDark={isDark} radius={9} backgroundColor={NEU_ACCENT} style={{ paddingHorizontal: 14, paddingVertical: 7 }} onPress={handleExport}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Export</Text>
              </NeuPressable>
            </Row>
            <Row>
              <RowLabel label="Import notes (JSON)" />
              <NeuPressable isDark={isDark} radius={9} backgroundColor={NEU_ACCENT} style={{ paddingHorizontal: 14, paddingVertical: 7 }} onPress={() => setShowImport(true)}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Import</Text>
              </NeuPressable>
            </Row>
            <Row last>
              <RowLabel label="Import StickieStyle" hint="Details coming soon" />
              <NeuView isDark={isDark} inset radius={9} style={{ paddingHorizontal: 14, paddingVertical: 7 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: sub }}>Import</Text>
              </NeuView>
            </Row>
          </SectionCard>

          {/* ── ACCOUNT ── */}
          <SectionHeader label="Account" />
          <SectionCard>
            <Row last>
              <RowLabel label="Connect with Google" hint="Coming soon" />
              <NeuView isDark={isDark} inset radius={9} style={{ paddingHorizontal: 14, paddingVertical: 7 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: sub }}>Connect</Text>
              </NeuView>
            </Row>
          </SectionCard>

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
          selectedItemSpacing={draftItemSpacing}
          onItemSpacingChange={setDraftItemSpacing}
          selectedLineSpacing={draftLineSpacing}
          onLineSpacingChange={setDraftLineSpacing}
          selectedChecklistSort={draftChecklistSort}
          onChecklistSortChange={setDraftChecklistSort}
          selectedChecklistTextMode={draftChecklistTextMode}
          onChecklistTextModeChange={setDraftChecklistTextMode}
          onSave={() => { handleSaveStyle(); setShowStyleEditor(false); }}
          onCancel={() => setShowStyleEditor(false)}
          showDiscardConfirmation={settings.showDiscardConfirmation}
          onDisableDiscardConfirmation={() => onUpdateSettings({ showDiscardConfirmation: false })}
          previewMode={true}
          initialShowStyling={true}
        />

        {/* Import JSON overlay */}
        <Modal visible={showImport} animationType="slide" transparent onRequestClose={() => setShowImport(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: p.base, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '70%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <TouchableOpacity onPress={() => { setShowImport(false); setImportText(''); }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: NEU_DANGER }}>Cancel</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: '700', color: text }}>Import JSON</Text>
                <TouchableOpacity onPress={handleImportConfirm}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: NEU_ACCENT }}>Import</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 12, color: sub, marginBottom: 12, lineHeight: 17 }}>
                Paste your Stickies backup JSON below. Notes will be merged with your existing data.
              </Text>
              <NeuView isDark={isDark} inset radius={NEU_RADIUS.md} style={{ flex: 1 }}>
                <TextInput
                  style={{ flex: 1, color: text, padding: 12, fontSize: 12, fontFamily: 'monospace' }}
                  multiline
                  value={importText}
                  onChangeText={setImportText}
                  placeholder="Paste JSON here…"
                  placeholderTextColor={sub}
                  textAlignVertical="top"
                  autoFocus
                />
              </NeuView>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </Modal>
  );
};

export default SettingsModal;