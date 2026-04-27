import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';

export function renderWithLatex(text: string): React.ReactNode[] {
  // Regex to match block math $$...$$ and inline math $...$
  const regex = /(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g;
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      return <BlockMath key={index} math={part.slice(2, -2)} />;
    } else if (part.startsWith('$') && part.endsWith('$')) {
      return <InlineMath key={index} math={part.slice(1, -1)} />;
    }
    return <span key={index}>{part}</span>;
  });
}
