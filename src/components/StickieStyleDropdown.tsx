// components/StickieStyleDropdown.tsx
//
// Minimal dropdown for choosing among saved StickieStyles. React Native has
// no native <select>, so this is built on the existing Neumorphic primitives
// to match the rest of the app.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { StickieStyle } from '../utils/stickieStyle';
import { NeuView, NeuPressable } from './Neumorphic';
import { getNeuPalette, NEU_ACCENT, NEU_RADIUS } from '../theme/neumorphic';

type StickieStyleDropdownProps = {
  styles: StickieStyle[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isDark?: boolean;
  placeholder?: string;
};

const StickieStyleDropdown: React.FC<StickieStyleDropdownProps> = ({
  styles: stickieStyles,
  selectedId,
  onSelect,
  isDark = false,
  placeholder = 'Select a style…',
}) => {
  const [open, setOpen] = useState(false);
  const p = getNeuPalette(isDark);
  const selected = stickieStyles.find(s => s.id === selectedId) || null;

  return (
    <View>
      <NeuPressable
        isDark={isDark}
        radius={NEU_RADIUS.md}
        style={s.trigger}
        onPress={() => setOpen(v => !v)}
      >
        <Text style={[s.triggerText, { color: selected ? p.textPrimary : p.textSecondary }]} numberOfLines={1}>
          {selected ? selected.name : placeholder}
        </Text>
        <Text style={[s.chevron, { color: p.textSecondary }]}>{open ? '▲' : '▼'}</Text>
      </NeuPressable>

      {open && (
        <NeuView isDark={isDark} radius={NEU_RADIUS.md} style={s.list}>
          <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {stickieStyles.length === 0 && (
              <Text style={[s.emptyText, { color: p.textSecondary }]}>No saved styles yet</Text>
            )}
            {stickieStyles.map(item => (
              <TouchableOpacity
                key={item.id}
                style={s.option}
                onPress={() => {
                  onSelect(item.id);
                  setOpen(false);
                }}
              >
                <View style={[s.swatch, { backgroundColor: item.color }]} />
                <Text
                  style={[
                    s.optionText,
                    { color: p.textPrimary },
                    item.id === selectedId && { color: NEU_ACCENT, fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {item.id === selectedId && <Text style={{ color: NEU_ACCENT }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </NeuView>
      )}
    </View>
  );
};

export default StickieStyleDropdown;

const s = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  triggerText: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  chevron: { fontSize: 11 },
  list: { marginTop: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  swatch: { width: 16, height: 16, borderRadius: 4, marginRight: 8 },
  optionText: { fontSize: 13.5, flex: 1 },
  emptyText: { fontSize: 13, padding: 14, textAlign: 'center' },
});