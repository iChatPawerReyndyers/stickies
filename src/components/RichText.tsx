// components/RichText.tsx
//
// Renders note text (a plain string, see utils/richText.ts for why) with its
// **bold**/''italic''/~~strike~~/++underline++ markers turned into real
// styled spans. Used everywhere a note's text-type content is shown
// read-only: NoteCard's preview, ReadOnlyModal, StickieStylePreviewCard, and
// NoteModal's own read-only/view-only/style-editor branches. The active
// TextInput while actually editing intentionally still shows the raw
// markers — see components/TextSelectionToolbar.tsx.

import React from 'react';
import { Text, StyleProp, TextStyle as RNTextStyle } from 'react-native';
import { parseRichText } from '../utils/richText';

type RichTextProps = {
  text: string;
  style?: StyleProp<RNTextStyle>;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
};

const RichText: React.FC<RichTextProps> = ({ text, style, numberOfLines, ellipsizeMode }) => {
  const segments = parseRichText(text);

  return (
    <Text style={style} numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode}>
      {segments.map((seg, i) => {
        const decorations: string[] = [];
        if (seg.underline) decorations.push('underline');
        if (seg.strike) decorations.push('line-through');
        return (
          <Text
            key={i}
            style={[
              seg.bold && { fontWeight: '700' as const },
              seg.italic && { fontStyle: 'italic' as const },
              decorations.length > 0 && { textDecorationLine: decorations.join(' ') as any },
            ]}
          >
            {seg.text}
          </Text>
        );
      })}
    </Text>
  );
};

export default RichText;