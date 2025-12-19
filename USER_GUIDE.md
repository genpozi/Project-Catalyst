
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
*   **Voice:** Click "Record Voice Memo" to speak your idea. The AI will listen, summarize your concept, and auto-detect constraints and project types.

### 2. The Blueprint Generation Loop
The app moves through several technical phases. In each phase, the AI makes decisions based on your initial constraints.
*   **Architecture:** Selection of Tech Stack and generation of `main.tf` Terraform code.
*   **Data Model:** Full database schema creation with Mermaid.js diagrams.
*   **UI/UX:** Design tokens and a live HTML wireframe preview.
*   **Code Forge:** The final bundle includes `package.json` (or `requirements.txt`) and a Git initialization script.

### 3. Blueprint Studio (Refine & Edit)
Once the specs are generated, you enter the **Blueprint Studio**.
*   **Visual vs Code:** Toggle between a friendly UI view and the raw JSON.
*   **Refine with AI:** Don't like a decision? Type a command in the input bar.
    *   *Example:* "Switch the database to PostgreSQL and add a 'comments' table."
*   **Version History:** Create snapshots of your architecture to safely experiment.

### 4. Agent Rules Engine
The app generates a `.cursorrules` (or System Prompt) file.
*   **Usage:** Copy this file into the root of your project when using AI code editors like Cursor, Windsurf, or GitHub Copilot. It prevents the AI from "hallucinating" or using the wrong libraries.

### 5. Workspace & Task Implementation
*   **Kanban Board:** A workspace to track progress.
*   **Export:** Click "Export to Jira/Linear (CSV)" to move your tasks to your project management tool.
*   **Task Assistant:** Click **"Generate Implementation Guide"** on any task to get a specific mini-tutorial.

### 6. The Handover (Kickoff)
Finally, download the **Developer Bundle (.zip)**.
It includes:
*   `setup_repo.sh`: A script to initialize Git and create the GitHub repo.
*   `scaffold.sh`: A script to create your folder structure.
*   `package.json` / `requirements.txt`: Your dependency list.
*   `infrastructure/main.tf`: Terraform configuration.
*   `.cursorrules`: The brain for your AI coding assistant.
*   `SPEC.md`: The full human-readable spec.
