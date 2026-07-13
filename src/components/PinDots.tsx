import React from 'react';
import { View } from 'react-native';
import { NEU_ACCENT } from '../theme/neumorphic';

type PinDotsProps = {
  length: number;
  filled: number;
  error?: boolean;
  isDark?: boolean;
};

const PinDots: React.FC<PinDotsProps> = ({ length, filled, error, isDark = false }) => {
  return (
    <View style={{ flexDirection: 'row', gap: 14, justifyContent: 'center', marginVertical: 20 }}>
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: error
              ? '#E5484D'
              : i < filled
              ? NEU_ACCENT
              : isDark
              ? '#3A3E48'
              : '#D9DEE8',
          }}
        />
      ))}
    </View>
  );
};

export default PinDots;