import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, G, Text, Ellipse } from 'react-native-svg';

interface RestFrameProps {
  size?: number;
}

export const RestFrame: React.FC<RestFrameProps> = ({ size = 300 }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg viewBox="0 0 400 400" width="100%" height="100%">

        {/* 1. Main Tilted Outer Frame Background & Border (Updated to Pastel Purple Palette) */}
        <G transform="rotate(2, 210, 200)">
          <Rect
            x="45"
            y="45"
            width="320"
            height="320"
            rx="40"
            fill="#F6F3FF"
            stroke="#D5C8F2"
            strokeWidth="12"
          />
          {/* Inner dark line detail to match hand-drawn style */}
          <Rect
            x="51"
            y="51"
            width="308"
            height="308"
            rx="34"
            fill="transparent"
            stroke="#2F231B"
            strokeWidth="3"
          />
        </G>
        {/* 2. Wooden Signpost Stand (Behind the sign and cup) */}
        <G stroke="#2F231B" strokeWidth="3.5" fill="#F0DCB9" strokeLinejoin="round">
          {/* Vertical posts */}
          <Rect x="55" y="220" width="12" height="110" rx="3" />
          <Rect x="75" y="240" width="10" height="90" rx="3" />

          {/* "Rest" Wooden Plaque */}
          <Path d="M 35,210 C 35,200 60,190 115,190 C 145,190 160,205 155,225 C 150,245 130,260 85,260 C 45,260 35,230 35,210 Z" fill="#E8D1B5" />

          {/* Wooden Grain Details */}
          <Path d="M 50,205 Q 80,200 135,205" fill="none" stroke="#D2B48C" strokeWidth="2" />
          <Path d="M 45,230 Q 90,240 125,225" fill="none" stroke="#D2B48C" strokeWidth="2" />
        </G>
        {/* 3. Text on the Signpost */}
        <Text
          x="90"
          y="232"
          fill="#2F231B"
          fontSize="26"
          fontWeight="bold"
          fontFamily="System"
          textAnchor="middle"
          transform="rotate(-5, 90, 232)"
        >
          Rest
        </Text>
        {/* 4. Coffee Saucer (Bottom Left) */}
        <G stroke="#2F231B" strokeWidth="3.5" strokeLinejoin="round">
          <Ellipse cx="105" cy="360" rx="55" ry="22" fill="#ECD3D8" />
          <Ellipse cx="105" cy="360" rx="35" ry="12" fill="#E2B6BD" />
        </G>
        {/* 5. Coffee Cup & Liquid */}
        <G stroke="#2F231B" strokeWidth="3.5" strokeLinejoin="round">
          {/* Cup Handle */}
          <Path d="M 80,310 C 50,310 50,345 80,345" fill="none" strokeWidth="4" />

          {/* Cup Body Base */}
          <Path d="M 80,295 L 90,350 C 92,356 128,356 130,350 L 140,295 Z" fill="#EEB9C2" />

          {/* Cup Rim Opening */}
          <Ellipse cx="110" cy="295" rx="30" ry="12" fill="#EEB9C2" />

          {/* Coffee/Tea Liquid Layer */}
          <Ellipse cx="110" cy="297" rx="25" ry="9" fill="#915B4B" />

          {/* Liquid Reflection/Highlight Accent */}
          <Path d="M 95,296 A 15,6 0 0,1 120,294" fill="none" stroke="#FFF" strokeWidth="2" opacity="0.6" />

          {/* Cup Side Highlight Shadow Line */}
          <Path d="M 125,305 C 130,315 125,340 115,348" fill="none" stroke="#DCA2AC" strokeWidth="3" />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
