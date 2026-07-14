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
import { NeuView } from '../components/Neumorphic';
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
  const [afterTabId, setAfterTabId] = useState<string | undefined>(editing?.id ? undefined : 'general');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    setName(editing?.name || '');
    setColorHex(getHexInputValue(editing?.color));
    setTextColorHex(getHexInputValue(editing?.textColor));
    setBackgroundImageUrl(editing?.backgroundImageUrl || '');
    setScreenBackgroundImageUrl(editing?.screenBackgroundImageUrl || '');
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

  const handleSave = () => {
    const trimmedName = name.trim() || 'New';
    const finalColor = normalizeHexColor(colorHex.trim()) || undefined;
    const finalTextColor = normalizeHexColor(textColorHex.trim()) || undefined;
    onSave(
      editing?.id,
      trimmedName,
      finalColor,
      afterTabId,
      finalTextColor,
      backgroundImageUrl.trim() || undefined,
      screenBackgroundImageUrl.trim() || undefined,
    );
  };

  // Live swatch preview — falls back to the tab's existing color, or a neutral
  // placeholder for a brand-new tab with nothing typed yet.
  const previewColor = normalizeHexColor(colorHex) || editing?.color || '#CCCCCC';
  const previewTextColor = normalizeHexColor(textColorHex) || editing?.textColor || '#FFFFFF';
  const resolvedPreviewImage = resolveImageUrl(backgroundImageUrl);
  const resolvedScreenPreviewImage = resolveImageUrl(screenBackgroundImageUrl);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable style={modalStyles.overlay} onPress={onCancel}>
        {/* Flat surface, no NeuView here on purpose — the raised dual-shadow
            reads as a harsh white bloom against the dark backdrop. Matches
            how PinSetupModal / StickieStyleNameModal already do their modal
            cards: flat p.base background, no shadow, inputs inside still
            carry the neumorphic inset treatment. */}
        <Pressable
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
              <Text style={[modalStyles.itemLabel, { color: p.textPrimary }]}>name</Text>
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
              <Text style={[modalStyles.itemLabel, { color: p.textPrimary }]}>background</Text>
              <View style={modalStyles.colorRow}>
                <NeuView isDark={isDark} radius={9} backgroundColor={previewColor} style={modalStyles.colorSwatch}>
                  {!!resolvedPreviewImage && (
                    <Image source={{ uri: resolvedPreviewImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  )}
                </NeuView>
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
            </View>

            <View style={modalStyles.formGroup}>
              <Text style={[modalStyles.itemLabel, { color: p.textPrimary }]}>tab label image</Text>
              <Text style={[modalStyles.itemHint, { color: p.textSecondary }]}>Shown behind the tab pill itself. Google Drive link ("Anyone with the link") or any public image URL. Overrides the color above.</Text>
              <View style={modalStyles.colorRow}>
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
            </View>

            <View style={modalStyles.formGroup}>
              <Text style={[modalStyles.itemLabel, { color: p.textPrimary }]}>main screen background image</Text>
              <Text style={[modalStyles.itemHint, { color: p.textSecondary }]}>Shown as the app's wallpaper behind the notes grid whenever this tab is open. Independent of the tab label image above — set one, both, or neither.</Text>
              <View style={modalStyles.colorRow}>
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
            </View>

            <View style={modalStyles.formGroup}>
              <Text style={[modalStyles.itemLabel, { color: p.textPrimary }]}>label color</Text>
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
                style={[modalStyles.btn, { backgroundColor: p.insetBase }]}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text style={modalStyles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.btn, { backgroundColor: NEU_ACCENT }]}
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Text style={modalStyles.btnSaveText}>{editing ? 'Save' : 'Create'}</Text>
              </TouchableOpacity>
            </View>

            {editing?.id && (
              <TouchableOpacity
                style={[modalStyles.deleteRow, { backgroundColor: p.insetBase }]}
                onPress={() => onDelete(editing.id)}
                activeOpacity={0.8}
              >
                <Text style={modalStyles.deleteRowText}>Delete Tab</Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
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