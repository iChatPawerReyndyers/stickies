import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, G, Pattern, Defs } from 'react-native-svg';

interface CameraFrameProps {
  size?: number;
}

export const CameraFrame: React.FC<CameraFrameProps> = ({ size = 300 }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg viewBox="0 0 500 350" width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          {/* Polka dot pattern definition */}
          <Pattern id="polka-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <Circle cx="6" cy="6" r="3" fill="#FFFFFF" />
            <Circle cx="18" cy="18" r="3" fill="#FFFFFF" />
            <Circle cx="18" cy="6" r="1.5" fill="#FFFFFF" opacity="0.6" />
            <Circle cx="6" cy="18" r="1.5" fill="#FFFFFF" opacity="0.6" />
          </Pattern>
        </Defs>

        {/* 1. External Shutter Buttons (Top & Right) */}
        <G stroke="#2B3A42" strokeWidth="4" fill="#FFFFFF" strokeLinejoin="round">
          {/* Top Button */}
          <Path d="M 330,25 C 330,12 390,12 390,25 Z" />
          {/* Right Flash/Grip Bump */}
          <Path d="M 470,90 C 485,90 485,160 470,160 Z" />
        </G>

        {/* 2. Main Camera Chassis with Polka Dot Fill */}
        <G stroke="#2B3A42" strokeWidth="4" strokeLinejoin="round">
          {/* Base Layer Pastel Blue */}
          <Path
            d="M 50,25 L 420,25 C 460,25 470,50 470,90 L 470,280 C 470,320 440,335 400,335 L 70,335 C 30,335 20,310 20,270 L 20,80 C 20,40 30,25 50,25 Z"
            fill="#C4DBF6"
          />
          {/* Pattern Overlay */}
          <Path
            d="M 50,25 L 420,25 C 460,25 470,50 470,90 L 470,280 C 470,320 440,335 400,335 L 70,335 C 30,335 20,310 20,270 L 20,80 C 20,40 30,25 50,25 Z"
            fill="url(#polka-dots)"
          />
        </G>

        {/* 3. Central Viewfinder Screen (Solid White) */}
        <Rect
          x="55"
          y="50"
          width="290"
          height="245"
          rx="25"
          fill="#FFFFFF"
          stroke="#2B3A42"
          strokeWidth="4"
        />

        {/* 4. Right Side Camera Controls */}
        <G stroke="#2B3A42" strokeWidth="4" fill="#FFFFFF" strokeLinejoin="round">
          {/* Top Horizontal Pill Button */}
          <Rect x="365" y="70" width="65" height="14" rx="7" />

          {/* Small Indicator Light */}
          <Circle cx="385" cy="120" r="10" />

          {/* Large D-Pad Dial Group */}
          <G id="d-pad">
            <Circle cx="410" cy="200" r="38" fill="#FFFFFF" />
            <Circle cx="410" cy="200" r="14" fill="#FFFFFF" />
          </G>

          {/* Bottom Menu Buttons */}
          <Circle cx="390" cy="285" r="11" />
          <Circle cx="440" cy="285" r="11" />
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
