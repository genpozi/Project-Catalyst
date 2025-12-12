
# AI Project Catalyst - Architecture & Internals

## 1. Core Philosophy
The application acts as a state machine where `App.tsx` serves as the central orchestrator (The "Brain"). It manages the `projectData` object, which accumulates technical specifications layer-by-layer as the user progresses through the `AppPhase` lifecycle.

## 2. State Management
*   **Central Store:** `App.tsx` holds the `projectData` state.
*   **Persistence:** `localStorage` is used to persist state between reloads via the `SAVED_STATE_KEY`.
*   **Data Flow:** Components (Views) receive `projectData` slices as props and trigger updates via callback functions (e.g., `onContinue`, `onUpdate`).

## 3. The Generation Pipeline
Each phase triggers a call to the Google Gemini API to generate the next layer of the spec.
*   **Prompt Engineering:** Prompts are constructed dynamically in `App.tsx` using the accumulated context from previous phases (e.g., The Schema generation prompt injects the selected Tech Stack).
*   **Structured Output:** We leverage Gemini's `responseSchema` to ensure strict JSON output for critical data structures (Schema, API Spec, Design System).
*   **Thinking Config:** For complex tasks (Architecture, Security), we use `thinkingBudget` to enable the model's reasoning capabilities.

## 4. Component Structure
*   **Views:** Located in `components/`, these are largely presentational but handle some local UI state (e.g., Tabs in `DataModelView`).
*   **Blueprint Studio:** A wrapper component that allows "Refinement Loops". It renders the standard Views but in a "Studio Mode" (actions hidden) alongside a JSON editor and an AI prompting interface.
*   **Kanban Board:** Handles the execution phase. It introduces a secondary AI loop ("Task Assistant") which generates implementation guides on demand.

## 5. Key Data Structures (`types.ts`)
*   `ProjectData`: The master object containing all specs.
*   `ArchitectureData`: Tech stack and patterns.
*   `SchemaData`: Database tables and diagrams.
*   `FileNode`: Recursive file tree structure.
*   `DesignSystem`: UI tokens and components.
*   `Task`: Individual units of work for the Kanban board.

## 6. API Integration
*   **Client:** `@google/genai` SDK.
*   **Model:** Primarily `gemini-2.5-flash` for speed and `thinking` capabilities.
*   **Audio:** Native audio ingestion via `inlineData` in `handleAnalyzeAudio`.

## 7. Contribution Guidelines
*   **Adding a Phase:**
    1. Add the enum to `AppPhase` in `types.ts`.
    2. Create a View component.
    3. Add a generation handler in `App.tsx`.
    4. Update `renderCurrentPhase` in `App.tsx`.
*   **Styling:** Tailwind CSS is used exclusively.
