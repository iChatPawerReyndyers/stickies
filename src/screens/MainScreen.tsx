import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NoteCard from '../cards/NoteCard';
import NoteModal from '../modals/NoteModal';
import TabModal from '../modals/TabModal';
import SettingsModal from '../modals/SettingsModal';
import ReadOnlyModal from '../modals/ReadOnlyModal';
import styles, { getCardSize } from '../styles';
import { Note, ChecklistItem, ContentType, TextStyle, DisplayNote, Tab, NoteMargins, DEFAULT_MARGINS, ItemSpacing, DEFAULT_ITEM_SPACING, DEFAULT_LINE_SPACING, ChecklistSort, ChecklistTextMode, AppSettings, SortOrder } from '../types';
import {
  COLORS,
  TEXT_COLORS,
  FONTS,
  TAB_COLOR_PALETTE,
  ALL_TAB_COLOR,
  GENERAL_TAB_COLOR,
  TRASH_TAB_COLOR,
} from '../constants';
import { getRandomFrameId } from '../frames';
import { NeuView, NeuPressable } from '../components/Neumorphic';
import { NEU_ACCENT } from '../theme/neumorphic';

const NOTES_KEY = '@sticky_notes_notes_v1';
const TABS_KEY = '@sticky_notes_tabs_v1';
const ACTIVE_TAB_KEY = '@sticky_notes_active_tab_v1';
const SETTINGS_KEY = '@sticky_notes_settings_v1';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  defaultColor: COLORS[0],
  defaultTextColor: TEXT_COLORS[0],
  defaultFont: FONTS[0].value,
  defaultFontSize: 16,
  gridColumns: 2,
  sortOrder: 'manual',
  showDiscardConfirmation: true,
  stickieStyles: [],
  defaultStyleId: undefined,
  defaultTabId: 'all',
};

const isBuiltInTabId = (id: string) => id === 'all' || id === 'general' || id === 'trash';

// Cycles through the palette based on how many custom tabs already exist,
// so each new tab pill gets a different color.
const getNextTabColor = (currentTabs: Tab[]) => {
  const customCount = currentTabs.filter(t => !isBuiltInTabId(t.id)).length;
  return TAB_COLOR_PALETTE[customCount % TAB_COLOR_PALETTE.length];
};

