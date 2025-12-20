
# 0relai - User Guide

## Overview
**0relai** (Zero Reliance) is your AI-powered "Meta-Architect." It helps you plan, visualize, and specify complex software systems before you write a single line of code.

## 🚀 Getting Started

### 1. Cloud Sync & Login
*   Click the **Login** button in the header to sign in via Email (Magic Link).
*   **Benefits:**
    *   **Sync:** Access your blueprints on any device.
    *   **Backup:** Never lose your work if your browser cache clears.
    *   **Marketplace:** Publish your best architectures to the community.

### 2. The Local Bridge (Optional but Recommended)
To enable 0relai to write code directly to your computer:
1.  Go to the **Verify** tab in the **Launch** phase.
2.  Click "Setup Info".
3.  Copy the `bridge.js` script to your project folder.
4.  Run `node bridge.js`.
5.  0relai will connect automatically via WebSocket.

---

## 🎨 Key Workflows

### The "Vision to Spec" Pipeline
1.  **Vision:** Speak or type your idea. Upload a whiteboard sketch.
2.  **Strategy:** AI identifies personas and user journeys.
3.  **Stack:** AI recommends a tech stack (e.g., Next.js + Supabase).
4.  **Visual Builder:** Drag and drop nodes to refine the architecture.
5.  **Schema:** Visually design your database tables.
6.  **Tasks:** AI generates a Kanban board of implementation tasks.

### The Blueprint Studio
This is your "God Mode" editor.
*   **Refine:** Select "Architecture" or "API" tabs.
*   **Command:** Type instructions like *"Add Redis caching layer"* or *"Change auth to OAuth2"*.
*   **Diff:** Review changes before accepting them.

### Community Marketplace
*   Click **"Saved"** -> **"Marketplace"** in the dashboard.
*   Browse blueprints created by other architects.
*   **Fork:** Click "Fork Blueprint" to copy it to your workspace and customize it.

### Local Intelligence (Privacy Mode)
*   Open **Settings** (Gear Icon).
*   Go to **Intelligence** and download the WebGPU model (~1.5GB).
*   Switch the Assistant Chat to **"Local Architect"**.
*   **Result:** Chat with your project data completely offline. No data leaves your machine.

---

## 🛠️ Exporting Your Work
When you are ready to code:
1.  Go to the **Launch** phase.
2.  Click **"Export Bundle"**.
3.  You get a ZIP file containing:
    *   `setup_repo.sh`
    *   `README.md`
    *   `.cursorrules` (Instructions for AI coding agents)
    *   Infrastructure code (Terraform/Docker)
    *   Full documentation (Markdown/Obsidian Vault)

## 🆘 Troubleshooting
*   **Red Status Bar:** You are offline. Cloud generation is disabled, but Local Intelligence still works.
*   **Sync Issues:** If cloud sync fails, your data is safe in Local Storage. It will retry automatically.
