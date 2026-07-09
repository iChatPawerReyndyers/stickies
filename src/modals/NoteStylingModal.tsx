import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { ContentType, TextStyle } from '../types';
import { COLORS, TEXT_COLORS, FONTS } from '../constants';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.5;

type NoteStylingModalProps = {
  visible: boolean;
  onClose: () => void;
  contentType: ContentType;
  onContentTypeChange: (type: ContentType) => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  selectedTextColor: string;
  onTextColorChange: (color: string) => void;
  selectedFont: string;
  onFontChange: (font: string) => void;
  selectedTextStyle: TextStyle;
  onTextStyleChange: (style: TextStyle) => void;
  useSvgBackground: boolean;
  onUseSvgBackgroundChange: (value: boolean) => void;
};

// Stacks on top of the compact NoteModal when its 'v' button is tapped —
// same compact 50%-screen-height treatment, but scrollable since it holds
// every styling + content-type control.
const NoteStylingModal = ({
  visible,
  onClose,
  contentType,
  onContentTypeChange,
  selectedColor,
  onColorChange,
  selectedTextColor,
  onTextColorChange,
  selectedFont,
  onFontChange,
  selectedTextStyle,
  onTextStyleChange,
  useSvgBackground,
  onUseSvgBackgroundChange,
}: NoteStylingModalProps) => {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalWrapper}>
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.headerLabel}>Styling</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dividerLine} />

            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Content Type</Text>
                <View style={styles.typeRow}>
                  {(['text', 'checklist'] as ContentType[]).map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeButton, contentType === type && styles.typeButtonActive]}
                      onPress={() => onContentTypeChange(type)}
                    >
                      <Text style={[styles.typeButtonText, contentType === type && styles.typeButtonTextActive]}>
                        {type === 'text' ? 'Text' : 'Checklist'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={styles.svgToggleRow}
                onPress={() => onUseSvgBackgroundChange(!useSvgBackground)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, useSvgBackground && styles.checkboxChecked]}>
                  {useSvgBackground && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={styles.svgToggleLabel}>Use SVG illustration background</Text>
              </TouchableOpacity>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Background Color</Text>
                <View
                  style={[styles.colorGrid, useSvgBackground && styles.disabledGrid]}
                  pointerEvents={useSvgBackground ? 'none' : 'auto'}
                >
                  {COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorSwatch, { backgroundColor: color }, selectedColor === color && styles.colorSwatchSelected]}
                      onPress={() => onColorChange(color)}
                    >
                      {selectedColor === color && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
                {useSvgBackground && (
                  <Text style={styles.disabledHint}>Disabled while using an SVG background.</Text>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Font Color</Text>
                <View style={styles.colorGrid}>
                  {TEXT_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[styles.colorSwatch, { backgroundColor: color }, selectedTextColor === color && styles.colorSwatchSelected]}
                      onPress={() => onTextColorChange(color)}
                    >
                      {selectedTextColor === color && <Text style={styles.checkMark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Font</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {FONTS.map(font => (
                    <TouchableOpacity
                      key={font.value}
                      style={[styles.fontOption, selectedFont === font.value && styles.fontOptionActive]}
                      onPress={() => onFontChange(font.value)}
                    >
                      <Text
                        style={[
                          styles.fontOptionText,
                          { fontFamily: font.value },
                          selectedFont === font.value && styles.fontOptionTextActive,
                        ]}
                      >
                        {font.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.lastSection}>
                <Text style={styles.sectionLabel}>Text Style</Text>
                <View style={styles.styleRow}>
                  {(['normal', 'bold', 'italic', 'underline'] as TextStyle[]).map(style => (
                    <TouchableOpacity
                      key={style}
                      style={[styles.styleButton, selectedTextStyle === style && styles.styleButtonActive]}
                      onPress={() => onTextStyleChange(style)}
                    >
                      <Text
                        style={[
                          styles.styleButtonText,
                          style === 'bold' && { fontWeight: 'bold' },
                          style === 'italic' && { fontStyle: 'italic' },
                          style === 'underline' && { textDecorationLine: 'underline' },
                          selectedTextStyle === style && styles.styleButtonTextActive,
                        ]}
                      >
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default NoteStylingModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalWrapper: {
    width: 320,
    height: MODAL_HEIGHT,
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  headerLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#E5E5EA',
    width: '100%',
  },
  scroll: {
    flex: 1,
    paddingTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  lastSection: {
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3A3A3C',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  svgToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkMark: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  svgToggleLabel: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  disabledGrid: {
    opacity: 0.35,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: '#1C1C1E',
  },
  disabledHint: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 8,
  },
  fontOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
    minWidth: 86,
    alignItems: 'center',
  },
  fontOptionActive: {
    backgroundColor: '#007AFF',
  },
  fontOptionText: {
    fontSize: 13,
    color: '#1C1C1E',
  },
  fontOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  styleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  styleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  styleButtonActive: {
    backgroundColor: '#007AFF',
  },
  styleButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3A3A3C',
  },
  styleButtonTextActive: {
    color: '#FFFFFF',
  },
});
