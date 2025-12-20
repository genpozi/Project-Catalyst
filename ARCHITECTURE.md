
# 0relai - System Architecture

## 1. High-Level Overview
0relai operates as a **Local-First Progressive Web App (PWA)**. It prioritizes local execution (IndexedDB, WebGPU) but leverages the cloud (Supabase, Gemini API) for persistence, collaboration, and heavy reasoning.

## 2. Core Components

### 2.1 State Management ("The Brain")
*   **Store:** React Context (`ProjectContext`) + `useReducer`.
*   **Persistence:**
    *   **L1 (Hot):** React State (Memory).
    *   **L2 (Warm):** `IndexedDB` (via `idb`) for offline persistence.
    *   **L3 (Cold):** `Supabase` (PostgreSQL) for cross-device sync.
*   **Sync Logic:** `CloudStorageService` handles the "Platform > BYOB > Local" resolution strategy.

### 2.2 Intelligence Layer (Hybrid)
*   **Router:** `GeminiService` decides where to route prompts based on complexity and privacy settings.
*   **Cloud (High IQ):** Google Gemini 2.0 (Flash/Pro) via `@google/genai`. Used for:
    *   Complex Architecture generation.
    *   Security Audits.
    *   Code Scaffolding.
*   **Local (Privacy):** WebLLM (`gemma-2b-it-q4f32_1`). Used for:
    *   Context-aware Chat (RAG).
    *   Refinement loops.
    *   Offline drafting.

### 2.3 Visual Engine
*   **Technology:** [React Flow](https://reactflow.dev) (WebGL-ready Canvas).
*   **Capabilities:** Handles large graphs (>100 nodes), automatic layout optimization, and image export.
*   **Presentation:** `PresentationDeck` overlays the UI state to create slide-like views.

### 2.4 The Bridge (`CLISyncService`)
A WebSocket client running in the browser that connects to a local Node.js server (`bridge.js`).
*   **Read:** Receives `tree` output and file content from disk.
*   **Write:** Pushes generated code directly to the user's filesystem.
*   **Drift:** `DriftAnalyzer` compares the `ProjectData` spec against the actual file tree.

## 3. Data Model (`types.ts`)
The `ProjectData` object is the single source of truth. Key sub-structures:
*   `architecture`: Stack, Patterns, Diagram Nodes (x/y coords).
*   `schema`: Database tables, columns, relations.
*   `fileStructure`: Recursive file tree with content stubs.
*   `devOpsConfig`: Dockerfiles, CI/CD YAML.
*   `tasks`: Kanban items linked to phases.

## 4. Security Model
*   **Authentication:** Supabase Auth (Magic Link).
*   **Authorization:** Row Level Security (RLS) on `public.projects` table.
    *   `auth.uid() = user_id` for CRUD.
    *   `is_public = true` for Marketplace viewing.
*   **API Keys:** Gemini API keys are injected via `process.env` in build, but `CloudStorageService` supports "Bring Your Own Key" (BYOK) patterns for the Supabase connection if configured manually.

## 5. Database Schema (Supabase)
The cloud backend relies on the following PostgreSQL schema. If using BYOB (Bring Your Own Backend), ensure these tables exist.

```sql
-- 1. Projects Table
create table public.projects (
  id text primary key,
  user_id uuid references auth.users not null,
  name text,
  description text,
  data jsonb, -- Stores the entire ProjectData object
  is_public boolean default false,
  likes int default 0,
  created_at timestamptz default now(),
  last_updated timestamptz default now()
);

-- 2. Profiles Table
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  display_name text,
  avatar_url text
);

-- RLS Policies
alter table public.projects enable row level security;
create policy "Users can CRUD their own projects" on public.projects for all using (auth.uid() = user_id);
create policy "Public projects are viewable by everyone" on public.projects for select using (is_public = true);
```

## 6. Directory Structure
```
src/
├── components/       # UI Views (ArchitectureView, KanbanBoard, etc.)
├── utils/
│   ├── db.ts         # IndexedDB wrapper
│   ├── cloudStorage.ts # Supabase Sync Logic
│   ├── validators.ts # JSON Schema validation
│   └── projectFileSystem.ts # Virtual File System generator
├── GeminiService.ts  # Cloud AI Logic
├── LocalIntelligence.ts # WebGPU Logic
└── ProjectContext.tsx # Global State
```
