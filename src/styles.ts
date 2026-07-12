import { Dimensions, StyleSheet } from 'react-native';
import { NEU_BASE, NEU_LIGHT_SHADOW, NEU_DARK_SHADOW, NEU_TEXT_PRIMARY, NEU_TEXT_SECONDARY, NEU_ACCENT, NEU_RADIUS } from './theme/neumorphic';

const RAIL_WIDTH = 64;
export const NOTE_COLUMNS = 2;
const GRID_GAP = 12;
export const CARD_SIZE = (Dimensions.get('window').width - RAIL_WIDTH - 32 - GRID_GAP * (NOTE_COLUMNS - 1)) / NOTE_COLUMNS;

// Dynamic card size for configurable grid columns
export const getCardSize = (numCols: number): number => {
  return (Dimensions.get('window').width - RAIL_WIDTH - 32 - GRID_GAP * (numCols - 1)) / numCols;
};

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NEU_BASE,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: NEU_BASE,
    borderBottomWidth: 0,
  },
  headerSpacing: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: NEU_TEXT_PRIMARY,
  },
  addButton: {
    backgroundColor: NEU_ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: NEU_RADIUS.sm,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: NEU_BASE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: NEU_DARK_SHADOW,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: NEU_ACCENT,
    fontWeight: '300',
    lineHeight: 36,
    marginTop: -2,
    marginLeft: 2,
  },
  mainContentRow: {
    flex: 1,
    flexDirection: 'row',
  },
  pillRail: {
    width: RAIL_WIDTH,
    flexGrow: 0,
    backgroundColor: NEU_BASE,
    borderRightWidth: 0,
  },
  pillRailContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  tabPillGroup: {
    alignItems: 'center',
  },
  tabPill: {
    width: 32,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 4,
  },
  tabPillActive: {
    borderWidth: 2,
    borderColor: NEU_ACCENT,
  },
  tabPillLabelTextActive: {
    fontWeight: '800',
  },
  tabPillLabelWrapper: {
    width: 68,
    transform: [{ rotate: '-90deg' }],
  },
  tabPillLabelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  tabPillConnector: {
    width: 0,
    height: 20,
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    borderColor: NEU_DARK_SHADOW,
  },
  tabPillAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: NEU_ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 166, 35, 0.08)',
  },
  tabPillAddButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: NEU_ACCENT,
    lineHeight: 20,
  },
  tabPillDivider: {
    marginTop: 20,
    alignItems: 'center',
  },
  mainContentArea: {
    flex: 1,
  },
  listContent: {
    padding: 12,
  },
  noteGrid: {
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  card: {
    width: CARD_SIZE,
    aspectRatio: 1,
    borderRadius: NEU_RADIUS.lg,
    padding: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  placeholderCard: {
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    elevation: 0,
  },
  cardSvgBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardSvgBlurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  cardFrameContent: {
    position: 'absolute',
    marginTop: 12,
  },
  cardTitleText: {
    fontSize: 10,
    fontWeight: '700',
    color: NEU_TEXT_PRIMARY,
  },
  cardFooter: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 20,
  },
  cardDeleteButton: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  deleteIcon: {
    fontSize: 12,
    lineHeight: 20,
  },
  deleteButton: {
    fontSize: 24,
    color: NEU_TEXT_SECONDARY,
    marginLeft: 8,
  },
  cardType: {
    fontSize: 12,
    lineHeight: 20,
    color: NEU_TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  cardContent: {
    marginBottom: 8,
    minHeight: 80,
  },
  cardPreview: {
    fontSize: 9,
    color: '#555',
    marginBottom: 4,
  },
  checklistItemPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checklistCheck: {
    fontSize: 12,
    marginRight: 6,
    color: NEU_TEXT_PRIMARY,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: NEU_TEXT_SECONDARY,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: NEU_BASE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  modalCloseButton: {
    fontSize: 16,
    color: NEU_ACCENT,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: NEU_TEXT_PRIMARY,
  },
  modalSaveButton: {
    fontSize: 16,
    color: NEU_ACCENT,
    fontWeight: '600',
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  stylingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: NEU_BASE,
    borderRadius: NEU_RADIUS.sm,
    marginBottom: 16,
  },
  stylingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: NEU_TEXT_PRIMARY,
  },
  expandIcon: {
    fontSize: 14,
    color: NEU_TEXT_SECONDARY,
  },
  colorPickerContainer: {
    marginBottom: 16,
  },
  svgToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  svgToggleLabel: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
    color: NEU_TEXT_PRIMARY,
  },
  colorPickerDisabled: {
    opacity: 0.35,
  },
  svgDisabledHint: {
    fontSize: 12,
    color: NEU_TEXT_SECONDARY,
    fontStyle: 'italic',
    marginTop: 6,
  },
  fontPickerContainer: {
    marginBottom: 16,
  },
  fontScroll: {
    marginVertical: 8,
  },
  fontOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 0,
    backgroundColor: NEU_BASE,
    borderRadius: NEU_RADIUS.sm,
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  fontOptionActive: {
    backgroundColor: NEU_ACCENT,
  },
  fontOptionText: {
    fontSize: 12,
    color: NEU_TEXT_PRIMARY,
  },
  fontOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  textStyleContainer: {
    marginBottom: 20,
  },
  textStyleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  styleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 0,
    backgroundColor: NEU_BASE,
    borderRadius: NEU_RADIUS.sm,
    alignItems: 'center',
  },
  styleButtonActive: {
    backgroundColor: NEU_ACCENT,
  },
  styleButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: NEU_TEXT_SECONDARY,
  },
  styleButtonTextActive: {
    color: '#fff',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: NEU_TEXT_PRIMARY,
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    borderBottomWidth: 0,
    paddingVertical: 8,
    marginBottom: 20,
    color: NEU_TEXT_PRIMARY,
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: NEU_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: NEU_TEXT_PRIMARY,
  },
  checkMark: {
    fontSize: 20,
    fontWeight: 'bold',
    color: NEU_TEXT_PRIMARY,
  },
  contentTypeContainer: {
    marginBottom: 20,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 0,
    backgroundColor: NEU_BASE,
    borderRadius: NEU_RADIUS.sm,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: NEU_ACCENT,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: NEU_TEXT_SECONDARY,
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  contentInput: {
    borderWidth: 0,
    backgroundColor: NEU_BASE,
    borderRadius: NEU_RADIUS.md,
    padding: 12,
    fontSize: 14,
    color: NEU_TEXT_PRIMARY,
    height: 150,
    marginBottom: 16,
  },
  checklistPreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 0,
  },
  addChecklistItemButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: NEU_ACCENT,
    borderRadius: NEU_RADIUS.sm,
    alignItems: 'center',
  },
  addChecklistItemText: {
    color: '#fff',
    fontWeight: '700',
  },
  checklistItemEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 0,
    backgroundColor: NEU_BASE,
    borderRadius: NEU_RADIUS.sm - 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: NEU_ACCENT,
  },
  checklistItemInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: NEU_TEXT_PRIMARY,
    borderBottomWidth: 0,
  },
  checklistItemCompleted: {
    textDecorationLine: 'line-through',
    color: NEU_TEXT_SECONDARY,
  },
  deleteTabButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: NEU_RADIUS.sm,
    backgroundColor: '#ffecec',
    alignItems: 'center',
  },
  deleteTabText: {
    color: '#d9534f',
    fontWeight: '600',
  },
  modalPrimaryButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: NEU_RADIUS.sm,
    backgroundColor: NEU_ACCENT,
    alignItems: 'center',
  },
  modalPrimaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  beforePicker: {
    marginVertical: 12,
  },
  dropdownToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 0,
    backgroundColor: NEU_BASE,
    borderRadius: NEU_RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownToggleText: {
    fontSize: 14,
    color: NEU_TEXT_PRIMARY,
  },
  dropdownArrow: {
    fontSize: 12,
    color: NEU_TEXT_SECONDARY,
  },
  dropdownList: {
    borderWidth: 0,
    backgroundColor: NEU_BASE,
    borderRadius: NEU_RADIUS.sm,
    marginTop: 8,
    maxHeight: 180,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownItemActive: {
    backgroundColor: NEU_ACCENT,
  },
  dropdownItemText: {
    fontSize: 14,
    color: NEU_TEXT_PRIMARY,
  },
  dropdownItemTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  readOnlyContent: {
    fontSize: 14,
    color: NEU_TEXT_PRIMARY,
    lineHeight: 20,
    marginBottom: 8,
  },
});