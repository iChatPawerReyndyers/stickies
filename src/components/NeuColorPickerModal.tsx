// components/NeuColorPickerModal.tsx
//
// Shared "tap the swatch, drag to a color" picker. Triggered from any color
// preview that stands in for a raw hex value (TabModal's three color rows,
// NoteModal styling bar's Background/Font Color custom-color tile, and by
// extension StickieStyleSection since it reuses NoteModal in
// styleEditorMode). Sliders only for now — no Grid/Spectrum tabs.
//
// Flat View card (not NeuView) against the dark backdrop, same reasoning as
// TabModal's own card: a raised dual-shadow here reads as a harsh white
// bloom. Footer buttons are plain TouchableOpacity for the same reason
// TabModal's are — NeuPressable only forwards `style` to its inner NeuView,
// never the outer Pressable, so a flex:1 button in a row never actually
// gets that sizing.

import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Pressable, PanResponder, StyleSheet, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { getNeuPalette, NEU_ACCENT, NEU_DANGER, NEU_RADIUS } from '../theme/neumorphic';
import { hexToRgb, rgbToHex } from '../utils/color';

type NeuColorPickerModalProps = {
  visible: boolean;
  initialColor: string;
  title?: string;
  isDark?: boolean;
  onCancel: () => void;
  onSave: (hex: string) => void;
};

const THUMB_SIZE = 22;
const TRACK_HEIGHT = 14;
// The pan responder lives on a taller invisible hit area than the visible
// track — a thumb you can only grab within a 14px-tall strip is hard to
// land a finger on reliably.
const HIT_HEIGHT = 40;
const THUMB_TOP = (HIT_HEIGHT - THUMB_SIZE) / 2;

// Sanitizes free-typed hex input to just valid hex characters, uppercased,
// capped at 6 digits — mirrors TabModal's own sanitizeHex.
const sanitizeHexInput = (text: string) => text.replace(/[^0-9a-fA-F]/g, '').toUpperCase().slice(0, 6);

type ChannelSliderProps = {
  label: string;
  value: number;
  gradientFrom: string;
  gradientTo: string;
  isDark: boolean;
  onChange: (value: number) => void;
};

// One R/G/B row: label + live value above a gradient track with a raised
// draggable thumb. The gradient endpoints are computed by the parent from
// the *other two* channels each render, so dragging Red actually shows
// what Red does to the current color instead of a fixed hue ramp.
const ChannelSlider: React.FC<ChannelSliderProps> = ({ label, value, gradientFrom, gradientTo, isDark, onChange }) => {
  const p = getNeuPalette(isDark);
  const trackRef = useRef<View>(null);
  const trackXRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);

  // PanResponder.create() below runs exactly once (it's the useRef
  // initializer), so its callbacks close over whatever `trackWidth` and
  // `onChange` were on that very first render — before the track has even
  // been measured, trackWidth is still 0. Later updates (the real
  // measured width landing after onLayout, or a fresh `onChange` for a
  // different channel) would otherwise never be seen inside
  // onPanResponderGrant/Move, so every drag would just keep hitting the
  // `width <= 0` guard and silently do nothing — the thumb never moves.
  // Mirroring the latest values into refs and reading the refs inside the
  // callbacks keeps the drag handling live. Same pattern SwipeToAction.tsx
  // already uses for its own PanResponder's `enabled` prop.
  const trackWidthRef = useRef(trackWidth);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    trackWidthRef.current = trackWidth;
  }, [trackWidth]);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const measureTrack = () => {
    // A layout callback fires as soon as Yoga has computed the box, which
    // on some Android devices is a frame before the native view is
    // actually placed on screen — measureInWindow called synchronously in
    // that gap can return a stale/zero x. Deferring one frame gives the
    // native side time to catch up.
    requestAnimationFrame(() => {
      trackRef.current?.measureInWindow((x, _y, width) => {
        trackXRef.current = x;
        setTrackWidth(width);
      });
    });
  };

  const updateFromPageX = (pageX: number) => {
    const width = trackWidthRef.current;
    if (width <= 0) return;
    const rel = Math.max(0, Math.min(width, pageX - trackXRef.current));
    onChangeRef.current(Math.round((rel / width) * 255));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Without this, the picker's own backdrop Pressable can reclaim the
      // responder a few pixels into the drag, which cuts the gesture off
      // right after it starts — the thumb would only ever move a couple
      // of pixels no matter how far the finger travels.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt: GestureResponderEvent) => updateFromPageX(evt.nativeEvent.pageX),
      onPanResponderMove: (evt: GestureResponderEvent, gesture: PanResponderGestureState) =>
        updateFromPageX(evt.nativeEvent.pageX ?? gesture.moveX),
    })
  ).current;

  const thumbLeft = trackWidth > 0 ? (value / 255) * trackWidth - THUMB_SIZE / 2 : -THUMB_SIZE / 2;

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={[cs.channelLabel, { color: p.textSecondary }]}>{label}</Text>
        <Text style={[cs.channelValue, { color: p.textPrimary }]}>{value}</Text>
      </View>
      <View
        ref={trackRef}
        onLayout={measureTrack}
        style={{ height: HIT_HEIGHT, justifyContent: 'center', position: 'relative' }}
        {...panResponder.panHandlers}
      >
        <View style={{ height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, overflow: 'hidden' }}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={`grad-${label}`} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={gradientFrom} />
                <Stop offset="1" stopColor={gradientTo} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#grad-${label})`} />
          </Svg>
        </View>
        <View pointerEvents="none" style={[cs.thumb, { left: thumbLeft, top: THUMB_TOP, backgroundColor: p.base }]} />
      </View>
    </View>
  );
};

