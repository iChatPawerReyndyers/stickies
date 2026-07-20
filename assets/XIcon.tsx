import React from 'react';
import Svg, { Path, SvgProps } from 'react-native-svg';

interface IconProps extends SvgProps {
  size?: number;
  color?: string;
}

export const XIcon: React.FC<IconProps> = ({
  size = 100,
  color = '#000000',
  ...props
}) => {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      {...props}
    >
      {/* Main Top-Left to Bottom-Right Stroke */}
      <Path
        d="M26 15C19 14 14 22 18 33C26 55 45 76 73 86C81 89 86 82 81 72C66 54 44 30 32 17C30 15 28 15 26 15Z"
        fill={color}
      />
      {/* Crossing Bottom-Left to Top-Right Stroke */}
      <Path
        d="M16 73C12 81 21 85 30 78C47 65 67 42 82 25C87 19 81 13 73 17C55 31 32 53 20 68C18 70 17 72 16 73Z"
        fill={color}
      />
    </Svg>
  );
};