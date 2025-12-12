
import React from 'react';

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
            <div key={`code-${i}`} className="my-4 rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
              {codeBlockLanguage && (
                <div className="px-4 py-1 bg-slate-800 text-xs text-slate-400 font-mono border-b border-slate-700">
                  {codeBlockLanguage}
                </div>
              )}
              <pre className="p-4 overflow-x-auto text-sm font-mono text-blue-200">
                <code>{codeBlockContent.join('\n')}</code>
              </pre>
            </div>
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
        // Don't push empty br tags excessively
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
