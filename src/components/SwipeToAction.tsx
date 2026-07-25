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

const SWIPE_THRESHOLD = 90;
// Dedicated dark shades for the swipe hints — deliberately not NEU_DANGER
// (the app's general cancel/destructive text color), since that's tuned to
// read on light backgrounds/buttons elsewhere and was too light against
// this larger pill. Local to this component so it doesn't affect any other
// destructive-action styling in the app.
const DELETE_COLOR = '#9B2C2C';
const ARCHIVE_COLOR = '#1F4E79';

type SwipeToActionProps = {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  enabled?: boolean;
  isDark?: boolean;
};

const SwipeToAction: React.FC<SwipeToActionProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = 'Delete',
  rightLabel = 'Archive',
  enabled = true,
  isDark = false,
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

  // Reaches full opacity right at SWIPE_THRESHOLD (the point the drag
  // actually commits to the action on release) instead of continuing to
  // fade in for another 60px past it — previously the hint was only ~50%
  // opaque by the time the swipe was far enough to trigger, which read as
  // "barely visible" right when it mattered most.
  const deleteOpacity = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -20, 0],
    outputRange: [1, 0, 0],
    extrapolate: 'clamp',
  });
  const archiveOpacity = translateX.interpolate({
    inputRange: [0, 20, SWIPE_THRESHOLD],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={{ flex: 1 }}>
      <Animated.View pointerEvents="none" style={[styles.hint, styles.hintLeft, { opacity: deleteOpacity }]}>
        <View style={styles.hintChip}>
          <Text style={styles.hintIcon}>🗑</Text>
          <Text style={[styles.hintText, { color: DELETE_COLOR }]}>{leftLabel}</Text>
        </View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.hint, styles.hintRight, { opacity: archiveOpacity }]}>
        <View style={styles.hintChip}>
          <Text style={styles.hintIcon}>📦</Text>
          <Text style={[styles.hintText, { color: ARCHIVE_COLOR }]}>{rightLabel}</Text>
        </View>
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
    paddingHorizontal: 16,
  },
  hintLeft: { right: 0 },
  hintRight: { left: 0 },
  // Flat white pill with a black outline border — outline lives on the
  // chip background rather than the label text.
  hintChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  hintIcon: { fontSize: 20 },
  hintText: { fontSize: 17, fontWeight: '700' },
});