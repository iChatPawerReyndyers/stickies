import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { ChecklistItem, TextStyle } from '../types';
import styles from '../styles';

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
    const baseStyle: any = { fontFamily, color: textColor };
    if (textStyle === 'bold') {
      baseStyle.fontWeight = 'bold';
    } else if (textStyle === 'italic') {
      baseStyle.fontStyle = 'italic';
    } else if (textStyle === 'underline') {
      baseStyle.textDecorationLine = 'underline';
    }
    return baseStyle;
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
