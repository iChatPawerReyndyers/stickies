import { ContentType, StickieStyle, TextStyle, NoteMargins, ChecklistSort, ChecklistTextMode } from '../types';

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
