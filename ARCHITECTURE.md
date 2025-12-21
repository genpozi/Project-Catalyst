
# 0relai - System Architecture

## 1. High-Level Overview
0relai operates as a **Local-First Progressive Web App (PWA)**. It prioritizes local execution (IndexedDB, WebGPU, WebContainers) but leverages the cloud (Supabase, Gemini API) for persistence, collaboration, and heavy reasoning.

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

### 2.3 Edge Runtime (`WebContainerService`)
*   **Technology:** WebContainer API (StackBlitz). Runs a micro-kernel in the browser.
*   **Lifecycle:**
    1.  **Boot:** Initializes the runtime (requires COOP/COEP headers).
    2.  **Mount:** Maps the `ProjectData.fileStructure` to the container's virtual filesystem.
    3.  **Shell:** Spawns `jsh` processes connected to `XTerm.js` in the UI.
    4.  **Sync:** Allows reading the container's filesystem state back into the React App via `getSnapshot()`.

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
*   **Isolation:** WebContainers run in a secure sandbox. They cannot access the host machine's files directly (unlike the Bridge).

## 5. Database Schema (Supabase)
The cloud backend relies on the following PostgreSQL schema.

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

-- 2. Organization Members
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,
  user_id uuid references auth.users not null,
  role text check (role in ('Owner', 'Admin', 'Member', 'Viewer')),
  joined_at timestamptz default now()
);
```

## 6. Directory Structure
```
src/
├── components/       # UI Views (ArchitectureView, DevConsole, etc.)
├── utils/
│   ├── db.ts         # IndexedDB wrapper
│   ├── cloudStorage.ts # Supabase Sync Logic
│   ├── WebContainerService.ts # Browser Runtime Logic
│   └── projectFileSystem.ts # Virtual File System generator
├── GeminiService.ts  # Cloud AI Logic
├── LocalIntelligence.ts # WebGPU Logic
└── ProjectContext.tsx # Global State
```
