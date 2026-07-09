import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';

interface CraftFrameProps {
  size?: number;
}

export const CraftFrame: React.FC<CraftFrameProps> = ({ size = 300 }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg viewBox="0 0 400 400" width="100%" height="100%">

        {/* 1. Main Pastel Green Frame Chassis */}
        <Rect
          x="30"
          y="30"
          width="340"
          height="340"
          rx="65"
          fill="#A3D9A5"
          stroke="#2B3A2C"
          strokeWidth="4"
        />

        {/* 2. Shiny Highlight Accents (Top-Left & Bottom-Right) */}
        <G stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.6">
          <Path d="M 95,45 L 145,45" />
          <Path d="M 270,355 L 310,355" />
        </G>

        {/* 3. Central Solid White Viewport Screen */}
        <Rect
          x="60"
          y="60"
          width="280"
          height="280"
          rx="45"
          fill="#FFFFFF"
          stroke="#2B3A2C"
          strokeWidth="4"
        />

        {/* 4. Cute Intermittent Dashed Border Line Accent */}
        <Rect
          x="68"
          y="68"
          width="264"
          height="264"
          rx="38"
          fill="transparent"
          stroke="#4A5E4B"
          strokeWidth="2"
          strokeDasharray="6,5"
        />

        {/* 5. Award Ribbon Badge (Top Right Corner) */}
        <G id="ribbon-badge">
          {/* Ribbon Tails hanging down */}
          <G fill="#E8C5C8" stroke="#2B3A2C" strokeWidth="3.5" strokeLinejoin="round">
            <Path d="M 305,110 L 290,145 L 315,135 L 330,115 Z" />
            <Path d="M 325,110 L 345,150 L 325,140 L 310,115 Z" />
          </G>

          {/* Scalloped Ribbon Outer Border Base */}
          <Path
            d="
              M 325,40
              A 12,12 0 0,1 342,46 A 12,12 0 0,1 355,62 A 12,12 0 0,1 355,80
              A 12,12 0 0,1 344,95 A 12,12 0 0,1 328,103 A 12,12 0 0,1 310,101
              A 12,12 0 0,1 295,90 A 12,12 0 0,1 292,72 A 12,12 0 0,1 298,55
              A 12,12 0 0,1 312,42 Z
            "
            fill="#FFFFFF"
            stroke="#2B3A2C"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Central Pastel Pink Button Center */}
          <Circle cx="325" cy="71" r="22" fill="#E8C5C8" stroke="#2B3A2C" strokeWidth="3.5" />
        </G>

        {/* 6. Craft Buttons (Bottom Left Corner) */}
        <G id="craft-buttons" stroke="#2B3A2C" strokeWidth="3.5" fill="#E8C5C8">

          {/* Large Main Button */}
          <G id="large-button">
            <Circle cx="50" cy="320" r="24" />
            <Circle cx="50" cy="320" r="18" fill="transparent" strokeDasharray="3,3" strokeWidth="1.5" />
            {/* Button Thread Holes */}
            <Circle cx="44" cy="320" r="2.5" fill="#2B3A2C" />
            <Circle cx="56" cy="320" r="2.5" fill="#2B3A2C" />
          </G>

          {/* Small Secondary Button */}
          <G id="small-button">
            <Circle cx="95" cy="345" r="15" />
            <Circle cx="95" cy="345" r="11" fill="transparent" strokeDasharray="2,2" strokeWidth="1" />
            {/* Button Thread Holes */}
            <Circle cx="95" cy="341" r="2" fill="#2B3A2C" />
            <Circle cx="95" cy="349" r="2" fill="#2B3A2C" />
          </G>

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
