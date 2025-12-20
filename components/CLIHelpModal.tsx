
import React, { useState } from 'react';
import CodeEditor from './CodeEditor';

interface CLIHelpModalProps {
  onClose: () => void;
}

const BRIDGE_SCRIPT = `/**
 * 0relai Local Bridge
 * Run this script in your project root to enable 2-way sync with the Architect.
 * Usage: node bridge.js
 * Requirements: npm install ws chokidar
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const PORT = 21337;
const IGNORE_PATTERNS = [/node_modules/, /\.git/, /\.next/, /dist/, /build/];

const wss = new WebSocket.Server({ port: PORT });

console.log(\`🔌 0relai Bridge running on ws://localhost:\${PORT}\`);
console.log('Watching for file changes...');

wss.on('connection', (ws) => {
    console.log('Client connected');

    // 1. Send Initial Tree
    sendTree(ws);

    // 2. Handle Messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'write') {
                const { path: filePath, content } = data.payload;
                const fullPath = path.join(process.cwd(), filePath);
                
                // Ensure dir exists
                fs.mkdirSync(path.dirname(fullPath), { recursive: true });
                fs.writeFileSync(fullPath, content);
                console.log(\`📝 Wrote: \${filePath}\`);
            }
        } catch (e) {
            console.error('Error handling message:', e);
        }
    });

    // 3. Setup File Watcher
    const watcher = chokidar.watch('.', {
        ignored: IGNORE_PATTERNS,
        persistent: true,
        ignoreInitial: true
    });

    watcher.on('all', (event, filePath) => {
        // Debounce or optimize in production
        sendTree(ws);
        
        ws.send(JSON.stringify({
            type: 'file_change',
            payload: { event, path: filePath },
            timestamp: Date.now()
        }));
    });

    ws.on('close', () => watcher.close());
});

function sendTree(ws) {
    // Simplified tree generation (use 'tree-cli' or custom recursion in prod)
    // For now, we'll send a placeholder trigger or implement a basic walker
    const getFileList = (dir) => {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach((file) => {
            if (IGNORE_PATTERNS.some(p => p.test(file))) return;
            file = path.join(dir, file);
            const stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                results = results.concat(getFileList(file));
            } else {
                results.push(file);
            }
        });
        return results;
    };
    
    // In a real implementation, generate the 'tree' string output format
    // ws.send(...)
}
`;

const CLIHelpModal: React.FC<CLIHelpModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(BRIDGE_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([BRIDGE_SCRIPT], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bridge.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-[#0f172a] border border-glass-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-glass-border bg-slate-900/50 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>🔌</span> Setup Local Bridge
            </h3>
            <button onClick={onClose} className="text-glass-text-secondary hover:text-white">✕</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
            <div className="bg-brand-primary/10 border border-brand-primary/20 p-4 rounded-xl mb-6">
                <p className="text-sm text-blue-100">
                    The <strong>0relai Bridge</strong> allows the web app to communicate directly with your local file system. 
                    This enables real-time drift detection and direct file writing from the browser.
                </p>
            </div>

            <ol className="list-decimal pl-5 space-y-4 text-sm text-slate-300 mb-6">
                <li>
                    Run this command in your project folder to install dependencies:
                    <div className="bg-black/30 p-2 rounded mt-2 font-mono text-xs text-brand-secondary border border-white/5 flex justify-between items-center group">
                        <code>npm install ws chokidar</code>
                        <button 
                            onClick={() => navigator.clipboard.writeText('npm install ws chokidar')}
                            className="opacity-0 group-hover:opacity-100 text-glass-text-secondary hover:text-white"
                        >
                            📋
                        </button>
                    </div>
                </li>
                <li>
                    Download the bridge script:
                    <div className="mt-2">
                        <button 
                            onClick={handleDownload}
                            className="bg-brand-secondary hover:bg-brand-primary text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-lg"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download bridge.js
                        </button>
                    </div>
                </li>
                <li>
                    Run the bridge:
                    <div className="bg-black/30 p-2 rounded mt-2 font-mono text-xs text-brand-secondary border border-white/5 flex justify-between items-center group">
                        <code>node bridge.js</code>
                        <button 
                            onClick={() => navigator.clipboard.writeText('node bridge.js')}
                            className="opacity-0 group-hover:opacity-100 text-glass-text-secondary hover:text-white"
                        >
                            📋
                        </button>
                    </div>
                </li>
            </ol>

            <div className="bg-[#0b0e14] rounded-xl border border-white/10 overflow-hidden flex flex-col h-64 relative">
                <div className="bg-slate-900 px-4 py-2 border-b border-white/5 flex justify-between items-center">
                    <span className="text-xs font-mono text-brand-accent">bridge.js preview</span>
                    <button 
                        onClick={handleCopy}
                        className="text-xs bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded transition-all"
                    >
                        {copied ? 'Copied!' : 'Copy Code'}
                    </button>
                </div>
                <div className="flex-grow relative">
                    <CodeEditor value={BRIDGE_SCRIPT} language="javascript" readOnly={true} />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CLIHelpModal;
