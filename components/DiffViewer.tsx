
import React, { useMemo } from 'react';

interface DiffViewerProps {
  oldCode: string;
  newCode: string;
  language?: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ oldCode, newCode }) => {
  const diffLines = useMemo(() => {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const result: { type: 'same' | 'add' | 'remove'; content: string; oldLineNum?: number; newLineNum?: number }[] = [];

    // Very naive line-by-line diff for demonstration. 
    // A production app would use 'diff-match-patch' or similar algorithm.
    // This assumes somewhat similar structure to be useful.
    
    let i = 0; 
    let j = 0;

    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        result.push({ type: 'same', content: oldLines[i], oldLineNum: i + 1, newLineNum: j + 1 });
        i++;
        j++;
      } else {
        // Look ahead to resync
        let syncI = -1;
        let syncJ = -1;
        
        // Check if old line exists later in new
        // Check if new line exists later in old
        // Simple heuristic: if we see a mismatch, treat as delete then add unless we find a match soon
        
        if (i < oldLines.length) {
            result.push({ type: 'remove', content: oldLines[i], oldLineNum: i + 1 });
            i++;
        }
        if (j < newLines.length) {
            result.push({ type: 'add', content: newLines[j], newLineNum: j + 1 });
            j++;
        }
      }
    }

    return result;
  }, [oldCode, newCode]);

  return (
    <div className="font-mono text-xs bg-[#0b0e14] rounded-xl overflow-hidden border border-glass-border h-full flex flex-col">
        <div className="flex bg-slate-900 border-b border-glass-border">
            <div className="flex-1 px-4 py-2 text-center text-red-400 font-bold border-r border-glass-border">Original</div>
            <div className="flex-1 px-4 py-2 text-center text-green-400 font-bold">Modified</div>
        </div>
        <div className="flex-grow overflow-auto custom-scrollbar p-0">
            {diffLines.map((line, idx) => (
                <div key={idx} className={`flex w-full ${line.type === 'add' ? 'bg-green-900/20' : line.type === 'remove' ? 'bg-red-900/20' : ''}`}>
                    {/* Gutter Old */}
                    <div className="w-10 flex-shrink-0 text-right pr-2 text-slate-600 select-none border-r border-slate-800 bg-slate-900/50 py-0.5">
                        {line.oldLineNum || ''}
                    </div>
                    {/* Content Old/Unified representation logic is complex for side-by-side, doing unified-ish view */}
                    <div className="flex-grow whitespace-pre-wrap break-all py-0.5 px-2 relative group">
                        {line.type === 'add' && <span className="absolute left-0 text-green-500 font-bold select-none">+</span>}
                        {line.type === 'remove' && <span className="absolute left-0 text-red-500 font-bold select-none">-</span>}
                        <span className={`pl-4 ${line.type === 'add' ? 'text-green-200' : line.type === 'remove' ? 'text-red-200 opacity-60 line-through decoration-red-500/50' : 'text-slate-400'}`}>
                            {line.content}
                        </span>
                    </div>
                    {/* Gutter New */}
                    <div className="w-10 flex-shrink-0 text-right pr-2 text-slate-600 select-none border-l border-slate-800 bg-slate-900/50 py-0.5">
                        {line.newLineNum || ''}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default DiffViewer;
