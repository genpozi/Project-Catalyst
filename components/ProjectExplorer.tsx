
import React, { useState } from 'react';
import { AppPhase, FileNode } from '../types';
import { useProject } from '../ProjectContext';

interface ProjectExplorerProps {
  currentPhase: AppPhase;
  projectData: any;
  onNavigate: (p: AppPhase) => void;
  unlockedPhases: AppPhase[];
}

const FileTreeItem: React.FC<{ 
    node: FileNode; 
    level: number; 
    onSelect: (path: string) => void; 
    selectedPath?: string 
}> = ({ node, level, onSelect, selectedPath }) => {
    const [isOpen, setIsOpen] = useState(false);
    const isFolder = node.type === 'folder';
    // Match based on full path logic (simplified here for brevity, usually assumes name uniqueness in simple tree or needs full path prop)
    const isSelected = selectedPath && selectedPath.includes(node.name); 

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isFolder) setIsOpen(!isOpen);
        else onSelect(node.name);
    };

    return (
        <div className="select-none">
            <div 
                className={`flex items-center gap-1 py-0.5 cursor-pointer transition-colors ${isSelected && !isFolder ? 'bg-brand-primary/20 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                style={{ paddingLeft: `${level * 12 + 12}px` }}
                onClick={handleClick}
            >
                <span className={`w-4 text-center text-[10px] transition-transform ${isOpen ? 'rotate-90' : ''} ${!isFolder ? 'opacity-0' : 'opacity-70'}`}>
                    ›
                </span>
                <span className="text-sm mr-1.5 opacity-80">
                    {isFolder ? (isOpen ? '📂' : '📁') : '📄'}
                </span>
                <span className={`text-xs truncate ${isSelected && !isFolder ? 'font-medium' : ''}`}>
                    {node.name}
                </span>
            </div>
            {isFolder && isOpen && node.children && (
                <div>
                    {node.children.map((child, idx) => (
                        <FileTreeItem 
                            key={idx} 
                            node={child} 
                            level={level + 1} 
                            onSelect={onSelect} 
                            selectedPath={selectedPath} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const ExplorerSection: React.FC<{
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-white/5 last:border-0">
            <div 
                className="flex items-center px-2 py-1.5 cursor-pointer hover:bg-white/5 group bg-[#151b26]"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`text-[10px] text-slate-500 group-hover:text-white transition-transform duration-150 mr-1 ${isOpen ? 'rotate-90' : ''}`}>›</span>
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-white uppercase tracking-wider">{title}</span>
            </div>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[800px] opacity-100 mb-2' : 'max-h-0 opacity-0'}`}>
                {children}
            </div>
        </div>
    );
};

