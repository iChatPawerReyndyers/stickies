// utils/stickieStyleStorage.ts
//
// Simple AsyncStorage-backed CRUD for saved StickieStyles. If your project
// already has a different persistence layer (e.g. a notes repository class,
// MMKV, SQLite), swap the body of these functions for calls into that
// instead — the StickieStyleSection component only depends on this file's
// exported function signatures, not on AsyncStorage itself.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StickieStyle } from '../types/stickieStyle';

const STORAGE_KEY = 'stickie:styles';

export async function loadStickieStyles(): Promise<StickieStyle[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StickieStyle[]) : [];
  } catch {
    return [];
  }
}

async function persist(styles: StickieStyle[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(styles));
}

// Adds a new style or overwrites an existing one (matched by id).
// Returns the full updated list so callers can refresh their state in one step.
export async function upsertStickieStyle(style: StickieStyle): Promise<StickieStyle[]> {
  const all = await loadStickieStyles();
  const idx = all.findIndex(s => s.id === style.id);
  if (idx >= 0) {
    all[idx] = style;
  } else {
    all.push(style);
  }
  await persist(all);
  return all;
}

export async function deleteStickieStyle(id: string): Promise<StickieStyle[]> {
  const all = await loadStickieStyles();
  const next = all.filter(s => s.id !== id);
  await persist(next);
  return next;
}