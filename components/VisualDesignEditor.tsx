
import React, { useState } from 'react';
import { DesignSystem, ColorPalette } from '../types';

interface VisualDesignEditorProps {
  system: DesignSystem;
  onUpdate: (system: DesignSystem) => void;
}

const VisualDesignEditor: React.FC<VisualDesignEditorProps> = ({ system, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'colors' | 'typography'>('colors');

  const updateColor = (index: number, field: keyof ColorPalette, value: string) => {
    const newColors = [...system.colorPalette];
    newColors[index] = { ...newColors[index], [field]: value };
    onUpdate({ ...system, colorPalette: newColors });
  };

  const addColor = () => {
    const newColor: ColorPalette = { name: 'New Color', hex: '#64748b', usage: 'Accent' };
    onUpdate({ ...system, colorPalette: [...system.colorPalette, newColor] });
  };

  const removeColor = (index: number) => {
    if (confirm('Remove this color?')) {
        const newColors = [...system.colorPalette];
        newColors.splice(index, 1);
        onUpdate({ ...system, colorPalette: newColors });
    }
  };

  const updateTypography = (index: number, field: string, value: string) => {
    const newType = [...system.typography];
    (newType[index] as any)[field] = value;
    onUpdate({ ...system, typography: newType });
  };

  // Helper to find specific colors for the playground
  const getHex = (namePart: string) => {
      const c = system.colorPalette.find(c => c.name.toLowerCase().includes(namePart.toLowerCase()) || c.usage.toLowerCase().includes(namePart.toLowerCase()));
      return c ? c.hex : '#cbd5e1';
  };

  const primary = getHex('primary') || getHex('action') || '#3b82f6';
  const secondary = getHex('secondary') || '#64748b';
  const background = getHex('background') || getHex('dark') || '#0f172a';
  const surface = getHex('surface') || getHex('panel') || '#1e293b';
  const text = getHex('text') || '#f8fafc';

  const headingFont = system.typography.find(t => t.role.toLowerCase().includes('heading'))?.fontFamily || 'sans-serif';
  const bodyFont = system.typography.find(t => t.role.toLowerCase().includes('body'))?.fontFamily || 'sans-serif';

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col bg-[#0b0e14] border border-white/5 rounded-xl overflow-hidden">
            <div className="flex border-b border-white/5 bg-slate-900/50">
                <button 
                    onClick={() => setActiveTab('colors')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'colors' ? 'text-white border-b-2 border-brand-primary' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Color Palette
                </button>
                <button 
                    onClick={() => setActiveTab('typography')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'typography' ? 'text-white border-b-2 border-brand-primary' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Typography
                </button>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar p-4">
                {activeTab === 'colors' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3">
                            {system.colorPalette.map((color, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5 group">
                                    <div className="relative w-10 h-10 rounded-lg overflow-hidden shadow-inner flex-shrink-0 cursor-pointer border border-white/10">
                                        <input 
                                            type="color" 
                                            value={color.hex} 
                                            onChange={(e) => updateColor(idx, 'hex', e.target.value)}
                                            className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] p-0 border-0 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-grow min-w-0 grid grid-cols-2 gap-2">
                                        <input 
                                            value={color.name}
                                            onChange={(e) => updateColor(idx, 'name', e.target.value)}
                                            className="bg-transparent text-sm font-bold text-white border-b border-transparent focus:border-brand-primary outline-none"
                                            placeholder="Name"
                                        />
                                        <input 
                                            value={color.hex}
                                            onChange={(e) => updateColor(idx, 'hex', e.target.value)}
                                            className="bg-transparent text-xs font-mono text-slate-400 border-b border-transparent focus:border-brand-primary outline-none"
                                        />
                                        <input 
                                            value={color.usage}
                                            onChange={(e) => updateColor(idx, 'usage', e.target.value)}
                                            className="col-span-2 bg-transparent text-[10px] text-glass-text-secondary border-b border-transparent focus:border-brand-primary outline-none"
                                            placeholder="Usage description"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => removeColor(idx)}
                                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={addColor}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-lg border border-dashed border-white/10 transition-all"
                        >
                            + Add Color
                        </button>
                    </div>
                )}

                {activeTab === 'typography' && (
                    <div className="space-y-4">
                        {system.typography.map((type, idx) => (
                            <div key={idx} className="bg-white/5 p-4 rounded-lg border border-white/5 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-glass-text-secondary uppercase tracking-wider">{type.role}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2">
                                        <label className="text-[9px] text-slate-500 block mb-1">Font Family</label>
                                        <input 
                                            value={type.fontFamily}
                                            onChange={(e) => updateTypography(idx, 'fontFamily', e.target.value)}
                                            className="w-full bg-black/20 rounded px-2 py-1 text-sm text-white border border-white/10 focus:border-brand-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-slate-500 block mb-1">Size/Weight</label>
                                        <input 
                                            value={type.size}
                                            onChange={(e) => updateTypography(idx, 'size', e.target.value)}
                                            className="w-full bg-black/20 rounded px-2 py-1 text-xs font-mono text-brand-secondary border border-white/10 focus:border-brand-primary outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* Live Playground */}
        <div className="flex-1 flex flex-col">
            <h3 className="text-xs font-bold text-glass-text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                <span>🎨</span> Live Token Playground
            </h3>
            
            <div 
                className="flex-grow rounded-xl overflow-hidden shadow-2xl relative transition-all duration-500"
                style={{ backgroundColor: background }}
            >
                {/* Simulated App Header */}
                <div className="h-12 flex items-center px-4 justify-between border-b border-white/5" style={{ backgroundColor: surface }}>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-white/20"></div>
                        <span className="text-sm font-bold" style={{ color: text, fontFamily: headingFont }}>My App</span>
                    </div>
                    <div className="flex gap-2">
                        <div className="w-16 h-2 rounded bg-white/10"></div>
                        <div className="w-8 h-8 rounded-full" style={{ backgroundColor: primary }}></div>
                    </div>
                </div>

                {/* Simulated Content */}
                <div className="p-6 space-y-6">
                    {/* Hero Card */}
                    <div className="p-6 rounded-xl border border-white/5" style={{ backgroundColor: surface }}>
                        <h1 className="text-2xl font-bold mb-2" style={{ color: text, fontFamily: headingFont }}>
                            Visual Consistency
                        </h1>
                        <p className="text-sm mb-6 opacity-70" style={{ color: text, fontFamily: bodyFont }}>
                            This component renders directly from your design tokens. Changing a color or font on the left immediately updates this preview.
                        </p>
                        <div className="flex gap-3">
                            <button className="px-4 py-2 rounded-lg text-sm font-bold text-white shadow-lg transition-transform hover:scale-105" style={{ backgroundColor: primary, fontFamily: bodyFont }}>
                                Primary Action
                            </button>
                            <button className="px-4 py-2 rounded-lg text-sm font-bold transition-colors hover:bg-white/5" style={{ color: text, border: `1px solid ${secondary}`, fontFamily: bodyFont }}>
                                Secondary
                            </button>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-4">
                        {[1, 2].map(i => (
                            <div key={i} className="p-4 rounded-lg border border-white/5 bg-white/5">
                                <div className="text-xs uppercase font-bold opacity-50 mb-1" style={{ color: text }}>Metric {i}</div>
                                <div className="text-2xl font-bold" style={{ color: secondary, fontFamily: headingFont }}>98.5%</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Simulated Floating Action Button */}
                <div className="absolute bottom-6 right-6 w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-white text-xl" style={{ backgroundColor: primary }}>
                    +
                </div>
            </div>
        </div>
    </div>
  );
};

export default VisualDesignEditor;
