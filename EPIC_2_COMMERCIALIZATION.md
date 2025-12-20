
# EPIC 2: Commercialization & Hardening (Research & RFC)

## 🎯 Objective
Transition 0relai from a single-player utility to a viable SaaS business with team collaboration capabilities.

## 1. Membership & Pricing Models

### Status: ✅ Implemented (Phase 12.1)

### Requirements
*   **Minimal Free Tier:** Local Intelligence (WebLLM) is free. Cloud Intelligence (Gemini Pro) is limited. 1 Active Project.
*   **Pro Tier:** Unlimited Cloud Intelligence, Cloud Sync, Private Projects.
*   **Team Tier:** Shared Workspaces, Role-Based Access Control (RBAC).

### Implementation Details
*   **State:** `UserProfile` in `types.ts` tracks `projectsUsed` and `tier`.
*   **Gating:** `ProjectContext` enforces `canCreateProject` check before `RESET_PROJECT` or `IMPORT` actions.
*   **UI:** `UpgradeModal` handles the upsell flow. `SettingsModal` displays usage metrics.

## 2. Team Workflows & Data Architecture

### Status: 🚧 In Progress (Phase 12.2)

### Requirements
*   A user can belong to multiple **Organizations**.
*   A project belongs to an **Organization** (or a personal scope).
*   **Roles:** Admin (Billing), Editor (Write), Viewer (Read).

### Research Topics
*   **Database Refactor:**
    *   Current: `projects` table has `user_id`.
    *   Future: `projects` table needs `organization_id`. `organization_members` table links `users` to `organizations` with `role`.
*   **RLS Complexity:** Writing Supabase Row Level Security policies for "User is member of Org that owns Project" is complex and performance-sensitive.
*   **Concurrent Editing:**
    *   *Problem:* Two users edit the Architecture Diagram at once. Last save overwrites.
    *   *Solution A (Easy):* Field locking. "User A is editing Architecture".
    *   *Solution B (Hard):* Y.js / CRDTs for real-time multiplayer editing.

## 3. Hardening & Security

### Open Items
*   **API Key Protection:** Currently, `process.env.API_KEY` is bundled in the frontend (if not using a proxy). This is insecure for a public app. 
    *   *Fix:* Move Gemini calls to Supabase Edge Functions.
*   **Data Residency:** If selling to Enterprise, do we need to store data in EU vs US?
*   **Drift Detection Logic:** The current `bridge.js` is naive. It needs to handle `.gitignore` robustly and avoid infinite loops when the agent writes files.
