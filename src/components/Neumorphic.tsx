// components/Neumorphic.tsx
// Reusable soft-UI primitives. Every raised surface in the app (cards,
// buttons, chips) should wrap its content in NeuView or NeuPressable instead
// of hand-rolling shadows, so the whole app stays consistent.
//
// Raised shadows are built from plain Views + native shadow*/elevation props
// (NOT react-native-shadow-2) so sizing always follows the real content —
// no separate measurement pass to get out of sync with dynamic children
// like ScrollViews or variable-height rows.

import React, { useState } from 'react';
import { View, ViewStyle, StyleProp, ViewProps, Pressable, PressableProps, Platform } from 'react-native';
import { getNeuPalette, NEU_SHADOW, NEU_ACCENT, NEU_RADIUS } from '../theme/neumorphic';

const IS_ANDROID = Platform.OS === 'android';

// Android's `elevation` model only draws a single soft gray shadow below a
// view — it ignores shadowColor/shadowOffset, so the two-tone (light
// top-left / dark bottom-right) shadow pair below is effectively invisible
// there. Since a raised card's default background is otherwise identical to
// the screen behind it, the card has no visible edge at all on Android.
// Blending the default (non-custom-color) card tone a bit lighter gives it
// a real color boundary against the page, independent of any shadow.
const lightenForAndroidCard = (hex: string, amount = 0.35): string => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
};

// Android has no way to render a real blurred, colored, directional shadow
// on a plain View (`elevation` is a single flat dark shadow only). This
// fakes blur by stacking several solid-color layers at a fixed offset
// (`shift`) with increasing spread (`grow`) and decreasing opacity — the
// constant shift keeps the shadow clearly on one side (near-side reach =
// shift+grow, far-side reach = grow-shift, which stays at/near zero until
// grow catches up), while more, smaller opacity steps reduce the visible
// banding a small number of hard-edged layers produces.
type BlurLayer = { shift: number; grow: number; opacity: number };

// Light theme keeps its original, tighter blur (unchanged look/feel).
const LIGHT_MODE_MULTIPLIERS = [0.3, 0.7, 1.2, 1.8, 2.6, 3.6];
const LIGHT_MODE_OPACITIES = [0.32, 0.24, 0.18, 0.12, 0.07, 0.04];

// Dark mode gets a wider, softer spread — approximating iOS's real
// shadowRadius: distance * 1.3 blur, which reaches further out and fades
// more gradually than the tighter light-mode layer stack. Paired with
// leaving the card's own fill color unchanged (see androidRaisedBg below),
// this is what gives a dark-mode card its separation from the page: a
// directional glow, darker/heavier toward the bottom-right, not a
// lighter-toned block.
const DARK_MODE_GLOW_MULTIPLIERS = [0.5, 1.1, 1.9, 2.9, 4.1, 5.6];
// Bumped up from the first pass — the dark (bottom-right) shadow needs to
// read as clearly dark on its own, since the light layer below is now
// deliberately kept faint rather than matching it.
const DARK_MODE_GLOW_OPACITIES = [0.34, 0.27, 0.21, 0.15, 0.10, 0.06];

const buildDarkBlurLayers = (distance: number, isDark: boolean): BlurLayer[] => {
  const shift = distance * .3;
  const multipliers = isDark ? DARK_MODE_GLOW_MULTIPLIERS : LIGHT_MODE_MULTIPLIERS;
  const opacities = isDark ? DARK_MODE_GLOW_OPACITIES : LIGHT_MODE_OPACITIES;
  return multipliers.map((m, i) => ({
    shift,
    grow: distance * m,
    opacity: opacities[i],
  }));
};

