import React, { useEffect, useRef } from 'react';
import SD from 'smiles-drawer';

interface SmilesProps {
  smiles: string;
  theme?: 'light' | 'dark';
  width?: number;
  height?: number;
  isReaction?: boolean;
}

export default function Smiles({ smiles, theme = 'dark', width, height, isReaction = false }: SmilesProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    if (containerRef.current && smiles) {
      try {
        const SmiDrawerOptions: any = {};
        if (width) SmiDrawerOptions.width = width;
        if (height) SmiDrawerOptions.height = height;

        // Determine if it's a reaction visually (if it contains '>')
        const actualIsReaction = isReaction || smiles.includes('>');

        const getDrawer = () => {
          if (SD && (SD as any).SmiDrawer) return (SD as any).SmiDrawer;
          if (SD && (SD as any).default && (SD as any).default.SmiDrawer) return (SD as any).default.SmiDrawer;
          return null;
        };

        const SmiDrawerClass = getDrawer();
        if (SmiDrawerClass) {
          const drawer = new SmiDrawerClass(SmiDrawerOptions);
          
          const callback = (svg: SVGElement) => {
             if (!active) return;
             if (containerRef.current) {
                containerRef.current.innerHTML = '';
                
                // Add viewBox if missing based on width and height so it scales instead of cropping
                const svgWidth = svg.getAttribute('width');
                const svgHeight = svg.getAttribute('height');
                if (svgWidth && svgHeight && !svg.hasAttribute('viewBox')) {
                    svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
                }
                
                // Ensure SVG fits gracefully within option buttons and text
                svg.style.width = '100%';
                svg.style.height = '100%';
                svg.style.maxWidth = '100%';
                svg.style.maxHeight = '80px'; // Reduce max height drastically to avoid scrolling
                
                svg.removeAttribute('width');
                svg.removeAttribute('height');
                
                containerRef.current.appendChild(svg);
             }
          };

          const errorCallback = (err: any) => {
             if (!active) return;
             // Suppress console error to avoid clutter
             if (containerRef.current) {
               containerRef.current.innerHTML = `<span class="text-sm font-mono text-muted-foreground">${smiles}</span>`;
             }
          };

          if (actualIsReaction) {
            drawer.drawReaction(smiles, 'svg', theme, {}, undefined, callback);
          } else {
            drawer.draw(smiles, 'svg', theme, callback, errorCallback);
          }
        }
      } catch (err) {
        // Suppress console error to avoid clutter
        if (containerRef.current && active) {
           containerRef.current.innerHTML = `<span class="text-sm font-mono text-muted-foreground">${smiles}</span>`;
        }
      }
    }
    
    return () => {
      active = false;
    };
  }, [smiles, theme, width, height, isReaction]);

  return <div ref={containerRef} className="flex justify-center my-2 max-w-full overflow-hidden" />;
}
