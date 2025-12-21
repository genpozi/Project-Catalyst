
# 0relai - User Guide

## Overview
**0relai** (Zero Reliance) is your AI-powered "Meta-Architect." It helps you plan, visualize, and specify complex software systems before you write a single line of code.

## 🚀 Getting Started

### 1. Cloud Sync & Login
*   Click the **Login** button in the header to sign in via Email (Magic Link).
*   **Benefits:** Sync, Backup, and Marketplace access.

### 2. The Edge Runtime (Live Coding)
0relai includes a full Node.js environment in the browser.
1.  Click the **⚡** (Lightning Bolt) icon in the bottom bar or press `Cmd+J`.
2.  **Boot:** Click "Boot Container". This mounts your project files into a virtual machine.
3.  **Terminal:** Use the terminal to run commands like `npm install` or `npm run dev`.
4.  **Preview:** Once a server is running, the "Live Preview" tab will automatically show your app.
5.  **Sync Back:** If your build scripts create files (e.g., dist folders), click **"⬇ Pull to Editor"** to save them to your project blueprint.

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
2.  Click **"Export Bundle"** for a ZIP file.
3.  OR click **"Push to GitHub"** to create a repo and open a Pull Request automatically.

## 🆘 Troubleshooting
*   **Red Status Bar:** You are offline. Cloud generation is disabled, but Local Intelligence still works.
*   **Headers Missing:** If the Edge Runtime says "Headers Missing", you must run the app in a secure context (HTTPS or localhost) that supports `SharedArrayBuffer`.
