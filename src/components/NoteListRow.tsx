import React from 'react';
import { View, Text, GestureResponderEvent } from 'react-native';
import { Note } from '../types';
import { NeuPressable } from './Neumorphic';
import { NEU_RADIUS } from '../theme/neumorphic';

// Fixed margin the neumorphic shadow is allowed to bleed past the row's
// own bounds — wrapping the row in an overflow:'hidden' container this
// much larger than the card caps the shadow at exactly this amount
// regardless of `distance`, instead of tuning distance by trial and error
// (the layered fake-blur shadow's outermost layers can otherwise bleed
// well past a card's edges — see Neumorphic.tsx's buildDarkBlurLayers/
// buildLightBlurLayers — which read as a separate pale strip beneath the
// row rather than a normal soft shadow).
const LIST_ROW_SHADOW_CLIP = 3;

type NoteListRowProps = {
  note: Note;
  onEdit: () => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  // See NoteCard's prop of the same name — drops the neumorphic shadow when
  // the active tab has a screen wallpaper behind the list.
  hasScreenBackgroundImage?: boolean;
  // Follows the app's Theme setting for the row's shadow tint — the row's
  // own fill (note.color) stays fixed regardless, same as NoteCard.
  isDark?: boolean;
};

const NoteListRow = ({ note, onEdit, onLongPress, hasScreenBackgroundImage = false, isDark = false }: NoteListRowProps) => {
  const getSnippet = (): string => {
    if (note.contentType === 'text') {
      return (note.content as string).trim();
    }
    const items = note.content as any[];
    const checkItems = items.slice(1).filter(i => i.text.trim());
    return checkItems.map(i => i.text).join(' · ');
  };

  return (
    <View
      style={{
        borderRadius: NEU_RADIUS.lg + LIST_ROW_SHADOW_CLIP,
        overflow: 'hidden',
        padding: LIST_ROW_SHADOW_CLIP,
        marginBottom: 10,
      }}
    >
      <NeuPressable
        radius={NEU_RADIUS.lg}
        isDark={isDark}
        backgroundColor={note.color}
        noShadow={hasScreenBackgroundImage}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}
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
              numberOfLines={3}
            >
              {getSnippet()}
            </Text>
          )}
        </View>
        {note.contentType === 'checklist' && (
          <Text style={{ fontSize: 13, color: note.textColor, opacity: 0.6, marginLeft: 8 }}>☑</Text>
        )}
      </NeuPressable>
    </View>
  );
};

export default NoteListRow;