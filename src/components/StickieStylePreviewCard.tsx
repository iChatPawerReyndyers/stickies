// components/StickieStylePreviewCard.tsx
//
// An inline (non-Modal) read-only note card used to preview what a
// StickieStyle looks like. Visually mirrors the card rendered inside
// NoteModal, but sized for embedding inside a settings panel instead of
// floating over a dark backdrop.

import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';
import { ChecklistItem, ContentType } from '../types';
import { StickieStyle } from '../types/stickieStyle';
import { FRAME_COMPONENTS } from '../frames';
import { resolveImageUrl } from '../utils/googleDriveImage';
import CheckboxIcon from './CheckboxIcon';

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
  const getTextStyle = (): any => {
    const base: any = {
      fontFamily: style.font,
      color: style.textColor,
      fontSize: style.fontSize,
      lineHeight: style.fontSize + style.lineSpacing,
    };
    if (style.textStyle === 'bold') base.fontWeight = 'bold';
    else if (style.textStyle === 'italic') base.fontStyle = 'italic';
    else if (style.textStyle === 'underline') base.textDecorationLine = 'underline';
    return base;
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
          paddingTop: 10 + style.margins.top,
          paddingBottom: 10 + style.margins.bottom,
          paddingLeft: 12 + style.margins.left,
          paddingRight: 12 + style.margins.right,
        }}
        showsVerticalScrollIndicator={false}
        pointerEvents="none"
      >
        {contentType === 'text' ? (
          <Text style={getTextStyle()}>{typeof content === 'string' ? content : ''}</Text>
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
                  { marginTop: style.itemSpacing.top, marginBottom: style.itemSpacing.bottom },
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