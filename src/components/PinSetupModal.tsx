import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import PinDots from './PinDots';
import PinKeypad from './PinKeypad';
import { NeuView, NeuPressable } from './Neumorphic';
import { getNeuPalette, NEU_ACCENT, NEU_DANGER, NEU_RADIUS } from '../theme/neumorphic';

type Mode = 'create' | 'change' | 'disable';

type PinSetupModalProps = {
  visible: boolean;
  mode: Mode;
  currentPin: string;
  isDark?: boolean;
  onClose: () => void;
  // Called with (newPin, newLength) on successful create/change,
  // or with ('', currentLength) on successful disable.
  onComplete: (newPin: string, newLength: 4 | 6) => void;
};

// create: pick length -> enter -> confirm
// change: verify current -> pick length -> enter -> confirm
// disable: verify current -> done
type Step = 'verify' | 'length' | 'enter' | 'confirm';

const PinSetupModal: React.FC<PinSetupModalProps> = ({
  visible, mode, currentPin, isDark = false, onClose, onComplete,
}) => {
  const p = getNeuPalette(isDark);
  const [step, setStep] = useState<Step>('verify');
  const [length, setLength] = useState<4 | 6>(4);
  const [entered, setEntered] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setEntered('');
    setFirstPin('');
    setError('');
    setLength(4);
    setStep(mode === 'create' ? 'length' : 'verify');
  }, [visible, mode]);

  const title =
    step === 'verify' ? 'Enter current PIN'
    : step === 'length' ? 'Choose PIN length'
    : step === 'enter' ? 'Create a new PIN'
    : 'Confirm your PIN';

  const handleDigit = (d: string) => {
    if (entered.length >= length) return;
    const next = entered + d;
    setEntered(next);
    setError('');

    if (next.length !== length) return;

    if (step === 'verify') {
      if (next === currentPin) {
        if (mode === 'disable') {
          onComplete('', length);
          onClose();
        } else {
          setEntered('');
          setStep('length');
        }
      } else {
        setError('Incorrect PIN');
        setTimeout(() => setEntered(''), 350);
      }
      return;
    }

    if (step === 'enter') {
      setFirstPin(next);
      setEntered('');
      setStep('confirm');
      return;
    }

    if (step === 'confirm') {
      if (next === firstPin) {
        onComplete(firstPin, length);
        onClose();
      } else {
        setError("PINs didn't match, try again");
        setFirstPin('');
        setTimeout(() => {
          setEntered('');
          setStep('enter');
        }, 500);
      }
    }
  };

  const handleBackspace = () => {
    setError('');
    setEntered(prev => prev.slice(0, -1));
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
        <NeuView isDark={isDark} radius={NEU_RADIUS.xl} style={{ width: 320, paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: p.textPrimary, marginBottom: 4 }}>{title}</Text>
          <Text style={{ fontSize: 12, color: error ? NEU_DANGER : p.textSecondary, height: 16 }}>
            {error || ' '}
          </Text>

          {step === 'length' ? (
            <>
              <View style={{ flexDirection: 'row', gap: 12, marginVertical: 20 }}>
                {([4, 6] as const).map(n => (
                  <NeuPressable
                    key={n}
                    isDark={isDark}
                    radius={NEU_RADIUS.md}
                    backgroundColor={length === n ? NEU_ACCENT : undefined}
                    style={{ paddingHorizontal: 22, paddingVertical: 12 }}
                    onPress={() => setLength(n)}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: length === n ? '#fff' : p.textPrimary }}>
                      {n} digits
                    </Text>
                  </NeuPressable>
                ))}
              </View>
              <NeuPressable
                isDark={isDark}
                radius={NEU_RADIUS.sm}
                backgroundColor={NEU_ACCENT}
                style={{ paddingVertical: 12, paddingHorizontal: 30, marginTop: 4 }}
                onPress={() => setStep('enter')}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Continue</Text>
              </NeuPressable>
            </>
          ) : (
            <>
              <PinDots length={length} filled={entered.length} error={!!error} isDark={isDark} />
              <View style={{ marginTop: 12 }}>
                <PinKeypad onDigit={handleDigit} onBackspace={handleBackspace} isDark={isDark} />
              </View>
            </>
          )}

          <TouchableOpacity onPress={onClose} style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: p.textSecondary }}>Cancel</Text>
          </TouchableOpacity>
        </NeuView>
      </View>
    </Modal>
  );
};

export default PinSetupModal;