import React from 'react';
import { View, Text } from 'react-native';
import { NeuPressable } from './Neumorphic';
import { getNeuPalette, NEU_RADIUS } from '../theme/neumorphic';

type PinKeypadProps = {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  isDark?: boolean;
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

const PinKeypad: React.FC<PinKeypadProps> = ({ onDigit, onBackspace, isDark = false }) => {
  const p = getNeuPalette(isDark);
  const KEY_SIZE = 68;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: KEY_SIZE * 3 + 24, justifyContent: 'space-between' }}>
      {KEYS.map((key, i) => {
        if (key === '') return <View key={i} style={{ width: KEY_SIZE, height: KEY_SIZE, marginBottom: 12 }} />;
        return (
          <NeuPressable
            key={i}
            isDark={isDark}
            radius={KEY_SIZE / 2}
            style={{ width: KEY_SIZE, height: KEY_SIZE, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
            onPress={() => (key === '⌫' ? onBackspace() : onDigit(key))}
          >
            <Text style={{ fontSize: key === '⌫' ? 20 : 24, fontWeight: '600', color: p.textPrimary }}>
              {key}
            </Text>
          </NeuPressable>
        );
      })}
    </View>
  );
};

export default PinKeypad;