const buildLightBlurLayers = (distance: number, isDark: boolean): BlurLayer[] => {
  const shift = distance * 0.3;
  const multipliers = isDark ? DARK_MODE_GLOW_MULTIPLIERS : LIGHT_MODE_MULTIPLIERS;
  // Deliberately faint in dark mode — previously this matched (and briefly
  // even exceeded) the dark layer's opacity, which made the top-left
  // "highlight" and bottom-right "shadow" blend into one even halo all the
  // way around the card instead of a directional drop-shadow. Cut to about
  // a third of the dark layer's strength so the bottom/right side reads as
  // the dominant, clearly-dark edge, with just a faint lift on top/left.
  const opacities = isDark
    ? DARK_MODE_GLOW_OPACITIES.map(o => Math.round(o * 0.35 * 100) / 100)
    : LIGHT_MODE_OPACITIES;
  return multipliers.map((m, i) => ({
    shift,
    grow: distance * m,
    opacity: opacities[i],
  }));
};

type NeuViewProps = ViewProps & {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  inset?: boolean;       // carved-in ("pressed"/field) look instead of raised
  isDark?: boolean;
  distance?: number;
  backgroundColor?: string; // override base color (e.g. a colored note card)
  // Skips the raised dual-shadow (iOS) / stacked-blur (Android) layers
  // entirely — used when the surface sits on top of a busy photo
  // background (e.g. a tab's screen wallpaper), where the neumorphic
  // shadow pair reads as visual noise rather than a soft-UI edge.
  noShadow?: boolean;
};

