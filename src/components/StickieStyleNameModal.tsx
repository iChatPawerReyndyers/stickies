// components/StickieStyleNameModal.tsx
//
// Small centered modal shown after confirming a new or edited StickieStyle,
// asking the user to name it before it's saved.

import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { getNeuPalette, NEU_ACCENT, NEU_DANGER } from '../theme/neumorphic';

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
        <View style={[s.card, { backgroundColor: p.base }]}>
          <Text style={[s.title, { color: p.textPrimary }]}>Name this style</Text>
          <View style={[s.inputWrap, { borderColor: error ? NEU_DANGER : `${p.darkShadow}55` }]}>
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
          </View>
          {!!error && <Text style={s.error}>{error}</Text>}

          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, s.btnCancel]} onPress={onCancel} activeOpacity={0.8}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnSave]} onPress={handleSave} activeOpacity={0.8}>
              <Text style={s.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default StickieStyleNameModal;

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  card: { width: 300, borderRadius: 20, padding: 22 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 14, textAlign: 'center' },
  inputWrap: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12 },
  input: { height: 44, fontSize: 15 },
  error: { color: NEU_DANGER, fontSize: 12, marginTop: 6, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  btn: { flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnCancel: { backgroundColor: '#F2F2F7' },
  btnSave: { backgroundColor: NEU_ACCENT },
  cancelText: { fontSize: 15, fontWeight: '700', color: '#FF3B30' },
  saveText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});