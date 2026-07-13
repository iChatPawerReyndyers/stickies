import React, { useState, useRef } from 'react';
import { View, Text, Animated, SafeAreaView } from 'react-native';
import PinDots from './PinDots';
import PinKeypad from './PinKeypad';
import { getNeuPalette, NEU_DANGER } from '../theme/neumorphic';

type PinLockScreenProps = {
  correctPin: string;
  pinLength: 4 | 6;
  isDark?: boolean;
  onUnlock: () => void;
};

const PinLockScreen: React.FC<PinLockScreenProps> = ({ correctPin, pinLength, isDark = false, onUnlock }) => {
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const p = getNeuPalette(isDark);

  const runShake = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 6, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 45, useNativeDriver: true }),
    ]).start();
  };

  const handleDigit = (d: string) => {
    if (entered.length >= pinLength) return;
    const next = entered + d;
    setEntered(next);
    setError(false);

    if (next.length === pinLength) {
      if (next === correctPin) {
        setTimeout(onUnlock, 120);
      } else {
        setError(true);
        runShake();
        setTimeout(() => setEntered(''), 350);
      }
    }
  };

  const handleBackspace = () => {
    setError(false);
    setEntered(prev => prev.slice(0, -1));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.base, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: p.textPrimary, marginBottom: 6 }}>
        Enter PIN
      </Text>
      <Text style={{ fontSize: 13, color: error ? NEU_DANGER : p.textSecondary, marginBottom: 4, height: 18 }}>
        {error ? 'Incorrect PIN, try again' : ' '}
      </Text>

      <Animated.View style={{ transform: [{ translateX: shake }] }}>
        <PinDots length={pinLength} filled={entered.length} error={error} isDark={isDark} />
      </Animated.View>

      <View style={{ marginTop: 24 }}>
        <PinKeypad onDigit={handleDigit} onBackspace={handleBackspace} isDark={isDark} />
      </View>
    </SafeAreaView>
  );
};

export default PinLockScreen;