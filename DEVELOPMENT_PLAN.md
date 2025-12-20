
# 0relai - Master Development Plan & Roadmap

## 🎯 Executive Summary
**0relai (Zero Reliance)** is an AI-powered "Meta-Architect" designed to guide developers from abstract ideas to fully specified, production-ready blueprints. It operates on a **Hybrid Intelligence** model, leveraging Cloud AI for reasoning and Local AI for privacy.

---

## 🗺️ Completed Foundations (Phases 1-9)

- [x] **Core Engine:** Hybrid AI Router (Gemini + WebLLM), Project State Machine.
- [x] **Visual Suite:** React Flow Architecture & ERD Designers, Gantt Charts.
- [x] **Data Integrity:** Supabase Sync, Local-First Persistence, Drift Detection.
- [x] **UX/UI:** Glassmorphic Interface, Toast System, Command Palette.
- [x] **Resilience:** Retry logic, Error Boundaries, WebGPU compatibility checks.

---

## 🔮 EPIC 1: Deep Agentic Capability (The "Magic")
**Focus:** Individual Developer Super-Powers. "Late 2025" Agent Architecture.
*Detailed Specification: `EPIC_1_DEEP_AGENTS.md`*

### Phase 11.1: "The Council" (Multi-Agent Debate)
Instead of a single chatbot, the user summons a "Council" where specialized agents critique each other before presenting a solution.
- [ ] **Agent Orchestrator:** Logic to spawn multiple sub-agents (Security, DevOps, Architect) for a single query.
- [ ] **Debate UI:** A threaded view where users see agents "talking to each other" (e.g., Security Bot flagging a DevOps Bot suggestion).
- [ ] **Consensus Engine:** A synthesizer step that merges the debate into a final decision.

### Phase 11.2: Tool Use & MCP (Model Context Protocol)
Agents gain read/write access to the environment via standardized protocols.
- [ ] **WebContainer Integration:** Run a Node.js sandbox in the browser to validate generated code *before* showing it to the user.
- [ ] **MCP Client:** Implement client-side Model Context Protocol to standardize how agents read local files (via Bridge) and external docs.

### Phase 11.3: The Git Bridge
Removing the friction of manual copy-pasting.
- [ ] **GitHub OAuth:** Link personal GitHub account.
- [ ] **Repo Tree Reader:** Read remote repositories for context.
- [ ] **Direct PR Agent:** The agent creates a branch, commits code, and opens a Pull Request with a detailed description.

---

## 🏢 EPIC 2: Commercialization & Hardening
**Focus:** Sustainability, Teams, and Enterprise-Grade Robustness.
*Research & Requirements: `EPIC_2_COMMERCIALIZATION.md`*

### Phase 12.1: The Membership Model
- **Research:** Stripe Connect vs. Standard, Token-based top-ups vs. Flat SaaS.
- **Implementation:** Tiered feature gating (Free vs. Pro).

### Phase 12.2: Team Dynamics
- **Research:** RBAC complexity, Shared Workspaces, Concurrent Editing (CRDTs).
- **Implementation:** Organization management UI, Invite flows.

### Phase 12.3: Security & Compliance
- **Hardening:** Row Level Security (RLS) audits, API Rate limiting, Data residency compliance.

---

## 📉 Archive
*   *Phases 1-9 completed.*
*   *Old Roadmap V2 merged.*
