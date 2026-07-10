import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  PanResponder,
  Animated,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NoteCard from '../cards/NoteCard';
import NoteModal from '../modals/NoteModal';
import TabModal from '../modals/TabModal';
import SettingsModal from '../modals/SettingsModal';
import ReadOnlyModal from '../modals/ReadOnlyModal';
import styles, { NOTE_COLUMNS, CARD_SIZE, getCardSize } from '../styles';
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
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  const updateSettings = (patch: Partial<AppSettings>) =>
    setSettings(prev => ({ ...prev, ...patch }));

  // ── Drag-and-drop state (pure PanResponder, no native deps) ─────────────────
  const [isDragging, setIsDragging] = useState(false);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  // Refs so PanResponder callbacks (created once) always see latest values
  const dragSrcRef = useRef<number | null>(null);
  const gridRef = useRef<View>(null);
  const gridPos = useRef({ x: 0, y: 0 });
  const visibleNotesRef = useRef<Note[]>([]);
  const activeTabIdRef = useRef(activeTabId);
  useEffect(() => { activeTabIdRef.current = activeTabId; }, [activeTabId]);

  const measureGrid = () => {
    gridRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      gridPos.current = { x: pageX, y: pageY };
    });
  };

  const getDropIndex = (pageX: number, pageY: number): number => {
    const relX = pageX - gridPos.current.x - 8;
    const relY = pageY - gridPos.current.y - 8;
    const numCols = settings.gridColumns;
    const cs = getCardSize(numCols);
    const cell = cs + 8;
    const col = Math.max(0, Math.min(numCols - 1, Math.floor(relX / cell)));
    const row = Math.max(0, Math.floor(relY / cell));
    return Math.min(
      Math.max(0, visibleNotesRef.current.length - 1),
      row * numCols + col,
    );
  };
  const getDropIndexRef = useRef(getDropIndex);
  useEffect(() => { getDropIndexRef.current = getDropIndex; });

  const applyReorder = (srcIdx: number, tgtIdx: number) => {
    if (srcIdx === tgtIdx) return;
    const visible = [...visibleNotesRef.current];
    if (srcIdx >= visible.length || tgtIdx >= visible.length) return;
    const [moved] = visible.splice(srcIdx, 1);
    visible.splice(tgtIdx, 0, moved);
    const tab = activeTabIdRef.current;
    if (tab === 'all') {
      setNotes(visible);
    } else {
      setNotes(prev => {
        const result = [...prev];
        const positions: number[] = [];
        result.forEach((n, i) => { if (n.tabId === tab) positions.push(i); });
        positions.forEach((pos, i) => { if (visible[i]) result[pos] = visible[i]; });
        return result;
      });
    }
  };
  const applyReorderRef = useRef(applyReorder);
  useEffect(() => { applyReorderRef.current = applyReorder; });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, { moveX, moveY }) => {
        dragX.setValue(moveX - CARD_SIZE / 2);
        dragY.setValue(moveY - CARD_SIZE / 2);
        setDropTargetIndex(getDropIndexRef.current(moveX, moveY));
      },
      onPanResponderRelease: (_, { moveX, moveY }) => {
        const tgt = getDropIndexRef.current(moveX, moveY);
        if (dragSrcRef.current !== null) applyReorderRef.current(dragSrcRef.current, tgt);
        dragSrcRef.current = null;
        setIsDragging(false);
        setDragSourceIndex(null);
        setDropTargetIndex(null);
      },
      onPanResponderTerminate: () => {
        dragSrcRef.current = null;
        setIsDragging(false);
        setDragSourceIndex(null);
        setDropTargetIndex(null);
      },
    })
  ).current;

  const handleLongPress = (index: number, event: GestureResponderEvent) => {
    if (activeTabIdRef.current === 'trash') return;
    const { pageX, pageY } = event.nativeEvent;
    measureGrid();
    dragSrcRef.current = index;
    dragX.setValue(pageX - CARD_SIZE / 2);
    dragY.setValue(pageY - CARD_SIZE / 2);
    setDragSourceIndex(index);
    setDropTargetIndex(index);
    setIsDragging(true);
  };
  // ─────────────────────────────────────────────────────────────────────────────
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
    const itemStyle = index % NOTE_COLUMNS === NOTE_COLUMNS - 1
      ? { marginRight: 0 }
      : { marginRight: 8 };

    if ('placeholder' in item && item.placeholder) {
      return <View style={[styles.card, styles.placeholderCard, itemStyle]} />;
    }

    const note = item as Note;
    const isSource = isDragging && dragSourceIndex === index;
    const isTarget = isDragging && dropTargetIndex === index && dropTargetIndex !== dragSourceIndex;

    return (
      <View style={[itemStyle, isSource && { opacity: 0.3 }]}>
        {isTarget && (
          <View style={dragStyles.dropHighlight} pointerEvents="none" />
        )}
        <NoteCard
          note={note}
          onEdit={() => isDragging ? null : (note.tabId === 'trash' ? openReadOnly(note) : editNote(note))}
          onDelete={() => deleteNote(note.id)}
          onLongPress={(e) => handleLongPress(index, e)}
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

  const cardSize = getCardSize(settings.gridColumns);
  const placeholdersNeeded = (NOTE_COLUMNS - (baseNotes.length % NOTE_COLUMNS)) % NOTE_COLUMNS;
  const displayedNotes: DisplayNote[] = [...baseNotes];
  for (let i = 0; i < placeholdersNeeded; i += 1) {
    displayedNotes.push({ id: `placeholder-${i}`, placeholder: true });
  }
  // Keep ref current for PanResponder callbacks
  visibleNotesRef.current = baseNotes.filter((n): n is Note => !('placeholder' in n));

  const noteModalTabId = editingNote ? editingNote.tabId : activeTabId;
  const noteModalTabName = tabs.find(t => t.id === noteModalTabId)?.name || 'General';

  return (
    <SafeAreaView style={[styles.container, settings.theme === 'dark' && { backgroundColor: '#1C1C1E' }]}>
      <View style={[styles.header, styles.headerSpacing]}>
        <Text style={styles.headerTitle}>Stickies</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 22, color: '#333' }}>⚙️</Text>
        </TouchableOpacity>
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
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.tabPill,
                    { backgroundColor: tab.color, shadowColor: tab.color },
                    isActive && styles.tabPillActive,
                  ]}
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
                <View style={styles.tabPillConnector} />
              </View>
            );
          })}

          <TouchableOpacity activeOpacity={0.7} onPress={createNewTab} style={styles.tabPillAddButton}>
            <Text style={styles.tabPillAddButtonText}>+</Text>
          </TouchableOpacity>

          {trashTab && (
            <View style={styles.tabPillDivider}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.tabPill,
                  { backgroundColor: trashTab.color, shadowColor: trashTab.color },
                  activeTabId === trashTab.id && styles.tabPillActive,
                ]}
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
            </View>
          )}
        </ScrollView>

        <View
          style={styles.mainContentArea}
          ref={gridRef}
          onLayout={measureGrid}
        >
          <FlatList
            data={displayedNotes}
            keyExtractor={item => item.id}
            numColumns={NOTE_COLUMNS}
            columnWrapperStyle={styles.noteGrid}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            scrollEnabled={!isDragging}
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

      <TouchableOpacity style={styles.fab} onPress={createNewNote} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Drag overlay — full-screen touch capture + floating card */}
      {isDragging && (
        <>
          <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />
          {dragSourceIndex !== null && baseNotes[dragSourceIndex] && (
            <Animated.View
              pointerEvents="none"
              style={[
                dragStyles.floatingCard,
                { left: dragX, top: dragY, width: cardSize, height: cardSize },
                { backgroundColor: (baseNotes[dragSourceIndex] as Note).color },
              ]}
            >
              <Text style={dragStyles.floatingTitle} numberOfLines={2}>
                {(baseNotes[dragSourceIndex] as Note).title}
              </Text>
            </Animated.View>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

export default MainScreen;


const dragStyles = StyleSheet.create({
  floatingCard: {
    position: 'absolute',
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 8,
    padding: 12,
    opacity: 0.92,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
    justifyContent: 'center',
    transform: [{ scale: 1.06 }],
  },
  floatingTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#333',
  },
  dropHighlight: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    zIndex: 1,
  },
});