
# 0relai - User Guide

## Overview
**0relai** (Zero Reliance) is an intelligent "Meta-Architect" designed to help you go from a vague idea to a fully specified technical blueprint. It doesn't just write code; it plans the *entire* architecture so that when you (or an AI agent) start coding, you do it right the first time.

## Navigation & Interface
0relai uses a **stepped vertical navigation bar** on the left side of the screen.
- **Vision:** Input your initial idea.
- **Strategy:** Review personas and USPs.
- **Research:** Feasibility analysis.
- **Stack:** Technical architecture choices and Infrastructure-as-Code (Terraform).
- **Data:** Database schema and diagrams.
- **Files:** Project file structure.
- **Design:** UI/UX tokens, components, and live HTML prototypes.
- **API:** Endpoint specifications.
- **Security:** RLS and testing policies.
- **Studio:** The "God Mode" editor to refine all previous steps and manage versions (Snapshots).
- **Rules:** The generated instructions for your AI agent.
- **Plan:** The execution roadmap.
- **Tasks:** Kanban board for implementation with **Jira/Linear Export**.
- **Launch:** Download your complete code bundle.

## Key Features

### 1. Multi-Modal Intake
*   **Text:** Type your idea in the main input box.
*   **Image:** Upload a whiteboard sketch, napkin drawing, or wireframe. The AI will analyze visual layout hints.
*   **Voice:** Click "Voice Input" to speak your idea. The AI will listen, summarize your concept, and auto-detect constraints.

### 2. Visual Architecture & Diagrams
*   **Interactive Graphs:** In the Architecture and Data Model views, you can drag nodes to rearrange them.
*   **✨ Auto-Organize:** Click the "Organize" button to have the AI intelligently untangle your diagram.
*   **📷 PNG Export:** Download high-resolution images of your architecture to include in external reports.

### 3. Presentation Mode (Pitch Deck)
*   **The Problem:** You need to explain your technical vision to non-technical stakeholders.
*   **The Solution:** Click **"Present Deck"** in the Document phase. 0relai transforms your specs into a beautiful, full-screen slide deck covering Strategy, Architecture, Roadmap, and Costs.

### 4. Blueprint Studio (Refine & Edit)
Once the specs are generated, you enter the **Blueprint Studio**.
*   **Visual vs Code:** Toggle between a friendly UI view and the raw JSON.
*   **Visual Diff:** Compare current changes against saved Snapshots to see exactly what has changed.
*   **Refine with AI:** Don't like a decision? Type a command in the input bar.
    *   *Example:* "Switch the database to PostgreSQL and add a 'comments' table."

### 5. "Self-Healing" Drift Detection
In the **Launch** phase (Verify tab), you can audit your actual code against the plan.
*   **Run `tree`** in your terminal.
*   **Paste the output** into the Drift Analyzer.
*   **Analyze:** 0relai will highlight missing files or unexpected additions.

### 6. Local Intelligence (Beta)
*   Go to **Settings** to initialize the Local Engine (WebLLM).
*   Once loaded (requires ~1.5GB download), you can switch the Assistant Chat to **"Local Architect"**.
*   This allows you to chat with your blueprint data **offline** without sending prompts to the cloud.

### 7. The Handover (Kickoff)
Finally, download the **Developer Bundle (.zip)**.
It includes:
*   `setup_repo.sh`: A script to initialize Git and create the GitHub repo.
*   `package.json` / `requirements.txt`: Your dependency list.
*   `infrastructure/main.tf`: Terraform configuration.
*   `.cursorrules`: The brain for your AI coding assistant.
*   `SPEC.md`: The full human-readable spec.
