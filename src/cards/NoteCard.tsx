import React from 'react';
import { View, Text, TouchableOpacity, GestureResponderEvent } from 'react-native';
import { Note } from '../types';
import styles, { CARD_SIZE } from '../styles';
import { FRAME_COMPONENTS } from '../frames';

type NoteCardProps = {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  cardSize?: number;
};

const NoteCard = ({ note, onEdit, onDelete, onLongPress, cardSize: propCardSize }: NoteCardProps) => {
  const size = propCardSize ?? CARD_SIZE;
  const getTextStyle = (): any => {
    const baseStyle: any = { fontFamily: note.fontFamily, color: note.textColor };
    if (note.textStyle === 'bold') {
      baseStyle.fontWeight = 'bold';
    } else if (note.textStyle === 'italic') {
      baseStyle.fontStyle = 'italic';
    } else if (note.textStyle === 'underline') {
      baseStyle.textDecorationLine = 'underline';
    }
    return baseStyle;
  };

  const renderPreview = () => {
    const textStyle = getTextStyle();

    if (note.contentType === 'text') {
      // Show the full content text exactly as typed, just small
      return (
        <Text style={[styles.cardPreview, textStyle]} numberOfLines={10}>
          {note.content as string}
        </Text>
      );
    }

    // Checklist — mirrors the modal: bold title row, then mini checkbox + text per item
    const items = note.content as any[];
    const titleItem = items[0];
    const rawCheckItems = items.slice(1);

    const checkItems = (() => {
      if (note.checklistSort === 'unchecked-first') {
        return [...rawCheckItems].sort((a: any, b: any) => Number(a.completed) - Number(b.completed));
      }
      if (note.checklistSort === 'alphabetical') {
        return [...rawCheckItems].sort((a: any, b: any) => a.text.localeCompare(b.text));
      }
      return rawCheckItems;
    })();
    return (
      <View>
        {titleItem?.text ? (
          <Text
            style={[styles.cardPreview, textStyle, { fontWeight: '700', marginBottom: 3 }]}
            numberOfLines={1}
          >
            {titleItem.text}
          </Text>
        ) : null}
        {checkItems.map((item: any) => (
          <View key={item.id} style={{ flexDirection: 'row', alignItems: note.checklistTextMode === 'wrap' ? 'flex-start' : 'center', marginBottom: 2 }}>
            {/* Mini checkbox matching the modal's rounded-square shape */}
            <View style={{
              width: 7, height: 7,
              borderRadius: 1.5,
              borderWidth: 0.8,
              borderColor: textStyle.color || '#1C1C1E',
              backgroundColor: item.completed ? (textStyle.color || '#1C1C1E') : 'transparent',
              marginRight: 3,
              marginTop: note.checklistTextMode === 'wrap' ? 3 : 0,
              flexShrink: 0,
            }} />
            <Text
              style={[
                styles.cardPreview,
                textStyle,
                item.completed && { textDecorationLine: 'line-through', opacity: 0.5 },
              ]}
              numberOfLines={note.checklistTextMode === 'wrap' ? 3 : 1}
            >
              {item.text}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const FrameComponent = note.useSvgBackground && note.svgFrameId
    ? FRAME_COMPONENTS[note.svgFrameId]
    : null;

  const m = note.margins || { top: 0, bottom: 0, left: 0, right: 0 };
  const cardMargin = {
    paddingTop: m.top * 0.34,
    paddingBottom: m.bottom * 0.34,
    paddingLeft: m.left * 0.42,
    paddingRight: m.right * 0.42,
  };

  return (
    <TouchableOpacity
      style={[styles.card, { width: size, height: size }, !FrameComponent && { backgroundColor: note.color }]}
      onPress={onEdit}
      onLongPress={onLongPress}
      delayLongPress={200}
    >
      {FrameComponent && (
        <>
          <View style={styles.cardSvgBackground} pointerEvents="none">
            <FrameComponent size={size} />
          </View>
          <View style={styles.cardSvgBlurOverlay} pointerEvents="none" />
        </>
      )}
      <View style={[styles.cardContent, cardMargin]}>{renderPreview()}</View>
    </TouchableOpacity>
  );
};

export default NoteCard;
