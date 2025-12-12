
# Project Vision: 0relai (Zero Reliance)

## Executive Summary
This project aims to evolve the current prototype into a **high-fidelity Specification Engine**. 
**Goal:** To ingest abstract human ideas and output a rigorous, technically precise "Blueprint Package." 
**Value:** This blueprint is designed specifically to be consumed by AI Coding Agents (GitHub Copilot, Claude Code, Cursor, Windsurf). By defining the boundaries, schema, stack, and rules explicitly, we minimize AI hallucination and maximize one-shot code generation success.

The tool acts as a "Genius Full-Stack Architect," making high-level technical decisions so the coding agents can focus on implementation.

---

## The 10-Epic Development Roadmap

### EPIC 1: Context Ingestion & Intent Analysis [COMPLETED]
**Goal:** Move beyond a simple text box to a multi-modal intake system that understands the *nuance* of the product.
*   **Features:**
    *   **Multi-modal Input:** Accept text descriptions, uploaded wireframes (images), and voice memos.
    *   **Constraint Definition:** specific inputs for "Non-negotiables" (e.g., "Must use Supabase", "Must be Mobile First").
    *   **Audience Profiling:** AI analysis of the target user to influence UX decisions.

### EPIC 2: Intelligent Stack & Architecture Resolution [COMPLETED]
**Goal:** The AI must act as a CTO, selecting the best tools for the job based on the Intent Manifest.
*   **Features:**
    *   **Stack Recommender:** Suggests specific versions (e.g., "React 19", "Next.js 14 App Router", "Tailwind 3.4") based on requirements (SEO vs. SPA, Real-time vs. Static).
    *   **Architecture Patterns:** Selects patterns (Monolith, Microservices, Serverless) and justifies the choice.
    *   **Dependency Locking:** Generates a preliminary `package.json` dependency list to prevent version conflicts in future AI generation.

### EPIC 3: Data Model & Schema Engineering [COMPLETED]
**Goal:** Design the database structure before a single line of code is written.
*   **Features:**
    *   **Schema Visualization:** Generate Mermaid.js Entity-Relationship Diagrams (ERD).
    *   **Schema Code Generation:** Output raw `schema.prisma` or SQL DDL.
    *   **Relationship Mapping:** Explicitly define One-to-Many, Many-to-Many relationships and foreign keys.

### EPIC 4: The "Virtual File Tree" Generator [COMPLETED]
**Goal:** Create the mental map of the project structure for the coding agent.
*   **Features:**
    *   **ASCII Tree Generation:** A complete, standard-compliant file structure (e.g., `src/components`, `src/lib`, `src/hooks`).
    *   **File Purpose Descriptions:** A metadata layer explaining *what* goes in `utils/helpers.ts` vs `lib/utils.ts` to prevent circular dependencies.
    *   **Convention Enforcement:** Enforcing naming conventions (PascalCase for components, camelCase for functions).

### EPIC 5: UI/UX System & Design Tokens [COMPLETED]
**Goal:** Define the "Look and Feel" in machine-readable formats.
*   **Features:**
    *   **Design System Generator:** specific Tailwind color palettes, typography scales, and border radii.
    *   **Component Library Definition:** A list of required atomic components (Buttons, Inputs, Modals) and their variant states (Hover, Active, Disabled).
    *   **Layout Specifications:** Flexbox/Grid strategies for main layouts.

### EPIC 6: API Surface & Logic Flow Specification [COMPLETED]
**Goal:** Define how data moves between client and server.
*   **Features:**
    *   **Endpoint Definition:** OpenAPI/Swagger-style paths, methods (GET/POST), and expected payloads.
    *   **Server Action/Mutation Plans:** specific logic flows for backend operations.
    *   **State Management Strategy:** deciding between Context API, Zustand, or Redux.

### EPIC 7: The "Agent Rules" Engine (.cursorrules / System Prompts) [COMPLETED]
**Goal:** The most critical feature. Generating the *instructions* for the next AI.
*   **Features:**
    *   **Rule Compilation:** Aggregating Epics 2-6 into a single `SYSTEM_PROMPT.md` or `.cursorrules` file.
    *   **Coding Standards:** Explicit instructions on "No `any` types", "Use arrow functions", "Error handling patterns".
    *   **Tech-Specific Instructions:** e.g., "When using Next.js, use `next/image` for all images."

### EPIC 8: Security, Testing & Compliance Matrix [COMPLETED]
**Goal:** ensuring production-readiness is baked in, not bolted on.
*   **Features:**
    *   **RLS (Row Level Security) Policies:** Defining who can see what data.
    *   **Testing Strategy:** generating a list of critical Unit and E2E tests required (e.g., "Test Login Flow", "Test Payment Webhook").
    *   **Validation Rules:** Zod schemas for form inputs.

### EPIC 9: Interactive Blueprint Studio (The UI) [COMPLETED]
**Goal:** A specialized IDE-like interface for the human to review and tweak the AI's architectural decisions.
*   **Features:**
    *   **Split View:** Visual Tree vs. Code Specs.
    *   **Edit-in-Place:** JSON editor for power users.
    *   **Regenerate Context:** "Refine with AI" logic to update specific sections (e.g., "Switch to PostgreSQL").

### EPIC 10: The "Handover" Package & Integration [COMPLETED]
**Goal:** delivering the payload to the developer or the next AI.
*   **Features:**
    *   **Downloadable Zip:** Contains `scaffold.sh`, `README.md`, `SPEC.md`, `schema.prisma`, `package.json`, and `.cursorrules`.
    *   **Copy-Paste Context:** One-click copy formatted specifically for AI context windows.

### EPIC 11: Task Planning & Execution [COMPLETED]
**Goal:** Bridge the gap between spec and code.
*   **Features:**
    *   **Action Plan:** Broken down phases with estimates.
    *   **Workspace:** Kanban board for managing tasks.
    *   **Task Implementation Assistant:** AI generates specific code guides for individual tasks.

---

## Status
All core epics have been implemented as of the latest build. The application now supports full end-to-end specification generation with voice input, refinement loops, and detailed export capabilities.
