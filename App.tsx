
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { ProjectData, Phase, Task, AppPhase, TaskStatus, ArchitectureData, SchemaData, FileNode, DesignSystem, ApiSpecification, SecurityContext, BrainstormingData } from './types';
import Header from './components/Header';
import PhaseStepper from './components/PhaseStepper';
import IdeaInput from './components/IdeaInput';
import BrainstormingView from './components/BrainstormingView';
import ResearchReport from './components/ResearchReport';
import ArchitectureView from './components/ArchitectureView';
import DataModelView from './components/DataModelView';
import FileStructureView from './components/FileStructureView';
import DesignSystemView from './components/DesignSystemView';
import ApiSpecView from './components/ApiSpecView';
import SecurityView from './components/SecurityView';
import BlueprintStudio from './components/BlueprintStudio';
import AgentRulesView from './components/AgentRulesView';
import ActionPlanView from './components/ActionPlanView';
import KanbanBoard from './components/KanbanBoard';
import SpecDocument from './components/SpecDocument';
import KickoffView from './components/KickoffView';
import LoadingSpinner from './components/LoadingSpinner';

const SAVED_STATE_KEY = 'ai-project-catalyst-state';

const getInitialState = (): { currentPhase: AppPhase; projectData: ProjectData } => {
  try {
    const savedState = localStorage.getItem(SAVED_STATE_KEY);
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      // Basic validation to ensure the loaded state is not malformed
      if (parsedState.currentPhase && parsedState.projectData) {
        return parsedState;
      }
    }
  } catch (e) {
    console.error("Failed to parse saved state, starting fresh.", e);
    localStorage.removeItem(SAVED_STATE_KEY);
  }
  return {
    currentPhase: AppPhase.IDEA,
    projectData: { initialIdea: '' }
  };
};

// Config for "Thinking" models to improve complex reasoning
const THINKING_CONFIG = {
  thinkingConfig: { thinkingBudget: 4096 } // Moderate budget for good latency/quality balance
};

