
import { GeminiService } from "../GeminiService";
import { AGENT_PERSONAS, AgentRoleId } from "./agentPersonas";
import { ProjectData } from "../types";
import { cleanAndParseJson } from "./safeJson";
import { getToolsForRole } from "./tools";

interface CouncilStep {
    roleId: AgentRoleId;
    response: string;
    proposal?: Partial<ProjectData>;
    proposalSummary?: string;
}

export class AgentOrchestrator {
    private gemini: GeminiService;

    constructor() {
        this.gemini = new GeminiService();
    }

    /**
     * Orchestrates a debate between multiple agents.
     * Yields partial results as each agent completes their turn.
     * 
     * Flow:
     * 1. Architect proposes solution.
     * 2. Security critiques.
     * 3. DevOps critiques.
     * 4. Chairperson synthesizes and potentially proposes JSON actions.
     */
    async *runCouncil(userQuery: string, projectData: ProjectData): AsyncGenerator<CouncilStep, void, unknown> {
        const history: string[] = [`User Query: "${userQuery}"`];

        // Helper to run an agent turn
        const runTurn = async (role: AgentRoleId, prompt: string) => {
            const persona = AGENT_PERSONAS[role];
            const tools = getToolsForRole(role);
            return this.gemini.generateAgentTurn(
                persona.systemPrompt(projectData),
                prompt,
                tools,
                projectData
            );
        };

        // 1. The Architect
        const archResponse = await runTurn('ARCHITECT', `
        User Request: "${userQuery}"
        
        Task: Provide a high-level architectural proposal to address this request. Focus on patterns and stack choices.
        If you need to check existing docs or files, use your tools.
        `);
        history.push(`Architect Proposed:\n${archResponse}`);
        yield { roleId: 'ARCHITECT', response: archResponse };

        // 2. The Skeptic (Security)
        const secResponse = await runTurn('SECURITY', `
        Review the Architect's proposal for the user request: "${userQuery}"
        
        Architect's Proposal:
        ${archResponse}
        
        Task: Identify security risks, vulnerabilities, or compliance issues in this proposal.
        Check the knowledge base for existing security policies if needed.
        `);
        history.push(`Security Critique:\n${secResponse}`);
        yield { roleId: 'SECURITY', response: secResponse };

        // 3. The Pragmatist (DevOps)
        const opsResponse = await runTurn('DEVOPS', `
        Review the proposal and security critique for: "${userQuery}"
        
        Architect's Proposal:
        ${archResponse}
        
        Security Critique:
        ${secResponse}
        
        Task: Assess operational complexity, deployment feasibility, and maintenance burden. Point out if the security requests are too heavy.
        `);
        history.push(`DevOps Critique:\n${opsResponse}`);
        yield { roleId: 'DEVOPS', response: opsResponse };

        // 4. The Synthesizer (Chairperson)
        const chairResponse = await runTurn('CHAIRPERSON', `
        You have heard the council debate regarding: "${userQuery}"
        
        Transcript:
        ${history.join('\n\n')}
        
        Task: Synthesize a final, binding decision. Incorporate the Architect's vision but modify it to address valid Security and DevOps concerns. Provide clear actionable steps.
        
        IMPORTANT: If you recommend changing the project state (like changing the stack, adding database tables, etc.), you MUST output a JSON block at the end of your response with the updates.
        `);
        
        // Check for JSON Proposal
        const jsonMatch = chairResponse.match(/```json\s*([\s\S]*?)\s*```/i);
        let proposal: any = undefined;
        let summary: string | undefined = undefined;

        if (jsonMatch) {
            try {
                proposal = cleanAndParseJson(jsonMatch[0]);
                if (proposal._summary) {
                    summary = proposal._summary;
                    delete proposal._summary;
                }
            } catch (e) {
                console.warn("Failed to parse Chairperson proposal JSON", e);
            }
        }

        yield { 
            roleId: 'CHAIRPERSON', 
            response: chairResponse.replace(/```json[\s\S]*```/g, ''), // Clean response for display
            proposal,
            proposalSummary: summary
        };
    }
}

export const orchestrator = new AgentOrchestrator();
