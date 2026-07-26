// utils/tabDefaults.ts
//
// Resolves which tab should actually be treated as "the default tab" — used
// both to seed activeTabId on app launch (MainScreen.tsx) and to decide
// which chip SettingsModal's own "Default tab" picker highlights as
// selected. Kept as one shared function so the two call sites can never
// drift out of sync on what counts as a valid fallback.
//
// Fallback chain, in order:
//   1. The raw stored id (settings.defaultTabId), if it points at a tab
//      that still exists — and, specifically for 'all', only if the All
//      pill isn't currently hidden (settings.showAllTab).
//   2. 'general', if General still exists.
//   3. The first user-created (non-built-in) tab still around, in the
//      order it appears in the tabs array — Tab has no createdAt of its
//      own, so array order (the same order the pill rail and this same
//      picker already display tabs in) is the closest available proxy for
//      "the very first one created".
//   4. 'general' as a last-resort literal — Trash/Archived/All are never
//      returned as a fallback, even if every other tab is somehow gone,
//      since none of them are valid places to create a new note.

import { Tab } from '../types';

const isBuiltInTabId = (id: string) => id === 'all' || id === 'general' || id === 'archived' || id === 'trash';

export const resolveDefaultTabId = (
  rawDefaultTabId: string | undefined,
  tabs: Tab[],
  showAllTab: boolean
): string => {
  const exists = (id: string) => tabs.some(t => t.id === id);
  const firstCustomTabId = tabs.find(t => !isBuiltInTabId(t.id))?.id;

  let candidate = rawDefaultTabId || 'all';

  // All hidden -> fall back to General.
  if (candidate === 'all' && !showAllTab) candidate = 'general';

  // General itself deleted -> fall back to the first still-existing
  // user-created tab.
  if (candidate === 'general' && !exists('general')) {
    candidate = firstCustomTabId || 'general';
  }

  // Final safety net — any other unresolved/deleted id (e.g. a custom tab
  // that's since been removed) falls back through the same General ->
  // first-custom-tab chain one more time.
  if (!exists(candidate)) {
    candidate = exists('general') ? 'general' : (firstCustomTabId || 'general');
  }

  return candidate;
};