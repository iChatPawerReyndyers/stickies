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
import { View, ViewStyle, StyleProp, Pressable, PressableProps } from 'react-native';
import { getNeuPalette, NEU_SHADOW, NEU_ACCENT, NEU_RADIUS } from '../theme/neumorphic';

type NeuViewProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  inset?: boolean;       // carved-in ("pressed"/field) look instead of raised
  isDark?: boolean;
  distance?: number;
  backgroundColor?: string; // override base color (e.g. a colored note card)
};

export const NeuView: React.FC<NeuViewProps> = ({
  children,
  style,
  radius = NEU_RADIUS.md,
  inset = false,
  isDark = false,
  distance = NEU_SHADOW.distance,
  backgroundColor,
}) => {
  const p = getNeuPalette(isDark);
  const bg = backgroundColor || (inset ? p.insetBase : p.base);

  if (inset) {
    // Carved-in look approximated with a two-tone inner border (dark
    // top-left, light bottom-right — inverse of the raised shadow pair).
    // Lives on the same View that carries `style` — absolute children with
    // top/left/right/bottom: 0 always align to this View's own box
    // regardless of its padding, so this stays accurate at any size.
    return (
      <View style={[{ borderRadius: radius, backgroundColor: bg, overflow: 'hidden' }, style]}>
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
  // content child below) plus two absolutely-positioned same-size siblings
  // that each cast a single-direction native shadow (dark bottom-right,
  // light top-left). The real content View paints last/on top, hiding the
  // siblings' fill and leaving only their shadow bleed visible at the edges.
  return (
    <View style={{ position: 'relative' }}>
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
      <View style={[{ borderRadius: radius, backgroundColor: bg }, style]}>
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
};

// Raised by default; flips to the inset "pressed" look while held down —
// the core neumorphic interaction (button looks carved-in on tap).
export const NeuPressable: React.FC<NeuPressableProps> = ({
  children,
  style,
  radius = NEU_RADIUS.md,
  isDark = false,
  backgroundColor,
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
      <NeuView radius={radius} inset={pressed} isDark={isDark} backgroundColor={pressed ? undefined : backgroundColor} style={style}>
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