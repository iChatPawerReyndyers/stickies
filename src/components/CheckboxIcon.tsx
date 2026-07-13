// components/CheckboxIcon.tsx
//
// Extracted from NoteModal.tsx so both the note editor and the new
// StickieStylePreviewCard render checkboxes identically instead of
// duplicating the SVG markup.

import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

const CHECKBOX_STROKE_COLOR = '#1C1C1E';
const CHECKBOX_CHECKED_FILL = '#1C1C1E';

type CheckboxIconProps = {
  checked: boolean;
  size?: number;
};

const CheckboxIcon: React.FC<CheckboxIconProps> = ({ checked, size = 26 }) => (
  <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    <Rect
      x={size * 0.08} y={size * 0.08}
      width={size * 0.84} height={size * 0.84}
      rx={size * 0.26} ry={size * 0.26}
      stroke={CHECKBOX_STROKE_COLOR} strokeWidth={size * 0.1}
      fill={checked ? CHECKBOX_CHECKED_FILL : 'transparent'}
    />
    {checked && (
      <Path
        d={`M${size * 0.27} ${size * 0.52} L${size * 0.42} ${size * 0.67} L${size * 0.75} ${size * 0.32}`}
        stroke="#FFFFFF" strokeWidth={size * 0.09}
        strokeLinecap="round" strokeLinejoin="round" fill="none"
      />
    )}
  </Svg>
);

export default CheckboxIcon;