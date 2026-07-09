import React from 'react';
import { CuteFrame } from './CuteFrame';
import { RestFrame } from './RestFrame';
import { CraftFrame } from './CraftFrame';
import { CloudFrame } from './CloudFrame';
import { CameraFrame } from './CameraFrame';
import { CatFrame } from './CatFrame';

export type FrameComponentType = React.FC<{ size?: number }>;

// Add a new frame here (and its file alongside the others) to include it
// in the random selection pool.
export const FRAME_COMPONENTS: Record<string, FrameComponentType> = {
  cute: CuteFrame,
  rest: RestFrame,
  craft: CraftFrame,
  cloud: CloudFrame,
  camera: CameraFrame,
  cat: CatFrame,
};

export const FRAME_IDS = Object.keys(FRAME_COMPONENTS);

export interface FrameContentInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

// Percentage insets (of the card's width/height) marking the empty area
// inside each frame's artwork — note text only renders inside this box so
// it never overlaps the decorative illustration.
export const FRAME_CONTENT_INSETS: Record<string, FrameContentInset> = {
  cute: { top: 18, bottom: 32, left: 14, right: 32 },
  rest: { top: 14, bottom: 35, left: 16, right: 12 },
  craft: { top: 16, bottom: 22, left: 20, right: 18 },
  cloud: { top: 23, bottom: 20, left: 15, right: 15 },
  camera: { top: 17, bottom: 19, left: 14, right: 33 },
  cat: { top: 29, bottom: 22, left: 16, right: 30 },
};

export const getRandomFrameId = (): string => {
  return FRAME_IDS[Math.floor(Math.random() * FRAME_IDS.length)];
};

export { CuteFrame, RestFrame, CraftFrame, CloudFrame, CameraFrame, CatFrame };
