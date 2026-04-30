import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import Smiles from './Smiles';

export function renderWithLatex(text: string): React.ReactNode[] {
  // Regex to match block math $$...$$, inline math $...$, and [SMILES]...[/SMILES]
  const regex = /(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$|\[SMILES\][\s\S]+?\[\/SMILES\])/g;
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      return <BlockMath key={index} math={part.slice(2, -2)} />;
    } else if (part.startsWith('$') && part.endsWith('$')) {
      return <InlineMath key={index} math={part.slice(1, -1)} />;
    } else if (part.startsWith('[SMILES]') && part.endsWith('[/SMILES]')) {
      return <Smiles key={index} smiles={part.slice(8, -9).trim()} />;
    }
    return <span key={index}>{part}</span>;
  });
}
