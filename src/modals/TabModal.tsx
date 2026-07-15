import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { Tab } from '../types';
import { getHexInputValue, normalizeHexColor } from '../utils/color';
import { resolveImageUrl } from '../utils/googleDriveImage';
import { COLORS, TEXT_COLORS } from '../constants';
import { NeuView, NeuPressable } from '../components/Neumorphic';
import { getNeuPalette, NEU_ACCENT, NEU_DANGER, NEU_RADIUS } from '../theme/neumorphic';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// A fixed (not max-) height, same pattern NoteModal.tsx already uses
// successfully for its own card (MODAL_HEIGHT = SCREEN_HEIGHT * 0.5).
// maxHeight-only containers don't hand a definite size down to a flex:1
// ScrollView in Yoga, so a fixed height gives it something concrete to
// flex against, letting it reliably fill the remaining space and scroll.
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.72;

// Matches the mini swatch grid used throughout NoteModal's Styling bar and
// SettingsModal's "Default note/text color" rows — same size/gap tokens so
// a swatch here looks identical to one there.
const MINI_SWATCH = 22;
const MINI_GAP = 6;

type TabModalProps = {
  visible: boolean;
  editing: Tab | null;
  tabs: Tab[];
  onSave: (
    id: string | undefined,
    name: string,
    color: string | undefined,
    afterTabId?: string,
    textColor?: string,
    backgroundImageUrl?: string,
    screenBackgroundImageUrl?: string,
    screenBackgroundColor?: string,
  ) => void;
  onDelete: (id?: string) => void;
  onCancel: () => void;
  isDark?: boolean;
};

// Keeps the color fields strictly to valid hex digits while still allowing shorthand input.
const sanitizeHex = (text: string) => text.replace(/[^0-9a-fA-F]/g, '').toUpperCase();

