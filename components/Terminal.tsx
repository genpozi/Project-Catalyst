
import React, { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

interface TerminalProps {
  onMount: (term: XTerm) => void;
  onInput?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
}

const Terminal: React.FC<TerminalProps> = ({ onMount, onInput, onResize }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const onInputRef = useRef(onInput);
  const onResizeRef = useRef(onResize);

  // Keep refs current to avoid re-binding listeners
  useEffect(() => {
      onInputRef.current = onInput;
      onResizeRef.current = onResize;
  }, [onInput, onResize]);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      theme: {
        background: '#0f172a', // Match app theme
        foreground: '#e2e8f0',
        cursor: '#4f46e5',
        selectionBackground: 'rgba(79, 70, 229, 0.3)',
      },
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 12,
      rows: 12, // Default height
      allowProposedApi: true
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    // Input Handling
    term.onData(data => {
        if (onInputRef.current) {
            onInputRef.current(data);
        }
    });

    termRef.current = term;
    onMount(term);

    // Debounced Resize Observer
    let resizeTimeout: any;
    const resizeObserver = new ResizeObserver(() => {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            fitAddon.fit();
            const dims = fitAddon.proposeDimensions();
            if (dims && onResizeRef.current) {
                onResizeRef.current(dims.cols, dims.rows);
            }
        }, 100);
    });
    
    resizeObserver.observe(containerRef.current);

    return () => {
      term.dispose();
      resizeObserver.disconnect();
    };
  }, []); // Run once on mount

  return (
    <div className="h-full w-full bg-[#0f172a] p-2 overflow-hidden terminal-container" ref={containerRef}></div>
  );
};

export default Terminal;
