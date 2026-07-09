import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';

interface CatFrameProps {
  size?: number;
}

export const CatFrame: React.FC<CatFrameProps> = ({ size = 300 }) => {
  return (
    <View style={[styles.container, { width: size, height: size * 0.8 }]}>
      <Svg viewBox="0 0 500 400" width="100%" height="100%">

        {/* 1. Tail (Bottom Right) */}
        <G stroke="#2B1A0A" strokeWidth="4" fill="#FCE3C6" strokeLinejoin="round" strokeLinecap="round">
          {/* Tail base silhouette */}
          <Path d="M 370,350 C 410,360 480,330 460,270 C 450,250 425,270 410,290 C 390,310 375,325 370,330" />
          {/* Tail stripes */}
          <Path d="M 418,298 C 425,290 435,295 440,305" fill="none" stroke="#EAA96E" strokeWidth="5" />
          <Path d="M 432,278 C 440,270 450,275 452,285" fill="none" stroke="#EAA96E" strokeWidth="5" />
          <Path d="M 448,262 C 455,255 460,262 458,270" fill="none" stroke="#EAA96E" strokeWidth="5" />
        </G>

        {/* 2. Ears (Top Corners) */}
        <G stroke="#2B1A0A" strokeWidth="4" fill="#FCE3C6" strokeLinejoin="round">
          {/* Left Ear */}
          <Path d="M 50,70 L 65,25 L 110,70 Z" />
          <Path d="M 62,65 L 72,37 L 98,65 Z" fill="#F7C1B2" stroke="none" />

          {/* Right Ear */}
          <Path d="M 320,70 L 365,25 L 380,70 Z" />
          <Path d="M 332,65 L 358,37 L 368,65 Z" fill="#F7C1B2" stroke="none" />
        </G>

        {/* 3. Whiskers (Left and Right Sides) */}
        <G stroke="#2B1A0A" strokeWidth="3.5" strokeLinecap="round">
          {/* Left Whiskers */}
          <Path d="M 35,140 L 5,130" />
          <Path d="M 35,170 L 0,170" />
          <Path d="M 35,200 L 5,210" />

          {/* Right Whiskers */}
          <Path d="M 395,140 L 425,130" />
          <Path d="M 395,170 L 430,170" />
          <Path d="M 395,200 L 425,210" />
        </G>

        {/* 4. Main Cat Body Frame */}
        <G stroke="#2B1A0A" strokeWidth="4" strokeLinejoin="round">
          <Rect x="35" y="70" width="360" height="280" rx="25" fill="#FCE3C6" />
        </G>

        {/* 5. Cat Fur Spots / Patterns */}
        <G fill="#EAA96E">
          {/* Top Head Stripes */}
          <Path d="M 180,72 L 195,95 L 210,72 L 225,95 L 240,72 Z" stroke="#2B1A0A" strokeWidth="3" strokeLinejoin="round" />
          {/* Left Spots */}
          <Path d="M 37,100 C 50,105 55,120 37,130 Z" />
          <Path d="M 37,220 C 55,225 50,250 37,265 Z" />
          <Path d="M 37,300 C 50,310 45,330 37,335 Z" />
          {/* Right Spots */}
          <Path d="M 393,100 C 380,105 375,120 393,130 Z" />
          <Path d="M 393,240 C 375,250 380,275 393,285 Z" />
          {/* Bottom Spots */}
          <Path d="M 190,348 C 195,335 220,335 225,348 Z" />
          <Path d="M 290,348 C 295,338 315,338 320,348 Z" />
        </G>

        {/* 6. Cat Eyes */}
        <G fill="#2B1A0A">
          <Circle cx="130" cy="92" r="6" />
          <Circle cx="295" cy="92" r="6" />
        </G>

        {/* 7. Inner Solid White Display Area */}
        <Rect
          x="65"
          y="105"
          width="300"
          height="220"
          rx="12"
          fill="#FFFFFF"
          stroke="#2B1A0A"
          strokeWidth="3"
        />

        {/* 8. Cute Dashed Accent Line inside the White Screen */}
        <Rect
          x="73"
          y="113"
          width="284"
          height="204"
          rx="8"
          fill="transparent"
          stroke="#A68B70"
          strokeWidth="2"
          strokeDasharray="6,4"
        />

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
