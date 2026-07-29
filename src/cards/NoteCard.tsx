import React from 'react';
import { View, Text, Image, GestureResponderEvent } from 'react-native';
import { Note, DEFAULT_ITEM_SPACING, DEFAULT_LINE_SPACING } from '../types';
import styles, { CARD_SIZE } from '../styles';
import { FRAME_COMPONENTS } from '../frames';
import { NeuPressable } from '../components/Neumorphic';
import { NEU_RADIUS } from '../theme/neumorphic';
import { resolveImageUrl } from '../utils/googleDriveImage';
import { resolveFontStyle } from '../utils/fontResolver';
import CheckboxIcon from '../components/CheckboxIcon';
import RichText from '../components/RichText';

type NoteCardProps = {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  cardSize?: number;
  // Independent width/height overrides for a spanning card (colSpan/rowSpan
  // > 1 in the grid). Each falls back to cardSize when omitted, so every
  // existing call site that only passes cardSize keeps rendering a square
  // card exactly as before.
  cardWidth?: number;
  cardHeight?: number;
  // True when the active tab has a screen wallpaper set (Tab.screenBackgroundImageUrl).
  // The neumorphic shadow pair reads as visual noise on top of a busy photo,
  // so it's dropped entirely in that case rather than tuned per-photo.
  hasScreenBackgroundImage?: boolean;
  // Follows the app's Theme setting so the card's shadow tint matches dark
  // mode — the card's own fill (note.color) intentionally stays fixed
  // either way, this only affects the neumorphic shadow around it.
  isDark?: boolean;
};

// Size of the mini checkbox rendered in the checklist preview. Uses the same
// CheckboxIcon component NoteModal.tsx and StickieStylePreviewCard.tsx
// render (see components/CheckboxIcon.tsx) so the card preview genuinely
// matches the modal's checkbox styling instead of approximating it with a
// hand-rolled box — this is a *preview* of the note, after all.
const CARD_CHECKBOX_SIZE = 11;

const NoteCard = ({ note, onEdit, onDelete, onLongPress, cardSize: propCardSize, cardWidth, cardHeight, hasScreenBackgroundImage = false, isDark = false }: NoteCardProps) => {
  const size = propCardSize ?? CARD_SIZE;
  const width = cardWidth ?? size;
  const height = cardHeight ?? size;
  const getTextStyle = (): any => {
    return { ...resolveFontStyle(note.fontFamily, note.textStyle), color: note.textColor };
  };

  // Checklist title is always shown bold, regardless of the note's own
  // textStyle setting — but resolving that bold weight has to go through
  // resolveFontStyle (which swaps in the real Bold .ttf file when the
  // chosen font bundles one) rather than just adding fontWeight:'700' on
  // top of getTextStyle()'s result. Layering a manual fontWeight alongside
  // a custom bundled fontFamily is exactly the case fontResolver.ts warns
  // about on Android — it can knock the font back to the system default
  // instead of just failing to render bold. Using 'bold' as the textStyle
  // argument here keeps the chosen font family intact on both platforms.
  const getTitleTextStyle = (): any => {
    return { ...resolveFontStyle(note.fontFamily, 'bold'), color: note.textColor };
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
  // across grid column counts, row spans, and per-note margin settings.
  const availableHeight = Math.max(
    0,
    height - 24 - cardMargin.paddingTop - cardMargin.paddingBottom - 8
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
        <RichText
          text={note.content as string}
          style={[styles.cardPreview, textStyle, { lineHeight: lineHeightPx }]}
          numberOfLines={maxLines}
          ellipsizeMode="tail"
        />
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
          <RichText
            text={titleItem.text}
            style={[styles.cardPreview, getTitleTextStyle(), { marginBottom: 3 }]}
            numberOfLines={1}
          />
        ) : null}
        {visibleItems.map((item: any) => (
          <View key={item.id} style={[{ flexDirection: 'row', alignItems: note.checklistTextMode === 'wrap' ? 'flex-start' : 'center' }, rowSpacingStyle]}>
            {/* Mini checkbox — same CheckboxIcon used by NoteModal/
                StickieStylePreviewCard, just shrunk down, so the card
                preview actually matches what the note looks like when
                opened instead of a different, hand-drawn box shape. */}
            <View style={{
              marginRight: 3,
              marginTop: note.checklistTextMode === 'wrap' ? 3 : 0,
              flexShrink: 0,
            }}>
              <CheckboxIcon checked={item.completed} size={CARD_CHECKBOX_SIZE} />
            </View>
            <RichText
              text={item.text}
              style={[
                styles.cardPreview,
                textStyle,
                item.completed && { textDecorationLine: 'line-through', opacity: 0.5 },
              ]}
              numberOfLines={note.checklistTextMode === 'wrap' ? 3 : 1}
            />
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

  // Image background loses to the SVG frame if both are somehow set (mirrors
  // the mutual-exclusivity the styling bar enforces), so it's only resolved
  // when there's no frame to draw instead.
  const resolvedImageUrl = !FrameComponent ? resolveImageUrl(note.backgroundImageUrl) : undefined;

  return (
    <NeuPressable
      radius={NEU_RADIUS.lg}
      isDark={isDark}
      backgroundColor={(FrameComponent || resolvedImageUrl) ? 'transparent' : note.color}
      noShadow={hasScreenBackgroundImage}
      style={{ width, height, padding: 12, overflow: 'hidden' }}
      onPress={onEdit}
      onLongPress={onLongPress}
      delayLongPress={200}
    >
      {FrameComponent && (
        <>
          <View style={styles.cardSvgBackground} pointerEvents="none">
            <FrameComponent size={Math.max(width, height)} />
          </View>
          <View style={styles.cardSvgBlurOverlay} pointerEvents="none" />
        </>
      )}
      {resolvedImageUrl && (
        <>
          <Image
            source={{ uri: resolvedImageUrl }}
            style={styles.cardSvgBackground}
            resizeMode="cover"
          />
          <View style={styles.cardSvgBlurOverlay} pointerEvents="none" />
        </>
      )}
      <View style={[styles.cardContent, cardMargin]}>{renderPreview()}</View>
    </NeuPressable>
  );
};

export default NoteCard;