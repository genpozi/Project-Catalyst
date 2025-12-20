
# 0relai - Architecture & Internals

## 1. Core Philosophy
The application acts as a state machine where `App.tsx` serves as the central orchestrator (The "Brain"). It manages the `projectData` object, which accumulates technical specifications layer-by-layer as the user progresses through the `AppPhase` lifecycle.

## 2. State Management
*   **Central Store:** `App.tsx` holds the `projectData` state via `ProjectContext`.
*   **Persistence:** `IndexedDB` (via `utils/db.ts`) is used for robust local storage of projects and files.
*   **Data Flow:** Components (Views) receive `projectData` slices as props and trigger updates via callback functions.

## 3. The Intelligence Layer
0relai uses a Hybrid Intelligence approach:

### Cloud Intelligence (`GeminiService.ts`)
*   **Client:** `@google/genai` SDK.
*   **Models:** 
    *   `gemini-3-flash-preview`: High-speed generation (JSON Schemas, Layouts).
    *   `gemini-3-pro-preview`: Complex reasoning (Architecture, Security, Code).
    *   `gemini-2.5-flash-native-audio-preview`: Real-time Voice/Audio (Live Architect).

### Local Intelligence (`LocalIntelligence.ts`)
*   **Client:** `@mlc-ai/web-llm`.
*   **Model:** `gemma-2b-it-q4f32_1-MLC` (Quantized).
*   **Function:** Runs entirely in the browser via WebGPU. Used for privacy-sensitive chat and offline drafting.

## 4. Component Structure
*   **Views:** Located in `components/`, these handle specific phases (e.g., `ArchitectureView`, `KanbanBoard`).
*   **Visual Editors:** Specialized components for manipulating graph data (`VisualArchitecture`, `VisualERD`, `VisualGantt`).
*   **PresentationDeck:** A full-screen overlay component that consumes `ProjectData` to render a slide deck.
*   **Blueprint Studio:** A wrapper component that allows "Refinement Loops" and manages Version History (Snapshots).

## 5. Key Data Structures (`types.ts`)
*   `ProjectData`: The master object containing all specs.
*   `ArchitectureData`: Tech stack, patterns, and IaC code.
*   `SchemaData`: Database tables and diagrams.
*   `FileNode`: Recursive file tree structure.
*   `DesignSystem`: UI tokens, components, and wireframe HTML.
*   `Task`: Individual units of work for the Kanban board.

## 6. Code Generation Strategy
Code generation happens at two levels:
1.  **Atomic Snippets:** Generated during the "Workspace" phase for individual tasks using `gemini-3-pro`.
2.  **Scaffolding:** Generated during the "Kickoff" phase (`kickoffAssets`, `devOpsConfig`) to ensure the foundation matches the final architecture.
3.  **Virtual Filesystem:** `utils/projectFileSystem.ts` merges the static scaffold with dynamic task snippets into a unified file tree for the final ZIP export.

## 7. Contribution Guidelines
*   **Adding a Phase:**
    1. Add the enum to `AppPhase` in `types.ts`.
    2. Create a new View component.
    3. Add a generation handler in `App.tsx`.
    4. Update `Sidebar.tsx`.
*   **Styling:** Tailwind CSS is used exclusively.
