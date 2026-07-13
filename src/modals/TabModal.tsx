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
} from 'react-native';
import { Tab } from '../types';
import { getHexInputValue, normalizeHexColor } from '../utils/color';
import { resolveImageUrl } from '../utils/googleDriveImage';

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
};

// Keeps the color fields strictly to valid hex digits while still allowing shorthand input.
const sanitizeHex = (text: string) => text.replace(/[^0-9a-fA-F]/g, '').toUpperCase();

const TabModal = ({ visible, editing, tabs, onSave, onDelete, onCancel }: TabModalProps) => {
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
        <Pressable style={modalStyles.modalCard}>
          <View style={modalStyles.topToolbar}>
            <Text style={modalStyles.headerLabel}>{editing ? 'Edit tab:' : 'New tab:'}</Text>
          </View>

          <View style={modalStyles.dividerLine} />

          <ScrollView contentContainerStyle={modalStyles.formBody} bounces={false} showsVerticalScrollIndicator={false}>
            <View style={modalStyles.formGroup}>
              <Text style={modalStyles.itemLabel}>name</Text>
              <TextInput
                style={modalStyles.textInput}
                placeholder="Enter name"
                placeholderTextColor="#C7C7CC"
                value={name}
                onChangeText={setName}
                autoCorrect={false}
              />
            </View>

            <View style={modalStyles.formGroup}>
              <Text style={modalStyles.itemLabel}>background</Text>
              <View style={modalStyles.colorRow}>
                <View style={[modalStyles.colorSwatch, { backgroundColor: previewColor, overflow: 'hidden' }]}>
                  {!!resolvedPreviewImage && (
                    <Image source={{ uri: resolvedPreviewImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  )}
                </View>
                <TextInput
                  style={[modalStyles.textInput, modalStyles.colorInput]}
                  placeholder="e.g. FF5733"
                  placeholderTextColor="#C7C7CC"
                  value={colorHex}
                  onChangeText={handleColorChange}
                  maxLength={8}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={modalStyles.formGroup}>
              <Text style={modalStyles.itemLabel}>tab label image</Text>
              <Text style={modalStyles.itemHint}>Shown behind the tab pill itself. Google Drive link ("Anyone with the link") or any public image URL. Overrides the color above.</Text>
              <View style={modalStyles.colorRow}>
                {!!resolvedPreviewImage && (
                  <View style={[modalStyles.colorSwatch, { overflow: 'hidden' }]}>
                    <Image source={{ uri: resolvedPreviewImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </View>
                )}
                <TextInput
                  style={[modalStyles.textInput, modalStyles.colorInput]}
                  placeholder="Paste a link…"
                  placeholderTextColor="#C7C7CC"
                  value={backgroundImageUrl}
                  onChangeText={setBackgroundImageUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={modalStyles.formGroup}>
              <Text style={modalStyles.itemLabel}>main screen background image</Text>
              <Text style={modalStyles.itemHint}>Shown as the app's wallpaper behind the notes grid whenever this tab is open. Independent of the tab label image above — set one, both, or neither.</Text>
              <View style={modalStyles.colorRow}>
                {!!resolvedScreenPreviewImage && (
                  <View style={[modalStyles.colorSwatch, { overflow: 'hidden' }]}>
                    <Image source={{ uri: resolvedScreenPreviewImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </View>
                )}
                <TextInput
                  style={[modalStyles.textInput, modalStyles.colorInput]}
                  placeholder="Paste a link…"
                  placeholderTextColor="#C7C7CC"
                  value={screenBackgroundImageUrl}
                  onChangeText={setScreenBackgroundImageUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={modalStyles.formGroup}>
              <Text style={modalStyles.itemLabel}>label color</Text>
              <View style={modalStyles.colorRow}>
                <View style={[modalStyles.colorSwatch, { backgroundColor: previewTextColor }]} />
                <TextInput
                  style={[modalStyles.textInput, modalStyles.colorInput]}
                  placeholder="e.g. FFFFFF"
                  placeholderTextColor="#C7C7CC"
                  value={textColorHex}
                  onChangeText={handleTextColorChange}
                  maxLength={8}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
            </View>

            {showAfterField && (
              <View style={modalStyles.formGroup}>
                <Text style={modalStyles.itemLabel}>place after</Text>

                <TouchableOpacity
                  style={modalStyles.dropdownTrigger}
                  onPress={() => setIsDropdownOpen(prev => !prev)}
                  activeOpacity={0.8}
                >
                  <Text style={modalStyles.dropdownTriggerText}>
                    {afterTabId ? tabs.find(tab => tab.id === afterTabId)?.name : 'After general'}
                  </Text>
                  <Text style={modalStyles.dropdownArrow}>{isDropdownOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {isDropdownOpen && (
                  <View style={modalStyles.dropdownOptionsContainer}>
                    {afterOptions.map(tab => (
                      <TouchableOpacity
                        key={tab.id}
                        style={[
                          modalStyles.dropdownOptionRow,
                          afterTabId === tab.id && modalStyles.selectedOptionRow,
                        ]}
                        onPress={() => {
                          setAfterTabId(tab.id);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <Text style={[
                          modalStyles.optionText,
                          afterTabId === tab.id && modalStyles.selectedOptionText,
                        ]}>
                          {tab.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={modalStyles.actionButtonRow}>
              <TouchableOpacity style={[modalStyles.btn, modalStyles.btnCancel]} onPress={onCancel}>
                <Text style={modalStyles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[modalStyles.btn, modalStyles.btnSave]} onPress={handleSave}>
                <Text style={modalStyles.btnSaveText}>{editing ? 'Save' : 'Create'}</Text>
              </TouchableOpacity>
            </View>

            {editing?.id && (
              <TouchableOpacity style={modalStyles.deleteRow} onPress={() => onDelete(editing.id)}>
                <Text style={modalStyles.deleteRowText}>Delete Tab</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
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
    width: 310,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    paddingVertical: 12,
  },
  topToolbar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 20,
    marginVertical: 4,
  },
  formBody: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  formGroup: {
    marginVertical: 8,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  itemHint: {
    fontSize: 11,
    color: '#8E8E93',
    marginBottom: 6,
    lineHeight: 15,
  },
  textInput: {
    height: 42,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#000000',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  colorInput: {
    flex: 1,
  },
  dropdownTrigger: {
    height: 42,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTriggerText: {
    fontSize: 15,
    color: '#000000',
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#8E8E93',
  },
  dropdownOptionsContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5EA',
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownOptionRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  selectedOptionRow: {
    backgroundColor: '#E8F2FF',
  },
  optionText: {
    fontSize: 15,
    color: '#1C1C1E',
  },
  selectedOptionText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  actionButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingBottom: 6,
  },
  btn: {
    flex: 0.46,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: '#F2F2F7',
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
  btnSave: {
    backgroundColor: '#007AFF',
  },
  btnSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteRow: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFEAEA',
    alignItems: 'center',
  },
  deleteRowText: {
    color: '#FF3B30',
    fontWeight: '600',
    fontSize: 15,
  },
});