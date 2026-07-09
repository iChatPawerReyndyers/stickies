import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Note } from '../types';
import styles from '../styles';

type ReadOnlyModalProps = {
  visible: boolean;
  note: Note | null;
  onClose: () => void;
};

const ReadOnlyModal = ({ visible, note, onClose }: ReadOnlyModalProps) => {
  if (!note) return null;

  const renderContent = () => {
    if (note.contentType === 'text') {
      return <Text style={styles.readOnlyContent}>{note.content as string}</Text>;
    }

    // item[0] is the title row — already shown as note.title above, so start from index 1.
    return (
      <View>
        {(note.content as any[]).slice(1).map((item: any) => (
          <Text key={item.id} style={styles.readOnlyContent}>
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
          <ScrollView style={styles.modalScroll}>
            <Text style={styles.label}>{note.title}</Text>
            {renderContent()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default ReadOnlyModal;
