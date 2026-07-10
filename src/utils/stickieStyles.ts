import { ContentType, StickieStyle, TextStyle, NoteMargins, ItemSpacing, ChecklistSort, ChecklistTextMode } from '../types';

export const createStickieStyle = ({
  name,
  color,
  textColor,
  fontFamily,
  fontSize,
  textStyle,
  contentType,
  useSvgBackground,
  svgFrameId,
  margins,
  itemSpacing,
  lineSpacing,
  checklistSort,
  checklistTextMode,
}: {
  name: string;
  color: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  textStyle: TextStyle;
  contentType: ContentType;
  useSvgBackground: boolean;
  svgFrameId?: string;
  margins?: NoteMargins;
  itemSpacing?: ItemSpacing;
  lineSpacing?: number;
  checklistSort?: ChecklistSort;
  checklistTextMode?: ChecklistTextMode;
}): StickieStyle => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name,
  color,
  textColor,
  fontFamily,
  fontSize,
  textStyle,
  contentType,
  useSvgBackground,
  svgFrameId,
  margins,
  itemSpacing,
  lineSpacing,
  checklistSort,
  checklistTextMode,
});


export const buildStylePreviewContent = (contentType: ContentType) => {
  if (contentType === 'checklist') {
    return [
      { id: '1', text: 'First task', completed: false },
      { id: '2', text: 'Second task', completed: false },
    ];
  }
  return 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
};