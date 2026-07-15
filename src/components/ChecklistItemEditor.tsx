import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { ChecklistItem, TextStyle } from '../types';
import styles from '../styles';
import { resolveFontStyle } from '../utils/fontResolver';

type ChecklistItemEditorProps = {
  item: ChecklistItem;
  onToggle: () => void;
  onTextChange: (text: string) => void;
  onAddItem?: () => void;
  fontFamily: string;
  textStyle: TextStyle;
  textColor: string;
};

const ChecklistItemEditor = ({ item, onToggle, onTextChange, onAddItem, fontFamily, textStyle, textColor }: ChecklistItemEditorProps) => {
  const getInputStyle = (): any => {
    return { ...resolveFontStyle(fontFamily, textStyle), color: textColor };
  };

  return (
    <View style={styles.checklistItemEditor}>
      <TouchableOpacity onPress={onToggle} style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
        <Text style={styles.checkMark}>{item.completed ? '✓' : ''}</Text>
      </TouchableOpacity>
      <TextInput
        style={[styles.checklistItemInput, getInputStyle(), item.completed && styles.checklistItemCompleted]}
        value={item.text}
        onChangeText={onTextChange}
        placeholder="Checklist item"
        placeholderTextColor="#ccc"
        multiline={false}
        blurOnSubmit={false}
        returnKeyType="next"
        onSubmitEditing={() => onAddItem && onAddItem()}
      />
    </View>
  );
};

export default ChecklistItemEditor;