const NeuColorPickerModal: React.FC<NeuColorPickerModalProps> = ({
  visible,
  initialColor,
  title = 'Pick a color',
  isDark = false,
  onCancel,
  onSave,
}) => {
  const p = getNeuPalette(isDark);
  const [r, setR] = useState(0);
  const [g, setG] = useState(0);
  const [b, setB] = useState(0);
  const [hexInput, setHexInput] = useState('000000');

  useEffect(() => {
    if (!visible) return;
    const rgb = hexToRgb(initialColor) || { r: 0, g: 0, b: 0 };
    setR(rgb.r);
    setG(rgb.g);
    setB(rgb.b);
    setHexInput(rgbToHex(rgb.r, rgb.g, rgb.b).slice(1));
  }, [visible, initialColor]);

  const setChannel = (channel: 'r' | 'g' | 'b', value: number) => {
    const next = { r, g, b, [channel]: value };
    setR(next.r);
    setG(next.g);
    setB(next.b);
    setHexInput(rgbToHex(next.r, next.g, next.b).slice(1));
  };

  const handleHexChange = (text: string) => {
    const sanitized = sanitizeHexInput(text);
    setHexInput(sanitized);
    if (sanitized.length === 6) {
      const rgb = hexToRgb(`#${sanitized}`);
      if (rgb) {
        setR(rgb.r);
        setG(rgb.g);
        setB(rgb.b);
      }
    }
  };

  const currentHex = rgbToHex(r, g, b);

  const handleSave = () => onSave(currentHex);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <Pressable style={cs.overlay} onPress={onCancel}>
        {/* Flat surface, no NeuView — matches TabModal/PinSetupModal/
            StickieStyleNameModal: a raised dual-shadow reads as a harsh
            white bloom against the dark backdrop. */}
        <View style={[cs.card, { backgroundColor: p.base }]} onStartShouldSetResponder={() => true}>
          <View style={cs.header}>
            <Text style={[cs.title, { color: p.textSecondary }]}>{title}</Text>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <View style={[cs.closeBtn, { backgroundColor: p.insetBase }]}>
                <Text style={[cs.closeBtnText, { color: p.textPrimary }]}>✕</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={[cs.divider, { backgroundColor: `${p.darkShadow}55` }]} />

          <View style={cs.previewRow}>
            <View style={[cs.previewSwatch, { backgroundColor: currentHex, shadowColor: p.darkShadow }]} />
            <View style={{ flex: 1 }}>
              <Text style={[cs.hexLabel, { color: p.textSecondary }]}>HEX</Text>
              <View style={[cs.hexInputWrap, { backgroundColor: p.insetBase }]}>
                <Text style={[cs.hexHash, { color: p.textSecondary }]}>#</Text>
                <TextInput
                  style={[cs.hexInput, { color: p.textPrimary }]}
                  value={hexInput}
                  onChangeText={handleHexChange}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                  placeholder="RRGGBB"
                  placeholderTextColor={p.textSecondary}
                />
              </View>
            </View>
          </View>

          <ChannelSlider
            label="RED"
            value={r}
            gradientFrom={rgbToHex(0, g, b)}
            gradientTo={rgbToHex(255, g, b)}
            isDark={isDark}
            onChange={v => setChannel('r', v)}
          />
          <ChannelSlider
            label="GREEN"
            value={g}
            gradientFrom={rgbToHex(r, 0, b)}
            gradientTo={rgbToHex(r, 255, b)}
            isDark={isDark}
            onChange={v => setChannel('g', v)}
          />
          <ChannelSlider
            label="BLUE"
            value={b}
            gradientFrom={rgbToHex(r, g, 0)}
            gradientTo={rgbToHex(r, g, 255)}
            isDark={isDark}
            onChange={v => setChannel('b', v)}
          />

          <View style={cs.footer}>
            <TouchableOpacity
              style={[cs.btn, cs.btnInset, { backgroundColor: p.insetBase }]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={cs.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cs.btn, cs.btnRaised, { backgroundColor: NEU_ACCENT, shadowColor: p.darkShadow }]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={cs.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

export default NeuColorPickerModal;

const cs = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '86%',
    maxWidth: 320,
    borderRadius: NEU_RADIUS.xl,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 15, fontWeight: '600' },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderTopColor: 'rgba(0,0,0,0.15)',
    borderLeftColor: 'rgba(0,0,0,0.15)',
    borderBottomColor: 'rgba(255,255,255,0.7)',
    borderRightColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 12, fontWeight: '700' },
  divider: { height: 1, marginBottom: 16 },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  previewSwatch: {
    width: 64,
    height: 64,
    borderRadius: NEU_RADIUS.md,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  hexLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4, marginBottom: 5 },
  hexInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9,
    paddingHorizontal: 12,
    height: 40,
  },
  hexHash: { fontSize: 14, fontWeight: '700', marginRight: 2 },
  hexInput: { flex: 1, fontSize: 14, fontWeight: '700', letterSpacing: 1, padding: 0, height: 40 },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  channelLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4 },
  channelValue: { fontSize: 12, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: NEU_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  btnRaised: {
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  btnInset: {
    borderWidth: 1.5,
    borderTopColor: 'rgba(0,0,0,0.15)',
    borderLeftColor: 'rgba(0,0,0,0.15)',
    borderBottomColor: 'rgba(255,255,255,0.7)',
    borderRightColor: 'rgba(255,255,255,0.7)',
  },
  cancelText: { fontSize: 15, fontWeight: '700', color: NEU_DANGER },
  saveText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});