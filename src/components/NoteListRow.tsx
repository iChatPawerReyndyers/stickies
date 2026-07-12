import React from 'react';
import { View, Text, GestureResponderEvent } from 'react-native';
import { Note } from '../types';
import { NeuPressable } from './Neumorphic';
import { NEU_RADIUS } from '../theme/neumorphic';

type NoteListRowProps = {
  note: Note;
  onEdit: () => void;
  onLongPress?: (event: GestureResponderEvent) => void;
};

const NoteListRow = ({ note, onEdit, onLongPress }: NoteListRowProps) => {
  const getSnippet = (): string => {
    if (note.contentType === 'text') {
      return (note.content as string).trim();
    }
    const items = note.content as any[];
    const checkItems = items.slice(1).filter(i => i.text.trim());
    return checkItems.map(i => i.text).join(' · ');
  };

  return (
    <NeuPressable
      radius={NEU_RADIUS.md}
      backgroundColor={note.color}
      style={{ flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10 }}
      onPress={onEdit}
      onLongPress={onLongPress}
      delayLongPress={200}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontFamily: note.fontFamily, color: note.textColor, fontWeight: '700', fontSize: 15, marginBottom: 3 }}
          numberOfLines={1}
        >
          {note.title}
        </Text>
        {!!getSnippet() && (
          <Text
            style={{ fontFamily: note.fontFamily, color: note.textColor, opacity: 0.7, fontSize: 12 }}
            numberOfLines={1}
          >
            {getSnippet()}
          </Text>
        )}
      </View>
      {note.contentType === 'checklist' && (
        <Text style={{ fontSize: 13, color: note.textColor, opacity: 0.6, marginLeft: 8 }}>☑</Text>
      )}
    </NeuPressable>
  );
};

export default NoteListRow;