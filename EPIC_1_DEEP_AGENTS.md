
# EPIC 1: Deep Agentic Capability (The Magic)

## 🧠 Philosophy: "Late 2025" Agent Thinking
In late 2025, an AI tool is not a chatbot that waits for a prompt. It is a **proactive system** that:
1.  **Reflects:** Checks its own output for errors before displaying it.
2.  **Collaborates:** Simulates a team of experts debating a problem to find edge cases.
3.  **Acts:** Directly manipulates the environment (Files, Git) rather than just suggesting edits.

## 📍 Phase 11.1: The Council (Multi-Agent Debate)

### Concept
When a user asks a complex question (e.g., "How should I handle auth?"), 0relai spawns three personas:
1.  **The Architect:** Proposes a solution (e.g., "Use NextAuth").
2.  **The Skeptic (Security):** Attacks the solution (e.g., "NextAuth with JWTs has revocation issues").
3.  **The Pragmatist (DevOps):** Evaluates cost/complexity (e.g., "NextAuth is cheap, but Keycloak is better for enterprise").

### Technical Implementation
*   **Orchestrator:** A new service (`AgentOrchestrator.ts`) that manages the message loop.
*   **Prompt Chain:** 
    1.  `User Query` -> `Architect` -> `Proposal`.
    2.  `Proposal` -> `Security` -> `Critique`.
    3.  `Proposal` + `Critique` -> `Synthesizer` -> `Final Recommendation`.
*   **UI:** A "Council View" component. The user watches the debate unfold in real-time (messages stream in from different avatars).

## 📍 Phase 11.2: Tool Use & Verification

### Concept
The agent should never output code that doesn't compile.
*   **WebContainers:** Integrate StackBlitz's WebContainer API. When the agent generates a React component, it spins up a micro-container in the background, runs `npm run build`, and only presents the code if it passes.
*   **MCP (Model Context Protocol):** Use the emerging MCP standard to define tools. The Local Bridge (`bridge.js`) becomes an MCP Server, allowing the Web-based AI to query local files using a standardized schema.

## 📍 Phase 11.3: Git-Native Integration

### Concept
The "Export ZIP" workflow is friction. The goal is **"One-Click PR"**.

### User Story
1.  User enters `Blueprint Studio`.
2.  User clicks "Implement Auth Task".
3.  Agent generates code and tests it.
4.  Agent says: *"I have created a branch `feat/auth-setup` and committed 4 files. Ready to open PR?"*
5.  User clicks "Approve".
6.  A GitHub Pull Request link appears.

### Technical Stack
*   **GitHub App:** Create a dedicated 0relai GitHub App for granular permissions.
*   **Octokit:** Use `octokit.js` in the browser (proxied via Supabase Edge Functions to hide secrets) to perform Git operations.
