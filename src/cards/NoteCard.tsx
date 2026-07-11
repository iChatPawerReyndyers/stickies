import React from 'react';
import { View, Text, TouchableOpacity, GestureResponderEvent } from 'react-native';
import { Note, DEFAULT_ITEM_SPACING, DEFAULT_LINE_SPACING } from '../types';
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

  const m = note.margins || { top: 0, bottom: 0, left: 0, right: 0 };
  const cardMargin = {
    paddingTop: m.top * 0.34,
    paddingBottom: m.bottom * 0.34,
    paddingLeft: m.left * 0.42,
    paddingRight: m.right * 0.42,
  };

  // How much vertical room the preview actually has to work with: the card's
  // own padding (12 top + 12 bottom), the note's own margins, and cardContent's
  // marginBottom — same box model used when rendering, so this stays accurate
  // across grid column counts and per-note margin settings.
  const availableHeight = Math.max(
    0,
    size - 24 - cardMargin.paddingTop - cardMargin.paddingBottom - 8
  );

  const renderPreview = () => {
    const textStyle = getTextStyle();

    if (note.contentType === 'text') {
      // Show as many wrapped lines as will actually fit, then let RN's own
      // tail-ellipsis show "…" if there's more than that.
      const lineSpacing = note.lineSpacing ?? DEFAULT_LINE_SPACING;
      const lineHeightPx = 8 + lineSpacing * 0.34;
      const maxLines = Math.max(1, Math.floor(availableHeight / lineHeightPx));
      return (
        <Text
          style={[styles.cardPreview, textStyle, { lineHeight: lineHeightPx }]}
          numberOfLines={maxLines}
          ellipsizeMode="tail"
        >
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
    // Same 0.34 scale factor used for vertical margins below, so the preview's
    // row gap stays proportional to what's set in the styling bar.
    const spacing = note.itemSpacing || DEFAULT_ITEM_SPACING;
    const rowSpacingStyle = { marginTop: spacing.top * 0.34, marginBottom: spacing.bottom * 0.34 };
    const rowGap = spacing.top * 0.34 + spacing.bottom * 0.34;

    // Estimate how many item rows fit below the title, then cut the list short
    // with a dedicated "…" row instead of letting items overflow and get
    // silently clipped by the card's overflow:hidden.
    const titleRowHeight = titleItem?.text ? 8 * 1.2 + 3 : 0;
    const itemRowHeight = 8 * 1.2 + rowGap;
    const maxItemsFit = Math.max(0, Math.floor((availableHeight - titleRowHeight) / itemRowHeight));
    const hasOverflow = checkItems.length > maxItemsFit;
    // Reserve one slot for the "…" row itself when there's overflow.
    const visibleItems = hasOverflow ? checkItems.slice(0, Math.max(0, maxItemsFit - 1)) : checkItems;

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
        {visibleItems.map((item: any) => (
          <View key={item.id} style={[{ flexDirection: 'row', alignItems: note.checklistTextMode === 'wrap' ? 'flex-start' : 'center' }, rowSpacingStyle]}>
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
        {hasOverflow && (
          <Text style={[styles.cardPreview, textStyle, rowSpacingStyle]}>…</Text>
        )}
      </View>
    );
  };

  const FrameComponent = note.useSvgBackground && note.svgFrameId
    ? FRAME_COMPONENTS[note.svgFrameId]
    : null;

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