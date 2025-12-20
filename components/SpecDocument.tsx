
import React, { useState } from 'react';
import { ProjectData } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import PresentationDeck from './PresentationDeck';
import { generateMarkdownVault } from '../utils/exportService';
import { useToast } from './Toast';

interface SpecDocumentProps {
  projectData: ProjectData;
  onContinue: () => void;
}

const SpecDocument: React.FC<SpecDocumentProps> = ({ projectData, onContinue }) => {
  const [isPresenting, setIsPresenting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { addToast } = useToast();

  const handlePrint = () => {
    window.print();
  };

  const handleExportVault = async () => {
      setIsExporting(true);
      try {
          const blob = await generateMarkdownVault(projectData);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${projectData.name.replace(/[^a-zA-Z0-9]/g, '-')}-Obsidian-Vault.zip`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          addToast("Vault exported successfully", "success");
      } catch (e) {
          addToast("Failed to export vault", "error");
      } finally {
          setIsExporting(false);
      }
  };

  return (
    <div className="animate-slide-in-up">
      {isPresenting && (
          <PresentationDeck projectData={projectData} onClose={() => setIsPresenting(false)} />
      )}

      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-brand-text">Project Specification Document</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPresenting(true)}
            className="px-4 py-2 bg-purple-600 text-white font-bold rounded-lg shadow-lg hover:bg-purple-500 transition-all transform hover:scale-105 flex items-center gap-2 text-xs sm:text-sm"
          >
            <span>📺</span> Presentation
          </button>
          <button 
            onClick={handleExportVault}
            disabled={isExporting}
            className="px-4 py-2 bg-slate-700 text-white font-bold rounded-lg shadow-lg hover:bg-slate-600 transition-all transform hover:scale-105 flex items-center gap-2 text-xs sm:text-sm"
            title="Export as Obsidian/Markdown Vault"
          >
            {isExporting ? 'Zipping...' : '⬇ Obsidian Vault'}
          </button>
          <button 
            onClick={handlePrint}
            className="px-4 py-2 bg-slate-600 text-white font-bold rounded-lg shadow-lg hover:bg-slate-500 transition-all transform hover:scale-105 text-xs sm:text-sm"
          >
            Print PDF
          </button>
          <button 
            onClick={onContinue}
            className="px-6 py-2 bg-brand-secondary text-white font-bold rounded-lg shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105 flex items-center gap-2 text-xs sm:text-sm"
          >
            Proceed to Kickoff
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      </div>
      
      <div className="bg-brand-light text-brand-dark p-8 rounded-lg space-y-8 print:text-black print:bg-white print:shadow-none">
        {/* Section 1: Initial Idea */}
        <section>
          <h3 className="text-2xl font-bold border-b-2 border-brand-primary pb-2 mb-4">1. Initial Idea</h3>
          <p className="text-lg">{projectData.initialIdea}</p>
        </section>

        {/* Section 2: Brainstorming */}
        {projectData.brainstormingResults && (
          <section>
            <h3 className="text-2xl font-bold border-b-2 border-brand-primary pb-2 mb-4">2. Strategic Analysis</h3>
            
            <h4 className="text-xl font-bold mt-4 mb-2">Target Personas</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {projectData.brainstormingResults.personas.map((p, i) => (
                    <div key={i} className="border p-4 rounded bg-white shadow-sm">
                        <strong className="block text-lg">{p.role}</strong>
                        <p className="text-sm text-gray-700 my-2">{p.description}</p>
                        <ul className="list-disc pl-5 text-sm text-red-700">
                            {p.painPoints.map((pp, pi) => <li key={pi}>{pp}</li>)}
                        </ul>
                    </div>
                ))}
            </div>

            <h4 className="text-xl font-bold mt-4 mb-2">Key Questions</h4>
            <ul className="list-decimal pl-6 mb-4">
                {projectData.brainstormingResults.questions.map((q, i) => <li key={i}>{q}</li>)}
            </ul>

            <h4 className="text-xl font-bold mt-4 mb-2">Unique Selling Propositions</h4>
            <ul className="list-disc pl-6">
                {projectData.brainstormingResults.usps.map((u, i) => <li key={i}>{u}</li>)}
            </ul>
          </section>
        )}

        {/* Section 3: Research Report */}
        {projectData.researchReport && (
          <section>
            <h3 className="text-2xl font-bold border-b-2 border-brand-primary pb-2 mb-4">3. Research & Feasibility Report</h3>
            <div className="prose prose-blue max-w-none">
              <MarkdownRenderer content={projectData.researchReport.summary} />
            </div>
            {projectData.researchReport.sources.length > 0 && (
               <div className="mt-6">
                  <h4 className="text-xl font-semibold">Sources:</h4>
                  <ul className="list-disc pl-6 mt-2">
                     {projectData.researchReport.sources.map((source, i) => (
                       <li key={i}><a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{source.title || source.uri}</a></li>
                     ))}
                  </ul>
               </div>
            )}
          </section>
        )}

        {/* Section 4: Architecture */}
        {projectData.architecture && (
          <section>
            <h3 className="text-2xl font-bold border-b-2 border-brand-primary pb-2 mb-4">4. Architecture & Stack</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div><strong>Frontend:</strong> {projectData.architecture.stack.frontend}</div>
                <div><strong>Backend:</strong> {projectData.architecture.stack.backend}</div>
                <div><strong>Database:</strong> {projectData.architecture.stack.database}</div>
                <div><strong>Deployment:</strong> {projectData.architecture.stack.deployment}</div>
            </div>
            <p className="italic text-gray-700 border-l-4 border-gray-400 pl-4 my-4">{projectData.architecture.stack.rationale}</p>
            
            <h4 className="text-lg font-bold mt-4">Core Dependencies</h4>
            <div className="flex flex-wrap gap-2 mt-2">
                {projectData.architecture.dependencies?.map((d, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">{d.name}</span>
                ))}
            </div>
          </section>
        )}

        {/* Section 5: Cost & Resource Projections */}
        {projectData.costEstimation && (
          <section>
            <h3 className="text-2xl font-bold border-b-2 border-brand-primary pb-2 mb-4">5. Resource & Financial Projections</h3>
            <div className="grid grid-cols-2 gap-8 mb-6">
                <div className="bg-gray-50 p-4 rounded border">
                    <span className="text-xs uppercase font-bold text-gray-500">Estimated Effort</span>
                    <div className="text-2xl font-bold text-brand-primary">{projectData.costEstimation.totalProjectHours}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded border">
                    <span className="text-xs uppercase font-bold text-gray-500">Suggested Team Size</span>
                    <div className="text-2xl font-bold text-brand-primary">{projectData.costEstimation.suggestedTeamSize}</div>
                </div>
            </div>
            <h4 className="text-lg font-bold mb-3">Infrastructure Estimates (Monthly)</h4>
            <table className="min-w-full text-sm text-left text-gray-700 mb-6">
                <thead className="bg-gray-100 uppercase text-xs">
                    <tr>
                        <th className="px-4 py-2">Service</th>
                        <th className="px-4 py-2">Cost Range</th>
                        <th className="px-4 py-2">Allocation Reason</th>
                    </tr>
                </thead>
                <tbody>
                    {projectData.costEstimation.monthlyInfrastructure.map((item, idx) => (
                        <tr key={idx} className="border-b">
                            <td className="px-4 py-2 font-semibold">{item.service}</td>
                            <td className="px-4 py-2">{item.estimatedCost}</td>
                            <td className="px-4 py-2 text-gray-600">{item.reason}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <h4 className="text-lg font-bold mb-3">Operational Risks</h4>
            <ul className="space-y-2">
                {projectData.costEstimation.risks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-3 bg-red-50 p-3 rounded border border-red-100">
                        <span className="font-bold text-red-600 uppercase text-[10px] mt-1">[{risk.impact}]</span>
                        <span className="text-sm">{risk.description}</span>
                    </li>
                ))}
            </ul>
          </section>
        )}

        {/* Section 6: Action Plan */}
        {projectData.actionPlan && (
          <section>
            <h3 className="text-2xl font-bold border-b-2 border-brand-primary pb-2 mb-4">{projectData.costEstimation ? '6' : '5'}. Detailed Action Plan</h3>
            <div className="space-y-6">
              {projectData.actionPlan.map((phase, i) => (
                <div key={i} className="break-inside-avoid">
                  <h4 className="text-xl font-bold mb-2 text-brand-secondary">{`Phase ${i+1}: ${phase.phase_name}`}</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-gray-700">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-200">
                            <tr>
                                <th className="px-4 py-2 w-1/12">Priority</th>
                                <th className="px-4 py-2 w-6/12">Task</th>
                                <th className="px-4 py-2 w-2/12">Role</th>
                                <th className="px-4 py-2 w-2/12">Duration</th>
                            </tr>
                        </thead>
                        <tbody>
                            {phase.tasks.map((task, ti) => (
                                <tr key={ti} className="border-b border-gray-200 hover:bg-gray-50">
                                    <td className="px-4 py-2 font-semibold">{task.priority}</td>
                                    <td className="px-4 py-2">{task.description}</td>
                                    <td className="px-4 py-2 italic">{task.role}</td>
                                    <td className="px-4 py-2">{task.estimatedDuration}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default SpecDocument;
