// utils/fontResolver.ts
//
// Custom (bundled) TTF fonts on Android can't fake bold/italic the way a
// built-in system font can — passing fontWeight:'bold' or
// fontStyle:'italic' alongside a custom fontFamily is silently ignored by
// Android, and the Regular file just renders unstyled. That's why "Bold"/
// "Italic" text style previously had no visible effect on Android.
//
// iOS's system fonts (Palatino, Courier, Times New Roman, plus the actual
// 'System' font) DO support synthetic bold/italic correctly and are left
// completely unchanged here.
//
// This resolves the *real* font file to load for a given (font, textStyle)
// combination on Android, using the dedicated Bold/Italic .ttf variants
// already bundled in assets/fonts (see FONTS in constants.ts).

import { Platform } from 'react-native';
import { TextStyle } from '../types';
import { FONTS } from '../constants';

export type ResolvedFontStyle = {
  fontFamily: string;
  fontWeight?: 'bold';
  fontStyle?: 'italic';
  textDecorationLine?: 'underline';
};

// Looks up a FONTS entry by its base (Regular) `value` — the fontFamily
// string stored on a Note/StickieStyle always matches one of these.
const findFontEntry = (fontValue: string) => (FONTS as any[]).find(f => f.value === fontValue);

// fontFamily + textStyle are combined in ~6 places across the app (the
// note editor, card previews, read-only view, style previews...) — this is
// the single place that decides how, so every one of them stays consistent
// and only needs to change here if a new font variant is added later.
export const resolveFontStyle = (fontValue: string, textStyle: TextStyle): ResolvedFontStyle => {
  if (Platform.OS === 'ios') {
    return {
      fontFamily: fontValue,
      fontWeight: textStyle === 'bold' ? 'bold' : undefined,
      fontStyle: textStyle === 'italic' ? 'italic' : undefined,
      textDecorationLine: textStyle === 'underline' ? 'underline' : undefined,
    };
  }

  // Android: swap in the real bold/italic file when one is bundled for
  // this font. Falls back to the Regular file with no synthetic
  // fontWeight/fontStyle when no dedicated variant exists (Android would
  // just ignore those anyway) — e.g. Cursive has no italic .ttf today.
  const entry = findFontEntry(fontValue);
  let resolvedFamily = fontValue;
  if (entry) {
    if (textStyle === 'bold' && entry.bold) resolvedFamily = entry.bold;
    else if (textStyle === 'italic' && entry.italic) resolvedFamily = entry.italic;
  }

  return {
    fontFamily: resolvedFamily,
    textDecorationLine: textStyle === 'underline' ? 'underline' : undefined,
  };
};