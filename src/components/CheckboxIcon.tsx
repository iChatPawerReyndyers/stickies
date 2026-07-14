// components/CheckboxIcon.tsx
//
// Shared by NoteModal's checklist rows and StickieStylePreviewCard so both
// render checkboxes identically.
//
// Neutral translucent-white treatment (approved "Option B" for both states)
// chosen because note cards come in many different pastel colors — a fixed
// grey fill (the app's usual NEU_INSET_BASE/NEU_ACCENT tokens) only matched
// some of them and looked like a mismatched patch on the rest. Translucent
// white sits correctly on top of *any* card color:
//   - unchecked → carved-in look via a two-tone translucent border (same
//     trick NeuView's own `inset` mode uses to fake an inner shadow —
//     RN doesn't support real inset shadows on a View)
//   - checked   → same translucent-white family, raised instead of inset,
//     with only the checkmark itself turning NEU_ACCENT orange — keeps
//     checked/unchecked reading as one family rather than introducing a
//     separate solid-color state that would fight with the card underneath

import React from 'react';
import { View, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { NEU_ACCENT } from '../theme/neumorphic';

const IS_ANDROID = Platform.OS === 'android';

type CheckboxIconProps = {
  checked: boolean;
  size?: number;
};

const CheckboxIcon: React.FC<CheckboxIconProps> = ({ checked, size = 26 }) => {
  // Mirrors the old SVG's rx (size * 0.26) so the corner radius looks the
  // same relative to the box at any size.
  const radius = size * 0.26;

  if (!checked) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: 'rgba(255,255,255,0.4)',
          overflow: 'hidden',
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            borderRadius: radius,
            borderWidth: 2,
            borderTopColor: 'rgba(0,0,0,0.15)',
            borderLeftColor: 'rgba(0,0,0,0.15)',
            borderBottomColor: 'rgba(255,255,255,0.7)',
            borderRightColor: 'rgba(255,255,255,0.7)',
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: 'rgba(255,255,255,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        IS_ANDROID
          ? { elevation: 3 }
          : {
              shadowColor: '#000',
              shadowOffset: { width: 2, height: 2 },
              shadowOpacity: 0.18,
              shadowRadius: 3,
            },
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Path
          d={`M${size * 0.27} ${size * 0.52} L${size * 0.42} ${size * 0.67} L${size * 0.75} ${size * 0.32}`}
          stroke={NEU_ACCENT}
          strokeWidth={size * 0.11}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
};

export default CheckboxIcon;