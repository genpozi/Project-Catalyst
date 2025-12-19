
# 0relai: Roadmap & Future Vision

This document outlines the strategic roadmap for **0relai** following the successful completion of the Phase 2 "Make it Real" milestone.

## 🏁 Current Status: v2.0 Production Ready
The core engine is fully functional. Users can go from a vague voice memo to a downloadable, executable codebase with infrastructure-as-code and project management exports.

## 📋 Phase 3: Enterprise & Collaboration

### 1. EPIC 16: Enterprise Compliance & Cost Estimator
**Objective:** Provide business intelligence alongside technical specs.
- **Deliverables:**
  - SOC2/HIPAA compliance checklist generation in the Security phase.
  - "Monthly Cost Estimator" based on the selected stack and deployment target (Completed in basic form, needs real-time API pricing integration).

### 2. EPIC 17: Collaborative Studio (Multiplayer)
**Objective:** Multiple architects working on the same blueprint.
- **Deliverables:**
  - Real-time synchronization of the `projectData` state (WebSockets/Supabase Realtime).
  - Commenting system on specific files or database tables.
  - Role-based access control (Viewer vs Editor).

### 3. EPIC 18: The "Self-Healing" Architect
**Objective:** Continuous integration with the codebase.
- **Deliverables:**
  - A CLI tool (`npx 0relai-sync`) that developers run in their CI/CD pipeline.
  - Checks if the actual code deviates from the Architecture Blueprint.
  - Auto-updates the `.cursorrules` based on code changes.

### 4. EPIC 19: Marketplace of Blueprints
**Objective:** Community sharing.
- **Deliverables:**
  - "Fork" existing popular architectures (e.g., "Netflix Clone Stack", "Uber Clone Stack").
  - Share read-only links to Blueprints.

---

## 🛠️ Maintenance & Optimization

| Item | Priority | Description |
| :--- | :--- | :--- |
| **PWA Offline Mode** | Medium | Cache previous projects to allow viewing specs without internet. |
| **Model Fine-Tuning** | High | Collect (anonymized) successful architecture patterns to fine-tune a specialized Gemini adapter. |
| **Plugin System** | Low | Allow community to write plugins that generate specific config files (e.g., Kubernetes Helm charts). |

---
