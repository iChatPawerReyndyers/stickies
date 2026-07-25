import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, LayoutChangeEvent, Dimensions } from 'react-native';
import { Note, DEFAULT_LINE_SPACING } from '../types';
import styles from '../styles';
import { NeuPressable } from '../components/Neumorphic';
import { resolveFontStyle } from '../utils/fontResolver';
import { getNeuPalette, NEU_ACCENT, NEU_DANGER, NEU_RADIUS } from '../theme/neumorphic';

// Fixed bottom padding baked into styles.modalContent — subtracted below so
// the computed scroll-area height matches the actual space left over after
// the header, not just the raw card height.
const MODAL_CONTENT_BOTTOM_PADDING = 20;

// Card is sized as a fraction of the screen rather than styles.modalContent's
// own fixed width/height, so it scales consistently across device sizes.
// Overridden locally (instead of editing styles.modalContent itself) the
// same way NoteModal/SettingsModal already derive their own sizes from
// Dimensions.get('window') rather than the shared stylesheet.
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_WIDTH = SCREEN_WIDTH * 0.93;
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.7;

type ReadOnlyModalProps = {
  visible: boolean;
  note: Note | null;
  onClose: () => void;
  // Explicit action buttons for a read-only note (archived or trashed) —
  // this view no longer supports swipe-to-action or any styling edits, so
  // both moving the note back to its previous tab and (trash-only)
  // permanently deleting it are surfaced as real buttons in the header
  // instead. onRestore is always provided when the modal is shown for an
  // archived/trashed note; onDeleteForever is only relevant — and only
  // rendered — for a note currently in Trash.
  onRestore?: () => void;
  onDeleteForever?: () => void;
  // Follows the app's Theme setting for the card chrome (background,
  // header, title). The note's own text stays note.textColor either way —
  // that's the note's own styling choice, not app theme.
  isDark?: boolean;
};

const ReadOnlyModal = ({ visible, note, onClose, onRestore, onDeleteForever, isDark = false }: ReadOnlyModalProps) => {
  const p = getNeuPalette(isDark);

  // Measured pixel heights of the modal card and its header block (title
  // row + action-button row together — see onHeaderLayout below). A
  // flex:1 chain here doesn't reliably resolve to a bounded height on
  // every RN/platform combination, which can leave the ScrollView
  // effectively unconstrained (and therefore not actually scrollable) even
  // though the flex styles look correct. Measuring both boxes directly and
  // giving the ScrollView an explicit numeric height sidesteps that
  // entirely.
  const [containerHeight, setContainerHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);

  if (!note) return null;

  // Mirrors NoteModal's getTextStyle() so a note looks the same here as it
  // did in the editor — previously this view ignored font family, size,
  // color, and bold/italic/underline entirely and just used a fixed style.
  const getTextStyle = (): any => {
    const fontSize = note.fontSize || 16;
    const lineSpacing = note.lineSpacing ?? DEFAULT_LINE_SPACING;
    return {
      ...resolveFontStyle(note.fontFamily, note.textStyle),
      color: note.textColor,
      fontSize,
      lineHeight: fontSize + lineSpacing,
    };
  };

  const renderContent = () => {
    const textStyle = getTextStyle();

    if (note.contentType === 'text') {
      return <Text style={[styles.readOnlyContent, textStyle]}>{note.content as string}</Text>;
    }

    // item[0] is the title row — already shown as note.title above, so start from index 1.
    return (
      <View>
        {(note.content as any[]).slice(1).map((item: any) => (
          <Text
            key={item.id}
            style={[styles.readOnlyContent, textStyle, item.completed && { textDecorationLine: 'line-through', opacity: 0.5 }]}
          >
            {item.completed ? '✓' : '○'} {item.text}
          </Text>
        ))}
      </View>
    );
  };

  const onContainerLayout = (e: LayoutChangeEvent) => setContainerHeight(e.nativeEvent.layout.height);
  const onHeaderLayout = (e: LayoutChangeEvent) => setHeaderHeight(e.nativeEvent.layout.height);

  // Falls back to flex:1 (the old behavior) until both measurements land on
  // the first render, then switches to a hard pixel height once we actually
  // know how much room is left for content.
  const hasMeasurements = containerHeight > 0 && headerHeight > 0;
  const scrollAreaStyle = hasMeasurements
    ? { height: Math.max(0, containerHeight - headerHeight - MODAL_CONTENT_BOTTOM_PADDING) }
    : { flex: 1 };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center' }]}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: p.base,
              shadowColor: p.darkShadow,
              width: MODAL_WIDTH,
              height: MODAL_HEIGHT,
              borderRadius: 20,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderBottomLeftRadius: 20,
              borderBottomRightRadius: 20,
            },
          ]}
          onLayout={onContainerLayout}
        >
          <View
            onLayout={onHeaderLayout}
            style={[styles.modalHeader, { borderBottomColor: `${p.darkShadow}30`, alignItems: 'flex-start' }]}
          >
            <TouchableOpacity onPress={onClose} style={{ paddingTop: 4 }}>
              <Text style={styles.modalCloseButton}>← Close</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: p.textPrimary, flex: 1, textAlign: 'center', paddingTop: 4 }]}>
              View Note
            </Text>
            {/* Restore / Delete forever — replaces the old swipe-left/
                swipe-right gestures now that this view is fully read-only.
                Sits where the header's old symmetry spacer used to be.
                Restore always sends the note back to note.previousTabId
                (falling back to General). Delete forever only ever applies
                to a note actually sitting in Trash, so it's a smaller
                secondary link stacked underneath rather than a second
                same-weight button. */}
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              {!!onRestore && (
                <NeuPressable
                  isDark={isDark}
                  radius={NEU_RADIUS.sm}
                  backgroundColor={NEU_ACCENT}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, gap: 6 }}
                  onPress={onRestore}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>↺ Restore</Text>
                </NeuPressable>
              )}
              {note.tabId === 'trash' && !!onDeleteForever && (
                <TouchableOpacity onPress={onDeleteForever} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                  <Text style={{ color: NEU_DANGER, fontWeight: '700', fontSize: 11.5 }}>Delete Forever</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <ScrollView
            style={[{ paddingHorizontal: 16, paddingTop: 16 }, scrollAreaStyle]}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            scrollEnabled
          >
            <Text style={[styles.label, getTextStyle(), { fontWeight: '700' }]}>{note.title}</Text>
            {renderContent()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default ReadOnlyModal;