
# 0relai (Zero Reliance)

**0relai** is an advanced AI-powered architectural engine designed to transform abstract software ideas into rigorous, production-ready technical blueprints. It acts as a "Meta-Architect," guiding you through strategy, stack selection, data modeling, and security planning before generating a complete developer handover bundle.

![0relai Interface](https://via.placeholder.com/1200x600/0f172a/c084fc?text=0relai+Interface+Preview)

## ✨ Core Features

- **Multi-Modal Intake:** Voice, Text, and Image analysis for project initiation.
- **Strategic Planning:** Automated persona generation, USP analysis, and user journey mapping.
- **Full-Stack Architecture:** Intelligent stack selection (Frontend, Backend, DB) based on constraints.
- **Visual Data Modeling:** Interactive Entity-Relationship Diagrams (ERD) and Schema generation (Prisma/SQL).
- **Blueprint Studio:** A dedicated IDE to refine and tweak AI-generated decisions in real-time.
- **Agent Rules Engine:** Generates `.cursorrules` and System Prompts to guide AI coding assistants (Cursor, Copilot).
- **Developer Handover:** Exports a `.zip` bundle with scaffold scripts, config files, and documentation.

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- A Google Gemini API Key (obtained from [Google AI Studio](https://aistudio.google.com/))

### Steps

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/0relai.git
    cd 0relai
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory and add your API key:
    ```env
    API_KEY=your_google_gemini_api_key_here
    ```
    *Note: In production/deployment, ensure this key is set in your environment variables.*

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

5.  **Build for Production**
    ```bash
    npm run build
    ```

## 🏗️ Project Structure

- `src/App.tsx`: Main application orchestrator and state machine.
- `src/components/`: UI components (Views, Sidebar, Inputs).
- `src/types.ts`: TypeScript definitions for the architectural data models.
- `src/components/BlueprintStudio.tsx`: The core logic for the refinement interface.

## 🤝 Contributing

0relai is designed to be extensible. To add a new phase to the architectural pipeline:
1.  Add the phase enum to `AppPhase` in `types.ts`.
2.  Create a new View component in `components/`.
3.  Add the generation logic to `App.tsx`.
4.  Update `Sidebar.tsx` with a new icon and label.

## 📄 License

MIT
