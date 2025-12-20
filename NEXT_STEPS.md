
# 📋 Immediate Next Steps: Epic 1 Execution

The focus is now on **Phase 11.1: The Council (Multi-Agent Chat)**.

## 1. Agent Orchestration Layer
- [ ] Create `utils/AgentOrchestrator.ts`.
- [ ] Define the specific system prompts for the "Council" members (Architect, Security, DevOps) in `utils/agentPersonas.ts`.
- [ ] Implement a function `orchestrateDebate(query: string)` that chains calls between these personas.

## 2. UI Updates
- [ ] Update `ArchitectChat.tsx` to support a "Threaded" view (nested messages).
- [ ] Design avatars/headers for the different agents to distinguish who is speaking.

## 3. Integration
- [ ] Wire the `AgentOrchestrator` into the main Chat interface.
- [ ] Allow the user to "Accept" the final synthesis, which should update the `ProjectData`.
