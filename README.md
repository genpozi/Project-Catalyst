
# 0relai (Zero Reliance) v1.1

![Status](https://img.shields.io/badge/Status-Stable-green?style=flat-square)
![Version](https://img.shields.io/badge/Version-1.1.0-blue?style=flat-square)
![AI](https://img.shields.io/badge/Powered_by-Gemini_2.0-purple?style=flat-square)

**0relai** is an advanced AI-powered architectural engine designed to transform abstract software ideas into rigorous, production-ready technical blueprints. It acts as a "Meta-Architect," guiding you through strategy, stack selection, data modeling, and security planning before generating a complete developer handover bundle.

## ✨ Core Features

### 🧠 Hybrid Intelligence
- **Cloud Architect:** Powered by **Gemini 2.0 Flash Thinking** for deep reasoning, complex system design, and security auditing.
- **Local Architect:** Integrated **WebLLM (Gemma 2B)** support for privacy-first, offline drafting running directly in your browser via WebGPU.
- **Voice Interface:** Real-time bi-directional voice negotiation with the architect using Gemini Live API.

### ⚡ Edge Runtime (Live Dev Environment)
- **Instant Boot:** Runs a full Node.js environment directly in your browser using **WebContainers**. No cloud VMs required.
- **Live Terminal:** Interact with your project using a real XTerm.js console (`npm install`, `npm run dev`, `node scripts/test.js`).
- **Bidirectional Sync:** 
    - **Editor -> Container:** File changes in the app are automatically written to the container.
    - **Container -> Editor:** Pull changes made by scripts or builds (e.g., generated artifacts) back into your project state.
- **Instant Preview:** See your changes reflected immediately in a live iframe.

### 📐 Visual Engineering
- **Diagram Orchestration:** AI-powered auto-layout for complex Architecture and ERD graphs.
- **Visual Editors:** Interactive builders for Tech Stack, Database Schema, and Gantt Charts.
- **Export Studio:** Download high-resolution PNGs of your diagrams for reports.
- **Smart Templates:** Pre-configured blueprints for 2025 trends (Bento Grids, 3D Microsites) and Enterprise standards (SaaS, CRM).

### 🛡️ Security & Enterprise
- **Compliance Engine:** Generate audit-ready checklists for SOC2, HIPAA, and GDPR.
- **RBAC Matrix:** Visually define roles and permissions.
- **Threat Modeling:** Simulate rate-limiting and security header configurations.
- **Audit Logs:** Track critical team actions and project changes.

## 🚀 The Workflow
1.  **Command Center:** A unified dashboard to track multiple projects and view recent activity.
2.  **Multi-Modal Intake:** Voice, Text, and Image analysis for project initiation.
3.  **Strategic Planning:** Automated persona generation, USP analysis, and user journey mapping.
4.  **Visual Architecture:** Intelligent stack selection and **Terraform IaC generation**.
5.  **Blueprint Studio:** A dedicated IDE to refine AI decisions with **Version History** and **Diff Views**.
6.  **Dev Console:** Boot the project instantly in the browser to verify code before exporting.
7.  **Code Forge:** Exports a `.zip` bundle or opens a GitHub Pull Request directly.

## 🛡️ Resilience & Safety
- **Offline Mode:** Continue viewing and editing local data even when internet connectivity is lost.
- **Drift Detection:** Analyze your actual codebase against the plan to detect architectural violations via the Local Bridge.
- **Auto-Recovery:** Integrated Error Boundaries prevent data loss during crashes.

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- A Google Gemini API Key (obtained from [Google AI Studio](https://aistudio.google.com/))
- **Important:** For WebContainers to work locally, your server must send COOP/COEP headers.

### Steps

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/0relai.git
    cd 0relai
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```env
    API_KEY=your_google_gemini_api_key_here
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    *Note: The included Vite config is pre-configured with the necessary security headers for WebContainers.*

5.  **Build for Production**
    ```bash
    npm run build
    ```

## 🏗️ Project Structure

- `src/App.tsx`: Main application orchestrator.
- `src/GeminiService.ts`: Cloud AI interactions.
- `src/LocalIntelligence.ts`: WebGPU engine.
- `src/utils/WebContainerService.ts`: Browser-based Node.js runtime manager.
- `src/components/`: UI Views (ArchitectureView, DevConsole, etc.).
- `src/types.ts`: TypeScript definitions for the architectural data models.

## 🤝 Contributing

0relai is designed to be extensible. To add a new phase:
1.  Add the phase enum to `AppPhase` in `types.ts`.
2.  Create a new View component in `components/`.
3.  Add the generation logic to `GeminiService.ts`.
4.  Update `Sidebar.tsx` and `App.tsx`.

## 📄 License

MIT
