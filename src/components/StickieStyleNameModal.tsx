// components/StickieStyleNameModal.tsx
//
// Small centered modal shown after confirming a new or edited StickieStyle,
// asking the user to name it before it's saved.

import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet } from 'react-native';
import { NeuView, NeuPressable } from './Neumorphic';
import { getNeuPalette, NEU_ACCENT, NEU_DANGER, NEU_RADIUS } from '../theme/neumorphic';

type StickieStyleNameModalProps = {
  visible: boolean;
  initialName?: string;
  isDark?: boolean;
  onCancel: () => void;
  onSave: (name: string) => void;
};

const StickieStyleNameModal: React.FC<StickieStyleNameModalProps> = ({
  visible,
  initialName = '',
  isDark = false,
  onCancel,
  onSave,
}) => {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  const p = getNeuPalette(isDark);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setError('');
    }
  }, [visible, initialName]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give this style a name');
      return;
    }
    onSave(trimmed);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={s.backdrop}>
        <NeuView isDark={isDark} radius={NEU_RADIUS.xl} style={s.card}>
          <Text style={[s.title, { color: p.textPrimary }]}>Name this style</Text>
          <NeuView
            isDark={isDark}
            inset
            radius={NEU_RADIUS.sm}
            style={error ? { borderWidth: 1.5, borderColor: NEU_DANGER } : undefined}
          >
            <TextInput
              style={[s.input, { color: p.textPrimary }]}
              value={name}
              onChangeText={t => { setName(t); setError(''); }}
              placeholder="e.g. Pastel Notes"
              placeholderTextColor={p.textSecondary}
              autoFocus
              onSubmitEditing={handleSave}
              returnKeyType="done"
            />
          </NeuView>
          {!!error && <Text style={s.error}>{error}</Text>}

          <View style={s.btnRow}>
            <NeuPressable isDark={isDark} radius={NEU_RADIUS.sm} style={s.btn} onPress={onCancel}>
              <Text style={s.cancelText}>Cancel</Text>
            </NeuPressable>
            <NeuPressable isDark={isDark} radius={NEU_RADIUS.sm} backgroundColor={NEU_ACCENT} style={s.btn} onPress={handleSave}>
              <Text style={s.saveText}>Save</Text>
            </NeuPressable>
          </View>
        </NeuView>
      </View>
    </Modal>
  );
};

export default StickieStyleNameModal;

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  card: { width: 300, padding: 22 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 14, textAlign: 'center' },
  input: { height: 44, paddingHorizontal: 12, fontSize: 15 },
  error: { color: NEU_DANGER, fontSize: 12, marginTop: 6, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  btn: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: NEU_DANGER },
  saveText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});