const App: React.FC = () => {
  const [currentPhase, setCurrentPhase] = useState<AppPhase>(getInitialState().currentPhase);
  const [projectData, setProjectData] = useState<ProjectData>(getInitialState().projectData);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isAnalyzingAudio, setIsAnalyzingAudio] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY as string }), []);

  useEffect(() => {
    try {
      const stateToSave = JSON.stringify({ currentPhase, projectData });
      localStorage.setItem(SAVED_STATE_KEY, stateToSave);
    } catch (e) {
      console.error("Failed to save state to localStorage", e);
    }
  }, [currentPhase, projectData]);

  const handleResetProject = useCallback(() => {
    if (window.confirm('Are you sure you want to start a new project? All current progress will be lost.')) {
      localStorage.removeItem(SAVED_STATE_KEY);
      setCurrentPhase(AppPhase.IDEA);
      setProjectData({ initialIdea: '' });
      // Optional: reload to ensure a clean slate, though state update should be enough
      // window.location.reload(); 
    }
  }, []);

  const handleNextPhase = () => {
    setCurrentPhase(prev => {
        const phases = Object.values(AppPhase);
        const currentIndex = phases.indexOf(prev);
        return phases[currentIndex + 1] || prev;
    });
  };

  const handleUpdateProjectData = useCallback((newData: Partial<ProjectData>) => {
    setProjectData(prev => ({ ...prev, ...newData }));
  }, []);

  const handleAnalyzeAudio = useCallback(async (audioBase64: string): Promise<{ idea: string; type: string; constraints: string } | null> => {
    setIsAnalyzingAudio(true);
    setError(null);
    try {
        const prompt = "Listen to this voice memo describing a software project. Extract the following information into a structured JSON: 1. Core Idea (summarize clearly). 2. Project Type (choose closest to: Web Application, Mobile App, API, CLI Tool, Desktop Application, Game, AI Model). 3. Constraints (extract any technical preferences or constraints mentioned).";
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    { inlineData: { mimeType: "audio/webm", data: audioBase64 } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        idea: { type: Type.STRING },
                        type: { type: Type.STRING },
                        constraints: { type: Type.STRING }
                    },
                    required: ['idea', 'type', 'constraints']
                }
            }
        });

        const result = JSON.parse(response.text);
        return result;

    } catch (e) {
        console.error("Audio analysis failed", e);
        setError("Failed to analyze audio. Please try again or type your idea.");
        return null;
    } finally {
        setIsAnalyzingAudio(false);
    }
  }, [ai]);

  const handleRefineProjectData = useCallback(async (section: string, feedback: string) => {
    setIsRefining(true);
    setError(null);

    try {
        let prompt = '';
        let schema: any = null;
        let updateKey: keyof ProjectData = 'architecture';

        // 1. Construct Prompt based on section
        switch(section) {
            case 'Brainstorming':
                updateKey = 'brainstormingResults';
                schema = {
                    type: Type.OBJECT,
                    properties: {
                        questions: { type: Type.ARRAY, items: { type: Type.STRING } },
                        usps: { type: Type.ARRAY, items: { type: Type.STRING } },
                        personas: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    role: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    painPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
                                },
                                required: ['role', 'description', 'painPoints']
                            }
                        },
                        features: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['questions', 'usps', 'personas', 'features']
                };
                prompt = `Refine the Brainstorming Analysis based on user feedback.
                Current State: ${JSON.stringify(projectData.brainstormingResults)}
                User Feedback: "${feedback}"
                
                Output the FULL updated Brainstorming object.`;
                break;
            case 'Architecture':
                updateKey = 'architecture';
                schema = {
                    type: Type.OBJECT,
                    properties: {
                      stack: {
                        type: Type.OBJECT,
                        properties: {
                          frontend: { type: Type.STRING },
                          backend: { type: Type.STRING },
                          database: { type: Type.STRING },
                          styling: { type: Type.STRING },
                          deployment: { type: Type.STRING },
                          rationale: { type: Type.STRING }
                        },
                        required: ['frontend', 'backend', 'database', 'styling', 'deployment', 'rationale']
                      },
                      patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
                      dependencies: {
                          type: Type.ARRAY,
                          items: {
                              type: Type.OBJECT,
                              properties: { name: { type: Type.STRING }, description: { type: Type.STRING } },
                              required: ['name', 'description']
                          }
                      }
                    },
                    required: ['stack', 'patterns', 'dependencies']
                };
                prompt = `Refine the Technical Architecture based on user feedback.
                Current State: ${JSON.stringify(projectData.architecture)}
                User Feedback: "${feedback}"
                
                Output the FULL updated Architecture object. Maintain existing choices unless the feedback specifically contradicts them.`;
                break;

            case 'Data Model':
                updateKey = 'schema';
                schema = {
                    type: Type.OBJECT,
                    properties: {
                        tables: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    columns: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                name: { type: Type.STRING },
                                                type: { type: Type.STRING },
                                                constraints: { type: Type.STRING },
                                                description: { type: Type.STRING }
                                            },
                                            required: ['name', 'type']
                                        }
                                    }
                                },
                                required: ['name', 'columns']
                            }
                        },
                        mermaidChart: { type: Type.STRING },
                        prismaSchema: { type: Type.STRING },
                        sqlSchema: { type: Type.STRING }
                    },
                    required: ['tables', 'mermaidChart', 'prismaSchema']
                };
                prompt = `Refine the Database Schema based on user feedback.
                Current State: ${JSON.stringify(projectData.schema)}
                User Feedback: "${feedback}"
                
                Requirements:
                1. Update the tables JSON structure.
                2. Regenerate the Mermaid diagram to reflect changes.
                3. Regenerate Prisma and SQL schemas to match.`;
                break;

            case 'Files':
                updateKey = 'fileStructure';
                // Recursive schema validation is tricky, usually we skip strict schema for recursive or trust the model.
                // We will use a simplified non-recursive check or just trust the model with a good prompt.
                prompt = `Refine the File Structure based on user feedback.
                Current State: ${JSON.stringify(projectData.fileStructure)}
                User Feedback: "${feedback}"
                
                Output the FULL updated JSON file tree.`;
                break;

            case 'UI/UX':
                updateKey = 'designSystem';
                schema = {
                    type: Type.OBJECT,
                    properties: {
                      colorPalette: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: { name: { type: Type.STRING }, hex: { type: Type.STRING }, usage: { type: Type.STRING } },
                          required: ['name', 'hex', 'usage']
                        }
                      },
                      typography: {
                        type: Type.ARRAY,
                        items: {
                           type: Type.OBJECT,
                           properties: { role: { type: Type.STRING }, fontFamily: { type: Type.STRING }, size: { type: Type.STRING } },
                           required: ['role', 'fontFamily', 'size']
                        }
                      },
                      coreComponents: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, states: { type: Type.ARRAY, items: { type: Type.STRING } } },
                          required: ['name', 'description', 'states']
                        }
                      },
                      layoutStrategy: { type: Type.STRING }
                    },
                    required: ['colorPalette', 'typography', 'coreComponents', 'layoutStrategy']
                };
                prompt = `Refine the Design System based on user feedback.
                Current State: ${JSON.stringify(projectData.designSystem)}
                User Feedback: "${feedback}"
                
                Output the FULL updated Design System object.`;
                break;

            case 'API':
                updateKey = 'apiSpec';
                schema = {
                    type: Type.OBJECT,
                    properties: {
                      endpoints: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            method: { type: Type.STRING },
                            path: { type: Type.STRING },
                            summary: { type: Type.STRING },
                            requestBody: { type: Type.STRING },
                            responseSuccess: { type: Type.STRING }
                          },
                          required: ['method', 'path', 'summary']
                        }
                      },
                      authMechanism: { type: Type.STRING }
                    },
                    required: ['endpoints', 'authMechanism']
                };
                prompt = `Refine the API Specification based on user feedback.
                Current State: ${JSON.stringify(projectData.apiSpec)}
                User Feedback: "${feedback}"
                
                Output the FULL updated API Spec object.`;
                break;

            case 'Security':
                updateKey = 'securityContext';
                schema = {
                    type: Type.OBJECT,
                    properties: {
                      policies: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, implementationHint: { type: Type.STRING } },
                          required: ['name', 'description', 'implementationHint']
                        }
                      },
                      testingStrategy: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: { name: { type: Type.STRING }, type: { type: Type.STRING, enum: ['Unit', 'Integration', 'E2E'] }, description: { type: Type.STRING } },
                          required: ['name', 'type', 'description']
                        }
                      },
                      compliance: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: { standard: { type: Type.STRING }, requirement: { type: Type.STRING } },
                          required: ['standard', 'requirement']
                        }
                      }
                    },
                    required: ['policies', 'testingStrategy', 'compliance']
                };
                prompt = `Refine the Security & QA Strategy based on user feedback.
                Current State: ${JSON.stringify(projectData.securityContext)}
                User Feedback: "${feedback}"
                
                Output the FULL updated Security Context object.`;
                break;
            default:
                throw new Error(`Unknown section: ${section}`);
        }

        const config: any = { ...THINKING_CONFIG };
        if (schema) {
            config.responseMimeType = "application/json";
            config.responseSchema = schema;
        } else {
             config.responseMimeType = "application/json";
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: config
        });

        const newData = JSON.parse(response.text);
        setProjectData(prev => ({ ...prev, [updateKey]: newData }));

    } catch (e) {
        console.error("Refinement failed", e);
        setError(`Failed to refine ${section}. Please try again.`);
    } finally {
        setIsRefining(false);
    }
  }, [ai, projectData]);

  // Handle generating a guide for a specific task
  const handleGenerateTaskGuide = useCallback(async (taskId: string) => {
    try {
        const task = projectData.tasks?.find(t => t.id === taskId);
        if (!task) return;

        // Context injection
        const context = `
            Project: ${projectData.projectType}
            Tech Stack: ${JSON.stringify(projectData.architecture?.stack)}
            Database Schema (relevant tables): ${projectData.schema?.tables.map(t => t.name).join(', ')}
            Dependencies: ${projectData.architecture?.dependencies.map(d => d.name).join(', ')}
            Design System Components: ${projectData.designSystem?.coreComponents.map(c => c.name).join(', ')}
        `;

        const prompt = `Act as a Senior Developer and Architect.
        
        **Context:**
        ${context}

        **Your Task:**
        Provide a detailed, step-by-step implementation guide for the following task:
        
        **Task Description:** "${task.content}"
        
        **Requirements:**
        1. Provide actual code snippets (files, functions, styles) relevant to the Tech Stack.
        2. If it's a database task, show the SQL/Prisma code.
        3. If it's a UI task, show the Component code using the defined Design System tokens.
        4. Be specific. Do not use generic placeholders. Use the project's data.
        5. Format as clean Markdown with syntax highlighting.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                ...THINKING_CONFIG
            }
        });

        const guide = response.text;
        
        // Update local state
        setProjectData(prev => ({
            ...prev,
            tasks: prev.tasks?.map(t => t.id === taskId ? { ...t, implementationGuide: guide } : t)
        }));

    } catch (e) {
        console.error("Failed to generate task guide", e);
        setError('Failed to generate implementation guide. Please try again.');
    }
  }, [ai, projectData]);

  const handleIdeaSubmit = useCallback(async (idea: string, type: string, constraints: string, imageBase64?: string) => {
    setIsLoading(true);
    setError(null);
    setProjectData({ initialIdea: idea, projectType: type, constraints: constraints });

    try {
      const prompt = `You are a Product Manager and UX Strategist. 
      Project Type: ${type}
      Core Idea: "${idea}"
      Constraints: "${constraints}"
      
      Analyze this idea and output a structured strategic analysis.
      1. List 5 key questions to consider.
      2. List 3 Unique Selling Propositions (USPs).
      3. Define 3 detailed User Personas (Role, Description, Pain Points).
      4. List 5-7 Core Features required for an MVP.
      `;
      
      let contents: any = prompt;
      
      if (imageBase64) {
          contents = {
            parts: [
                { text: prompt },
                { 
                    inlineData: {
                        mimeType: 'image/png', // Assuming png/jpeg from generic file input logic
                        data: imageBase64
                    }
                }
            ]
          };
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: { type: Type.ARRAY, items: { type: Type.STRING } },
              usps: { type: Type.ARRAY, items: { type: Type.STRING } },
              personas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    role: { type: Type.STRING },
                    description: { type: Type.STRING },
                    painPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ['role', 'description', 'painPoints']
                }
              },
              features: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['questions', 'usps', 'personas', 'features']
          }
        }
      });

      const brainstormingData: BrainstormingData = JSON.parse(response.text);
      setProjectData(prev => ({ ...prev, brainstormingResults: brainstormingData }));
      handleNextPhase();
    } catch (e) {
      setError('Failed to generate brainstorming ideas. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [ai]);

  const handleStartResearch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const prompt = `Research the feasibility of this project idea: "${projectData.initialIdea}". 
        Project Type: ${projectData.projectType}
        Constraints: ${projectData.constraints}

        Provide a market overview, identify 3 potential competitors, and suggest emerging trends relevant to this. Use Google Search for up-to-date information. Format as clean markdown.`;
        
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            tools: [{googleSearch: {}}],
          },
        });

        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web) || [];
        setProjectData(prev => ({ ...prev, researchReport: { summary: response.text, sources } }));
        handleNextPhase();
    } catch (e) {
      setError('Failed to conduct research. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [ai, projectData]);

  const handleGenerateArchitecture = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const prompt = `Act as a Chief Technology Officer (CTO). Design the optimal technical architecture for this project.
      
      **Input Context:**
      - Project Type: ${projectData.projectType}
      - Idea: ${projectData.initialIdea}
      - Constraints: ${projectData.constraints}
      - MVP Features: ${projectData.brainstormingResults?.features.join(', ')}

      **Task:**
      Select the best Tech Stack (Frontend, Backend, Database, Styling, Deployment).
      Identify key Design Patterns.
      **Crucially**, list the specific Package Dependencies (libraries) required for this stack (e.g., 'axios', 'mongoose', 'tailwindcss', 'framer-motion').
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          ...THINKING_CONFIG, // Activate thinking for better architectural decisions
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              stack: {
                type: Type.OBJECT,
                properties: {
                  frontend: { type: Type.STRING },
                  backend: { type: Type.STRING },
                  database: { type: Type.STRING },
                  styling: { type: Type.STRING },
                  deployment: { type: Type.STRING },
                  rationale: { type: Type.STRING }
                },
                required: ['frontend', 'backend', 'database', 'styling', 'deployment', 'rationale']
              },
              patterns: {
                 type: Type.ARRAY,
                 items: { type: Type.STRING }
              },
              dependencies: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          name: { type: Type.STRING },
                          description: { type: Type.STRING }
                      },
                      required: ['name', 'description']
                  }
              }
            },
            required: ['stack', 'patterns', 'dependencies']
          }
        }
      });

      const archData: ArchitectureData = JSON.parse(response.text);
      setProjectData(prev => ({ ...prev, architecture: archData }));
      handleNextPhase();
    } catch(e) {
      setError("Failed to generate architecture. Please try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [ai, projectData]);

  const handleGenerateSchema = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const prompt = `Act as a Database Architect. Design a comprehensive database schema for the following project.
        
        **Context:**
        - Idea: ${projectData.initialIdea}
        - Tech Stack: Database=${projectData.architecture?.stack.database}, Backend=${projectData.architecture?.stack.backend}
        
        **Requirements:**
        1. Create a structured JSON list of tables and columns.
        2. Generate a VALID Mermaid.js ER diagram string (graph TD or erDiagram).
        3. Generate a Prisma Schema code snippet (or SQL if preferred by the stack).
        4. Generate a standard SQL DDL snippet.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                ...THINKING_CONFIG, // Activate thinking for complex schema relationships
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        tables: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    columns: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                name: { type: Type.STRING },
                                                type: { type: Type.STRING },
                                                constraints: { type: Type.STRING },
                                                description: { type: Type.STRING }
                                            },
                                            required: ['name', 'type']
                                        }
                                    }
                                },
                                required: ['name', 'columns']
                            }
                        },
                        mermaidChart: { type: Type.STRING },
                        prismaSchema: { type: Type.STRING },
                        sqlSchema: { type: Type.STRING }
                    },
                    required: ['tables', 'mermaidChart', 'prismaSchema']
                }
            }
        });

        const schemaData: SchemaData = JSON.parse(response.text);
        setProjectData(prev => ({ ...prev, schema: schemaData }));
        handleNextPhase();

    } catch(e) {
        setError('Failed to generate database schema. Please try again.');
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  }, [ai, projectData]);

  const handleGenerateFileStructure = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const prompt = `Act as a Senior Software Architect. Create a production-ready file structure for a ${projectData.projectType} using ${projectData.architecture?.stack.frontend} and ${projectData.architecture?.stack.backend}.
        
        **Context:**
        - Patterns: ${JSON.stringify(projectData.architecture?.patterns)}
        - Database: ${projectData.architecture?.stack.database}
        
        **Requirements:**
        - Follow strict framework conventions (e.g., Next.js App Router vs Pages, Rails standard structure).
        - Include essential config files (tsconfig.json, .env.example, etc.).
        - Provide a 'description' for EVERY file and folder explaining its specific purpose in this project.
        - Return a recursive JSON tree structure.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                // We'll trust the model to follow the structure without a strictly validated recursive schema to prevent runtime errors with the SDK helper.
            }
        });

        const structure: FileNode[] = JSON.parse(response.text);
        setProjectData(prev => ({ ...prev, fileStructure: structure }));
        handleNextPhase();

    } catch (e) {
        setError('Failed to generate file structure. Please try again.');
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  }, [ai, projectData]);

  const handleGenerateDesignSystem = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const prompt = `Act as a Lead UI/UX Designer. Create a Design System for a ${projectData.projectType}.
      
      **Context:**
      - Idea: ${projectData.initialIdea}
      - Tech Stack: ${projectData.architecture?.stack.styling} (Ensure tokens are compatible, e.g. Tailwind names)
      - Personas: ${projectData.brainstormingResults?.personas.map(p => p.role).join(', ')}
      
      **Tasks:**
      1. Define a Color Palette (names, hex, usage).
      2. Define Typography (font families for headings/body).
      3. List Core Components required for this specific app (e.g., "ProductCard", "DashboardStats").
      4. Describe the Layout Strategy (e.g., "Sidebar navigation with dashboard grid").
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              colorPalette: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    hex: { type: Type.STRING },
                    usage: { type: Type.STRING }
                  },
                  required: ['name', 'hex', 'usage']
                }
              },
              typography: {
                type: Type.ARRAY,
                items: {
                   type: Type.OBJECT,
                   properties: {
                     role: { type: Type.STRING },
                     fontFamily: { type: Type.STRING },
                     size: { type: Type.STRING }
                   },
                   required: ['role', 'fontFamily', 'size']
                }
              },
              coreComponents: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    states: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ['name', 'description', 'states']
                }
              },
              layoutStrategy: { type: Type.STRING }
            },
            required: ['colorPalette', 'typography', 'coreComponents', 'layoutStrategy']
          }
        }
      });

      const designSystem: DesignSystem = JSON.parse(response.text);
      setProjectData(prev => ({ ...prev, designSystem }));
      handleNextPhase();
    } catch(e) {
      setError('Failed to generate Design System.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [ai, projectData]);

  const handleGenerateApiSpec = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const prompt = `Act as a Backend Architect. Define the API Specification.
      
      **Context:**
      - Tech Stack: ${projectData.architecture?.stack.backend}
      - Database Schema: ${projectData.schema?.tables.map(t => t.name).join(', ')}
      
      **Tasks:**
      1. List all necessary API Endpoints (Method, Path, Summary).
      2. For each, provide a sample JSON Request Body and Success Response.
      3. Define the Authentication Mechanism.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              endpoints: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    method: { type: Type.STRING },
                    path: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    requestBody: { type: Type.STRING },
                    responseSuccess: { type: Type.STRING }
                  },
                  required: ['method', 'path', 'summary']
                }
              },
              authMechanism: { type: Type.STRING }
            },
            required: ['endpoints', 'authMechanism']
          }
        }
      });

      const apiSpec: ApiSpecification = JSON.parse(response.text);
      setProjectData(prev => ({ ...prev, apiSpec }));
      handleNextPhase();
    } catch(e) {
      setError('Failed to generate API Spec.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [ai, projectData]);

  const handleGenerateSecurity = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const prompt = `Act as a Senior Security Engineer and QA Lead. Define the Security, Testing, and Compliance strategy.
      
      **Context:**
      - Project: ${projectData.projectType}
      - Database: ${projectData.architecture?.stack.database} (Tables: ${projectData.schema?.tables.map(t => t.name).join(', ')})
      - Auth: ${projectData.apiSpec?.authMechanism}

      **Tasks:**
      1. Define critical Access Control / Security Policies (e.g. RLS policies).
      2. Define the Testing Strategy (Unit vs E2E, tools to use).
      3. List Compliance Rules (e.g. GDPR, Validation standards).
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          ...THINKING_CONFIG, // Activate thinking for deep security analysis
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              policies: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    implementationHint: { type: Type.STRING }
                  },
                  required: ['name', 'description', 'implementationHint']
                }
              },
              testingStrategy: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['Unit', 'Integration', 'E2E'] },
                    description: { type: Type.STRING }
                  },
                  required: ['name', 'type', 'description']
                }
              },
              compliance: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    standard: { type: Type.STRING },
                    requirement: { type: Type.STRING }
                  },
                  required: ['standard', 'requirement']
                }
              }
            },
            required: ['policies', 'testingStrategy', 'compliance']
          }
        }
      });

      const securityContext: SecurityContext = JSON.parse(response.text);
      setProjectData(prev => ({ ...prev, securityContext }));
      handleNextPhase();
    } catch(e) {
      setError('Failed to generate Security Strategy.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [ai, projectData]);

  const handleGenerateAgentRules = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const fileStructureStr = JSON.stringify(projectData.fileStructure, null, 2);
        const designSystemStr = JSON.stringify(projectData.designSystem, null, 2);
        const apiSpecStr = JSON.stringify(projectData.apiSpec, null, 2);
        const securityStr = JSON.stringify(projectData.securityContext, null, 2);
        const depsStr = JSON.stringify(projectData.architecture?.dependencies, null, 2);
        
        const prompt = `Act as a Lead Developer. You are tasking an AI coding assistant (like GitHub Copilot or Cursor) to build this project. 
        Create a comprehensive '.cursorrules' (or SYSTEM_PROMPT) file.

        **Project DNA:**
        - **Tech Stack:** ${JSON.stringify(projectData.architecture?.stack)}
        - **Dependencies:** ${depsStr}
        - **Database:** ${projectData.schema?.prismaSchema || projectData.schema?.sqlSchema}
        - **Security & QA:** ${securityStr}
        
        **Your Output must:**
        1. Be formatted as a valid markdown block suitable for a System Prompt.
        2. Define "Coding Standards" (naming conventions, error handling, strict typing).
        3. Include the "Project Structure" context (condensed version of the file tree).
        4. Include the "Design Tokens" (colors, fonts).
        5. Include "API Rules" (endpoint structure, auth).
        6. **Include Security & Testing mandates** (RLS, Tests, Validation).
        
        **Goal:** ensuring the AI agent produces production-ready code in the first shot without needing constant correction.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                ...THINKING_CONFIG, // Maximize thinking budget for the final synthesis task
            }
        });

        setProjectData(prev => ({ ...prev, agentRules: response.text }));
        handleNextPhase();
    } catch(e) {
        setError('Failed to generate Agent Rules.');
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  }, [ai, projectData]);

  const handleGeneratePlan = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const prompt = `Create a highly detailed action plan for a ${projectData.projectType}.
      
      **Context:**
      - Idea: ${projectData.initialIdea}
      - Tech Stack: ${JSON.stringify(projectData.architecture?.stack)}
      - Database Schema: Defined with ${projectData.schema?.tables.length} tables.
      - File Structure: Defined.
      - Design System: Defined (${projectData.designSystem?.coreComponents.length} components).
      - API Spec: Defined (${projectData.apiSpec?.endpoints.length} endpoints).
      - Security: Defined (${projectData.securityContext?.policies.length} policies).

      **Task:**
      Create a 4-phase plan: 'Discovery & Design', 'Development', 'Testing & QA', and 'Launch'. 
      For each phase, list 3-5 specific, actionable tasks.
      
      **CRITICAL:** The tasks must be specific to the generated specs.
      - Example: "Implement 'ProductCard' component matching Design System".
      - Example: "Build 'POST /api/users' endpoint per API Spec".
      - Example: "Implement RLS policy for 'Posts' table".
      - Example: "Write E2E test for Login Flow".

      For EACH task, provide:
      1. Description
      2. Estimated duration
      3. Priority (High/Medium/Low)
      4. Role (e.g., "Frontend Dev", "Backend Dev")`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phase_name: { type: Type.STRING },
                tasks: {
                  type: Type.ARRAY,
                  items: { 
                    type: Type.OBJECT,
                    properties: {
                      description: { type: Type.STRING },
                      estimatedDuration: { type: Type.STRING },
                      priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                      role: { type: Type.STRING }
                    },
                    required: ['description', 'estimatedDuration', 'priority', 'role']
                  }
                }
              },
              required: ['phase_name', 'tasks']
            }
          }
        }
      });

      const plan: Phase[] = JSON.parse(response.text);
      
      // Normalize data
      const normalizedPlan = plan.map(phase => ({
        ...phase,
        tasks: phase.tasks.map(task => ({
          ...task,
          priority: (["High", "Medium", "Low"].includes(task.priority) ? task.priority : "Medium") as "High" | "Medium" | "Low"
        }))
      }));

      setProjectData(prev => ({ ...prev, actionPlan: normalizedPlan }));
      handleNextPhase();
    } catch (e) {
      setError('Failed to generate the action plan. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [ai, projectData]);
  
  const handleGenerateKickoffAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const planSummary = projectData.actionPlan?.map(p => 
          `- ${p.phase_name}:\n${p.tasks.map(t => `  * ${t.description} (${t.priority})`).join('\n')}`
        ).join('\n');
        
        const prompt = `Based on the comprehensive project data provided, generate assets for a project kickoff.

**Project Data:**
*   **Initial Idea:** "${projectData.initialIdea}"
*   **Tech Stack:** ${JSON.stringify(projectData.architecture?.stack)}
*   **Action Plan Summary:**
    ${planSummary}

**Required Assets:**
Generate the following three items:
1.  **Elevator Pitch:** A compelling 60-second pitch.
2.  **Key Milestones (First Month):** 5 key, tangible milestones.
3.  **Kickoff Meeting Agenda:** A sample agenda.

**Formatting Instructions:**
Format the entire response as clean, well-structured markdown.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        setProjectData(prev => ({ ...prev, kickoffAssets: response.text }));
    } catch (e) {
        setError('Failed to generate kickoff assets. Please try again.');
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  }, [ai, projectData]);

  const handleSetupWorkspace = useCallback((finalPlan: Phase[]) => {
    if (!finalPlan) return;

    const tasks: Task[] = finalPlan.flatMap(phase => 
      phase.tasks.map((task, index) => ({
        id: `${phase.phase_name.replace(/\s+/g, '-')}-${index}-${Date.now()}`,
        content: task.description,
        description: task.description,
        estimatedDuration: task.estimatedDuration,
        priority: task.priority,
        role: task.role,
        status: TaskStatus.TODO,
        phase: phase.phase_name,
      }))
    );
    
    setProjectData(prev => ({ ...prev, actionPlan: finalPlan, tasks: tasks }));
    handleNextPhase();
  }, []);

  const handleUpdateTasks = useCallback((updatedTasks: Task[]) => {
    setProjectData(prev => ({ ...prev, tasks: updatedTasks }));
  }, []);

  const renderCurrentPhase = () => {
    if (isLoading) return <LoadingSpinner />;
    if (error) return <div className="text-red-400 text-center p-8 animate-fade-in">{error}</div>;

    switch (currentPhase) {
      case AppPhase.IDEA:
        return (
            <IdeaInput 
                onSubmit={handleIdeaSubmit} 
                onAnalyzeAudio={handleAnalyzeAudio}
                isAnalyzingAudio={isAnalyzingAudio}
            />
        );
      case AppPhase.BRAINSTORM:
        return (
            <BrainstormingView 
                data={projectData.brainstormingResults} 
                onUpdate={(data) => handleUpdateProjectData({ brainstormingResults: data })}
                onRefine={(prompt) => handleRefineProjectData('Brainstorming', prompt)}
                isRefining={isRefining}
                onContinue={handleStartResearch} 
            />
        );
      case AppPhase.RESEARCH:
        return <ResearchReport report={projectData.researchReport} onContinue={handleGenerateArchitecture} />;
      case AppPhase.ARCHITECTURE:
        return (
            <ArchitectureView 
                architecture={projectData.architecture} 
                onContinue={handleGenerateSchema}
                onRefine={(prompt) => handleRefineProjectData('Architecture', prompt)}
                isRefining={isRefining} 
            />
        );
      case AppPhase.DATAMODEL:
        return (
            <DataModelView 
                data={projectData.schema} 
                onContinue={handleGenerateFileStructure} 
                onRefine={(prompt) => handleRefineProjectData('Data Model', prompt)}
                isRefining={isRefining}
            />
        );
      case AppPhase.FILE_STRUCTURE:
        return (
            <FileStructureView 
                structure={projectData.fileStructure} 
                onContinue={handleGenerateDesignSystem} 
                onRefine={(prompt) => handleRefineProjectData('Files', prompt)}
                isRefining={isRefining}
            />
        );
      case AppPhase.UI_UX:
        return (
            <DesignSystemView 
                designSystem={projectData.designSystem} 
                onContinue={handleGenerateApiSpec} 
                onRefine={(prompt) => handleRefineProjectData('UI/UX', prompt)}
                isRefining={isRefining}
            />
        );
      case AppPhase.API_SPEC:
        return (
            <ApiSpecView 
                apiSpec={projectData.apiSpec} 
                onContinue={handleGenerateSecurity} 
                onRefine={(prompt) => handleRefineProjectData('API', prompt)}
                isRefining={isRefining}
            />
        );
      case AppPhase.SECURITY:
        return (
            <SecurityView 
                securityContext={projectData.securityContext} 
                onContinue={handleNextPhase} 
                onRefine={(prompt) => handleRefineProjectData('Security', prompt)}
                isRefining={isRefining}
            />
        );
      case AppPhase.BLUEPRINT_STUDIO:
        return (
            <BlueprintStudio 
                projectData={projectData} 
                onUpdate={handleUpdateProjectData} 
                onRefine={handleRefineProjectData}
                onContinue={handleGenerateAgentRules} 
                isRefining={isRefining}
            />
        );
      case AppPhase.AGENT_RULES:
        return <AgentRulesView rules={projectData.agentRules} onContinue={handleGeneratePlan} />;
      case AppPhase.PLAN:
        return <ActionPlanView plan={projectData.actionPlan || []} onContinue={handleSetupWorkspace} />;
      case AppPhase.WORKSPACE:
        return (
            <KanbanBoard 
                tasks={projectData.tasks || []} 
                onUpdateTasks={handleUpdateTasks} 
                onGenerateGuide={handleGenerateTaskGuide}
                onContinue={handleNextPhase} 
            />
        );
      case AppPhase.DOCUMENT:
        return <SpecDocument projectData={projectData} onContinue={handleNextPhase} />;
      case AppPhase.KICKOFF:
        return <KickoffView assets={projectData.kickoffAssets} projectData={projectData} onGenerate={handleGenerateKickoffAssets} />;
      default:
        return <IdeaInput onSubmit={handleIdeaSubmit} onAnalyzeAudio={handleAnalyzeAudio} isAnalyzingAudio={isAnalyzingAudio} />;
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark font-sans flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-7xl mx-auto">
        <Header onReset={handleResetProject} />
        <main className="mt-8 bg-slate-900/70 backdrop-blur-sm rounded-2xl shadow-2xl ring-1 ring-white/10">
          <PhaseStepper currentPhase={currentPhase} />
          <div className="p-4 sm:p-8 md:p-12 min-h-[60vh]">
            {renderCurrentPhase()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
