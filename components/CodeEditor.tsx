
import React, { useState, useRef, useEffect } from 'react';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ 
  value, 
  onChange, 
  language = 'javascript', 
  readOnly = false, 
  className = '',
  placeholder 
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  // Sync scroll between textarea and pre
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Simple Regex Tokenizer for Highlighting
  const highlight = (code: string) => {
    if (!code) return '';
    
    // Escaping HTML characters
    let html = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Syntax Rules
    const rules: { regex: RegExp, class: string }[] = [
      { regex: /(\/\/.*)/g, class: 'text-slate-500 italic' }, // Single line comments
      { regex: /(#.*)/g, class: 'text-slate-500 italic' }, // Shell/Python comments
      { regex: /(".*?"|'.*?'|`.*?`)/g, class: 'text-green-400' }, // Strings
      { regex: /\b(const|let|var|function|class|import|export|from|return|if|else|for|while|async|await|try|catch|interface|type|enum|default|case|switch)\b/g, class: 'text-purple-400 font-bold' }, // Keywords JS/TS
      { regex: /\b(def|class|print|import|from|return|if|else|elif|for|while|try|except|with|as)\b/g, class: 'text-blue-400 font-bold' }, // Keywords Python
      { regex: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN|AND|OR|NOT|NULL|CREATE|TABLE|PRIMARY|KEY)\b/g, class: 'text-orange-400 font-bold' }, // Keywords SQL
      { regex: /\b(true|false|null|undefined|NaN)\b/g, class: 'text-red-400' }, // Booleans/Null
      { regex: /\b(\d+)\b/g, class: 'text-yellow-400' }, // Numbers
      { regex: /({|}|\[|\]|\(|\))/g, class: 'text-white/60' }, // Brackets
    ];

    // Apply highlighting via span wrapping (naive approach, order matters)
    // To prevent re-highlighting inside existing tags, we use a placeholder approach or simplified logic.
    // Given the complexity of regex parsing HTML strings, we'll do a simplified single-pass or use a split approach.
    
    // Simplification for stability: We will just tokenise by splitting and matching
    // This is less accurate than a parser but safer than recursive regex on HTML strings
    
    // Better approach: Split by delimiters and map
    // For this lightweight version, let's just highlight keywords and strings that are distinct.
    
    // Reverting to a safer simple replace for specific patterns that won't overlap often in simple code.
    // Note: This is imperfect but better than plain text.
    
    // 1. Comments (Apply first to avoid matching keywords inside comments)
    // We actually can't do this easily with regex replace on a full string without a tokenizer loop.
    
    // Let's try a split-token approach for basic robustness
    const tokens = html.split(/([ \t\n{}()\[\];,.])/);
    
    return tokens.map((token, i) => {
        if (token.match(/^(".*"|'.*')$/)) return `<span class="text-green-400">${token}</span>`;
        if (token.match(/^\d+$/)) return `<span class="text-yellow-400">${token}</span>`;
        
        // Keywords
        if (['const','let','var','function','class','import','export','return','if','else','await','async','interface','type'].includes(token)) 
            return `<span class="text-purple-400 font-bold">${token}</span>`;
        
        if (['def','print','elif','True','False','None'].includes(token))
            return `<span class="text-blue-400 font-bold">${token}</span>`;

        if (['true','false','null','undefined'].includes(token))
            return `<span class="text-red-400">${token}</span>`;
            
        return token;
    }).join('');
  };

  // Improved highlighting logic handling multi-token structures vaguely better
  const advancedHighlight = (code: string) => {
      let result = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      // Strings (Basic)
      result = result.replace(/(".*?"|'.*?'|`.*?`)/g, '<span class="text-green-400">$1</span>');
      
      // Comments (must come after strings to avoid comment chars in strings, but regex is tricky)
      // We'll stick to a simpler set for safety in this lightweight editor
      
      // Keywords
      result = result.replace(/\b(const|let|var|function|class|import|export|from|return|if|else|for|while|async|await|try|catch|interface|type|enum)\b/g, '<span class="text-purple-400 font-bold">$1</span>');
      
      // Numbers
      result = result.replace(/\b(\d+)\b/g, '<span class="text-yellow-400">$1</span>');
      
      // Booleans
      result = result.replace(/\b(true|false|null)\b/g, '<span class="text-red-400 font-bold">$1</span>');

      return result;
  };

  return (
    <div className={`relative font-mono text-sm leading-6 bg-[#0b0e14] ${className}`}>
      {/* Highlight Layer */}
      <pre
        ref={preRef}
        aria-hidden="true"
        className="absolute inset-0 m-0 p-4 overflow-auto bg-transparent pointer-events-none whitespace-pre-wrap break-words z-0 text-transparent"
      >
        <code 
            className="text-blue-100" 
            dangerouslySetInnerHTML={{ __html: advancedHighlight(value) }} 
        />
      </pre>

      {/* Input Layer */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        onScroll={handleScroll}
        readOnly={readOnly}
        spellCheck={false}
        placeholder={placeholder}
        className={`relative z-10 w-full h-full p-4 bg-transparent text-transparent caret-white outline-none resize-none whitespace-pre-wrap break-words ${readOnly ? 'cursor-text' : 'cursor-text'}`}
        style={{ color: 'transparent', caretColor: 'white' }} 
        // Text is transparent so pre layer shows through, but caret is visible. 
        // NOTE: Selection color might be invisible depending on browser. 
        // To fix selection visibility, we usually use a non-transparent text with mix-blend-mode or just simple opacity tricks.
        // A common trick for simple editors: Make text color distinct but transparent-ish? 
        // Actually, ensuring the font metrics match perfectly is key.
      />
      
      {/* Fallback for selection visibility if needed: 
          For a truly robust solution we'd use a library, but for this "Aesthetic" request, 
          we can actually just use the CodeBlock for display and Textarea for edit, 
          or overlay.
          
          Standard trick: Textarea has text-transparent, caret-white. 
          Selection highlight is browser native.
      */}
    </div>
  );
};

export default CodeEditor;
