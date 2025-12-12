
# AI Project Catalyst - User Guide

## Overview
AI Project Catalyst is an intelligent "Meta-Architect" designed to help you go from a vague idea to a fully specified technical blueprint. It doesn't just write code; it plans the *entire* architecture so that when you (or an AI agent) start coding, you do it right the first time.

## Key Features

### 1. Multi-Modal Intake
*   **Text:** Type your idea in the main input box.
*   **Image:** Upload a whiteboard sketch, napkin drawing, or wireframe. The AI will analyze visual layout hints.
*   **Voice:** Click "Record Voice Memo" to speak your idea. The AI will listen, summarize your concept, and auto-detect constraints and project types.

### 2. Strategic Analysis (Brainstorming)
Before jumping to code, the AI acts as a Product Manager. It generates:
*   **User Personas:** Who are you building for?
*   **USPs:** What makes this unique?
*   **Critical Questions:** Gaps in your logic you need to address.

### 3. The Blueprint Generation Loop
The app moves through several technical phases. In each phase, the AI makes decisions based on your initial constraints.
*   **Research:** Competitor analysis and feasibility check (using Google Search).
*   **Architecture:** Selection of Tech Stack (Frontend, Backend, DB) and design patterns.
*   **Data Model:** Full database schema creation with Mermaid.js diagrams.
*   **File Structure:** A complete, recursive file tree optimized for your chosen framework.
*   **UI/UX:** Design tokens (colors, typography) and component library definitions.
*   **API Spec:** RESTful endpoint definitions and auth strategies.
*   **Security:** RLS policies and testing strategies.

### 4. Blueprint Studio (Refine & Edit)
Once the specs are generated, you enter the **Blueprint Studio**.
*   **Visual vs Code:** Toggle between a friendly UI view and the raw JSON.
*   **Refine with AI:** Don't like a decision? Type a command in the input bar at the bottom.
    *   *Example:* "Switch the database to PostgreSQL and add a 'comments' table."
    *   *Example:* "Make the design system dark-mode themed with neon accents."
    *   The AI will intelligently update *only* that section while keeping the rest of the project context intact.

### 5. Agent Rules Engine
This is the "Secret Sauce." The app generates a `.cursorrules` (or System Prompt) file. This file contains the distilled essence of every decision made so far (Schema, Stack, API, Design).
*   **Usage:** Copy this file into the root of your project when using AI code editors like Cursor, Windsurf, or GitHub Copilot. It prevents the AI from "hallucinating" or using the wrong libraries.

### 6. Workspace & Task Implementation
*   **Action Plan:** A phased roadmap of tasks.
*   **Kanban Board:** A workspace to track progress.
*   **Task Assistant:** Click any task card to open the detail view. Click **"Generate Implementation Guide"**. The AI will write a specific mini-tutorial for *that exact task*, using your project's specific schema and stack.

### 7. The Handover (Kickoff)
Finally, download the **Developer Bundle (.zip)**.
It includes:
*   `scaffold.sh`: A script to create your folder structure.
*   `package.json` / `requirements.txt`: Your dependency list.
*   `README.md`: Project documentation.
*   `.cursorrules`: The brain for your AI coding assistant.
*   `SPEC.md`: The full human-readable spec.

## Best Practices
*   **Be specific in constraints:** If you hate TypeScript, say "No TypeScript" in the constraints box at the start.
*   **Refine often:** Use the Blueprint Studio to tweak the Architecture before generating the Action Plan.
*   **Use the generated rules:** The `.cursorrules` file is the most valuable asset. It aligns your coding environment with the architecture.
