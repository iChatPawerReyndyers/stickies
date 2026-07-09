import React, { useEffect } from 'react';
import { View, Text, TextInput } from 'react-native';
import { ChecklistItem, ContentType, TextStyle } from '../types';
import ChecklistItemEditor from './ChecklistItemEditor';
import styles from '../styles';

type ContentEditorProps = {
  type: ContentType;
  content: string | ChecklistItem[];
  onContentChange: (content: string | ChecklistItem[]) => void;
  fontFamily: string;
  textStyle: TextStyle;
  textColor: string;
};

const ContentEditor = ({ type, content, onContentChange, fontFamily, textStyle, textColor }: ContentEditorProps) => {
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

  if (type === 'text') {
    return (
      <View>
        <Text style={styles.label}>Content</Text>
        <TextInput
          style={[styles.contentInput, getInputStyle()]}
          placeholder="Enter your text here..."
          multiline
          value={content as string}
          onChangeText={onContentChange}
          placeholderTextColor="#999"
          textAlignVertical="top"
        />
      </View>
    );
  }

  const items = Array.isArray(content) ? content : [];

  useEffect(() => {
    if (items.length === 0) {
      onContentChange([{ id: Date.now().toString(), text: '', completed: false }]);
    }
  }, []);

  const addItemAfter = (id: string) => {
    const nextItems = [...items];
    const index = nextItems.findIndex(item => item.id === id);
    const newItem = { id: Date.now().toString(), text: '', completed: false };
    if (index >= 0) {
      nextItems.splice(index + 1, 0, newItem);
    } else {
      nextItems.push(newItem);
    }
    onContentChange(nextItems);
  };

  const updateItem = (id: string, text: string) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, text } : item
    );
    onContentChange(updatedItems);
  };

  const toggleItem = (id: string) => {
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    onContentChange(updatedItems);
  };

  return (
    <View>
      <Text style={styles.label}>Checklist Items</Text>
      <View style={styles.checklistPreview}>
        {items.map(item => (
          <ChecklistItemEditor
            key={item.id}
            item={item}
            onToggle={() => toggleItem(item.id)}
            onTextChange={(newText) => updateItem(item.id, newText)}
            onAddItem={() => addItemAfter(item.id)}
            fontFamily={fontFamily}
            textStyle={textStyle}
            textColor={textColor}
          />
        ))}
      </View>
    </View>
  );
};

export default ContentEditor;
