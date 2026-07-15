// theme/neumorphic.ts
// Central design tokens for the app's neumorphic (soft-UI) theme, calibrated
// to the approved reference mockup. Every raised/inset surface pulls its
// colors and radii from here — change a value here and it propagates
// everywhere.

export const NEU_BASE = '#E6EBF2';        // shared base surface color (bg, cards, buttons)
// Deepened from #2B2E36 — matched against the iOS reference build, whose
// dark-mode page sits noticeably darker than any raised card on it. The
// old value was close enough to NEU_INSET_BASE_DARK/card tones that raised
// surfaces had very little room to visually lift off the page, especially
// on Android where there's no real colored shadow to help separate them.
export const NEU_BASE_DARK = '#14151a';   // dark-mode base surface color

export const NEU_LIGHT_SHADOW = '#FFFFFF';
export const NEU_DARK_SHADOW = '#A6B0C3';

// Brightened from #454A56 — this is Android's "light" shadow layer (see
// buildLightBlurLayers in Neumorphic.tsx) as well as iOS's shadowColor for
// the light-side shadow View. The old tone was too close in luminance to
// the card itself to register as a highlight, which is what made Android's
// dual-shadow read as a single flat dark smudge instead of a soft lifted
// edge (iOS's real shadowOpacity/shadowRadius masked the same issue).
export const NEU_LIGHT_SHADOW_DARK_MODE = '#565B68';
export const NEU_DARK_SHADOW_DARK_MODE = '#0E0F12';

// Base color for carved-in/inset surfaces (text inputs, unselected radio
// tracks, toggle-off tracks) — slightly darker than NEU_BASE so the inset
// border read as a groove rather than a flat fill.
export const NEU_INSET_BASE = '#DEE4ED';
export const NEU_INSET_BASE_DARK = '#22252B';

export const NEU_TEXT_PRIMARY = '#3A4358';
export const NEU_TEXT_SECONDARY = '#8891A5';
export const NEU_TEXT_PRIMARY_DARK = '#ECEDEF';
export const NEU_TEXT_SECONDARY_DARK = '#9297A5';

// Single accent used for active/selected states, sliders, primary actions.
export const NEU_ACCENT = '#F5A623';       // warm orange
export const NEU_ACCENT_SOFT = '#FBD9A6';  // lighter tint, behind accent icons
export const NEU_DANGER = '#E06B6B';        // cancel / destructive text & actions

// Pastel note-color palette — softened tints of the same hues so the
// dual light/dark neumorphic shadow actually has contrast to read against.
// Fully saturated colors sit too far from the page background (NEU_BASE)
// for the shadow's light side to register, which made cards look like a
// flat single drop-shadow instead of a soft-UI surface.
export const NEU_NOTE_COLORS = [
  '#FBDDA6', // pastel peach   (was #F5A623 orange)
  '#B8E4FB', // pastel sky blue (was #5AC8FA)
  '#FBC4CE', // pastel coral pink (was #FF6B81)
  '#B4EAD7', // pastel mint    (was #34D399)
  '#D6CCF9', // pastel violet  (was #A78BFA)
];

export const NEU_RADIUS = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
};

export const NEU_SHADOW = {
  distance: 5,    // react-native-shadow-2 "distance" prop for raised elevation
  offsetMul: 0.9, // multiplier applied to distance for each shadow's offset
};

export interface NeuPalette {
  base: string;
  insetBase: string;
  lightShadow: string;
  darkShadow: string;
  textPrimary: string;
  textSecondary: string;
}

export const getNeuPalette = (isDark: boolean): NeuPalette => ({
  base: isDark ? NEU_BASE_DARK : NEU_BASE,
  insetBase: isDark ? NEU_INSET_BASE_DARK : NEU_INSET_BASE,
  lightShadow: isDark ? NEU_LIGHT_SHADOW_DARK_MODE : NEU_LIGHT_SHADOW,
  darkShadow: isDark ? NEU_DARK_SHADOW_DARK_MODE : NEU_DARK_SHADOW,
  textPrimary: isDark ? NEU_TEXT_PRIMARY_DARK : NEU_TEXT_PRIMARY,
  textSecondary: isDark ? NEU_TEXT_SECONDARY_DARK : NEU_TEXT_SECONDARY,
});