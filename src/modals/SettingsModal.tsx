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
import { AppSettings, AppTheme, SortOrder, ViewMode, ChecklistTextMode, ContentType, Note, Tab, StickieStyle } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.5;
import { COLORS, TEXT_COLORS, FONTS } from '../constants';
// Reads the app's real native version at runtime (Android's versionName /
// iOS's CFBundleShortVersionString) instead of a separately-maintained JS
// constant — this is the exact same value build.gradle's own versionName
// bakes into the release APK's filename (see android/app/build.gradle),
// so Settings and the APK filename can never drift out of sync. Requires
// the 'react-native-device-info' package (native module — needs a rebuild
// after installing, not just a JS bundle refresh).
import DeviceInfo from 'react-native-device-info';
// Same clipboard module NoteModal.tsx already uses for its own Copy/Paste
// toolbar — requires '@react-native-clipboard/clipboard' (native module,
// needs a rebuild if it isn't already installed).
import Clipboard from '@react-native-clipboard/clipboard';
import { fetchDriveTextFile, DriveFetchError } from '../utils/textImportSource';
import { NeuView, NeuPressable, NeuToggle, NeuRadio } from '../components/Neumorphic';
import { resolveDefaultTabId } from '../utils/tabDefaults';
import PinSetupModal from '../components/PinSetupModal';
import StickieStyleSection from '../components/StickieStyleSection';
import AllTabFilterSection from '../components/AllTabFilterSection';
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
  // 'paste' (type/paste JSON directly) or 'link' (fetch a public Google
  // Drive .txt/.rtf link and import its content) — see the mode toggle in
  // the Import JSON overlay below. driveLinkInput/drivePreviewText/
  // driveFetchLoading only matter in 'link' mode; drivePreviewText is
  // read-only (rendered in a ScrollView, not a TextInput) and is what
  // actually gets parsed on Import when this mode is active.
  const [importSourceMode, setImportSourceMode] = useState<'paste' | 'link'>('paste');
  const [driveLinkInput, setDriveLinkInput] = useState('');
  const [drivePreviewText, setDrivePreviewText] = useState('');
  const [driveFetchLoading, setDriveFetchLoading] = useState(false);
  // Same paste-JSON pattern as the notes import above, applied to
  // StickieStyles instead — kept as its own state/modal/handler set rather
  // than generalizing the two, since they parse and merge different shapes
  // (notes+tabs vs. a flat StickieStyle array) and conflating them would
  // make both harder to follow for a fairly small amount of shared code.
  const [showStyleImport, setShowStyleImport] = useState(false);
  const [styleImportText, setStyleImportText] = useState('');
  const [styleImportSourceMode, setStyleImportSourceMode] = useState<'paste' | 'link'>('paste');
  const [styleDriveLinkInput, setStyleDriveLinkInput] = useState('');
  const [styleDrivePreviewText, setStyleDrivePreviewText] = useState('');
  const [styleDriveFetchLoading, setStyleDriveFetchLoading] = useState(false);
  // Which PIN flow is currently open: 'create' (turning the lock on for the
  // first time), 'change' (replacing an existing PIN), 'disable' (turning
  // the lock off — still requires verifying the current PIN), or null when
  // no PIN modal should be shown.
  const [pinModalMode, setPinModalMode] = useState<'create' | 'change' | 'disable' | null>(null);
  // Owned here (rather than as local state inside AllTabFilterSection)
  // specifically so toggling a checkbox — which round-trips through
  // onUpdateSettings and re-renders that section with new props — can
  // never reset it back to collapsed.
  const [allTabFilterExpanded, setAllTabFilterExpanded] = useState(false);

  // Effective values — each falls back to its group's first/default option
  // when the underlying settings field is unset (e.g. an existing user's
  // stored settings predate a newer field, or AppSettings' own seeded
  // defaults haven't been updated yet). Falling back here means every
  // toggle/chip below always shows something selected instead of nothing
  // highlighted, without needing every call site to duplicate the same
  // `|| default` fallback.
  const effectiveTheme: AppTheme = settings.theme || 'light';
  const isDark = effectiveTheme === 'dark';
  const p = getNeuPalette(isDark);
  const text = p.textPrimary;
  const sub = p.textSecondary;
  const effectiveViewMode: ViewMode = settings.viewMode || 'grid';
  const effectiveGridColumns: 2 | 3 = settings.gridColumns || 2;
  const effectiveSortOrder: SortOrder = settings.sortOrder || SORT_OPTIONS[0].value;
  const effectiveDefaultFont = settings.defaultFont || FONTS[0].value;
  const effectiveDefaultColor = settings.defaultColor || COLORS[0];
  const effectiveDefaultTextColor = settings.defaultTextColor || TEXT_COLORS[0];
  const effectiveDefaultTabId = resolveDefaultTabId(settings.defaultTabId, tabs, settings.showAllTab);
  const effectiveDefaultContentType: ContentType = settings.defaultContentType || 'text';

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    // `tabs` already carries each tab's styling (color, textColor,
    // backgroundImageUrl, screenBackgroundImageUrl) alongside its id/name,
    // so a round-trip import can restore both which tab a note belongs to
    // and how that tab looks.
    const payload = JSON.stringify({ notes, tabs }, null, 2);
    try {
      await Share.share({ message: payload, title: 'Stickies Backup' });
    } catch {
      Alert.alert('Export failed', 'Could not share the backup.');
    }
  };

  const handlePasteImportText = async () => {
    try {
      const clip = await Clipboard.getString();
      if (clip) setImportText(clip);
    } catch {
      // Clipboard read failed — no-op, same as elsewhere in the app.
    }
  };

  const handleClearImportText = () => setImportText('');

  const handleFetchDriveImport = async () => {
    setDriveFetchLoading(true);
    try {
      const fetched = await fetchDriveTextFile(driveLinkInput);
      setDrivePreviewText(fetched);
    } catch (e) {
      setDrivePreviewText('');
      Alert.alert('Fetch failed', e instanceof DriveFetchError ? e.message : 'Could not fetch that file.');
    } finally {
      setDriveFetchLoading(false);
    }
  };

  const resetImportModalState = () => {
    setShowImport(false);
    setImportText('');
    setDriveLinkInput('');
    setDrivePreviewText('');
    setImportSourceMode('paste');
  };

  const handleImportConfirm = () => {
    const sourceText = importSourceMode === 'link' ? drivePreviewText : importText;
    try {
      const parsed = JSON.parse(sourceText);
      // Backward compatible with older backups that were just a bare array
      // of notes with no tabs at all (Array.isArray(parsed)) as well as the
      // current `{ notes, tabs }` shape. Either way, missing/absent tabs
      // simply becomes an empty list — MainScreen's import handler then
      // falls each note back to the General tab when its tabId doesn't
      // resolve to a tab we actually have.
      const importedNotes: Note[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.notes) ? parsed.notes : null;
      const importedTabs: Tab[] = Array.isArray(parsed.tabs) ? parsed.tabs : [];
      if (!importedNotes) throw new Error();
      const builtInIds = new Set(['all', 'general', 'archived', 'trash']);
      const customTabCount = importedTabs.filter(t => !builtInIds.has(t.id)).length;
      const tabsNote = customTabCount > 0 ? ` and ${customTabCount} tab(s)` : '';
      Alert.alert(
        'Confirm Import',
        `This will merge ${importedNotes.length} note(s)${tabsNote} into your current notes. Notes with no matching tab will go into General. Continue?`,
        [
          { text: 'Cancel', onPress: () => {} },
          {
            text: 'Import',
            onPress: () => {
              onImportNotes(importedNotes, importedTabs);
              resetImportModalState();
              Alert.alert('Done', `${importedNotes.length} notes imported.`);
            },
          },
        ]
      );
    } catch {
      Alert.alert('Invalid JSON', 'Could not parse the pasted or fetched content. Make sure it is a valid Stickies backup.');
    }
  };

  const handleExportStyles = async () => {
    const payload = JSON.stringify({ stickieStyles: settings.stickieStyles }, null, 2);
    try {
      await Share.share({ message: payload, title: 'Stickies StickieStyles Backup' });
    } catch {
      Alert.alert('Export failed', 'Could not share the StickieStyles backup.');
    }
  };

  const handlePasteStyleImportText = async () => {
    try {
      const clip = await Clipboard.getString();
      if (clip) setStyleImportText(clip);
    } catch {
      // Clipboard read failed — no-op.
    }
  };

  const handleClearStyleImportText = () => setStyleImportText('');

  const handleFetchStyleDriveImport = async () => {
    setStyleDriveFetchLoading(true);
    try {
      const fetched = await fetchDriveTextFile(styleDriveLinkInput);
      setStyleDrivePreviewText(fetched);
    } catch (e) {
      setStyleDrivePreviewText('');
      Alert.alert('Fetch failed', e instanceof DriveFetchError ? e.message : 'Could not fetch that file.');
    } finally {
      setStyleDriveFetchLoading(false);
    }
  };

  const resetStyleImportModalState = () => {
    setShowStyleImport(false);
    setStyleImportText('');
    setStyleDriveLinkInput('');
    setStyleDrivePreviewText('');
    setStyleImportSourceMode('paste');
  };

  const handleStyleImportConfirm = () => {
    const sourceText = styleImportSourceMode === 'link' ? styleDrivePreviewText : styleImportText;
    try {
      const parsed = JSON.parse(sourceText);
      // Accepts either a bare array of styles or the `{ stickieStyles }`
      // wrapper handleExportStyles above produces, same
      // accept-both-shapes leniency handleImportConfirm gives notes.
      const importedStyles: StickieStyle[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.stickieStyles) ? parsed.stickieStyles : null;
      if (!importedStyles) throw new Error();
      // Loose shape check — just enough that a style missing these core
      // fields (garbage/unrelated JSON) gets caught here instead of
      // silently breaking StickieStylePreviewCard/applyStickieStyle later.
      const validStyles = importedStyles.filter(
        s => s && typeof s.id === 'string' && typeof s.name === 'string' && typeof s.color === 'string'
      );
      if (validStyles.length === 0) throw new Error();

      const existingIds = new Set(settings.stickieStyles.map(s => s.id));
      const newStyles = validStyles.filter(s => !existingIds.has(s.id));
      const skippedCount = validStyles.length - newStyles.length;
      const skippedNote = skippedCount > 0 ? ` ${skippedCount} already exist locally and will be skipped.` : '';

      Alert.alert(
        'Confirm Import',
        `This will add ${newStyles.length} new StickieStyle(s) to your saved styles.${skippedNote} Continue?`,
        [
          { text: 'Cancel', onPress: () => {} },
          {
            text: 'Import',
            onPress: () => {
              onUpdateSettings({ stickieStyles: [...settings.stickieStyles, ...newStyles] });
              resetStyleImportModalState();
              Alert.alert('Done', `${newStyles.length} StickieStyle(s) imported.`);
            },
          },
        ]
      );
    } catch {
      Alert.alert('Invalid JSON', 'Could not parse the pasted or fetched content. Make sure it is a valid StickieStyles backup.');
    }
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
      <Text style={{ fontSize: 11, fontWeight: active ? '700' : '500', color: active ? (isDark ? '#000000' : '#FFFFFF') : sub }}>{label}</Text>
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

  const isListView = effectiveViewMode === 'list';

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: p.base }}>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, marginTop: 32 }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: text }}>← Back</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: '700', color: text }}>Settings</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>

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
                    backgroundColor={effectiveTheme === t ? p.base : undefined}
                    style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                    onPress={() => onUpdateSettings({ theme: t })}
                  >
                    <Text style={{ fontSize: 11, fontWeight: effectiveTheme === t ? '700' : '400', color: effectiveTheme === t ? text : sub }}>
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
                  {COLORS.slice(0, 5).map(color => (
                    <TouchableOpacity key={color} onPress={() => onUpdateSettings({ defaultColor: color })}>
                      <NeuView
                        isDark={isDark}
                        radius={9}
                        backgroundColor={color}
                        style={[
                          { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
                          effectiveDefaultColor === color && { borderWidth: 2, borderColor: text },
                        ]}
                      >
                        {effectiveDefaultColor === color && <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>✓</Text>}
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
                          effectiveDefaultTextColor === color && { borderWidth: 2, borderColor: NEU_ACCENT },
                        ]}
                      >
                        {effectiveDefaultTextColor === color && <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFF' }}>✓</Text>}
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
                      active={effectiveDefaultFont === font.value}
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
            <Row>
              <RowLabel label="Notes view" hint="How notes are displayed on the main screen" />
              <NeuView isDark={isDark} inset radius={10} style={{ flexDirection: 'row', padding: 3 }}>
                {(['grid', 'list'] as ViewMode[]).map(mode => (
                  <NeuPressable
                    key={mode}
                    isDark={isDark}
                    radius={8}
                    backgroundColor={effectiveViewMode === mode ? p.base : undefined}
                    style={{ paddingHorizontal: 14, paddingVertical: 6 }}
                    onPress={() => onUpdateSettings({ viewMode: mode })}
                  >
                    <Text style={{ fontSize: 12, fontWeight: effectiveViewMode === mode ? '700' : '400', color: effectiveViewMode === mode ? text : sub }}>
                      {mode === 'grid' ? 'Grid' : 'List'}
                    </Text>
                  </NeuPressable>
                ))}
              </NeuView>
            </Row>

            <Row>
              <RowLabel label="Grid columns" hint={isListView ? 'Only applies in grid view' : undefined} />
              {/* pointerEvents has to live on a plain View — NeuView's props
                  don't include it (and it isn't spread onto the inner View),
                  so passing it directly to NeuView fails to typecheck. */}
              <View
                style={isListView ? { opacity: 0.4 } : undefined}
                pointerEvents={isListView ? 'none' : 'auto'}
              >
                <NeuView isDark={isDark} inset radius={10} style={{ flexDirection: 'row', padding: 3 }}>
                  {([2, 3] as (2 | 3)[]).map(n => (
                    <NeuPressable
                      key={n}
                      isDark={isDark}
                      radius={8}
                      backgroundColor={effectiveGridColumns === n ? p.base : undefined}
                      style={{ paddingHorizontal: 14, paddingVertical: 6 }}
                      onPress={() => onUpdateSettings({ gridColumns: n })}
                    >
                      <Text style={{ fontSize: 12, fontWeight: effectiveGridColumns === n ? '700' : '400', color: effectiveGridColumns === n ? text : sub }}>{n}</Text>
                    </NeuPressable>
                  ))}
                </NeuView>
              </View>
            </Row>

            <Row last>
              <RowLabel label="Show All tab" hint="A pill that shows every note across all your tabs at once" />
              <NeuToggle
                value={settings.showAllTab}
                onValueChange={(v) => onUpdateSettings({ showAllTab: v })}
                isDark={isDark}
              />
            </Row>
          </SectionCard>

          {/* Which tabs' notes actually populate the "All" pill above
              (including General, not just user-created tabs). See
              components/AllTabFilterSection.tsx — allTabIncludedIds routes
              through settings the same way stickieStyles does below. */}
          <View style={{ marginTop: 12 }}>
            <SectionCard>
              <AllTabFilterSection
                isDark={isDark}
                tabs={tabs}
                includedTabIds={settings.allTabIncludedIds}
                onIncludedTabIdsChange={(ids) => onUpdateSettings({ allTabIncludedIds: ids })}
                expanded={allTabFilterExpanded}
                onToggleExpanded={() => setAllTabFilterExpanded(v => !v)}
              />
            </SectionCard>
          </View>

          {/* ── SORT ── */}
          <SectionHeader label="Sort notes by" />
          <SectionCard>
            {SORT_OPTIONS.map((opt, i) => (
              <TouchableOpacity key={opt.value} onPress={() => onUpdateSettings({ sortOrder: opt.value })}>
                <Row last={i === SORT_OPTIONS.length - 1}>
                  <RowLabel label={opt.label} />
                  <NeuRadio selected={effectiveSortOrder === opt.value} isDark={isDark} />
                </Row>
              </TouchableOpacity>
            ))}
          </SectionCard>

          {/* ── PREFERENCES ── */}
          <SectionHeader label="Preferences" />
          <SectionCard>
            <Row>
              <RowLabel label="Confirm style discards" hint="Show confirmation when tapping ✕ in the styling bar" />
              <NeuToggle
                value={settings.showDiscardConfirmation}
                onValueChange={(v) => onUpdateSettings({ showDiscardConfirmation: v })}
                isDark={isDark}
              />
            </Row>
            <Row>
              <RowLabel label="Restore checklist state" hint="Keep checked items and their order when switching a note back to checklist" />
              <NeuToggle
                value={settings.restoreChecklistState}
                onValueChange={(v) => onUpdateSettings({ restoreChecklistState: v })}
                isDark={isDark}
              />
            </Row>
            <Row>
              <RowLabel label="Default note type" hint="Content type a brand-new note starts as" />
              <NeuView isDark={isDark} inset radius={10} style={{ flexDirection: 'row', padding: 3 }}>
                {(['text', 'checklist'] as ContentType[]).map(type => {
                  const active = effectiveDefaultContentType === type;
                  return (
                    <NeuPressable
                      key={type}
                      isDark={isDark}
                      radius={8}
                      backgroundColor={active ? NEU_ACCENT : undefined}
                      style={{ paddingHorizontal: 14, paddingVertical: 6 }}
                      onPress={() => onUpdateSettings({ defaultContentType: type })}
                    >
                      <Text style={{ fontSize: 12, fontWeight: active ? '700' : '400', color: active ? '#FFFFFF' : sub }}>
                        {type === 'text' ? 'Text' : 'Checklist'}
                      </Text>
                    </NeuPressable>
                  );
                })}
              </NeuView>
            </Row>
            <Row last>
              <RowLabel label="Default checklist display" hint="How new checklist items show their text" />
              <NeuView isDark={isDark} inset radius={10} style={{ flexDirection: 'row', padding: 3 }}>
                {(['single', 'wrap'] as ChecklistTextMode[]).map(mode => {
                  // Falls back to 'single' ("Line") when unset — existing
                  // users won't have this field in storage until wherever
                  // AppSettings' defaults are seeded (outside this file)
                  // adds it, so this keeps the toggle showing the intended
                  // default instead of neither chip being highlighted.
                  const effectiveMode = settings.defaultChecklistTextMode || 'single';
                  const active = effectiveMode === mode;
                  return (
                    <NeuPressable
                      key={mode}
                      isDark={isDark}
                      radius={8}
                      backgroundColor={active ? NEU_ACCENT : undefined}
                      style={{ paddingHorizontal: 14, paddingVertical: 6 }}
                      onPress={() => onUpdateSettings({ defaultChecklistTextMode: mode })}
                    >
                      <Text style={{ fontSize: 12, fontWeight: active ? '700' : '400', color: active ? '#FFFFFF' : sub }}>
                        {mode === 'single' ? 'Line' : 'Wrap'}
                      </Text>
                    </NeuPressable>
                  );
                })}
              </NeuView>
            </Row>
          </SectionCard>

          {/* ── SECURITY ── */}
          <SectionHeader label="Security" />
          <SectionCard>
            <Row last={!settings.appLockEnabled}>
              <RowLabel label="App PIN lock" hint="Require a PIN to open the app" />
              <NeuToggle
                value={settings.appLockEnabled}
                onValueChange={(v) => {
                  if (v) {
                    setPinModalMode('create');
                  } else {
                    setPinModalMode('disable');
                  }
                }}
                isDark={isDark}
              />
            </Row>
            {settings.appLockEnabled && (
              <Row last>
                <RowLabel label="Change PIN" hint={`Currently ${settings.appPinLength} digits`} />
                <NeuPressable
                  isDark={isDark}
                  radius={9}
                  style={{ paddingHorizontal: 14, paddingVertical: 7 }}
                  onPress={() => setPinModalMode('change')}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: text }}>Change</Text>
                </NeuPressable>
              </Row>
            )}
          </SectionCard>

          {/* ── STICKIE STYLES ── */}
          <SectionHeader label="Stickie styles" />

          <SectionCard>
            <Row>
              <RowLabel
                label="StickieStyle as default"
                hint={
                  settings.stickieStyles.length === 0
                    ? 'No saved styles yet — falls back to the plain defaults above'
                    : 'On: new notes randomly pick a saved style. Off: they use the plain defaults above.'
                }
              />
              <NeuToggle
                value={settings.useDefaultStickieStyle}
                onValueChange={(v) => onUpdateSettings({ useDefaultStickieStyle: v })}
                isDark={isDark}
              />
            </Row>
            <Row last>
              <View style={{ flex: 1 }}>
                <RowLabel label="Default tab" hint="Where new notes are created by default" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={{ gap: 8 }}>
                  {tabs.map(tab => (
                    <TouchableOpacity key={tab.id} onPress={() => onUpdateSettings({ defaultTabId: tab.id })}>
                      <NeuView
                        isDark={isDark}
                        radius={10}
                        backgroundColor={tab.color}
                        style={[
                          { paddingHorizontal: 12, paddingVertical: 8, minWidth: 70, alignItems: 'center' },
                          effectiveDefaultTabId === tab.id && { borderWidth: 2, borderColor: text },
                        ]}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: tab.textColor || '#fff' }} numberOfLines={1}>{tab.name}</Text>
                      </NeuView>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Row>
          </SectionCard>

          {/* Expandable manager: preview + dropdown + Add New / Edit Current.
              See components/StickieStyleSection.tsx.
              stickieStyles/onStickieStylesChange route through
              settings.stickieStyles — the same array NoteModal's styling
              bar dropdown reads — so a style saved here is immediately
              available when creating/editing a note. */}
          <View style={{ marginTop: 12 }}>
            <SectionCard>
              <StickieStyleSection
                isDark={isDark}
                stickieStyles={settings.stickieStyles}
                onStickieStylesChange={(styles) => onUpdateSettings({ stickieStyles: styles })}
              />
            </SectionCard>
          </View>

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
            <Row>
              <RowLabel label="Export StickieStyles (JSON)" />
              <NeuPressable isDark={isDark} radius={9} backgroundColor={NEU_ACCENT} style={{ paddingHorizontal: 14, paddingVertical: 7 }} onPress={handleExportStyles}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Export</Text>
              </NeuPressable>
            </Row>
            <Row last>
              <RowLabel label="Import StickieStyles (JSON)" />
              <NeuPressable isDark={isDark} radius={9} backgroundColor={NEU_ACCENT} style={{ paddingHorizontal: 14, paddingVertical: 7 }} onPress={() => setShowStyleImport(true)}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Import</Text>
              </NeuPressable>
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

          {/* ── ABOUT ── */}
          <SectionHeader label="About" />
          <SectionCard>
            <Row last>
              <RowLabel label="Version" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: sub }}>{DeviceInfo.getVersion()}</Text>
            </Row>
          </SectionCard>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Import JSON overlay */}
        <Modal visible={showImport} animationType="slide" transparent onRequestClose={resetImportModalState}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: p.base, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '78%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <TouchableOpacity onPress={resetImportModalState}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: NEU_DANGER }}>Cancel</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: '700', color: text }}>Import JSON</Text>
                <TouchableOpacity onPress={handleImportConfirm}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: NEU_ACCENT }}>Import</Text>
                </TouchableOpacity>
              </View>

              <NeuView isDark={isDark} inset radius={10} style={{ flexDirection: 'row', padding: 3, marginBottom: 12 }}>
                {(['paste', 'link'] as const).map(mode => {
                  const active = importSourceMode === mode;
                  return (
                    <View key={mode} style={{ flex: 1 }}>
                      <NeuPressable
                        isDark={isDark}
                        radius={8}
                        backgroundColor={active ? p.base : undefined}
                        style={{ width: '100%', paddingVertical: 8, alignItems: 'center' }}
                        onPress={() => setImportSourceMode(mode)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: active ? '700' : '400', color: active ? text : sub }}>
                          {mode === 'paste' ? 'Paste JSON' : 'From Drive link'}
                        </Text>
                      </NeuPressable>
                    </View>
                  );
                })}
              </NeuView>

              {importSourceMode === 'paste' ? (
                <>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <NeuPressable isDark={isDark} radius={9} style={{ width: '100%', paddingVertical: 9, alignItems: 'center' }} onPress={handlePasteImportText}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: text }}>Paste</Text>
                      </NeuPressable>
                    </View>
                    <View style={{ flex: 1 }}>
                      <NeuPressable isDark={isDark} radius={9} style={{ width: '100%', paddingVertical: 9, alignItems: 'center' }} onPress={handleClearImportText}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: NEU_DANGER }}>Clear</Text>
                      </NeuPressable>
                    </View>
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
                    />
                  </NeuView>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 12, color: sub, marginBottom: 10, lineHeight: 17 }}>
                    Paste a public Google Drive link to a .txt or .rtf file containing your backup JSON. Sharing must be set to "Anyone with the link".
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <NeuView isDark={isDark} inset radius={9} style={{ flex: 1 }}>
                      <TextInput
                        style={{ height: 40, paddingHorizontal: 12, fontSize: 12.5, color: text }}
                        value={driveLinkInput}
                        onChangeText={setDriveLinkInput}
                        placeholder="Paste a Drive link…"
                        placeholderTextColor={sub}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </NeuView>
                    <NeuPressable
                      isDark={isDark}
                      radius={9}
                      backgroundColor={NEU_ACCENT}
                      style={{ paddingHorizontal: 16, justifyContent: 'center', opacity: driveFetchLoading || !driveLinkInput.trim() ? 0.5 : 1 }}
                      onPress={handleFetchDriveImport}
                      disabled={driveFetchLoading || !driveLinkInput.trim()}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{driveFetchLoading ? 'Fetching…' : 'Fetch'}</Text>
                    </NeuPressable>
                  </View>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    Preview (read-only)
                  </Text>
                  {/* Scrollable but never editable — a plain Text inside a
                      ScrollView, not a TextInput, so there's no way to
                      accidentally edit fetched content before importing it. */}
                  <NeuView isDark={isDark} inset radius={NEU_RADIUS.md} style={{ flex: 1 }}>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }} showsVerticalScrollIndicator={false}>
                      <Text style={{ color: text, fontSize: 12, fontFamily: 'monospace', opacity: drivePreviewText ? 1 : 0.5 }}>
                        {drivePreviewText || 'Fetched content will appear here once you tap Fetch.'}
                      </Text>
                    </ScrollView>
                  </NeuView>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Import StickieStyles JSON overlay — same pattern as the notes
            one above, applied to settings.stickieStyles instead. */}
        <Modal visible={showStyleImport} animationType="slide" transparent onRequestClose={resetStyleImportModalState}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: p.base, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '78%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <TouchableOpacity onPress={resetStyleImportModalState}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: NEU_DANGER }}>Cancel</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: '700', color: text }}>Import StickieStyles</Text>
                <TouchableOpacity onPress={handleStyleImportConfirm}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: NEU_ACCENT }}>Import</Text>
                </TouchableOpacity>
              </View>

              <NeuView isDark={isDark} inset radius={10} style={{ flexDirection: 'row', padding: 3, marginBottom: 12 }}>
                {(['paste', 'link'] as const).map(mode => {
                  const active = styleImportSourceMode === mode;
                  return (
                    <View key={mode} style={{ flex: 1 }}>
                      <NeuPressable
                        isDark={isDark}
                        radius={8}
                        backgroundColor={active ? p.base : undefined}
                        style={{ width: '100%', paddingVertical: 8, alignItems: 'center' }}
                        onPress={() => setStyleImportSourceMode(mode)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: active ? '700' : '400', color: active ? text : sub }}>
                          {mode === 'paste' ? 'Paste JSON' : 'From Drive link'}
                        </Text>
                      </NeuPressable>
                    </View>
                  );
                })}
              </NeuView>

              {styleImportSourceMode === 'paste' ? (
                <>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    <View style={{ flex: 1 }}>
                      <NeuPressable isDark={isDark} radius={9} style={{ width: '100%', paddingVertical: 9, alignItems: 'center' }} onPress={handlePasteStyleImportText}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: text }}>Paste</Text>
                      </NeuPressable>
                    </View>
                    <View style={{ flex: 1 }}>
                      <NeuPressable isDark={isDark} radius={9} style={{ width: '100%', paddingVertical: 9, alignItems: 'center' }} onPress={handleClearStyleImportText}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: NEU_DANGER }}>Clear</Text>
                      </NeuPressable>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: sub, marginBottom: 12, lineHeight: 17 }}>
                    Paste a StickieStyles backup JSON below. New styles are added to your saved styles — any whose id already exists locally is skipped rather than overwritten.
                  </Text>
                  <NeuView isDark={isDark} inset radius={NEU_RADIUS.md} style={{ flex: 1 }}>
                    <TextInput
                      style={{ flex: 1, color: text, padding: 12, fontSize: 12, fontFamily: 'monospace' }}
                      multiline
                      value={styleImportText}
                      onChangeText={setStyleImportText}
                      placeholder="Paste JSON here…"
                      placeholderTextColor={sub}
                      textAlignVertical="top"
                    />
                  </NeuView>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 12, color: sub, marginBottom: 10, lineHeight: 17 }}>
                    Paste a public Google Drive link to a .txt or .rtf file containing your StickieStyles backup JSON. Sharing must be set to "Anyone with the link".
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <NeuView isDark={isDark} inset radius={9} style={{ flex: 1 }}>
                      <TextInput
                        style={{ height: 40, paddingHorizontal: 12, fontSize: 12.5, color: text }}
                        value={styleDriveLinkInput}
                        onChangeText={setStyleDriveLinkInput}
                        placeholder="Paste a Drive link…"
                        placeholderTextColor={sub}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </NeuView>
                    <NeuPressable
                      isDark={isDark}
                      radius={9}
                      backgroundColor={NEU_ACCENT}
                      style={{ paddingHorizontal: 16, justifyContent: 'center', opacity: styleDriveFetchLoading || !styleDriveLinkInput.trim() ? 0.5 : 1 }}
                      onPress={handleFetchStyleDriveImport}
                      disabled={styleDriveFetchLoading || !styleDriveLinkInput.trim()}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>{styleDriveFetchLoading ? 'Fetching…' : 'Fetch'}</Text>
                    </NeuPressable>
                  </View>
                  <Text style={{ fontSize: 10.5, fontWeight: '700', color: sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    Preview (read-only)
                  </Text>
                  <NeuView isDark={isDark} inset radius={NEU_RADIUS.md} style={{ flex: 1 }}>
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }} showsVerticalScrollIndicator={false}>
                      <Text style={{ color: text, fontSize: 12, fontFamily: 'monospace', opacity: styleDrivePreviewText ? 1 : 0.5 }}>
                        {styleDrivePreviewText || 'Fetched content will appear here once you tap Fetch.'}
                      </Text>
                    </ScrollView>
                  </NeuView>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* App PIN lock — create / change / disable flow. See
            components/PinSetupModal.tsx for the step logic. */}
        <PinSetupModal
          visible={pinModalMode !== null}
          mode={pinModalMode || 'create'}
          currentPin={settings.appPin}
          isDark={isDark}
          onClose={() => setPinModalMode(null)}
          onComplete={(newPin, newLength) => {
            if (pinModalMode === 'disable') {
              onUpdateSettings({ appLockEnabled: false, appPin: '' });
            } else {
              onUpdateSettings({ appLockEnabled: true, appPin: newPin, appPinLength: newLength });
            }
          }}
        />

      </SafeAreaView>
    </Modal>
  );
};

export default SettingsModal;