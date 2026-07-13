// components/SwipeToAction.tsx
// Reusable horizontal swipe wrapper: swipe left to trigger onSwipeLeft
// ("delete"), swipe right to trigger onSwipeRight ("archive"). Shows a
// label that fades in as the user drags past a small threshold, and only
// commits the action once the drag passes SWIPE_THRESHOLD — otherwise it
// springs back. Vertical scrolling inside `children` (e.g. a checklist
// ScrollView) is left alone since the gesture only claims the responder
// when the drag is clearly more horizontal than vertical.

import React, { useRef, useEffect } from 'react';
import { Animated, PanResponder, View, Text, StyleSheet } from 'react-native';
import { NEU_DANGER } from '../theme/neumorphic';

const SWIPE_THRESHOLD = 90;
const ARCHIVE_COLOR = '#4A90D9';

type SwipeToActionProps = {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  enabled?: boolean;
};

const SwipeToAction: React.FC<SwipeToActionProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = 'Delete',
  rightLabel = 'Archive',
  enabled = true,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;

  // PanResponder.create() below runs exactly once (it's the useRef
  // initializer), so its callbacks close over whatever `enabled` was on
  // that very first render — later prop updates (e.g. the styling bar
  // opening, or the keyboard appearing) would otherwise never be seen by
  // onMoveShouldSetPanResponder. Mirroring the latest value into a ref and
  // reading the ref inside the callback keeps the gesture check live.
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        enabledRef.current && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderMove: (_, gesture) => {
        translateX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx <= -SWIPE_THRESHOLD && onSwipeLeft) {
          Animated.timing(translateX, { toValue: -600, duration: 180, useNativeDriver: true }).start(() => {
            translateX.setValue(0);
            onSwipeLeft();
          });
        } else if (gesture.dx >= SWIPE_THRESHOLD && onSwipeRight) {
          Animated.timing(translateX, { toValue: 600, duration: 180, useNativeDriver: true }).start(() => {
            translateX.setValue(0);
            onSwipeRight();
          });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 7 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 7 }).start();
      },
    })
  ).current;

  const deleteOpacity = translateX.interpolate({
    inputRange: [-150, -20, 0],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });
  const archiveOpacity = translateX.interpolate({
    inputRange: [0, 20, 150],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ flex: 1 }}>
      <Animated.View pointerEvents="none" style={[styles.hint, styles.hintLeft, { opacity: deleteOpacity }]}>
        <Text style={[styles.hintText, { color: NEU_DANGER }]}>🗑 {leftLabel}</Text>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.hint, styles.hintRight, { opacity: archiveOpacity }]}>
        <Text style={[styles.hintText, { color: ARCHIVE_COLOR }]}>📦 {rightLabel}</Text>
      </Animated.View>
      <Animated.View style={{ flex: 1, transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
};

export default SwipeToAction;

const styles = StyleSheet.create({
  hint: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  hintLeft: { right: 0 },
  hintRight: { left: 0 },
  hintText: { fontSize: 13, fontWeight: '700' },
});