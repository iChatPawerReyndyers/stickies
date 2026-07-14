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
import { AppSettings, AppTheme, SortOrder, ViewMode, Note, Tab } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.5;
import { COLORS, TEXT_COLORS, FONTS } from '../constants';
import { NeuView, NeuPressable, NeuToggle, NeuRadio } from '../components/Neumorphic';
import PinSetupModal from '../components/PinSetupModal';
import StickieStyleSection from '../components/StickieStyleSection';
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
  // Which PIN flow is currently open: 'create' (turning the lock on for the
  // first time), 'change' (replacing an existing PIN), 'disable' (turning
  // the lock off — still requires verifying the current PIN), or null when
  // no PIN modal should be shown.
  const [pinModalMode, setPinModalMode] = useState<'create' | 'change' | 'disable' | null>(null);

  const isDark = settings.theme === 'dark';
  const p = getNeuPalette(isDark);
  const text = p.textPrimary;
  const sub = p.textSecondary;

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

  const handleImportConfirm = () => {
    try {
      const parsed = JSON.parse(importText);
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

  const isListView = settings.viewMode === 'list';

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
            <Row>
              <RowLabel label="Notes view" hint="How notes are displayed on the main screen" />
              <NeuView isDark={isDark} inset radius={10} style={{ flexDirection: 'row', padding: 3 }}>
                {(['grid', 'list'] as ViewMode[]).map(mode => (
                  <NeuPressable
                    key={mode}
                    isDark={isDark}
                    radius={8}
                    backgroundColor={settings.viewMode === mode ? p.base : undefined}
                    style={{ paddingHorizontal: 14, paddingVertical: 6 }}
                    onPress={() => onUpdateSettings({ viewMode: mode })}
                  >
                    <Text style={{ fontSize: 12, fontWeight: settings.viewMode === mode ? '700' : '400', color: settings.viewMode === mode ? text : sub }}>
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
                      backgroundColor={settings.gridColumns === n ? p.base : undefined}
                      style={{ paddingHorizontal: 14, paddingVertical: 6 }}
                      onPress={() => onUpdateSettings({ gridColumns: n })}
                    >
                      <Text style={{ fontSize: 12, fontWeight: settings.gridColumns === n ? '700' : '400', color: settings.gridColumns === n ? text : sub }}>{n}</Text>
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
            <Row>
              <RowLabel label="Confirm style discards" hint="Show confirmation when tapping ✕ in the styling bar" />
              <NeuToggle
                value={settings.showDiscardConfirmation}
                onValueChange={(v) => onUpdateSettings({ showDiscardConfirmation: v })}
                isDark={isDark}
              />
            </Row>
            <Row last>
              <RowLabel label="Restore checklist state" hint="Keep checked items and their order when switching a note back to checklist" />
              <NeuToggle
                value={settings.restoreChecklistState}
                onValueChange={(v) => onUpdateSettings({ restoreChecklistState: v })}
                isDark={isDark}
              />
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
          </SectionCard>

          {/* Expandable manager: preview + dropdown + Add New / Edit Current.
              See components/StickieStyleSection.tsx. */}
          <View style={{ marginTop: 12 }}>
            <SectionCard>
              <StickieStyleSection isDark={isDark} />
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