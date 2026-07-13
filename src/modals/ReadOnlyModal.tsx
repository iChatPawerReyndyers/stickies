import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, LayoutChangeEvent } from 'react-native';
import { Note, DEFAULT_LINE_SPACING } from '../types';
import styles from '../styles';
import SwipeToAction from '../components/SwipeToAction';

// Fixed bottom padding baked into styles.modalContent — subtracted below so
// the computed scroll-area height matches the actual space left over after
// the header, not just the raw card height.
const MODAL_CONTENT_BOTTOM_PADDING = 20;

type ReadOnlyModalProps = {
  visible: boolean;
  note: Note | null;
  onClose: () => void;
  // Swipe-to-action while viewing a read-only (already-trashed) note. Left =
  // permanently delete now, right = restore to the tab it was trashed from.
  onSwipeDelete?: () => void;
  onSwipeRestore?: () => void;
};

const ReadOnlyModal = ({ visible, note, onClose, onSwipeDelete, onSwipeRestore }: ReadOnlyModalProps) => {
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
    const base: any = {
      fontFamily: note.fontFamily,
      color: note.textColor,
      fontSize,
      lineHeight: fontSize + lineSpacing,
    };
    if (note.textStyle === 'bold') base.fontWeight = 'bold';
    else if (note.textStyle === 'italic') base.fontStyle = 'italic';
    else if (note.textStyle === 'underline') base.textDecorationLine = 'underline';
    return base;
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
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent} onLayout={onContainerLayout}>
          <View style={styles.modalHeader} onLayout={onHeaderLayout}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCloseButton}>← Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>View Note</Text>
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