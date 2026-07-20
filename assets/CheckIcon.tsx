import React from 'react';
import Svg, { Path, SvgProps } from 'react-native-svg';

interface IconProps extends SvgProps {
  size?: number;
  color?: string;
}

export const CheckIcon: React.FC<IconProps> = ({
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
      <Path
        d="M16.5 41.5C13.5 38.5 14.5 48 18.5 55.5C23.5 65 31 77.5 39.5 85.5C43 89 47.5 91 50.5 84C55.5 72.5 68.5 48.5 81 27C87 16.5 94.5 7.5 96.5 9.5C98.5 11.5 91 22.5 84.5 33.5C72 54.5 58 77 47.5 83.5C43 86.5 39.5 79.5 36.5 72.5C30.5 59.5 22.5 46.5 16.5 41.5Z"
        fill={color}
      />
    </Svg>
  );
};