const MainScreen = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newNoteContentType, setNewNoteContentType] = useState<ContentType>('text');
  const [newNoteContent, setNewNoteContent] = useState<string | ChecklistItem[]>('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedTextColor, setSelectedTextColor] = useState(TEXT_COLORS[0]);
  const [selectedFont, setSelectedFont] = useState(FONTS[0].value);
  const [selectedFontSize, setSelectedFontSize] = useState(16);
  const [selectedTextStyle, setSelectedTextStyle] = useState<TextStyle>('normal');
  const [useSvgBackground, setUseSvgBackground] = useState(false);
  const [svgFrameId, setSvgFrameId] = useState<string | undefined>(undefined);
  const [selectedMargins, setSelectedMargins] = useState<NoteMargins>(DEFAULT_MARGINS);
  const [selectedItemSpacing, setSelectedItemSpacing] = useState<ItemSpacing>(DEFAULT_ITEM_SPACING);
  const [selectedLineSpacing, setSelectedLineSpacing] = useState<number>(DEFAULT_LINE_SPACING);
  const [selectedChecklistSort, setSelectedChecklistSort] = useState<ChecklistSort>('as-is');
  const [selectedChecklistTextMode, setSelectedChecklistTextMode] = useState<ChecklistTextMode>('single');
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'all', name: 'All', color: ALL_TAB_COLOR },
    { id: 'general', name: 'General', color: GENERAL_TAB_COLOR },
    { id: 'trash', name: 'Trash', color: TRASH_TAB_COLOR },
  ]);
  const [activeTabId, setActiveTabId] = useState('all');
  const [showTabModal, setShowTabModal] = useState(false);
  const [editingTab, setEditingTab] = useState<Tab | null>(null);
  const [readOnlyNote, setReadOnlyNote] = useState<Note | null>(null);
  const [showReadOnlyModal, setShowReadOnlyModal] = useState(false);
  // View Only — opened via long-press on any note card. Reuses NoteModal in
  // its `viewOnly` mode so the note's real color/font/SVG frame render
  // exactly as saved, with no editing affordances.
  const [viewOnlyNote, setViewOnlyNote] = useState<Note | null>(null);
  const [showViewOnlyModal, setShowViewOnlyModal] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  const updateSettings = (patch: Partial<AppSettings>) =>
    setSettings(prev => ({ ...prev, ...patch }));

  // Single source of truth for grid column count — drives FlatList's
  // numColumns, per-item right-margin, and placeholder padding below, so the
  // whole grid always agrees on how many columns actually exist.
  const numColumns = settings.gridColumns;

  const nonTrashTabs = tabs.filter(t => t.id !== 'trash');
  const trashTab = tabs.find(t => t.id === 'trash');

  useEffect(() => {
    const load = async () => {
      try {
        const [notesJson, tabsJson, activeTab, settingsJson] = await Promise.all([
          AsyncStorage.getItem(NOTES_KEY),
          AsyncStorage.getItem(TABS_KEY),
          AsyncStorage.getItem(ACTIVE_TAB_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
        ]);

        if (notesJson) {
          const parsed = JSON.parse(notesJson);
          if (Array.isArray(parsed)) {
            setNotes(parsed.map((note: any) => ({
              ...note,
              textColor: note.textColor || '#333333',
              contentType: note.contentType === 'bullets' ? 'text' : note.contentType,
            })));
          }
        }

        if (tabsJson) {
          const parsedTabs = JSON.parse(tabsJson);
          if (Array.isArray(parsedTabs)) {
            const hasAll = parsedTabs.some((t: any) => t.id === 'all');
            const hasTrash = parsedTabs.some((t: any) => t.id === 'trash');
            const hasGeneral = parsedTabs.some((t: any) => t.id === 'general');
            let finalTabs = parsedTabs;
            if (!hasAll) finalTabs = [{ id: 'all', name: 'All', color: ALL_TAB_COLOR }, ...finalTabs];
            if (!hasGeneral) finalTabs = [...finalTabs, { id: 'general', name: 'General', color: GENERAL_TAB_COLOR }];
            if (!hasTrash) finalTabs = [...finalTabs, { id: 'trash', name: 'Trash', color: TRASH_TAB_COLOR }];

            // Back-fill colors for tabs that were persisted before the colored pill rail existed.
            let customColorIndex = 0;
            finalTabs = finalTabs.map((t: any) => {
              if (t.color) return t;
              if (t.id === 'all') return { ...t, color: ALL_TAB_COLOR };
              if (t.id === 'general') return { ...t, color: GENERAL_TAB_COLOR };
              if (t.id === 'trash') return { ...t, color: TRASH_TAB_COLOR };
              const color = TAB_COLOR_PALETTE[customColorIndex % TAB_COLOR_PALETTE.length];
              customColorIndex += 1;
              return { ...t, color };
            });

            setTabs(finalTabs);
          }
        }

        if (settingsJson) {
          try {
            const parsed = JSON.parse(settingsJson);
            setSettings(prev => ({ ...prev, ...parsed }));
            // Prefer the user's chosen default tab on startup if available
            setActiveTabId(parsed.defaultTabId || activeTab || 'all');
          } catch {
            // keep defaults
            setActiveTabId(activeTab || 'all');
          }
        } else {
          setActiveTabId(activeTab || 'all');
        }
      } catch (e) {
        console.warn('Failed to load persisted notes/tabs', e);
      } finally {
        setIsDataLoaded(true);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!isDataLoaded) return;

    const save = async () => {
      try {
        await Promise.all([
          AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes)),
          AsyncStorage.setItem(TABS_KEY, JSON.stringify(tabs)),
          AsyncStorage.setItem(ACTIVE_TAB_KEY, activeTabId),
          AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)),
        ]);
      } catch (e) {
        console.warn('Failed to persist notes/tabs', e);
      }
    };
    save();
  }, [notes, tabs, activeTabId, settings, isDataLoaded]);

  const createNewNote = () => {
    if (activeTabId === 'trash') {
      Alert.alert('Cannot create in Trash', 'You cannot create a note inside Trash.');
      return;
    }
    setEditingNote(null);
    setNewNoteContentType('text');
    setNewNoteContent('');
    setSelectedColor(settings.defaultColor);
    setSelectedTextColor(settings.defaultTextColor);
    setSelectedFont(settings.defaultFont);
    setSelectedFontSize(settings.defaultFontSize);
    setSelectedTextStyle('normal');
    setUseSvgBackground(false);
    setSvgFrameId(undefined);
    setSelectedMargins(DEFAULT_MARGINS);
    setSelectedItemSpacing(DEFAULT_ITEM_SPACING);
    setSelectedLineSpacing(DEFAULT_LINE_SPACING);
    setSelectedChecklistSort('as-is');
    setSelectedChecklistTextMode('single');
    setShowModal(true);
  };

  const openReadOnly = (note: Note) => {
    setReadOnlyNote(note);
    setShowReadOnlyModal(true);
  };

  const openViewOnlyModal = (note: Note) => {
    setViewOnlyNote(note);
    setShowViewOnlyModal(true);
  };

  const closeViewOnlyModal = () => {
    setShowViewOnlyModal(false);
    setViewOnlyNote(null);
  };

  const createNewTab = () => {
    setEditingTab(null);
    setShowTabModal(true);
  };

  const extractTitleFromContent = (contentType: ContentType, content: string | ChecklistItem[]): string => {
    if (contentType === 'text') {
      const text = content as string;
      const words = text.trim().split(/\s+/);
      return words.slice(0, 5).join(' ') || 'Untitled Note';
    }
    const items = content as ChecklistItem[];
    const firstItem = items.find(item => item.text.trim());
    return firstItem?.text.trim() || 'Untitled Note';
  };

  const editNote = (note: Note) => {
    setEditingNote(note);
    setNewNoteContentType(note.contentType);
    setNewNoteContent(note.content);
    setSelectedColor(note.color);
    setSelectedTextColor(note.textColor || TEXT_COLORS[0]);
    setSelectedFont(note.fontFamily);
    setSelectedFontSize(note.fontSize || 16);
    setSelectedTextStyle(note.textStyle);
    setUseSvgBackground(note.useSvgBackground || false);
    setSvgFrameId(note.svgFrameId);
    setSelectedMargins(note.margins || DEFAULT_MARGINS);
    setSelectedItemSpacing(note.itemSpacing || DEFAULT_ITEM_SPACING);
    setSelectedLineSpacing(note.lineSpacing ?? DEFAULT_LINE_SPACING);
    setSelectedChecklistSort(note.checklistSort || 'as-is');
    setSelectedChecklistTextMode(note.checklistTextMode || 'single');
    setShowModal(true);
  };

  const saveTab = (id: string | undefined, name: string, color: string | undefined, afterTabId?: string, textColor?: string) => {
    if (!name.trim()) return;

    const insertAfter = (list: Tab[], item: Tab, afterId?: string) => {
      const filtered = list.filter(t => t.id !== item.id);
      if (afterId) {
        const index = filtered.findIndex(t => t.id === afterId);
        if (index >= 0) {
          filtered.splice(index + 1, 0, item);
          return filtered;
        }
      }
      const generalIndex = filtered.findIndex(t => t.id === 'general');
      const insertAt = generalIndex >= 0 ? generalIndex + 1 : filtered.length;
      filtered.splice(insertAt, 0, item);
      return filtered;
    };

    if (id) {
      setTabs(prevTabs => {
        const updatedTab = prevTabs.map(t => (t.id === id ? { ...t, name, color: color || t.color, textColor: textColor || t.textColor } : t));
        if (afterTabId && afterTabId !== id) {
          const tab = updatedTab.find(t => t.id === id);
          if (!tab) return updatedTab;
          return insertAfter(updatedTab, tab, afterTabId);
        }
        return updatedTab;
      });
    } else {
      const newTab: Tab = { id: Date.now().toString(), name, color: color || getNextTabColor(tabs), textColor: textColor || '#FFFFFF' };
      setTabs(prevTabs => insertAfter(prevTabs, newTab, afterTabId));
      setActiveTabId(newTab.id);
    }
    setShowTabModal(false);
  };

  const deleteTab = (id: string) => {
    if (id === 'all' || id === 'trash') return;
    setTabs(tabs.filter(t => t.id !== id));
    setNotes(notes.map(n => (n.tabId === id ? { ...n, tabId: 'trash' } : n)));
    setActiveTabId('trash');
    setShowTabModal(false);
  };

  const saveNote = () => {
    if (typeof newNoteContent === 'string' && !newNoteContent.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }
    if (Array.isArray(newNoteContent) && !newNoteContent.some(item => item.text.trim())) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    const generatedTitle = extractTitleFromContent(newNoteContentType, newNoteContent);

    if (editingNote) {
      setNotes(notes.map(note =>
        note.id === editingNote.id
          ? {
              ...note,
              title: generatedTitle,
              contentType: newNoteContentType,
              content: newNoteContent,
              color: selectedColor,
              textColor: selectedTextColor,
              fontFamily: selectedFont,
              fontSize: selectedFontSize,
              textStyle: selectedTextStyle,
              tabId: editingNote.tabId || 'all',
              useSvgBackground,
              svgFrameId: useSvgBackground ? svgFrameId : undefined,
              margins: selectedMargins,
              itemSpacing: selectedItemSpacing,
              lineSpacing: selectedLineSpacing,
              checklistSort: selectedChecklistSort,
              checklistTextMode: selectedChecklistTextMode,
            }
          : note
      ));
    } else {
      const newNote: Note = {
        id: Date.now().toString(),
        title: generatedTitle,
        contentType: newNoteContentType,
        content: newNoteContent,
        createdAt: Date.now(),
        color: selectedColor,
        textColor: selectedTextColor,
        fontFamily: selectedFont,
        fontSize: selectedFontSize,
        textStyle: selectedTextStyle,
        tabId: activeTabId || 'all',
        useSvgBackground,
        svgFrameId: useSvgBackground ? svgFrameId : undefined,
        margins: selectedMargins,
        itemSpacing: selectedItemSpacing,
        lineSpacing: selectedLineSpacing,
        checklistSort: selectedChecklistSort,
        checklistTextMode: selectedChecklistTextMode,
      };
      setNotes([newNote, ...notes]);
    }

    setShowModal(false);
  };

  const deleteNote = (id: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: () => setNotes(notes.filter(note => note.id !== id)),
          style: 'destructive',
        },
      ]
    );
  };

  const renderItem = ({ item, index }: { item: DisplayNote; index: number }) => {
    const itemStyle = index % numColumns === numColumns - 1
      ? { marginRight: 0 }
      : { marginRight: 8 };

    if ('placeholder' in item && item.placeholder) {
      return <View style={[styles.card, styles.placeholderCard, itemStyle]} />;
    }

    const note = item as Note;

    return (
      <View style={itemStyle}>
        <NoteCard
          note={note}
          onEdit={() => (note.tabId === 'trash' ? openReadOnly(note) : editNote(note))}
          onDelete={() => deleteNote(note.id)}
          onLongPress={() => openViewOnlyModal(note)}
          cardSize={cardSize}
        />
      </View>
    );
  };

  const rawBaseNotes = activeTabId === 'all' ? notes : notes.filter(n => n.tabId === activeTabId);

  const baseNotes = (() => {
    const s = settings.sortOrder;
    if (s === 'manual') return rawBaseNotes;
    const sorted = [...rawBaseNotes];
    if (s === 'created-desc') sorted.sort((a, b) => b.createdAt - a.createdAt);
    else if (s === 'created-asc') sorted.sort((a, b) => a.createdAt - b.createdAt);
    else if (s === 'title-asc') sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (s === 'title-desc') sorted.sort((a, b) => b.title.localeCompare(a.title));
    return sorted;
  })();

  const cardSize = getCardSize(numColumns);
  const placeholdersNeeded = (numColumns - (baseNotes.length % numColumns)) % numColumns;
  const displayedNotes: DisplayNote[] = [...baseNotes];
  for (let i = 0; i < placeholdersNeeded; i += 1) {
    displayedNotes.push({ id: `placeholder-${i}`, placeholder: true });
  }

  const noteModalTabId = editingNote ? editingNote.tabId : activeTabId;
  const noteModalTabName = tabs.find(t => t.id === noteModalTabId)?.name || 'General';
  const viewOnlyTabName = tabs.find(t => t.id === viewOnlyNote?.tabId)?.name || 'General';

  return (
    <SafeAreaView style={[styles.container, settings.theme === 'dark' && { backgroundColor: '#1C1C1E' }]}>
      <View style={[styles.header, styles.headerSpacing]}>
        <Text style={styles.headerTitle}>Stickies</Text>
        <NeuPressable
          radius={20}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setShowSettings(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 18, color: NEU_ACCENT }}>⚙️</Text>
        </NeuPressable>
      </View>

      <View style={styles.mainContentRow}>
        <ScrollView
          style={styles.pillRail}
          contentContainerStyle={styles.pillRailContent}
          showsVerticalScrollIndicator={false}
        >
          {nonTrashTabs.map(tab => {
            const isActive = activeTabId === tab.id;
            return (
              <View key={tab.id} style={styles.tabPillGroup}>
                <NeuView
                  radius={16}
                  backgroundColor={tab.color}
                  inset={isActive}
                  style={{ width: 32, height: 80, marginBottom: 4 }}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setActiveTabId(tab.id)}
                    onLongPress={() => { setEditingTab(tab); setShowTabModal(true); }}
                  >
                    <View style={styles.tabPillLabelWrapper}>
                      <Text
                        style={[styles.tabPillLabelText, { color: tab.textColor || '#FFFFFF' }, isActive && styles.tabPillLabelTextActive]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.5}
                      >
                        {tab.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </NeuView>
                <View style={styles.tabPillConnector} />
              </View>
            );
          })}

          <NeuPressable
            radius={16}
            style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}
            onPress={createNewTab}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: NEU_ACCENT, lineHeight: 20 }}>+</Text>
          </NeuPressable>

          {trashTab && (
            <View style={styles.tabPillDivider}>
              <NeuView
                radius={16}
                backgroundColor={trashTab.color}
                inset={activeTabId === trashTab.id}
                style={{ width: 32, height: 80 }}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => setActiveTabId(trashTab.id)}
                  onLongPress={() => { setEditingTab(trashTab); setShowTabModal(true); }}
                >
                  <View style={styles.tabPillLabelWrapper}>
                    <Text
                      style={[styles.tabPillLabelText, { color: trashTab.textColor || '#FFFFFF' }, activeTabId === trashTab.id && styles.tabPillLabelTextActive]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.5}
                    >
                      {trashTab.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              </NeuView>
            </View>
          )}
        </ScrollView>

        <View style={styles.mainContentArea}>
          <FlatList
            key={`grid-${numColumns}`}
            data={displayedNotes}
            keyExtractor={item => item.id}
            numColumns={numColumns}
            columnWrapperStyle={styles.noteGrid}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No notes yet. Create one to get started!</Text>
              </View>
            }
          />
        </View>
      </View>

      <TabModal
        visible={showTabModal}
        editing={editingTab}
        tabs={tabs}
        onSave={saveTab}
        onDelete={(id) => { if (id) deleteTab(id); }}
        onCancel={() => setShowTabModal(false)}
      />

      <ReadOnlyModal
        visible={showReadOnlyModal}
        note={readOnlyNote}
        onClose={() => { setShowReadOnlyModal(false); setReadOnlyNote(null); }}
      />

      <NoteModal
        visible={showModal}
        tabName={noteModalTabName}
        contentType={newNoteContentType}
        onContentTypeChange={setNewNoteContentType}
        content={newNoteContent}
        onContentChange={setNewNoteContent}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
        selectedTextColor={selectedTextColor}
        onTextColorChange={setSelectedTextColor}
        selectedFont={selectedFont}
        onFontChange={setSelectedFont}
        selectedFontSize={selectedFontSize}
        onFontSizeChange={setSelectedFontSize}
        selectedTextStyle={selectedTextStyle}
        onTextStyleChange={setSelectedTextStyle}
        useSvgBackground={useSvgBackground}
        onUseSvgBackgroundChange={(value: boolean) => {
          setUseSvgBackground(value);
          setSvgFrameId(value ? getRandomFrameId() : undefined);
        }}
        svgFrameId={svgFrameId}
        selectedMargins={selectedMargins}
        onMarginsChange={setSelectedMargins}
        selectedItemSpacing={selectedItemSpacing}
        onItemSpacingChange={setSelectedItemSpacing}
        selectedLineSpacing={selectedLineSpacing}
        onLineSpacingChange={setSelectedLineSpacing}
        selectedChecklistSort={selectedChecklistSort}
        onChecklistSortChange={setSelectedChecklistSort}
        selectedChecklistTextMode={selectedChecklistTextMode}
        onChecklistTextModeChange={setSelectedChecklistTextMode}
        showDiscardConfirmation={settings.showDiscardConfirmation}
        onDisableDiscardConfirmation={() => updateSettings({ showDiscardConfirmation: false })}
        onSave={saveNote}
        onCancel={() => setShowModal(false)}
      />

      {/* View Only — long-press any note card. Renders the note exactly as
          saved (color/font/SVG frame) with no editing controls; closes only
          via the ✕ in the top-right corner. */}
      <NoteModal
        visible={showViewOnlyModal}
        tabName={viewOnlyTabName}
        contentType={viewOnlyNote?.contentType || 'text'}
        onContentTypeChange={() => {}}
        content={viewOnlyNote?.content ?? ''}
        onContentChange={() => {}}
        selectedColor={viewOnlyNote?.color || COLORS[0]}
        onColorChange={() => {}}
        selectedTextColor={viewOnlyNote?.textColor || TEXT_COLORS[0]}
        onTextColorChange={() => {}}
        selectedFont={viewOnlyNote?.fontFamily || FONTS[0].value}
        onFontChange={() => {}}
        selectedFontSize={viewOnlyNote?.fontSize || 16}
        onFontSizeChange={() => {}}
        selectedTextStyle={viewOnlyNote?.textStyle || 'normal'}
        onTextStyleChange={() => {}}
        useSvgBackground={viewOnlyNote?.useSvgBackground || false}
        onUseSvgBackgroundChange={() => {}}
        svgFrameId={viewOnlyNote?.svgFrameId}
        selectedMargins={viewOnlyNote?.margins || DEFAULT_MARGINS}
        onMarginsChange={() => {}}
        selectedItemSpacing={viewOnlyNote?.itemSpacing || DEFAULT_ITEM_SPACING}
        onItemSpacingChange={() => {}}
        selectedLineSpacing={viewOnlyNote?.lineSpacing ?? DEFAULT_LINE_SPACING}
        onLineSpacingChange={() => {}}
        selectedChecklistSort={viewOnlyNote?.checklistSort || 'as-is'}
        onChecklistSortChange={() => {}}
        selectedChecklistTextMode={viewOnlyNote?.checklistTextMode || 'single'}
        onChecklistTextModeChange={() => {}}
        onSave={() => {}}
        onCancel={closeViewOnlyModal}
        showDiscardConfirmation={false}
        onDisableDiscardConfirmation={() => {}}
        viewOnly
      />

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        notes={notes}
        tabs={tabs}
        onImportNotes={(importedNotes, importedTabs) => {
          setNotes(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newOnes = importedNotes.filter(n => !existingIds.has(n.id));
            return [...prev, ...newOnes];
          });
        }}
      />

      <NeuPressable
        radius={28}
        style={{ position: 'absolute', bottom: 32, right: 32, width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}
        onPress={createNewNote}
      >
        <Text style={styles.fabText}>+</Text>
      </NeuPressable>
    </SafeAreaView>
  );
};

export default MainScreen;