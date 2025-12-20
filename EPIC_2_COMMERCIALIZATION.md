
# EPIC 2: Commercialization & Hardening (Research & RFC)

## 🎯 Objective
Transition 0relai from a single-player utility to a viable SaaS business with team collaboration capabilities.

## 1. Membership & Pricing Models

### Requirements
*   **Minimal Free Tier:** Local Intelligence (WebLLM) is free. Cloud Intelligence (Gemini Pro) is severely rate-limited or disabled.
*   **Pro Tier:** Unlimited Cloud Intelligence, Cloud Sync, Private Projects.
*   **Team Tier:** Shared Workspaces, Role-Based Access Control (RBAC).
*   **Top-Ups:** Since high-reasoning models (Gemini 1.5/2.0 Pro) are expensive, heavy users may need token top-ups.

### Research Topics
*   **Stripe Integration:**
    *   *Checkout Sessions:* For handling initial subscription.
    *   *Customer Portal:* Allow users to cancel/upgrade self-serve.
    *   *Webhooks:* Need a Supabase Edge Function to listen for `invoice.payment_succeeded` to update the `projects` table quotas.
*   **Usage Metering:** How do we count tokens per user? 
    *   *Idea:* Intermediate proxy (Edge Function) between Client and Gemini API to log token usage to Supabase.

## 2. Team Workflows & Data Architecture

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
