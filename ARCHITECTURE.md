
# 0relai - Architecture & Internals

## 1. Core Philosophy
The application acts as a state machine where `App.tsx` serves as the central orchestrator (The "Brain"). It manages the `projectData` object, which accumulates technical specifications layer-by-layer as the user progresses through the `AppPhase` lifecycle.

## 2. State Management
*   **Central Store:** `App.tsx` holds the `projectData` state via `ProjectContext`.
*   **Persistence:** `localStorage` is used to persist state.
*   **Data Flow:** Components (Views) receive `projectData` slices as props and trigger updates via callback functions.

## 3. The Generation Pipeline
Each phase triggers a call to the Google Gemini API to generate the next layer of the spec.
*   **GeminiService:** A dedicated service class that abstracts all API interactions.
*   **Thinking Config:** For complex tasks (Architecture, Security), we use `thinkingBudget` (Gemini 2.0 Flash Thinking/Pro) to enable reasoning.
*   **Code Forge:** Dynamic generation of `package.json`, `setup_repo.sh`, and `main.tf` happens during the final Kickoff phase to ensure all architectural decisions are captured.

## 4. Component Structure
*   **Views:** Located in `components/`, these handle specific phases (e.g., `ArchitectureView`, `KanbanBoard`).
*   **Blueprint Studio:** A wrapper component that allows "Refinement Loops" and manages Version History (Snapshots).
*   **RefineBar:** A reusable component that sends natural language modification requests to the AI to update specific JSON slices.

## 5. Key Data Structures (`types.ts`)
*   `ProjectData`: The master object containing all specs.
*   `ArchitectureData`: Tech stack, patterns, and IaC code.
*   `SchemaData`: Database tables and diagrams.
*   `FileNode`: Recursive file tree structure.
*   `DesignSystem`: UI tokens, components, and wireframe HTML.
*   `Task`: Individual units of work for the Kanban board.

## 6. API Integration
*   **Client:** `@google/genai` SDK.
*   **Models:** 
    *   `gemini-3-flash-preview` for high-speed JSON generation.
    *   `gemini-3-pro-preview` for complex reasoning (Architecture, Security).
    *   `gemini-2.5-flash-native-audio-preview` for voice input analysis.

## 7. Contribution Guidelines
*   **Adding a Phase:**
    1. Add the enum to `AppPhase` in `types.ts`.
    2. Create a View component.
    3. Add a generation handler in `App.tsx`.
    4. Update `Sidebar.tsx`.
*   **Styling:** Tailwind CSS is used exclusively.
