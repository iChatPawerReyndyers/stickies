import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, G, Polygon } from 'react-native-svg';

interface CloudFrameProps {
  size?: number;
}

export const CloudFrame: React.FC<CloudFrameProps> = ({ size = 300 }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg viewBox="0 0 500 400" width="100%" height="100%" preserveAspectRatio="none">

        {/* 1. Main Pastel Purple Cloud Chassis */}
        <G stroke="#2B263B" strokeWidth="4" strokeLinejoin="round" fill="#D6C7FF">
          <Path d="
            M 60,80
            A 45,45 0 0,1 120,50
            A 55,55 0 0,1 210,40
            A 65,65 0 0,1 320,40
            A 45,45 0 0,1 390,45
            A 45,45 0 0,1 450,90
            L 455,300
            A 40,40 0 0,1 415,355
            L 80,355
            A 40,40 0 0,1 40,315
            L 45,130
            A 35,35 0 0,1 60,80 Z
          " />
        </G>

        {/* 2. Central Display Screen (Solid White) */}
        <Rect
          x="65"
          y="85"
          width="370"
          height="245"
          rx="30"
          fill="#FFFFFF"
          stroke="#2B263B"
          strokeWidth="4"
        />

        {/* 3. Small Decorative Yellow Stars */}
        <G fill="#FFF5C2" stroke="#2B263B" strokeWidth="2.5" strokeLinejoin="round">
          {/* Top Star */}
          <Polygon points="160,50 163,57 170,57 165,62 167,69 160,65 153,69 155,62 150,57 157,57" />
          {/* Left Stars */}
          <Polygon points="35,140 38,145 44,145 40,149 41,155 35,152 29,155 30,149 26,145 32,145" />
          <Polygon points="30,180 33,185 39,185 35,189 36,195 30,192 24,195 25,189 21,185 27,185" />
          {/* Right Stars */}
          <Polygon points="465,110 468,115 474,115 470,119 471,125 465,122 459,125 460,119 456,115 462,115" />
          <Polygon points="468,230 471,235 477,235 473,239 474,245 468,242 462,245 463,239 459,235 465,235" />
          <Polygon points="465,315 468,320 474,320 470,324 471,330 465,327 459,330 460,324 456,320 462,320" />
        </G>

        {/* 4. Little Accent Clouds on the Sides */}
        <G fill="#FFFFFF" stroke="#2B263B" strokeWidth="2.5" strokeLinejoin="round">
          {/* Top Right Cloud */}
          <Path d="M 390,30 C 390,20 410,20 415,25 C 420,15 440,20 435,32 C 445,35 440,50 425,45 C 410,48 395,45 390,30 Z" />
          {/* Bottom Left Cloud */}
          <Path d="M 25,260 C 25,252 38,252 42,256 C 45,248 58,252 55,262 C 62,265 58,275 48,272 C 38,275 28,272 25,260 Z" />
          {/* Middle Right Cloud */}
          <Path d="M 450,140 C 450,132 463,132 467,136 C 470,128 483,132 480,142 C 487,145 483,155 473,152 C 463,155 453,152 450,140 Z" />
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
