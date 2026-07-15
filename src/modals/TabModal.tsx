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
} from 'react-native';
import { Tab } from '../types';
import { getHexInputValue, normalizeHexColor } from '../utils/color';
import { resolveImageUrl } from '../utils/googleDriveImage';
import { NeuView, NeuPressable } from '../components/Neumorphic';
import NeuColorPickerModal from '../components/NeuColorPickerModal';
import { getNeuPalette, NEU_ACCENT, NEU_DANGER, NEU_RADIUS } from '../theme/neumorphic';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// A fixed (not max-) height, same pattern NoteModal.tsx already uses
// successfully for its own card (MODAL_HEIGHT = SCREEN_HEIGHT * 0.5).
// maxHeight-only containers don't hand a definite size down to a flex:1
// ScrollView in Yoga, so a fixed height gives it something concrete to
// flex against, letting it reliably fill the remaining space and scroll.
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.72;

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

// Keeps the color-swatch tap targets from competing with the form
// ScrollView for the drag gesture. TouchableOpacity/Pressable are both
// built on the Pressability system, which is exactly what the modal card
// itself used to run into for the same reason once there was enough form
// content to actually need scrolling. This sidesteps that system entirely:
// a plain View using the raw responder API, treated as a tap only if the
// finger barely moved between grant and release — anything more (a real
// scroll drag that happened to start on a swatch) falls through untouched.
const SWATCH_TAP_SLOP = 6;

