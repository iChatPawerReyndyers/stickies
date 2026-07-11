import { Platform } from 'react-native';
import { NEU_NOTE_COLORS, NEU_ACCENT } from './theme/neumorphic';

// Bright, saturated note colors — designed to sit inside a NeuView so the
// soft dual-shadow still reads even though the fill itself is colorful.
export const COLORS = NEU_NOTE_COLORS;
export const TEXT_COLORS = ['#3A3F4B', '#000000', '#FFFFFF', '#4A4A4A', '#D32F2F', '#1976D2', '#2E7D32', '#7B1FA2'];
export const FONTS = Platform.OS === 'ios'
  ? [
      { name: 'System', value: 'System' },
      { name: 'Arial', value: 'Arial' },
      { name: 'Georgia', value: 'Georgia' },
      { name: 'Times New Roman', value: 'Times New Roman' },
      { name: 'Courier', value: 'Courier' },
      { name: 'Menlo', value: 'Menlo' },
      { name: 'Palatino', value: 'Palatino' },
      { name: 'Helvetica', value: 'Helvetica' },
    ]
  : [
      { name: 'Sans Serif', value: 'sans-serif' },
      { name: 'Serif', value: 'serif' },
      { name: 'Monospace', value: 'monospace' },
      { name: 'Roboto', value: 'Roboto' },
    ];

// Cycled through automatically whenever a new (non-built-in) tab is created,
// so every pill in the vertical tab rail gets a distinct color.
export const TAB_COLOR_PALETTE = [
  ...NEU_NOTE_COLORS,
  '#4677C9',
  '#C2185B',
];

// Fixed colors for the built-in tabs that always exist.
export const ALL_TAB_COLOR = '#8A90A0';
export const GENERAL_TAB_COLOR = NEU_ACCENT;
export const ARCHIVED_TAB_COLOR = '#6E8FAD';
export const TRASH_TAB_COLOR = '#B8BEC9';