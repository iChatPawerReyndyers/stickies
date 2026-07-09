import { Platform } from 'react-native';

export const COLORS = ['#FFE5B4', '#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#E5B4FF'];
export const TEXT_COLORS = ['#333333', '#000000', '#FFFFFF', '#4A4A4A', '#D32F2F', '#1976D2', '#2E7D32', '#7B1FA2'];
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
  '#B65B5E',
  '#9B59C9',
  '#E2A716',
  '#3FA796',
  '#4677C9',
  '#C2185B',
  '#7E57C2',
  '#558B2F',
  '#EF6C00',
];

// Fixed colors for the built-in tabs that always exist.
export const ALL_TAB_COLOR = '#5B5B5B';
export const GENERAL_TAB_COLOR = '#4677C9';
export const TRASH_TAB_COLOR = '#8B3A3A';