const TabModal = ({ visible, editing, tabs, onSave, onDelete, onCancel, isDark = false }: TabModalProps) => {
  const p = getNeuPalette(isDark);

  const [name, setName] = useState(editing?.name || '');
  const [colorHex, setColorHex] = useState(getHexInputValue(editing?.color));
  const [textColorHex, setTextColorHex] = useState(getHexInputValue(editing?.textColor));
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(editing?.backgroundImageUrl || '');
  const [screenBackgroundImageUrl, setScreenBackgroundImageUrl] = useState(editing?.screenBackgroundImageUrl || '');
  const [screenBackgroundColorHex, setScreenBackgroundColorHex] = useState(getHexInputValue(editing?.screenBackgroundColor));
  // Which single input is shown for each background — Color or Image.
  // Defaults to Color for a brand-new tab; an existing tab that already has
  // an image set opens on Image instead so its current setup is visible
  // right away. Switching modes only changes which field is shown/edited —
  // the other field's value is left alone in state, so toggling back and
  // forth doesn't lose anything already typed.
  const [labelBgMode, setLabelBgMode] = useState<'color' | 'image'>(editing?.backgroundImageUrl ? 'image' : 'color');
  const [tabBgMode, setTabBgMode] = useState<'color' | 'image'>(editing?.screenBackgroundImageUrl ? 'image' : 'color');
  const [afterTabId, setAfterTabId] = useState<string | undefined>(editing?.id ? undefined : 'general');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    setName(editing?.name || '');
    setColorHex(getHexInputValue(editing?.color));
    setTextColorHex(getHexInputValue(editing?.textColor));
    setBackgroundImageUrl(editing?.backgroundImageUrl || '');
    setScreenBackgroundImageUrl(editing?.screenBackgroundImageUrl || '');
    setScreenBackgroundColorHex(getHexInputValue(editing?.screenBackgroundColor));
    setLabelBgMode(editing?.backgroundImageUrl ? 'image' : 'color');
    setTabBgMode(editing?.screenBackgroundImageUrl ? 'image' : 'color');
    setAfterTabId(editing ? undefined : 'general');
    setIsDropdownOpen(false);
  }, [editing, visible]);

  const isEditableCustomTab = !!editing && editing.id !== 'all' && editing.id !== 'general' && editing.id !== 'trash' && editing.id !== 'archived';
  const afterOptions = (editing ? isEditableCustomTab : true)
    ? tabs.filter(tab => tab.id !== editing?.id && tab.id !== 'trash' && tab.id !== 'all')
    : [];
  const showAfterField = editing ? (afterOptions.length > 0 && isEditableCustomTab) : afterOptions.length > 0;

  const handleColorChange = (text: string) => setColorHex(sanitizeHex(text));
  const handleTextColorChange = (text: string) => setTextColorHex(sanitizeHex(text));
  const handleScreenBackgroundColorChange = (text: string) => setScreenBackgroundColorHex(sanitizeHex(text));

  const handleSave = () => {
    const trimmedName = name.trim() || 'New';
    const finalColor = normalizeHexColor(colorHex.trim()) || undefined;
    const finalTextColor = normalizeHexColor(textColorHex.trim()) || undefined;
    const finalScreenBackgroundColor = normalizeHexColor(screenBackgroundColorHex.trim()) || undefined;
    onSave(
      editing?.id,
      trimmedName,
      finalColor,
      afterTabId,
      finalTextColor,
      backgroundImageUrl.trim() || undefined,
      screenBackgroundImageUrl.trim() || undefined,
      finalScreenBackgroundColor,
    );
  };

  // Live swatch preview — falls back to the tab's existing color, or a neutral
  // placeholder for a brand-new tab with nothing typed yet.
  const previewColor = normalizeHexColor(colorHex) || editing?.color || '#CCCCCC';
  const previewTextColor = normalizeHexColor(textColorHex) || editing?.textColor || '#FFFFFF';
  const previewScreenBackgroundColor = normalizeHexColor(screenBackgroundColorHex) || editing?.screenBackgroundColor || '#CCCCCC';
  const resolvedPreviewImage = resolveImageUrl(backgroundImageUrl);
  const resolvedScreenPreviewImage = resolveImageUrl(screenBackgroundImageUrl);

  // ── Settings-style building blocks ──────────────────────────────────────
  // Same raised-card treatment SettingsModal's SectionCard uses (NeuView,
  // NEU_RADIUS.lg, isDark) — every field group below sits inside one of
  // these instead of just floating on the modal's own background.
  const SectionCard = ({ children, style }: { children: React.ReactNode; style?: any }) => (
    <NeuView isDark={isDark} radius={NEU_RADIUS.lg} style={[modalStyles.sectionCard, style]}>
      {children}
    </NeuView>
  );

  // Preset swatch grid — same shape as the Styling bar's color grid and
  // SettingsModal's "Default note/text color" rows: a NeuView chip per
  // color, a dark selection ring + checkmark on whichever one matches the
  // current hex field.
  const renderSwatchGrid = (palette: string[], currentHex: string, onPick: (hex: string) => void) => (
    <View style={modalStyles.swatchGrid}>
      {palette.map(color => {
        const selected = normalizeHexColor(currentHex) === color;
        return (
          <TouchableOpacity key={color} onPress={() => onPick(getHexInputValue(color))} activeOpacity={0.8}>
            <NeuView
              isDark={isDark}
              radius={7}
              backgroundColor={color}
              style={[modalStyles.swatch, selected && modalStyles.swatchSel]}
            >
              {selected && <Text style={modalStyles.swatchCheck}>✓</Text>}
            </NeuView>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable style={modalStyles.overlay} onPress={onCancel}>
        {/* Shadow-casting wrapper, separate from the card that actually clips
            its content. A raised shadow and overflow:'hidden' can't live on
            the same view (the corners that get clipped take the shadow with
            them), so — same two-layer trick NeuView's own raised mode uses
            internally — the shadow lives on this outer, non-clipping View,
            and modalCard (overflow:'hidden', for the rounded ScrollView/
            footer) sits inside it at an identical size/radius/background.

            Plain View + onStartShouldSetResponder (not Pressable) on
            purpose — this still swallows taps so they don't fall through to
            the overlay's onPress={onCancel}, but unlike a nested Pressable
            it doesn't compete with the ScrollView below for the drag
            gesture. Same pattern NoteModal.tsx's card already uses
            successfully. A Pressable-in-Pressable here worked fine while
            all the fields fit on screen with nothing to scroll, but started
            swallowing the scroll gesture itself once there was enough
            content to actually need scrolling. */}
        <View
          style={[modalStyles.modalCardShadow, { backgroundColor: p.base }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[modalStyles.modalCard, { backgroundColor: p.base, height: MODAL_HEIGHT }]}>
            <View style={modalStyles.topToolbar}>
              <Text style={[modalStyles.headerLabel, { color: p.textSecondary }]}>{editing ? 'Edit tab:' : 'New tab:'}</Text>
            </View>

            <View style={[modalStyles.dividerLine, { backgroundColor: `${p.darkShadow}55` }]} />

            <ScrollView
              style={modalStyles.scrollArea}
              contentContainerStyle={modalStyles.formBody}
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={modalStyles.formGroup}>
                <Text style={[modalStyles.itemLabel, { color: p.textPrimary }]}>Name</Text>
                <SectionCard>
                  <NeuView isDark={isDark} inset radius={NEU_RADIUS.sm}>
                    <TextInput
                      style={[modalStyles.textInput, { color: p.textPrimary }]}
                      placeholder="Enter name"
                      placeholderTextColor={p.textSecondary}
                      value={name}
                      onChangeText={setName}
                      autoCorrect={false}
                    />
                  </NeuView>
                </SectionCard>
              </View>

              <View style={modalStyles.formGroup}>
                <Text style={[modalStyles.itemLabel, { color: p.textPrimary }]}>Label Background</Text>
                <Text style={[modalStyles.itemHint, { color: p.textSecondary }]}>Shown behind the tab pill itself.</Text>
                <SectionCard>
                  <NeuView isDark={isDark} inset radius={10} style={modalStyles.modeToggleTrack}>
                    {(['color', 'image'] as const).map(mode => (
                      <NeuPressable
                        key={mode}
                        isDark={isDark}
                        radius={8}
                        backgroundColor={labelBgMode === mode ? p.base : undefined}
                        style={modalStyles.modeToggleBtn}
                        onPress={() => setLabelBgMode(mode)}
                      >
                        <Text style={[modalStyles.modeToggleText, { color: labelBgMode === mode ? p.textPrimary : p.textSecondary, fontWeight: labelBgMode === mode ? '700' : '400' }]}>
                          {mode === 'color' ? 'Color' : 'Image'}
                        </Text>
                      </NeuPressable>
                    ))}
                  </NeuView>
                  {labelBgMode === 'color' ? (
                    <>
                      <View style={[modalStyles.colorRow, modalStyles.modeFieldSpacing]}>
                        <NeuView isDark={isDark} radius={9} backgroundColor={previewColor} style={modalStyles.colorSwatch} />
                        <NeuView isDark={isDark} inset radius={NEU_RADIUS.sm} style={{ flex: 1 }}>
                          <TextInput
                            style={[modalStyles.textInput, modalStyles.colorInput, { color: p.textPrimary }]}
                            placeholder="e.g. FF5733"
                            placeholderTextColor={p.textSecondary}
                            value={colorHex}
                            onChangeText={handleColorChange}
                            maxLength={8}
                            autoCapitalize="characters"
                            autoCorrect={false}
                          />
                        </NeuView>
                      </View>
                      <View style={modalStyles.modeFieldSpacing}>
                        {renderSwatchGrid(COLORS, colorHex, setColorHex)}
                      </View>
                    </>
                  ) : (
                    <View style={[modalStyles.colorRow, modalStyles.modeFieldSpacing]}>
                      {!!resolvedPreviewImage && (
                        <NeuView isDark={isDark} radius={9} style={modalStyles.colorSwatch}>
                          <Image source={{ uri: resolvedPreviewImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        </NeuView>
                      )}
                      <NeuView isDark={isDark} inset radius={NEU_RADIUS.sm} style={{ flex: 1 }}>
                        <TextInput
                          style={[modalStyles.textInput, modalStyles.colorInput, { color: p.textPrimary }]}
                          placeholder="Paste a link…"
                          placeholderTextColor={p.textSecondary}
                          value={backgroundImageUrl}
                          onChangeText={setBackgroundImageUrl}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </NeuView>
                    </View>
                  )}
                </SectionCard>
              </View>

              <View style={modalStyles.formGroup}>
                <Text style={[modalStyles.itemLabel, { color: p.textPrimary }]}>Label Color</Text>
                <SectionCard>
                  <View style={modalStyles.colorRow}>
                    <NeuView isDark={isDark} radius={9} backgroundColor={previewTextColor} style={modalStyles.colorSwatch} />
                    <NeuView isDark={isDark} inset radius={NEU_RADIUS.sm} style={{ flex: 1 }}>
                      <TextInput
                        style={[modalStyles.textInput, modalStyles.colorInput, { color: p.textPrimary }]}
                        placeholder="e.g. FFFFFF"
                        placeholderTextColor={p.textSecondary}
                        value={textColorHex}
                        onChangeText={handleTextColorChange}
                        maxLength={8}
                        autoCapitalize="characters"
                        autoCorrect={false}
                      />
                    </NeuView>
                  </View>
                  <View style={modalStyles.modeFieldSpacing}>
                    {renderSwatchGrid(TEXT_COLORS, textColorHex, setTextColorHex)}
                  </View>
                </SectionCard>
              </View>

              <View style={modalStyles.formGroup}>
                <Text style={[modalStyles.itemLabel, { color: p.textPrimary }]}>Tab Background</Text>
                <Text style={[modalStyles.itemHint, { color: p.textSecondary }]}>Shown as the app's wallpaper behind the notes grid whenever this tab is open.</Text>
                <SectionCard>
                  <NeuView isDark={isDark} inset radius={10} style={modalStyles.modeToggleTrack}>
                    {(['color', 'image'] as const).map(mode => (
                      <NeuPressable
                        key={mode}
                        isDark={isDark}
                        radius={8}
                        backgroundColor={tabBgMode === mode ? p.base : undefined}
                        style={modalStyles.modeToggleBtn}
                        onPress={() => setTabBgMode(mode)}
                      >
                        <Text style={[modalStyles.modeToggleText, { color: tabBgMode === mode ? p.textPrimary : p.textSecondary, fontWeight: tabBgMode === mode ? '700' : '400' }]}>
                          {mode === 'color' ? 'Color' : 'Image'}
                        </Text>
                      </NeuPressable>
                    ))}
                  </NeuView>
                  {tabBgMode === 'color' ? (
                    <>
                      <View style={[modalStyles.colorRow, modalStyles.modeFieldSpacing]}>
                        <NeuView isDark={isDark} radius={9} backgroundColor={previewScreenBackgroundColor} style={modalStyles.colorSwatch} />
                        <NeuView isDark={isDark} inset radius={NEU_RADIUS.sm} style={{ flex: 1 }}>
                          <TextInput
                            style={[modalStyles.textInput, modalStyles.colorInput, { color: p.textPrimary }]}
                            placeholder="e.g. D6CCF9"
                            placeholderTextColor={p.textSecondary}
                            value={screenBackgroundColorHex}
                            onChangeText={handleScreenBackgroundColorChange}
                            maxLength={8}
                            autoCapitalize="characters"
                            autoCorrect={false}
                          />
                        </NeuView>
                      </View>
                      <View style={modalStyles.modeFieldSpacing}>
                        {renderSwatchGrid(COLORS, screenBackgroundColorHex, setScreenBackgroundColorHex)}
                      </View>
                    </>
                  ) : (
                    <View style={[modalStyles.colorRow, modalStyles.modeFieldSpacing]}>
                      {!!resolvedScreenPreviewImage && (
                        <NeuView isDark={isDark} radius={9} style={modalStyles.colorSwatch}>
                          <Image source={{ uri: resolvedScreenPreviewImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        </NeuView>
                      )}
                      <NeuView isDark={isDark} inset radius={NEU_RADIUS.sm} style={{ flex: 1 }}>
                        <TextInput
                          style={[modalStyles.textInput, modalStyles.colorInput, { color: p.textPrimary }]}
                          placeholder="Paste a link…"
                          placeholderTextColor={p.textSecondary}
                          value={screenBackgroundImageUrl}
                          onChangeText={setScreenBackgroundImageUrl}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </NeuView>
                    </View>
                  )}
                </SectionCard>
              </View>

              {showAfterField && (
                <View style={modalStyles.formGroup}>
                  <Text style={[modalStyles.itemLabel, { color: p.textPrimary }]}>place after</Text>
                  <SectionCard>
                    <NeuView isDark={isDark} inset={!isDropdownOpen} radius={NEU_RADIUS.sm} backgroundColor={isDropdownOpen ? p.base : undefined}>
                      <TouchableOpacity
                        style={modalStyles.dropdownTrigger}
                        onPress={() => setIsDropdownOpen(prev => !prev)}
                        activeOpacity={0.8}
                      >
                        <Text style={[modalStyles.dropdownTriggerText, { color: p.textPrimary }]}>
                          {afterTabId ? tabs.find(tab => tab.id === afterTabId)?.name : 'After general'}
                        </Text>
                        <Text style={[modalStyles.dropdownArrow, { color: p.textSecondary }]}>{isDropdownOpen ? '▲' : '▼'}</Text>
                      </TouchableOpacity>
                    </NeuView>

                    {isDropdownOpen && (
                      <NeuView isDark={isDark} radius={NEU_RADIUS.sm} style={modalStyles.dropdownOptionsContainer}>
                        {afterOptions.map(tab => (
                          <TouchableOpacity
                            key={tab.id}
                            style={[
                              modalStyles.dropdownOptionRow,
                              { borderColor: `${p.darkShadow}40` },
                            ]}
                            onPress={() => {
                              setAfterTabId(tab.id);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <Text style={[
                              modalStyles.optionText,
                              { color: p.textPrimary },
                              afterTabId === tab.id && { color: NEU_ACCENT, fontWeight: '700' },
                            ]}>
                              {tab.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </NeuView>
                    )}
                  </SectionCard>
                </View>
              )}
            </ScrollView>

            {/* Footer — NeuPressable buttons, each wrapped in its own plain
                flex:1 View. NeuPressable only forwards `style` to its inner
                NeuView, never to the outer Pressable, so flex:1 has to live
                on a wrapping View for the row to actually split evenly —
                moving the flex out one level keeps the raised neumorphic
                look (matching Settings' buttons) without hitting the
                "row collapses to invisible" issue plain TouchableOpacitys
                were dodging before. */}
            <View style={modalStyles.footer}>
              <View style={modalStyles.actionButtonRow}>
                <View style={modalStyles.footerBtnWrap}>
                  <NeuPressable
                    isDark={isDark}
                    radius={NEU_RADIUS.sm}
                    backgroundColor={p.insetBase}
                    style={modalStyles.btnInner}
                    onPress={onCancel}
                  >
                    <Text style={modalStyles.btnCancelText}>Cancel</Text>
                  </NeuPressable>
                </View>
                <View style={modalStyles.footerBtnWrap}>
                  <NeuPressable
                    isDark={isDark}
                    radius={NEU_RADIUS.sm}
                    backgroundColor={NEU_ACCENT}
                    style={modalStyles.btnInner}
                    onPress={handleSave}
                  >
                    <Text style={modalStyles.btnSaveText}>{editing ? 'Save' : 'Create'}</Text>
                  </NeuPressable>
                </View>
              </View>

              {editing?.id && (
                <View style={modalStyles.deleteRowWrap}>
                  <NeuPressable
                    isDark={isDark}
                    radius={NEU_RADIUS.sm}
                    backgroundColor={p.insetBase}
                    style={modalStyles.deleteRowInner}
                    onPress={() => onDelete(editing.id)}
                  >
                    <Text style={modalStyles.deleteRowText}>Delete Tab</Text>
                  </NeuPressable>
                </View>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

export default TabModal;

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Shadow-casting wrapper — see the big comment above the JSX for why this
  // is split from modalCard. Same soft-drop-shadow tokens the app already
  // uses for its other floating cards (StickieStyleNameModal's confirm
  // overlay), sized/radiused to match modalCard exactly underneath it.
  modalCardShadow: {
    width: '86%',
    maxWidth: 340,
    borderRadius: NEU_RADIUS.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  modalCard: {
    borderRadius: NEU_RADIUS.xl,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  topToolbar: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  dividerLine: {
    height: 1,
    marginHorizontal: 20,
    marginBottom: 4,
  },
  // Works reliably because modalCard now has a definite `height` (not
  // maxHeight), so this can actually flex against it and cede space to the
  // footer below, same as NoteModal.tsx's content area.
  scrollArea: {
    flex: 1,
  },
  formBody: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 4,
  },
  formGroup: {
    marginVertical: 8,
  },
  // Raised card every field group sits inside — same NEU_RADIUS.lg + padding
  // SettingsModal's SectionCard uses for every section on that screen.
  sectionCard: {
    padding: 14,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  itemHint: {
    fontSize: 11,
    marginBottom: 6,
    lineHeight: 15,
  },
  textInput: {
    height: 42,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    overflow: 'hidden',
  },
  colorInput: {
    flex: 1,
  },
  modeToggleTrack: {
    flexDirection: 'row',
    padding: 3,
  },
  modeToggleBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
  },
  modeToggleText: {
    fontSize: 12.5,
  },
  modeFieldSpacing: {
    marginTop: 10,
  },
  // Preset color swatch grid — same tokens as NoteModal's Styling bar /
  // SettingsModal's default-color rows.
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MINI_GAP,
  },
  swatch: {
    width: MINI_SWATCH,
    height: MINI_SWATCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSel: {
    borderWidth: 2,
    borderColor: '#3A4358',
  },
  swatchCheck: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  dropdownTrigger: {
    height: 42,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTriggerText: {
    fontSize: 15,
  },
  dropdownArrow: {
    fontSize: 10,
  },
  dropdownOptionsContainer: {
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownOptionRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 15,
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  actionButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  // Plain flex:1 wrapper around each NeuPressable button — see the footer
  // comment above the JSX for why the flex has to live out here.
  footerBtnWrap: {
    flex: 1,
    marginHorizontal: 4,
  },
  btnInner: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: NEU_DANGER,
  },
  btnSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteRowWrap: {
    marginTop: 12,
    marginHorizontal: 4,
  },
  deleteRowInner: {
    paddingVertical: 13,
    alignItems: 'center',
  },
  deleteRowText: {
    color: NEU_DANGER,
    fontWeight: '700',
    fontSize: 15,
  },
});