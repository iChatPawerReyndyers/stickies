// components/DraggableGridItem.tsx
//
// The grid view (see MainScreen.tsx's layoutNotesGrid) isn't a real
// FlatList — it's a dense auto-packed layout that supports notes spanning
// multiple columns/rows, with every card absolutely positioned by pixel
// math. That rules out drop-in libraries like react-native-draggable-
// flatlist for this view (list view uses that instead — see MainScreen's
// list-view branch). This component does the grid's drag mechanism by
// hand: while rearrange mode is on, touching a card lets it float freely
// (via a PanResponder-driven translate on top of its normal absolute
// position) following the finger; on release, it hit-tests the drag
// point's final position against every *other* card's rect and reports
// back which one it landed on (or none, if dropped over empty space) —
// MainScreen.tsx turns that into an actual array reorder and everything
// else reflows naturally on the next render.
//
// Deliberately doesn't animate the *other* cards sliding out of the way
// mid-drag (that's what a full DnD-with-live-reflow library would add) —
// only the card actually being dragged moves smoothly; everyone else just
// snaps to their new position once the drop commits. Simpler, and still
// reads as "drag and drop" rather than the more elaborate live-reflow
// version other apps sometimes have.
//
// NOTE: this previously wrapped `children` in JiggleWrapper (the "iOS
// home screen" wobble) while rearrangeMode was on. That's been removed —
// after several rounds chasing a java.lang.AssertionError in
// SurfaceMountingManager.overridePropsReadableMap (a Fabric/New
// Architecture crash), the most consistent trigger turned out to be
// simultaneous Animated mutations across many cards at once — most
// severely when "Done" flips rearrangeMode off for every jiggling card in
// the same React commit. Rather than keep patching the animation's
// timing, the wobble was dropped entirely; dragging itself (this file's
// actual job) doesn't depend on it.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder } from 'react-native';

export type DraggableRect = { noteId: string; left: number; top: number; width: number; height: number };

type DraggableGridItemProps = {
  noteId: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rearrangeMode: boolean;
  // All cards' current rects (including this one) — read fresh at drop
  // time via a ref, not a PanResponder dependency, since the grid layout
  // itself doesn't change mid-drag.
  allRects: DraggableRect[];
  onDrop: (draggedNoteId: string, targetNoteId: string | null) => void;
  children: React.ReactNode;
};

const DraggableGridItem: React.FC<DraggableGridItemProps> = ({
  noteId,
  left,
  top,
  width,
  height,
  rearrangeMode,
  allRects,
  onDrop,
  children,
}) => {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const [dragging, setDragging] = useState(false);

  // PanResponder.create() runs once (useRef initializer) — mirror the
  // latest values into refs so its callbacks (created on that first
  // render) still see up-to-date state, same pattern SwipeToAction.tsx and
  // NeuColorPickerModal.tsx already use for their own PanResponders.
  const rearrangeModeRef = useRef(rearrangeMode);
  useEffect(() => { rearrangeModeRef.current = rearrangeMode; }, [rearrangeMode]);
  const allRectsRef = useRef(allRects);
  useEffect(() => { allRectsRef.current = allRects; }, [allRects]);
  const geometryRef = useRef({ left, top, width, height });
  useEffect(() => { geometryRef.current = { left, top, width, height }; }, [left, top, width, height]);
  // onDrop closes over MainScreen's current `baseNotes` each render — since
  // PanResponder.create() below only ever runs once (the useRef
  // initializer), calling the raw `onDrop` prop directly from inside its
  // callbacks would keep using whichever `baseNotes` snapshot existed on
  // this component's *first* render, silently reordering against stale
  // data. Same ref-mirroring fix as the others above.
  const onDropRef = useRef(onDrop);
  useEffect(() => { onDropRef.current = onDrop; }, [onDrop]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => rearrangeModeRef.current,
      onMoveShouldSetPanResponder: () => rearrangeModeRef.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        setDragging(true);
      },
      // useNativeDriver: false — deliberately NOT true. An earlier attempt
      // set this to true to move the drag animation onto the native UI
      // thread, on the theory that JS-driven prop updates at gesture speed
      // were causing the Fabric crash described in the file header
      // comment. That introduced a *separate* bug once
      // react-native-reanimated was also installed in this project:
      // Reanimated appears to register its own native animated module in
      // a way that conflicts with RN core Animated's native driver, so
      // Animated.event's returned function came back broken — PanResponder
      // then threw "TypeError: Object is not a function" trying to call
      // it. false avoids that conflict entirely. Still safe for the same
      // reason as always: onPanResponderRelease reads gesture.dx/
      // gesture.dy from the raw gesture state object, never from `pan`
      // itself.
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_evt, gesture) => {
        setDragging(false);
        const { left: l, top: t, width: w, height: h } = geometryRef.current;
        const centerX = l + w / 2 + gesture.dx;
        const centerY = t + h / 2 + gesture.dy;
        const target = allRectsRef.current.find(
          r =>
            r.noteId !== noteId &&
            centerX >= r.left && centerX <= r.left + r.width &&
            centerY >= r.top && centerY <= r.top + r.height
        );
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 8 }).start();
        onDropRef.current(noteId, target ? target.noteId : null);
      },
      onPanResponderTerminate: () => {
        setDragging(false);
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 8 }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      {...(rearrangeMode ? panResponder.panHandlers : {})}
      pointerEvents={rearrangeMode ? 'box-only' : 'auto'}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        zIndex: dragging ? 100 : 1,
        elevation: dragging ? 12 : 0,
        transform: pan.getTranslateTransform(),
      }}
    >
      {children}
    </Animated.View>
  );
};

export default DraggableGridItem;