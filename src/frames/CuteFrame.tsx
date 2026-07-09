import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Rect, Path, Circle, G, Ellipse } from 'react-native-svg';

interface CuteFrameProps {
  size?: number;
}

export const CuteFrame: React.FC<CuteFrameProps> = ({ size = 300 }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg viewBox="0 0 400 400" width="100%" height="100%">
        {/* 1. Transparent Inner Background with Pastel Border Line */}
        <Rect
          x="40"
          y="40"
          width="320"
          height="320"
          fill="transparent"
          stroke="#E8C5C8"
          strokeWidth="4"
          rx="15"
        />

        {/* 2. Top Border Decorative Elements (Pastel Peaches/Oranges) */}
        <G id="top-decorations">
          <Circle cx="120" cy="30" r="10" fill="#FFB7A1" />
          <Circle cx="180" cy="30" r="10" fill="#FFB7A1" />
          <Circle cx="240" cy="30" r="10" fill="#FFB7A1" />
          <Circle cx="300" cy="30" r="10" fill="#FFB7A1" />
        </G>

        {/* 3. Bottom Pastel Fence Line */}
        <G id="pastel-fence" fill="#F3C6C9" stroke="#A77E81" strokeWidth="3">
          {/* Repeating fence pickets along the bottom */}
          <Path d="M 20,340 L 20,390 A 10,10 0 0,1 40,390 L 40,340 Z" />
          <Path d="M 50,340 L 50,390 A 10,10 0 0,1 70,390 L 70,340 Z" />
          <Path d="M 80,340 L 80,390 A 10,10 0 0,1 100,390 L 100,340 Z" />
          <Path d="M 110,340 L 110,390 A 10,10 0 0,1 130,390 L 130,340 Z" />
          <Path d="M 140,340 L 140,390 A 10,10 0 0,1 160,390 L 160,340 Z" />
          <Path d="M 170,340 L 170,390 A 10,10 0 0,1 190,390 L 190,340 Z" />
          <Path d="M 200,340 L 200,390 A 10,10 0 0,1 220,390 L 220,340 Z" />
          <Path d="M 230,340 L 230,390 A 10,10 0 0,1 250,390 L 250,340 Z" />
          <Path d="M 260,340 L 260,390 A 10,10 0 0,1 280,390 L 280,340 Z" />
          <Path d="M 290,340 L 290,390 A 10,10 0 0,1 310,390 L 310,340 Z" />
          <Path d="M 320,340 L 320,390 A 10,10 0 0,1 340,390 L 340,340 Z" />
          <Path d="M 350,340 L 350,390 A 10,10 0 0,1 370,390 L 370,340 Z" />
          {/* Horizontal fence support rail */}
          <Rect x="15" y="360" width="370" height="12" rx="4" fill="#E2B2B5" />
        </G>

        {/* 4. Large Pastel Bear (Bottom Right Corner) */}
        <G id="main-bear" stroke="#5C4033" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Left Ear */}
          <Circle cx="280" cy="240" r="24" fill="#C19A6B" />
          <Circle cx="280" cy="240" r="12" fill="#E8C5C8" />

          {/* Right Ear */}
          <Circle cx="370" cy="240" r="24" fill="#C19A6B" />
          <Circle cx="370" cy="240" r="12" fill="#E8C5C8" />

          {/* Bear Body / Arms */}
          <Path d="M 265,330 C 265,290 385,290 385,330" fill="#C19A6B" />

          {/* Bear Head */}
          <Circle cx="325" cy="275" r="45" fill="#C19A6B" />

          {/* Snout */}
          <Ellipse cx="325" cy="285" rx="14" ry="10" fill="#FFF" />
          <Path d="M 321,282 Q 325,286 329,282" fill="none" />

          {/* Eyes */}
          <Circle cx="305" cy="270" r="4" fill="#5C4033" />
          <Circle cx="345" cy="270" r="4" fill="#5C4033" />

          {/* Pastel Bow Tie */}
          <G fill="#FFD1DC">
            <Path d="M 325,320 L 305,305 L 305,335 Z" />
            <Path d="M 325,320 L 345,305 L 345,335 Z" />
            <Circle cx="325" cy="320" r="6" fill="#FFAABB" />
          </G>
        </G>

        {/* 5. Small Bear Lollipop (Bottom Left Corner) */}
        <G id="lollipop-bear" stroke="#5C4033" strokeWidth="3">
          {/* Stick */}
          <Path d="M 60,330 L 60,360" strokeWidth="4" stroke="#5C4033" />
          {/* Head */}
          <Circle cx="60" cy="310" r="18" fill="#D2B48C" />
          {/* Ears */}
          <Circle cx="46" cy="296" r="6" fill="#D2B48C" />
          <Circle cx="74" cy="296" r="6" fill="#D2B48C" />
          {/* Face details */}
          <Circle cx="54" cy="308" r="2" fill="#5C4033" />
          <Circle cx="66" cy="308" r="2" fill="#5C4033" />
          <Circle cx="60" cy="314" r="3" fill="#FFF" />
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