// Any extra View props (onStartShouldSetResponder, onLayout, etc.) land on
// the single real content View in both branches below — never on the
// decorative shadow/border layers — so NeuView can drop in anywhere a plain
// touch-catching <View> was used before (e.g. a modal card) without losing
// that behavior.
export const NeuView: React.FC<NeuViewProps> = ({
  children,
  style,
  radius = NEU_RADIUS.md,
  inset = false,
  isDark = false,
  distance = NEU_SHADOW.distance,
  backgroundColor,
  noShadow = false,
  ...rest
}) => {
  const p = getNeuPalette(isDark);
  const bg = backgroundColor || (inset ? p.insetBase : p.base);
  // Only tint the *default* base tone — an explicit backgroundColor (a
  // colored note swatch, an accent button, etc.) already stands out against
  // the page by hue, so leave it alone.
  // 35% was tuned against the light theme's pale base — still used as-is
  // there. Dark mode no longer lightens the fill at all: matched against
  // the iOS build, a dark card should sit close to the page's own tone and
  // rely on the wider glow (see buildDarkBlurLayers/buildLightBlurLayers
  // above) to read as raised — lightening the fill on top of that glow
  // just made cards look like flat gray blocks instead of soft-lifted
  // dark surfaces.
  const androidRaisedBg = IS_ANDROID && !backgroundColor && !inset && !isDark
    ? lightenForAndroidCard(bg, 0.35)
    : bg;

  if (inset) {
    // Carved-in look approximated with a two-tone inner border (dark
    // top-left, light bottom-right — inverse of the raised shadow pair).
    // Lives on the same View that carries `style` — absolute children with
    // top/left/right/bottom: 0 always align to this View's own box
    // regardless of its padding, so this stays accurate at any size.
    return (
      <View style={[{ borderRadius: radius, backgroundColor: bg, overflow: 'hidden' }, style]} {...rest}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: radius,
            borderWidth: 2,
            borderTopColor: p.darkShadow,
            borderLeftColor: p.darkShadow,
            borderBottomColor: p.lightShadow,
            borderRightColor: p.lightShadow,
            opacity: 0.55,
          }}
        />
        {children}
      </View>
    );
  }

  // Raised: an unconstrained relative wrapper (sized purely by its one real
  // content child below). iOS gets two same-size siblings casting a real
  // native dual shadow. Android can't render that (see buildBlurLayers
  // comment above) so it instead gets stacked fake-blur layers in each
  // direction. Either way the real content View paints last/on top.
  return (
    <View style={{ position: 'relative' }}>
      {!noShadow && (IS_ANDROID ? (
        <>
          {buildDarkBlurLayers(distance, isDark).map((l, i) => (
            <View
              key={`dark-${i}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: l.shift - l.grow,
                left: l.shift - l.grow,
                right: -(l.shift + l.grow),
                bottom: -(l.shift + l.grow),
                borderRadius: radius + l.grow,
                backgroundColor: p.darkShadow,
                opacity: l.opacity,
              }}
            />
          ))}
          {buildLightBlurLayers(distance, isDark).map((l, i) => (
            <View
              key={`light-${i}`}
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: -l.shift - l.grow,
                left: -l.shift - l.grow,
                right: l.shift - l.grow,
                bottom: l.shift - l.grow,
                borderRadius: radius + l.grow,
                backgroundColor: p.lightShadow,
                opacity: l.opacity,
              }}
            />
          ))}
        </>
      ) : (
        <>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: radius,
              backgroundColor: bg,
              shadowColor: p.darkShadow,
              shadowOffset: { width: distance, height: distance },
              shadowOpacity: 0.95,
              shadowRadius: distance * 1.3,
              elevation: distance,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: radius,
              backgroundColor: bg,
              shadowColor: p.lightShadow,
              shadowOffset: { width: -distance, height: -distance },
              shadowOpacity: 1,
              shadowRadius: distance * 1.3,
            }}
          />
        </>
      ))}
      <View
        style={[
          { borderRadius: radius, backgroundColor: androidRaisedBg },
          style,
        ]}
        {...rest}
      >
        {children}
      </View>
    </View>
  );
};

type NeuPressableProps = PressableProps & {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  isDark?: boolean;
  backgroundColor?: string;
  noShadow?: boolean;
};

// Raised by default; flips to the inset "pressed" look while held down —
// the core neumorphic interaction (button looks carved-in on tap).
export const NeuPressable: React.FC<NeuPressableProps> = ({
  children,
  style,
  radius = NEU_RADIUS.md,
  isDark = false,
  backgroundColor,
  noShadow = false,
  onPressIn,
  onPressOut,
  ...rest
}) => {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPressIn={(e) => { setPressed(true); onPressIn?.(e); }}
      onPressOut={(e) => { setPressed(false); onPressOut?.(e); }}
      {...rest}
    >
      <NeuView radius={radius} inset={pressed} isDark={isDark} backgroundColor={pressed ? undefined : backgroundColor} noShadow={noShadow} style={style}>
        {children}
      </NeuView>
    </Pressable>
  );
};

// ── Toggle switch ───────────────────────────────────────────────────────────

type NeuToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  isDark?: boolean;
};

export const NeuToggle: React.FC<NeuToggleProps> = ({ value, onValueChange, isDark = false }) => {
  const p = getNeuPalette(isDark);
  return (
    <Pressable onPress={() => onValueChange(!value)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <View
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          backgroundColor: value ? NEU_ACCENT : p.insetBase,
          padding: 2,
          justifyContent: 'center',
          alignItems: value ? 'flex-end' : 'flex-start',
        }}
      >
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: p.base,
            shadowColor: '#000',
            shadowOffset: { width: 1, height: 1 },
            shadowOpacity: 0.3,
            shadowRadius: 2,
            elevation: 2,
          }}
        />
      </View>
    </Pressable>
  );
};

// ── Radio button ─────────────────────────────────────────────────────────────

type NeuRadioProps = {
  selected: boolean;
  isDark?: boolean;
  size?: number;
};

export const NeuRadio: React.FC<NeuRadioProps> = ({ selected, isDark = false, size = 18 }) => {
  const p = getNeuPalette(isDark);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: selected ? NEU_ACCENT : p.darkShadow,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {selected && (
        <View style={{ width: size * 0.45, height: size * 0.45, borderRadius: size * 0.225, backgroundColor: NEU_ACCENT }} />
      )}
    </View>
  );
};