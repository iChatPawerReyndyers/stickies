import { Platform } from 'react-native';
import { NEU_NOTE_COLORS, NEU_ACCENT } from './theme/neumorphic';

// Bright, saturated note colors — designed to sit inside a NeuView so the
// soft dual-shadow still reads even though the fill itself is colorful.
export const COLORS = NEU_NOTE_COLORS;
export const TEXT_COLORS = ['#3A3F4B', '#000000', '#FFFFFF', '#4A4A4A', '#D32F2F', '#1976D2', '#2E7D32', '#7B1FA2', '#F5A623', '#00796B'];
export const FONTS = Platform.OS === 'ios'
  ? [
      { name: 'System', value: 'System' },
      { name: 'Cursive', value: 'Snell Roundhand' },
      { name: 'Palatino', value: 'Palatino' },
      { name: 'Courier', value: 'Courier' },
      { name: 'Times New Roman', value: 'Times New Roman' },
    ]
  : [
      // Android has no bundled Palatino/Times New Roman, and generic
      // families used to be the fallback here — but 'serif' was used for
      // BOTH Palatino and Times New Roman, so picking either one produced
      // the exact same look. 'cursive' is also unreliable: several OEM
      // skins (Samsung/Xiaomi/etc.) don't map it to an actual script font
      // and silently fall back to the default. These four now point at
      // real .ttf files bundled under /assets/fonts and linked via
      // `npx react-native-asset` (see react-native.config.js at the
      // project root), so every device renders them identically.
      // The value must exactly match each font file's name minus its
      // .ttf extension.
      { name: 'System', value: 'sans-serif' },
      { name: 'Cursive', value: 'DancingScript-Regular' },
      { name: 'Palatino', value: 'Cardo-Regular' },
      { name: 'Courier', value: 'Cousine-Regular' },
      { name: 'Times New Roman', value: 'Tinos-Regular' },
    ];

// Cycled through automatically whenever a new (non-built-in) tab is created,
// so every pill in the vertical tab rail gets a distinct color.
export const TAB_COLOR_PALETTE = [
  ...NEU_NOTE_COLORS,
  '#A2BBE4', // pastel blue (was #4677C9)
  '#E08BAD', // pastel magenta (was #C2185B)
];

// One-time remap from the old saturated note-color set to their new pastel
// equivalents, applied when notes are loaded from storage so existing notes
// pick up the new palette instead of staying stuck on their original color.
export const LEGACY_COLOR_MIGRATION: Record<string, string> = {
  '#F5A623': '#FBDDA6',
  '#5AC8FA': '#B8E4FB',
  '#FF6B81': '#FBC4CE',
  '#34D399': '#B4EAD7',
  '#A78BFA': '#D6CCF9',
  '#FFD166': '#FDE7B3',
};

// Fixed colors for the built-in tabs that always exist.
export const ALL_TAB_COLOR = '#8A90A0';
export const GENERAL_TAB_COLOR = NEU_ACCENT;
export const ARCHIVED_TAB_COLOR = '#6E8FAD';
export const TRASH_TAB_COLOR = '#B8BEC9';