// components/Toast.tsx
// Bottom "snackbar"-style toast with an optional Undo action. Auto-hides
// after 5 seconds; tapping Undo cancels the auto-hide timer, runs the
// undo callback, and dismisses immediately.

import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AUTO_HIDE_MS = 5000;
// Base gap above the screen edge before any safe-area adjustment — the
// toast sits above the FAB (see MainScreen's own FAB offset), so this stays
// larger than the FAB's base 32px regardless of platform.
const BASE_BOTTOM_OFFSET = 104;

type ToastProps = {
  visible: boolean;
  message: string;
  onUndo?: () => void;
  onHide: () => void;
  isDark?: boolean;
};

const Toast: React.FC<ToastProps> = ({ visible, message, onUndo, onHide, isDark = false }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Same rationale as MainScreen's own FAB: on Android this is the on-screen
  // nav bar's real height when the 3-button bar is showing (smaller under
  // gesture nav, 0 with none), so the toast clears it without needing a
  // separate hardcoded value per nav mode.
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => onHide());
      }, AUTO_HIDE_MS);
    } else {
      opacity.setValue(0);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, message]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.wrap, { opacity, bottom: BASE_BOTTOM_OFFSET + insets.bottom, backgroundColor: isDark ? '#3A3E48' : '#1C1C1E' }]}
      pointerEvents="box-none"
    >
      <Text style={styles.message} numberOfLines={2}>{message}</Text>
      {onUndo && (
        <TouchableOpacity
          onPress={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            onUndo();
            onHide();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.undo}>UNDO</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

export default Toast;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 50,
  },
  message: { color: '#FFFFFF', fontSize: 14, fontWeight: '500', flex: 1, marginRight: 12 },
  undo: { color: '#F5A623', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
});