export const ProjectExplorer: React.FC<ProjectExplorerProps> = ({ currentPhase, projectData, onNavigate, unlockedPhases }) => {
    const { state, dispatch } = useProject();

    const handleFileSelect = (path: string) => {
        // Simple path finder - in production pass full path
        const findFullPath = (nodes: FileNode[], target: string, prefix = ''): string => {
            for (const n of nodes) {
                const cur = prefix ? `${prefix}/${n.name}` : n.name;
                if (n.name === target) return cur;
                if (n.children) {
                    const found = findFullPath(n.children, target, cur);
                    if (found) return found;
                }
            }
            return path;
        };
        const fullPath = findFullPath(projectData.fileStructure || [], path);
        
        dispatch({ type: 'SET_SELECTED_FILE', payload: fullPath });
        if (currentPhase !== AppPhase.FILE_STRUCTURE && currentPhase !== AppPhase.WORKSPACE) {
            onNavigate(AppPhase.FILE_STRUCTURE);
        }
    };

    const PhaseItem = ({ id, label, icon }: { id: AppPhase, label: string, icon: string }) => {
        const isActive = currentPhase === id;
        const isUnlocked = unlockedPhases.includes(id);
        
        return (
            <div
                onClick={() => isUnlocked && onNavigate(id)}
                className={`
                    pl-6 pr-3 py-1 text-xs cursor-pointer flex items-center gap-2 border-l-2 transition-all
                    ${isActive ? 'border-brand-primary text-white bg-brand-primary/10' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'}
                    ${!isUnlocked ? 'opacity-40 cursor-not-allowed' : ''}
                `}
            >
                <span className="w-4 text-center text-[10px]">{icon}</span>
                <span className="truncate">{label}</span>
            </div>
        );
    };

    return (
        <div className="h-full bg-[#0b0e14] border-r border-white/5 flex flex-col w-[260px] flex-shrink-0 select-none animate-fade-in">
            {/* Header */}
            <div className="px-4 py-3 flex justify-between items-center bg-[#151b26] border-b border-white/5">
                <span className="text-[10px] text-glass-text-secondary uppercase tracking-widest font-bold">Explorer</span>
                <button className="text-slate-500 hover:text-white transition-colors">•••</button>
            </div>
            
            <div className="flex-grow overflow-y-auto custom-scrollbar">
                
                {/* Workflow Section */}
                <ExplorerSection title="Blueprint Phases">
                    <div className="mt-1">
                        <div className="px-4 py-1 text-[9px] font-bold text-slate-600 uppercase mt-1 mb-0.5">Strategy</div>
                        <PhaseItem id={AppPhase.BRAINSTORM} label="Brainstorming" icon="💡" />
                        <PhaseItem id={AppPhase.KNOWLEDGE_BASE} label="Knowledge" icon="🧠" />
                        <PhaseItem id={AppPhase.RESEARCH} label="Research" icon="🔍" />

                        <div className="px-4 py-1 text-[9px] font-bold text-slate-600 uppercase mt-2 mb-0.5">Design</div>
                        <PhaseItem id={AppPhase.ARCHITECTURE} label="Architecture" icon="🏗️" />
                        <PhaseItem id={AppPhase.DATAMODEL} label="Data Model" icon="🗄️" />
                        <PhaseItem id={AppPhase.UI_UX} label="UI/UX" icon="🎨" />
                        <PhaseItem id={AppPhase.API_SPEC} label="API Specs" icon="🔌" />
                        <PhaseItem id={AppPhase.SECURITY} label="Security" icon="🛡️" />

                        <div className="px-4 py-1 text-[9px] font-bold text-slate-600 uppercase mt-2 mb-0.5">Build</div>
                        <PhaseItem id={AppPhase.BLUEPRINT_STUDIO} label="Studio" icon="✨" />
                        <PhaseItem id={AppPhase.AGENT_RULES} label="Agent Rules" icon="🤖" />
                        <PhaseItem id={AppPhase.PLAN} label="Action Plan" icon="📅" />
                        <PhaseItem id={AppPhase.WORKSPACE} label="Tasks" icon="✅" />
                        
                        <div className="px-4 py-1 text-[9px] font-bold text-slate-600 uppercase mt-2 mb-0.5">Deploy</div>
                        <PhaseItem id={AppPhase.DOCUMENT} label="Specs" icon="📄" />
                        <PhaseItem id={AppPhase.KICKOFF} label="Handover" icon="🚀" />
                    </div>
                </ExplorerSection>

                {/* File System Section */}
                {projectData.fileStructure && projectData.fileStructure.length > 0 && (
                    <ExplorerSection title="File System" defaultOpen={true}>
                        <div className="py-1">
                            {projectData.fileStructure.map((node: FileNode, idx: number) => (
                                <FileTreeItem 
                                    key={idx} 
                                    node={node} 
                                    level={0} 
                                    onSelect={handleFileSelect} 
                                    selectedPath={state.ui.selectedFilePath}
                                />
                            ))}
                        </div>
                    </ExplorerSection>
                )}

                {/* Docs Section */}
                {projectData.knowledgeBase && projectData.knowledgeBase.length > 0 && (
                    <ExplorerSection title="Knowledge Base" defaultOpen={false}>
                        <div className="py-1">
                            {projectData.knowledgeBase.map((doc: any, idx: number) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        dispatch({ type: 'SET_SELECTED_DOC', payload: doc.id });
                                        onNavigate(AppPhase.KNOWLEDGE_BASE);
                                    }}
                                    className={`
                                        pl-6 pr-3 py-1 text-xs cursor-pointer flex items-center gap-2 hover:bg-white/5
                                        ${state.ui.selectedDocId === doc.id ? 'text-white' : 'text-slate-400'}
                                    `}
                                >
                                    <span className="text-[10px]">{doc.type === 'code' ? '📝' : '📄'}</span>
                                    <span className="truncate">{doc.title}</span>
                                </div>
                            ))}
                        </div>
                    </ExplorerSection>
                )}
            </div>
        </div>
    );
};
