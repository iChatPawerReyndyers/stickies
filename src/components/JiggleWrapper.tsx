// components/JiggleWrapper.tsx
//
// The subtle continuous wobble that signals "rearrange mode is on, you can
// drag things now" — same visual language as iOS's home screen icon
// jiggle. Purely decorative; MainScreen.tsx is what actually gates
// dragging on/off, this just wraps whatever's passed as children in the
// animated rotation whenever `active` is true.
//
// Each card should pass a different `seed` (e.g. derived from its own id)
// so a whole screen of jiggling cards doesn't all wobble in perfect,
// robotic unison — the duration jitter below staggers them.

import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

type JiggleWrapperProps = {
  active: boolean;
  seed: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const JiggleWrapper: React.FC<JiggleWrapperProps> = ({ active, seed, children, style }) => {
  const rotate = useRef(new Animated.Value(0)).current;
  const jitter = seed % 60; // 0-59ms stagger so cards don't wobble in lockstep

  useEffect(() => {
    if (!active) {
      // Deliberately deferred, not synchronous. Hitting "Done" (see
      // MainScreen.tsx's exitRearrangeMode) flips every currently-jiggling
      // card's `active` prop to false in the same React commit — if every
      // one of them synchronously called stopAnimation()/setValue() here,
      // that's many native-driven Animated "override props" mutations
      // landing on the exact same frame, which has been implicated in a
      // Fabric/New Architecture crash (java.lang.AssertionError in
      // SurfaceMountingManager.overridePropsReadableMap) — the same root
      // cause class as an earlier crash on drag-start, just at a larger
      // scale (many cards at once instead of two animations on one card).
      // Spreading these resets across a wider window than the `jitter`
      // used for the ongoing wobble (which only staggers timing while
      // active, not this stop) means each card's mutation lands on a
      // different frame instead of piling into one.
      //
      // Safe to defer purely visually too: the render below already drops
      // the `transform` style entirely (active ? {...} : null) in the same
      // synchronous render that set active=false, via ordinary React prop
      // diffing — not through Animated's imperative/native-override path.
      // So the wobble already visually stops immediately regardless of
      // when this cleanup actually runs; this timeout only delays
      // resetting the Animated.Value's own internal state, which has no
      // visible representation once its style is already gone.
      const stopDelay = seed % 250;
      const timeoutId = setTimeout(() => {
        rotate.stopAnimation();
        rotate.setValue(0);
      }, stopDelay);
      return () => clearTimeout(timeoutId);
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1, duration: 130 + jitter, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -1, duration: 260 + jitter, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0, duration: 130 + jitter, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active]);

  const rotateInterpolate = rotate.interpolate({ inputRange: [-1, 1], outputRange: ['-1.5deg', '1.5deg'] });

  return (
    <Animated.View style={[style, active ? { transform: [{ rotate: rotateInterpolate }] } : null]}>
      {children}
    </Animated.View>
  );
};

export default JiggleWrapper;