import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, LayoutChangeEvent, Dimensions } from 'react-native';
import { Note, DEFAULT_LINE_SPACING } from '../types';
import styles from '../styles';
import SwipeToAction from '../components/SwipeToAction';
import { resolveFontStyle } from '../utils/fontResolver';
import { getNeuPalette } from '../theme/neumorphic';

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
  // Swipe-to-action while viewing a read-only (already-trashed) note. Left =
  // permanently delete now, right = restore to the tab it was trashed from.
  onSwipeDelete?: () => void;
  onSwipeRestore?: () => void;
  // Follows the app's Theme setting for the card chrome (background,
  // header, title). The note's own text stays note.textColor either way —
  // that's the note's own styling choice, not app theme.
  isDark?: boolean;
};

const ReadOnlyModal = ({ visible, note, onClose, onSwipeDelete, onSwipeRestore, isDark = false }: ReadOnlyModalProps) => {
  const p = getNeuPalette(isDark);

  // Measured pixel heights of the modal card and its header row. The scroll
  // area previously relied on a flex:1 chain running through SwipeToAction's
  // Animated.View (which also carries a transform for the swipe gesture) —
  // that chain doesn't reliably resolve to a bounded height on every RN/
  // platform combination, which can leave the ScrollView effectively
  // unconstrained (and therefore not actually scrollable) even though the
  // flex styles look correct. Measuring both boxes directly and giving the
  // ScrollView an explicit numeric height sidesteps that entirely.
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
          <View style={[styles.modalHeader, { borderBottomColor: `${p.darkShadow}30` }]} onLayout={onHeaderLayout}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCloseButton}>← Close</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: p.textPrimary }]}>View Note</Text>
            <View style={{ width: 60 }} />
          </View>
          <SwipeToAction
            enabled={!!(onSwipeDelete || onSwipeRestore)}
            onSwipeLeft={onSwipeDelete}
            onSwipeRight={onSwipeRestore}
            leftLabel="Delete Forever"
            rightLabel="Restore"
          >
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
          </SwipeToAction>
        </View>
      </View>
    </Modal>
  );
};

export default ReadOnlyModal;