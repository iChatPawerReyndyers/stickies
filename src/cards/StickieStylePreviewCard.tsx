// components/StickieStylePreviewCard.tsx
//
// An inline (non-Modal) read-only note card used to preview what a
// StickieStyle looks like. Visually mirrors the card rendered inside
// NoteModal, but sized for embedding inside a settings panel instead of
// floating over a dark backdrop.

import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import {
  ChecklistItem,
  ContentType,
  DEFAULT_MARGINS,
  DEFAULT_ITEM_SPACING,
  DEFAULT_LINE_SPACING,
} from '../types';
import { StickieStyle } from '../utils/stickieStyle';
import { FRAME_COMPONENTS } from '../frames';
import { resolveImageUrl } from '../utils/googleDriveImage';
import { resolveFontStyle } from '../utils/fontResolver';
import CheckboxIcon from '../components/CheckboxIcon';
import RichText from '../components/RichText';

type StickieStylePreviewCardProps = {
  style: StickieStyle;
  contentType: ContentType;
  content: string | ChecklistItem[];
  width?: number;
  height?: number;
};

const DEFAULT_WIDTH = 260;
const DEFAULT_HEIGHT = 170;

const StickieStylePreviewCard: React.FC<StickieStylePreviewCardProps> = ({
  style,
  contentType,
  content,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}) => {
  // margins/itemSpacing/lineSpacing are optional on StickieStyle (a style
  // saved before these existed, or one built minimally by hand, might not
  // set them) — same fallback-to-default pattern NoteModal.tsx's own
  // applyStickieStyle already uses.
  const margins = style.margins || DEFAULT_MARGINS;
  const itemSpacing = style.itemSpacing || DEFAULT_ITEM_SPACING;
  const lineSpacing = style.lineSpacing ?? DEFAULT_LINE_SPACING;

  const getTextStyle = (): any => {
    return {
      ...resolveFontStyle(style.fontFamily, style.textStyle),
      color: style.textColor,
      fontSize: style.fontSize,
      lineHeight: style.fontSize + lineSpacing,
    };
  };

  const FrameComponent = style.useSvgBackground && style.svgFrameId
    ? FRAME_COMPONENTS[style.svgFrameId]
    : null;
  const resolvedBgImageUrl = !FrameComponent ? resolveImageUrl(style.backgroundImageUrl) : undefined;

  const items: ChecklistItem[] = Array.isArray(content) ? content : [];

  return (
    <View
      style={[
        styles.card,
        { width, height },
        { backgroundColor: (FrameComponent || resolvedBgImageUrl) ? 'transparent' : style.color },
      ]}
    >
      {FrameComponent && (
        <>
          <View style={[StyleSheet.absoluteFill, styles.centered]} pointerEvents="none">
            <FrameComponent size={Math.max(width, height)} />
          </View>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.28)' }]} pointerEvents="none" />
        </>
      )}

      {resolvedBgImageUrl && (
        <>
          <Image source={{ uri: resolvedBgImageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.15)' }]} pointerEvents="none" />
        </>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: 10 + margins.top,
          paddingBottom: 10 + margins.bottom,
          paddingLeft: 12 + margins.left,
          paddingRight: 12 + margins.right,
        }}
        showsVerticalScrollIndicator={false}
        pointerEvents="none"
      >
        {contentType === 'text' ? (
          <RichText text={typeof content === 'string' ? content : ''} style={getTextStyle()} />
        ) : (
          <>
            {items[0]?.text ? (
              <Text
                style={[getTextStyle(), { fontWeight: '700', fontSize: Math.max(style.fontSize + 4, 18), marginBottom: 6 }]}
                numberOfLines={1}
              >
                {items[0].text}
              </Text>
            ) : null}
            {items.slice(1).map(item => (
              <View
                key={item.id}
                style={[
                  styles.row,
                  { marginTop: itemSpacing.top, marginBottom: itemSpacing.bottom },
                ]}
              >
                <View style={styles.checkboxSlot}>
                  <CheckboxIcon checked={item.completed} size={18} />
                </View>
                <Text
                  style={[
                    getTextStyle(),
                    { flex: 1 },
                    item.completed && { textDecorationLine: 'line-through', opacity: 0.5 },
                  ]}
                  numberOfLines={style.checklistTextMode === 'wrap' ? 2 : 1}
                >
                  {item.text}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default StickieStylePreviewCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  centered: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  checkboxSlot: { marginRight: 8, alignItems: 'center', justifyContent: 'center' },
});