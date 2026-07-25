// components/AllTabFilterSection.tsx
//
// Expandable settings section controlling which tabs' notes actually show
// up under the "All" aggregate pill:
//   - collapsed: just a header row you tap to expand (same interaction as
//     StickieStyleSection.tsx)
//   - expanded: one checkbox row per tab, including General
//
// expanded/onToggleExpanded are controlled by the parent (SettingsModal)
// rather than owned as local state here — SettingsModal.tsx holds the
// actual useState so a check/uncheck (which round-trips through
// onUpdateSettings and re-renders this section with new props) can never
// reset it back to collapsed, regardless of how far up the tree that
// update causes a re-render.
//
// "All" itself, Archived, and Trash are still excluded — filtering those
// out of All wouldn't mean anything — but General is now a regular row
// like any custom tab, since its notes should be optionally filterable
// too, not permanently pinned in.
//
// settings.allTabIncludedIds is undefined by default, meaning every tab is
// included (so an existing user sees no change until they actually
// uncheck something) — once anything is toggled, it becomes an explicit
// array of the tab ids still checked. See types.ts for the full field
// comment.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tab } from '../types';
import { getNeuPalette, NEU_ACCENT } from '../theme/neumorphic';

type AllTabFilterSectionProps = {
  isDark?: boolean;
  // Full tab list (same array MainScreen already owns) — filtered down to
  // just the filterable ones below.
  tabs: Tab[];
  // undefined means "every filterable tab included" — see file header comment.
  includedTabIds?: string[];
  // Called with the full replacement list of included tab ids any time a
  // row is toggled. SettingsModal wires this straight to
  // onUpdateSettings({ allTabIncludedIds: ... }).
  onIncludedTabIdsChange: (ids: string[]) => void;
  // Controlled expand/collapse state — see file header comment.
  expanded: boolean;
  onToggleExpanded: () => void;
};

// "All" (not a real tab notes belong to), Archived, and Trash are excluded
// — General is deliberately NOT in this set anymore, so it shows as a
// normal filterable row below.
const EXCLUDED_TAB_IDS = new Set(['all', 'archived', 'trash']);

const AllTabFilterSection: React.FC<AllTabFilterSectionProps> = ({
  isDark = false,
  tabs,
  includedTabIds,
  onIncludedTabIdsChange,
  expanded,
  onToggleExpanded,
}) => {
  const p = getNeuPalette(isDark);

  const filterableTabs = tabs.filter(t => !EXCLUDED_TAB_IDS.has(t.id));

  // Effective included set — every filterable tab id when includedTabIds is
  // unset, so a fresh install (or one from before this setting existed)
  // renders every row checked instead of none.
  const effectiveIncluded = includedTabIds ?? filterableTabs.map(t => t.id);

  const toggleTab = (id: string) => {
    const isIncluded = effectiveIncluded.includes(id);
    const next = isIncluded
      ? effectiveIncluded.filter(x => x !== id)
      : [...effectiveIncluded, id];
    onIncludedTabIdsChange(next);
  };

  return (
    <View style={styles_.wrap}>
      <TouchableOpacity style={styles_.header} onPress={onToggleExpanded} activeOpacity={0.7}>
        <Text style={[styles_.headerText, { color: p.textPrimary }]}>Tabs shown in "All"</Text>
        <Text style={[styles_.chevron, { color: p.textSecondary }]}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles_.body}>
          {filterableTabs.length === 0 ? (
            <Text style={{ color: p.textSecondary, fontSize: 12, paddingVertical: 8 }}>
              No tabs to filter yet.
            </Text>
          ) : (
            filterableTabs.map(tab => {
              const checked = effectiveIncluded.includes(tab.id);
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={styles_.row}
                  onPress={() => toggleTab(tab.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles_.checkbox,
                      { borderColor: checked ? NEU_ACCENT : p.darkShadow },
                      checked && { backgroundColor: NEU_ACCENT },
                    ]}
                  >
                    {checked && <Text style={styles_.checkMark}>✓</Text>}
                  </View>
                  <View style={[styles_.swatch, { backgroundColor: tab.color }]} />
                  <Text style={[styles_.rowText, { color: p.textPrimary }]} numberOfLines={1}>
                    {tab.name}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}
    </View>
  );
};

export default AllTabFilterSection;

const styles_ = StyleSheet.create({
  wrap: { marginBottom: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  headerText: { fontSize: 15, fontWeight: '700' },
  chevron: { fontSize: 12 },
  body: { paddingTop: 4, paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  swatch: { width: 16, height: 16, borderRadius: 4 },
  rowText: { fontSize: 14, flex: 1 },
});