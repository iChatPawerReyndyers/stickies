// components/TextSelectionToolbar.tsx
//
// Replaces the native copy/paste bubble (see NoteModal.tsx's
// `contextMenuHidden` TextInputs) with the app's own formatting-aware
// toolbar. Docks as a floating strip at the top of the note card whenever
// there's an active, non-empty text selection in either the text-note
// TextInput or a checklist item's TextInput — see NoteModal.tsx's
// selection-tracking state for how "active" is decided.
//
// Deliberately does NOT try to float exactly over the selected words —
// getting a precise on-screen rect for an arbitrary text selection isn't
// available from plain React Native without a native module, so a fixed
// docked position is the reliable choice. Native drag-to-extend selection
// handles keep working underneath it untouched; this toolbar never steals
// focus from the TextInput.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MarkerKind } from '../utils/richText';

type TextSelectionToolbarProps = {
  onMarker: (kind: MarkerKind) => void;
  onCopy: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
};

const TextSelectionToolbar: React.FC<TextSelectionToolbarProps> = ({
  onMarker,
  onCopy,
  onPaste,
  onSelectAll,
}) => {
  return (
    <View style={s.wrap} pointerEvents="box-none">
      <View style={s.bar}>
        <TouchableOpacity style={s.markerBtn} onPress={() => onMarker('bold')} hitSlop={s.hitSlop}>
          <Text style={[s.markerBtnText, s.boldText]}>B</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.markerBtn} onPress={() => onMarker('italic')} hitSlop={s.hitSlop}>
          <Text style={[s.markerBtnText, s.italicText]}>I</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.markerBtn} onPress={() => onMarker('strike')} hitSlop={s.hitSlop}>
          <Text style={[s.markerBtnText, s.strikeText]}>S</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.markerBtn} onPress={() => onMarker('underline')} hitSlop={s.hitSlop}>
          <Text style={[s.markerBtnText, s.underlineText]}>U</Text>
        </TouchableOpacity>

        <View style={s.divider} />

        <TouchableOpacity style={s.actionBtn} onPress={onCopy} hitSlop={s.hitSlop}>
          <Text style={s.actionBtnText} numberOfLines={1}>Copy</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={onPaste} hitSlop={s.hitSlop}>
          <Text style={s.actionBtnText} numberOfLines={1}>Paste</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtnWide} onPress={onSelectAll} hitSlop={s.hitSlop}>
          <Text style={s.actionBtnText} numberOfLines={1}>Select All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default TextSelectionToolbar;

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: -18,
    left: 8,
    right: 8,
    zIndex: 50,
    alignItems: 'stretch',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  hitSlop: { top: 6, bottom: 6, left: 2, right: 2 },
  markerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  markerBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  boldText: { fontWeight: '800' },
  italicText: { fontStyle: 'italic' },
  strikeText: { textDecorationLine: 'line-through' },
  underlineText: { textDecorationLine: 'underline' },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 3,
  },
  actionBtn: {
    flex: 1.4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  actionBtnWide: {
    flex: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  actionBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
});