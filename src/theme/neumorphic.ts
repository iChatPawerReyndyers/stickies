// theme/neumorphic.ts
// Central design tokens for the app's neumorphic (soft-UI) theme, calibrated
// to the approved reference mockup. Every raised/inset surface pulls its
// colors and radii from here — change a value here and it propagates
// everywhere.

export const NEU_BASE = '#E6EBF2';        // shared base surface color (bg, cards, buttons)
export const NEU_BASE_DARK = '#2B2E36';   // dark-mode base surface color

export const NEU_LIGHT_SHADOW = '#FFFFFF';
export const NEU_DARK_SHADOW = '#A6B0C3';

export const NEU_LIGHT_SHADOW_DARK_MODE = '#3A3E48';
export const NEU_DARK_SHADOW_DARK_MODE = '#15171B';

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

// Bright note-color palette. The "neumorphic-ness" comes from the dual-shadow
// pair around each card, not from the base hue, so these can stay saturated
// and still read as soft-UI once wrapped in NeuView.
export const NEU_NOTE_COLORS = [
  '#F5A623', // orange (primary accent)
  '#5AC8FA', // sky blue
  '#FF6B81', // coral pink
  '#34D399', // mint green
  '#A78BFA', // soft violet
  '#FFD166', // warm yellow
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