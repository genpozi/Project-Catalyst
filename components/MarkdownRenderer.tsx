
import React, { useState } from 'react';

const CodeBlock: React.FC<{ language: string; code: string }> = ({ language, code }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-4 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 group">
            <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-400 font-mono font-bold uppercase tracking-wider">
                    {language || 'Code'}
                </span>
                <button 
                    onClick={handleCopy}
                    className="text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 px-2 py-1 rounded transition-all flex items-center gap-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                    {copied ? (
                        <>
                            <span className="text-green-400">✓</span> Copied
                        </>
                    ) : (
                        <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 011.414.293l4.414 4.414a1 1 0 01.293 1.414V19a2 2 0 01-2 2h-1M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                            Copy
                        </>
                    )}
                </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm font-mono text-blue-200 custom-scrollbar">
                <code>{code}</code>
            </pre>
        </div>
    );
};

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const renderContent = () => {
    const lines = content.split('\n');
    const elements: React.JSX.Element[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeBlockLanguage = '';
    let listItems: React.JSX.Element[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc pl-6 space-y-1 my-4 text-blue-100">
            {...listItems}
          </ul>
        );
        listItems = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code Blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          flushList();
          elements.push(
            <CodeBlock 
                key={`code-${i}`} 
                language={codeBlockLanguage} 
                code={codeBlockContent.join('\n')} 
            />
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          // Start of code block
          flushList();
          inCodeBlock = true;
          codeBlockLanguage = line.trim().substring(3);
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Headings
      if (line.startsWith('### ')) {
        flushList();
        elements.push(<h4 key={i} className="text-lg font-bold text-brand-accent mt-6 mb-2">{line.substring(4)}</h4>);
      } else if (line.startsWith('## ')) {
        flushList();
        elements.push(<h3 key={i} className="text-xl font-extrabold text-white mt-8 mb-3 border-b border-slate-700 pb-2">{line.substring(3)}</h3>);
      } else if (line.startsWith('# ')) {
        flushList();
        elements.push(<h2 key={i} className="text-2xl font-black text-brand-secondary mt-10 mb-4">{line.substring(2)}</h2>);
      } 
      // Lists
      else if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const text = line.replace(/^(\*|\-)\s+/, '');
        // Handle bolding in lists
        const parts = text.split(/(\*\*.*?\*\*)/g).map((part, idx) => {
             if (part.startsWith('**') && part.endsWith('**')) {
                 return <strong key={idx} className="text-white">{part.slice(2, -2)}</strong>;
             }
             return part;
        });
        listItems.push(<li key={`li-${i}`}>{parts}</li>);
      } 
      // Paragraphs / Empty lines
      else if (line.trim() === '') {
        flushList();
      } else {
        flushList();
        // Handle bolding in paragraphs
        const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g).map((part, idx) => {
             if (part.startsWith('**') && part.endsWith('**')) {
                 return <strong key={idx} className="text-white">{part.slice(2, -2)}</strong>;
             }
             if (part.startsWith('`') && part.endsWith('`')) {
                 return <code key={idx} className="bg-slate-800 px-1 py-0.5 rounded text-brand-accent text-sm font-mono">{part.slice(1, -1)}</code>;
             }
             return part;
        });
        elements.push(<p key={i} className="my-2 leading-relaxed">{parts}</p>);
      }
    }
    
    flushList(); // Final flush
    return elements;
  };

  return <div className="prose prose-invert max-w-none text-slate-300">{renderContent()}</div>;
};

export default MarkdownRenderer;
