
# 0relai - Agentic Development Specifications

## 1. System Overview
**0relai** is a client-side, AI-powered architectural engine (PWA). It transforms abstract user inputs into structured JSON blueprints, visual diagrams, and code artifacts.

### 1.1 Core Principles
1.  **Strict Schema Adherence:** All AI generation MUST output valid JSON conforming to `types.ts`.
2.  **Hybrid Intelligence:** Use Local LLM for privacy/speed; Cloud Gemini for complex reasoning.
3.  **Single Source of Truth:** The `ProjectData` object.
4.  **Safe Generation:** AI code suggestions must use the `DiffViewer` flow.

---

## 2. Technical Stack

| Component | Technology | Constraint |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite | Functional Components only. |
| **State** | React Context | Actions dispatched via `useReducer`. |
| **Styling** | Tailwind CSS | Follow `brand-*` tokens. |
| **Cloud DB** | Supabase | RLS enabled. Use `supabaseClient` wrapper. |
| **Local AI** | WebLLM | `gemma-2b-it-q4f32_1-MLC`. |
| **Cloud AI** | Google GenAI | `gemini-3-pro-preview` for reasoning. |

---

## 3. Data Architecture (`ProjectData`)

### 3.1 Primary Data Model
Agents modifying state must adhere to the `ProjectData` interface.
*   **`id`**: UUID (local or cloud).
*   **`collaborators`**: Array of users with roles.
*   **`architecture.visualLayout`**: Stores Node graph positions.

### 3.2 State Updates
*   **NEVER** mutate state directly.
*   **ALWAYS** use `dispatch({ type: 'ACTION_NAME', payload: ... })`.
*   **Cloud Sync:** Is handled automatically by `ProjectContext` effects. Do not manually call `cloudStorage.saveProject` inside components unless forcing an immediate save.

---

## 4. AI Service Integration Patterns

### 4.1 Schema-First Generation
When generating structural data, use `responseSchema` in `GeminiService.ts`.

### 4.2 Thinking Budget
For complex tasks (Security Audit, Code Gen), enforce deep reasoning:
```typescript
config: { thinkingConfig: { thinkingBudget: 8000 } }
```

### 4.3 Context Injection
Use `getKnowledgeContext()` to inject RAG data (Knowledge Base docs) into prompts.

---

## 5. UI/UX Patterns

### 5.1 The "Glass" Aesthetic
*   **Backgrounds:** `bg-[#0b0e14]`.
*   **Panels:** `glass-panel` class or `bg-slate-900/50 border-white/5`.

### 5.2 Safe Editors
*   **Code:** Use `components/CodeEditor.tsx`.
*   **Diff:** If overwriting user content, present a `DiffViewer` first.

---

## 6. Workflow for New Features
1.  **Define Type:** Update `types.ts`.
2.  **Add Reducer Action:** Update `ProjectContext.tsx`.
3.  **Implement View:** Create component.
4.  **Add AI Logic:** Update `GeminiService.ts`.
5.  **Validate:** Update `utils/validators.ts`.