const ColorSwatchButton: React.FC<{ onPress: () => void; children: React.ReactNode }> = ({ onPress, children }) => {
  const start = useRef({ x: 0, y: 0 });
  return (
    <View
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      }}
      onResponderRelease={(e) => {
        const dx = Math.abs(e.nativeEvent.pageX - start.current.x);
        const dy = Math.abs(e.nativeEvent.pageY - start.current.y);
        if (dx < SWATCH_TAP_SLOP && dy < SWATCH_TAP_SLOP) onPress();
      }}
      onResponderTerminationRequest={() => true}
    >
      {children}
    </View>
  );
};

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
  // Which color row's swatch was tapped to open NeuColorPickerModal — null
  // when the picker is closed. Reused for all three rows instead of three
  // separate booleans since only one can be open at a time.
  const [colorPickerTarget, setColorPickerTarget] = useState<'label' | 'text' | 'screen' | null>(null);

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

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      {/* Backdrop is now a sibling of the card (not its parent) — a tap
          anywhere on the card never reaches this Pressable, so the card no
          longer needs to swallow touches itself just to avoid dismissing.
          That's what unblocks the ScrollView below: previously the card
          used onStartShouldSetResponder={() => true} to intercept every
          touch (so taps wouldn't fall through to this backdrop's onPress),
          but claiming the responder on touch-start like that also stops
          the ScrollView from ever getting a chance to recognize a drag as
          a scroll gesture. */}
      <View style={modalStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <View
          style={[
            modalStyles.modalCard,
            { backgroundColor: p.base, height: MODAL_HEIGHT },
          ]}
        >
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
            </View>

            <View style={modalStyles.formGroup}>
              <Text style={[modalStyles.itemLabel, { color: p.textPrimary }]}>Label Background</Text>
              <Text style={[modalStyles.itemHint, { color: p.textSecondary }]}>Shown behind the tab pill itself.</Text>
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
                <View style={[modalStyles.colorRow, modalStyles.modeFieldSpacing]}>
                  <ColorSwatchButton onPress={() => setColorPickerTarget('label')}>
                    <NeuView isDark={isDark} radius={9} backgroundColor={previewColor} style={modalStyles.colorSwatch} />
                  </ColorSwatchButton>
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
            </View>

            <View style={modalStyles.formGroup}>
              <Text style={[modalStyles.itemLabel, { color: p.textPrimary }]}>Label Color</Text>
              <View style={modalStyles.colorRow}>
                <ColorSwatchButton onPress={() => setColorPickerTarget('text')}>
                  <NeuView isDark={isDark} radius={9} backgroundColor={previewTextColor} style={modalStyles.colorSwatch} />
                </ColorSwatchButton>
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
            </View>

            <View style={modalStyles.formGroup}>
              <Text style={[modalStyles.itemLabel, { color: p.textPrimary }]}>Tab Background</Text>
              <Text style={[modalStyles.itemHint, { color: p.textSecondary }]}>Shown as the app's wallpaper behind the notes grid whenever this tab is open.</Text>
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
                <View style={[modalStyles.colorRow, modalStyles.modeFieldSpacing]}>
                  <ColorSwatchButton onPress={() => setColorPickerTarget('screen')}>
                    <NeuView isDark={isDark} radius={9} backgroundColor={previewScreenBackgroundColor} style={modalStyles.colorSwatch} />
                  </ColorSwatchButton>
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
            </View>

            {showAfterField && (
              <View style={modalStyles.formGroup}>
                <Text style={[modalStyles.itemLabel, { color: p.textPrimary }]}>place after</Text>

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
              </View>
            )}
          </ScrollView>

          {/* Footer — plain TouchableOpacity buttons, deliberately NOT
              NeuPressable here. NeuPressable only forwards `style` to its
              inner NeuView, never to the outer Pressable — harmless for a
              button that sizes to its own content, but it means flex:1
              never reaches the actual flex-participating element, which is
              exactly what was collapsing this row to invisible. Same fix
              StickieStyleNameModal.tsx already uses for its own Cancel/Save. */}
          <View style={modalStyles.footer}>
            <View style={modalStyles.actionButtonRow}>
              <TouchableOpacity
                style={[modalStyles.btn, modalStyles.btnInset, { backgroundColor: p.insetBase }]}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text style={modalStyles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.btn, modalStyles.btnRaised, { backgroundColor: NEU_ACCENT, shadowColor: p.darkShadow }]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text style={modalStyles.btnSaveText}>{editing ? 'Save' : 'Create'}</Text>
              </TouchableOpacity>
            </View>

            {editing?.id && (
              <TouchableOpacity
                style={[modalStyles.deleteRow, modalStyles.btnInset, { backgroundColor: p.insetBase }]}
                onPress={() => onDelete(editing.id)}
                activeOpacity={0.8}
              >
                <Text style={modalStyles.deleteRowText}>Delete Tab</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <NeuColorPickerModal
          visible={colorPickerTarget !== null}
          initialColor={
            colorPickerTarget === 'label' ? previewColor
            : colorPickerTarget === 'text' ? previewTextColor
            : previewScreenBackgroundColor
          }
          title={
            colorPickerTarget === 'label' ? 'Label background'
            : colorPickerTarget === 'text' ? 'Label color'
            : 'Tab background'
          }
          isDark={isDark}
          onCancel={() => setColorPickerTarget(null)}
          onSave={(hex) => {
            const clean = hex.replace('#', '');
            if (colorPickerTarget === 'label') setColorHex(clean);
            else if (colorPickerTarget === 'text') setTextColorHex(clean);
            else if (colorPickerTarget === 'screen') setScreenBackgroundColorHex(clean);
            setColorPickerTarget(null);
          }}
        />
      </View>
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
  modalCard: {
    width: '86%',
    maxWidth: 340,
    borderRadius: 24,
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
  btn: {
    flex: 1,
    height: 46,
    borderRadius: NEU_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  // Manual approximations of NeuView's raised/inset shadow pair — used here
  // instead of NeuPressable because NeuPressable only forwards `style` to
  // its inner NeuView, never the outer Pressable, so a flex:1 button never
  // actually participates in this row's flex layout (see the comment above
  // this footer in the JSX).
  btnRaised: {
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  btnInset: {
    borderWidth: 1.5,
    borderTopColor: 'rgba(0,0,0,0.15)',
    borderLeftColor: 'rgba(0,0,0,0.15)',
    borderBottomColor: 'rgba(255,255,255,0.7)',
    borderRightColor: 'rgba(255,255,255,0.7)',
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
  // Same inset/danger treatment as the Cancel button above, per earlier request.
  deleteRow: {
    marginTop: 12,
    marginHorizontal: 4,
    paddingVertical: 13,
    borderRadius: NEU_RADIUS.sm,
    alignItems: 'center',
  },
  deleteRowText: {
    color: NEU_DANGER,
    fontWeight: '700',
    fontSize: 15,
  },
});