import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Note, DEFAULT_LINE_SPACING } from '../types';
import styles from '../styles';
import SwipeToAction from '../components/SwipeToAction';

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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
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
            <ScrollView style={styles.modalScroll}>
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