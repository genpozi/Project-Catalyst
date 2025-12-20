
import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { LocalIntelligence } from "./LocalIntelligence";
import { 
  ProjectData, 
  BrainstormingData, 
  ArchitectureData, 
  SchemaData, 
  FileNode, 
  DesignSystem, 
  ApiSpecification, 
  SecurityContext, 
  Phase,
  Task,
  ChecklistItem,
  CostEstimation,
  TaskCodeSnippet,
  ChatMessage,
  ResearchReportData,
  ComplianceItem,
  DevOpsConfig,
  KnowledgeDoc,
  ArchitectureNode,
  ArchitectureEdge,
  TechStack,
  AgentRuleConfig
} from './types';

export class GeminiService {
  private ai: GoogleGenAI;
  private local: LocalIntelligence;
  private modelFlash = "gemini-3-flash-preview";
  private modelPro = "gemini-3-pro-preview";
  private modelAudio = "gemini-2.5-flash-native-audio-preview-09-2025";

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    this.local = LocalIntelligence.getInstance();
  }

  // --- Router Logic ---
  // Decides whether to use Cloud or Local based on model readiness and task complexity.
  // Currently, we prefer Local for 'Refinement' (text-to-text) if ready.
  // Complex JSON tasks still prefer Cloud due to 2B model limitations on strict schema adherence.
  
  private async routeTextTask(prompt: string, preferLocal = true): Promise<string> {
      if (preferLocal && this.local.isReady) {
          try {
              console.log("Routing to Local Intelligence...");
              return await this.local.generateText(prompt);
          } catch (e) {
              console.warn("Local inference failed, falling back to cloud", e);
          }
      }
      
      const response = await this.ai.models.generateContent({
          model: this.modelFlash,
          contents: prompt
      });
      return response.text || "";
  }

  // --- End Router Logic ---

  private getKnowledgeContext(docs?: KnowledgeDoc[]): string {
      if (!docs || docs.length === 0) return "";
      
      const snippets = docs.map(d => `--- DOC: ${d.title} (${d.type}) ---\n${d.content}\n`).join('\n');
      return `\n\nSYSTEM CONTEXT / KNOWLEDGE BASE:\nUse the following user-provided documentation to guide your decisions. Prioritize these rules over general best practices if they conflict.\n\n${snippets}\n\n`;
  }

  async analyzeAudioIdea(audioBase64: string) {
    const response = await this.ai.models.generateContent({
      model: this.modelAudio,
      contents: { 
        parts: [
          { inlineData: { mimeType: "audio/pcm;rate=16000", data: audioBase64 } }, 
          { text: "Analyze this voice memo. Extract: 1. Core Idea 2. Project Type 3. Specific Constraints. Be concise." } 
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
    return JSON.parse(response.text);
  }

  async generateBrainstorming(idea: string, type: string, constraints: string, imageBase64?: string): Promise<BrainstormingData> {
    const parts: any[] = [{ text: `Act as a senior product strategist. Analyze this project: TYPE: ${type}, IDEA: ${idea}, CONSTRAINTS: ${constraints}. Generate strategic foundation JSON including personas and user journeys.` }];
    if (imageBase64) {
      parts.push({ inlineData: { mimeType: 'image/png', data: imageBase64 } });
    }
    const response = await this.ai.models.generateContent({
      model: this.modelFlash,
      contents: { parts },
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
                }
              }
            },
            userJourneys: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  personaRole: { type: Type.STRING },
                  goal: { type: Type.STRING },
                  steps: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            },
            features: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    return JSON.parse(response.text);
  }

  async generateResearch(idea: string): Promise<ResearchReportData> {
    const response = await this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Perform a deep technical feasibility research for: ${idea}. 
      1. Provide a summary.
      2. Identify 3-4 real-world competitors or similar projects.
      3. For each competitor, list strengths, weaknesses, and their pricing model (Free/Paid/SaaS).`,
      config: { 
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                competitors: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            url: { type: Type.STRING },
                            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                            priceModel: { type: Type.STRING }
                        }
                    }
                }
            }
        }
      }
    });
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter((c: any) => c.web)
        .map((chunk: any) => chunk.web) || [];

    const data = JSON.parse(response.text);
    return { ...data, sources };
  }

  async generateArchitecture(project: ProjectData): Promise<ArchitectureData> {
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Architect a production-ready system for: ${project.initialIdea}. Stack choice justification required. Features: ${JSON.stringify(project.brainstormingResults?.features)}
      ${kb}`,
      config: {
        thinkingConfig: { thinkingBudget: 16000 },
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
              }
            },
            patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
            dependencies: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } } } }
          }
        }
      }
    });
    return JSON.parse(response.text);
  }

  // --- Visual Architect Logic ---

  async syncSpecFromGraph(currentArch: ArchitectureData, nodes: ArchitectureNode[], edges: ArchitectureEdge[]): Promise<ArchitectureData> {
    const response = await this.ai.models.generateContent({
        model: this.modelPro,
        contents: `
        You are a System Architect.
        The user has drawn a system diagram with the following Nodes and Edges.
        
        NODES: ${JSON.stringify(nodes.map(n => ({ type: n.type, label: n.label })))}
        EDGES: ${JSON.stringify(edges)}
        
        CURRENT SPEC: ${JSON.stringify(currentArch.stack)}

        Task: Update the architectural specification (Stack, Dependencies, Rationale) to match the visual diagram.
        - If a Node 'Redis' (type: cache) exists, ensure the stack or dependencies reflect that.
        - If a Node 'Lambda' exists, update deployment strategy.
        - Update the 'Rationale' to explain the flow defined by the edges.
        - Keep existing valid choices if they don't conflict.
        
        Return the full ArchitectureData object.
        `,
        config: {
            thinkingConfig: { thinkingBudget: 8000 },
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
                        }
                    },
                    patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
                    dependencies: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } } } }
                }
            }
        }
    });
    
    // Merge result with existing visual data so we don't lose it
    const newArch = JSON.parse(response.text);
    return {
        ...currentArch,
        stack: newArch.stack,
        patterns: newArch.patterns,
        dependencies: newArch.dependencies,
    };
  }

  async generateGraphLayout(stack: TechStack): Promise<{ nodes: ArchitectureNode[], edges: ArchitectureEdge[] }> {
      const response = await this.ai.models.generateContent({
          model: this.modelFlash,
          contents: `
          Generate a visual node graph layout for this Tech Stack: ${JSON.stringify(stack)}.
          
          Create a list of Nodes (id, type, label, x, y) and Edges (from, to).
          - Use a standard left-to-right or top-to-bottom flow.
          - Frontend at x:100, y:100.
          - Backend at x:400, y:100.
          - Database at x:700, y:100.
          - Add generic nodes for things implied by the stack (e.g. if AWS, maybe add S3 or CloudFront).
          - Coordinates should be numbers (approximate 0-1000 canvas).
          
          Node Types allowed: 'frontend', 'backend', 'database', 'service', 'deployment', 'cache', 'queue', 'external'.
          `,
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                      nodes: {
                          type: Type.ARRAY,
                          items: {
                              type: Type.OBJECT,
                              properties: {
                                  id: { type: Type.STRING },
                                  type: { type: Type.STRING },
                                  label: { type: Type.STRING },
                                  x: { type: Type.NUMBER },
                                  y: { type: Type.NUMBER },
                                  description: { type: Type.STRING }
                              },
                              required: ['id', 'type', 'label', 'x', 'y']
                          }
                      },
                      edges: {
                          type: Type.ARRAY,
                          items: {
                              type: Type.OBJECT,
                              properties: {
                                  id: { type: Type.STRING },
                                  from: { type: Type.STRING },
                                  to: { type: Type.STRING },
                                  label: { type: Type.STRING }
                              },
                              required: ['id', 'from', 'to']
                          }
                      }
                  }
              }
          }
      });
      return JSON.parse(response.text);
  }

  async optimizeGraphLayout(nodes: any[], edges: any[], type: 'architecture' | 'erd'): Promise<any[]> {
      const response = await this.ai.models.generateContent({
          model: this.modelFlash,
          contents: `
          Optimize the layout of this ${type} diagram to minimize crossing lines and group related items logically.
          
          Nodes: ${JSON.stringify(nodes.map(n => ({ id: n.id, label: n.label || n.name, type: n.type || 'table' })))}
          Edges/Relations: ${JSON.stringify(edges)}
          
          Return ONLY the array of nodes with UPDATED 'x' and 'y' coordinates. 
          Keep the layout within a 1000x800 canvas.
          Use a left-to-right flow for Architecture.
          Use a clustered layout for ERD.
          `,
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          id: { type: Type.STRING },
                          x: { type: Type.NUMBER },
                          y: { type: Type.NUMBER }
                      },
                      required: ['id', 'x', 'y']
                  }
              }
          }
      });
      return JSON.parse(response.text);
  }

  // --- End Visual Architect Logic ---

  async generateCloudInfrastructure(project: ProjectData): Promise<{ iacCode: string; cloudDiagram: string }> {
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.ai.models.generateContent({
      model: this.modelPro,
      contents: `You are a Senior DevOps Engineer. 
      Generate infrastructure assets for this project: "${project.initialIdea}"
      Tech Stack: ${JSON.stringify(project.architecture?.stack)}
      ${kb}
      
      Requirements:
      1. 'iacCode': A complete, production-ready 'main.tf' Terraform configuration. Use AWS or the most appropriate provider for the stack. Include comments.
      2. 'cloudDiagram': A Mermaid.js 'C4Container' diagram syntax that visualizes the system architecture, containers, and database relationships. Do NOT include markdown code blocks in the string, just the raw mermaid code.
      `,
      config: {
        thinkingConfig: { thinkingBudget: 8000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            iacCode: { type: Type.STRING },
            cloudDiagram: { type: Type.STRING }
          },
          required: ['iacCode', 'cloudDiagram']
        }
      }
    });
    return JSON.parse(response.text);
  }

  async generateProjectManifest(project: ProjectData): Promise<{ filename: string; content: string; installCommand: string }> {
    const frontend = project.architecture?.stack?.frontend || "Modern JavaScript Framework";
    const backend = project.architecture?.stack?.backend || "Node.js or Python";
    const database = project.architecture?.stack?.database || "PostgreSQL";

    const response = await this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Generate the dependency manifest file (package.json, requirements.txt, go.mod, etc) for this stack:
      Frontend: ${frontend}
      Backend: ${backend}
      Database: ${database}
      
      Return JSON with:
      - filename: The standard filename (e.g. package.json)
      - content: The file content (valid JSON or text, no markdown blocks)
      - installCommand: Command to install (e.g. 'npm install')
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            filename: { type: Type.STRING },
            content: { type: Type.STRING },
            installCommand: { type: Type.STRING }
          },
          required: ['filename', 'content', 'installCommand']
        }
      }
    });
    return JSON.parse(response.text);
  }

  async generateGitScript(project: ProjectData): Promise<string> {
    const backendStack = project.architecture?.stack?.backend || "Generic";
    
    const response = await this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Generate a bash script to initialize a git repo, create a .gitignore relevant to the stack (${backendStack}), and push to GitHub using 'gh repo create'.
      Project Name: ${project.name}
      Return ONLY the raw bash script content, no markdown blocks.`,
    });
    let script = response.text;
    if (script.startsWith('```bash')) script = script.replace('```bash', '').replace('```', '');
    if (script.startsWith('```')) script = script.replace('```', '').replace('```', '');
    return script;
  }

  async generateSchema(project: ProjectData): Promise<SchemaData> {
    const db = project.architecture?.stack?.database || "General SQL";
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Design a database schema for: ${project.initialIdea}. Stack: ${db}. ${kb}`,
      config: {
        responseMimeType: "application/json",
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
                  columns: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, constraints: { type: Type.STRING }, description: { type: Type.STRING } } } }
                }
              }
            },
            mermaidChart: { type: Type.STRING },
            prismaSchema: { type: Type.STRING },
            sqlSchema: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text);
  }

  async generateFileStructure(project: ProjectData): Promise<FileNode[]> {
    const stack = JSON.stringify(project.architecture?.stack || { frontend: 'React', backend: 'Node', database: 'Postgres' });
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const schemaContext = project.schema?.tables?.map(t => t.name).join(', ') || "";

    const response = await this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Create a comprehensive file structure for: ${project.initialIdea}. 
      Stack: ${stack}. 
      Database Tables defined: ${schemaContext} (Ensure models/entities for these exist).
      ${kb}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING },
              description: { type: Type.STRING },
              children: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, description: { type: Type.STRING } } } }
            }
          }
        }
      }
    });
    return JSON.parse(response.text);
  }

  async generateFilePreview(file: FileNode, project: ProjectData): Promise<string> {
    const stack = JSON.stringify(project.architecture?.stack);
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const api = JSON.stringify(project.apiSpec?.endpoints);
    const design = JSON.stringify(project.designSystem?.colorPalette);

    const response = await this.ai.models.generateContent({
        model: this.modelPro,
        contents: `You are a Senior Software Engineer. Write the ACTUAL CODE content for this file: "${file.name}".
        
        File Purpose: ${file.description}
        Tech Stack: ${stack}
        API Context: ${api}
        Design Tokens: ${design}
        ${kb}

        If it's a code file (js, ts, py, go, rs, etc.), write production-ready code.
        If it's a config file (json, yaml), write valid config.
        Do NOT wrap in markdown code blocks. Return raw file content only.
        `,
        config: { thinkingConfig: { thinkingBudget: 8000 } }
    });
    
    let content = response.text;
    // Strip markdown if the model insists on adding it despite instructions
    if (content.startsWith('```')) {
        content = content.replace(/^```[a-z]*\n/, '').replace(/```$/, '');
    }
    return content;
  }

  async parseTreeToStructure(treeOutput: string): Promise<FileNode[]> {
    const response = await this.ai.models.generateContent({
        model: this.modelFlash,
        contents: `Convert this file tree text output into a JSON array of FileNode objects.
        Tree Output:
        ${treeOutput}
        
        Format:
        interface FileNode {
          name: string;
          type: 'file' | 'folder';
          description: string; // Infer a brief description based on file name/extension
          children?: FileNode[];
        }
        `,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        type: { type: Type.STRING },
                        description: { type: Type.STRING },
                        children: { 
                            type: Type.ARRAY, 
                            items: { 
                                type: Type.OBJECT, 
                                properties: { 
                                    name: { type: Type.STRING }, 
                                    type: { type: Type.STRING }, 
                                    description: { type: Type.STRING } 
                                } 
                            } 
                        }
                    }
                }
            }
        }
    });
    return JSON.parse(response.text);
  }

  async generateDesignSystem(project: ProjectData): Promise<DesignSystem> {
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Design a UI/UX design system for: ${project.initialIdea}. ${kb}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            colorPalette: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, hex: { type: Type.STRING }, usage: { type: Type.STRING } } } },
            typography: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { role: { type: Type.STRING }, fontFamily: { type: Type.STRING }, size: { type: Type.STRING } } } },
            coreComponents: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, states: { type: Type.ARRAY, items: { type: Type.STRING } } } } },
            layoutStrategy: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text);
  }

  async generateWireframe(project: ProjectData): Promise<string> {
    const palette = project.designSystem?.colorPalette.map(c => `${c.name}: ${c.hex}`).join(', ') || "Default Colors";
    const font = project.designSystem?.typography?.[0]?.fontFamily || "Sans-serif";
    const response = await this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Generate a single-file HTML prototype using Tailwind CSS via CDN for this app: "${project.initialIdea}". 
      Use these design tokens: Colors=[${palette}], Font=[${font}].
      Include a responsive layout, a navigation bar, and a main dashboard or landing page content relevant to the app idea.
      Return ONLY the raw HTML string code starting with <!DOCTYPE html>. Do not wrap in markdown blocks.`,
    });
    let html = response.text;
    if (html.startsWith('```html')) html = html.replace('```html', '').replace('```', '');
    if (html.startsWith('```')) html = html.replace('```', '').replace('```', '');
    return html;
  }

  async generateApiSpec(project: ProjectData): Promise<ApiSpecification> {
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Define API specification for: ${project.initialIdea}. ${kb}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            endpoints: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { method: { type: Type.STRING }, path: { type: Type.STRING }, summary: { type: Type.STRING }, requestBody: { type: Type.STRING }, responseSuccess: { type: Type.STRING } } } },
            authMechanism: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text);
  }

  async generateSecurityContext(project: ProjectData): Promise<SecurityContext> {
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Define security and QA policies for: ${project.initialIdea}. ${kb}
      Also include a compliance checklist relevant to the project type (e.g. HIPAA for health, GDPR for EU users, PCI for payments).`,
      config: {
        thinkingConfig: { thinkingBudget: 8000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            policies: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, implementationHint: { type: Type.STRING } } } },
            testingStrategy: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, description: { type: Type.STRING } } } },
            complianceChecklist: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  id: { type: Type.STRING }, 
                  standard: { type: Type.STRING }, 
                  requirement: { type: Type.STRING }, 
                  action: { type: Type.STRING }, 
                  status: { type: Type.STRING } 
                } 
              } 
            }
          }
        }
      }
    });
    return JSON.parse(response.text);
  }

  async generateComplianceChecklist(standard: string, project: ProjectData): Promise<ComplianceItem[]> {
    const response = await this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Generate a specific ${standard} compliance audit checklist for this project: "${project.initialIdea}".
      Tech Stack: ${JSON.stringify(project.architecture?.stack)}.
      Focus on actionable technical requirements for ${standard}.`,
      config: {
        thinkingConfig: { thinkingBudget: 8000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { 
            type: Type.OBJECT, 
            properties: { 
              id: { type: Type.STRING }, 
              standard: { type: Type.STRING }, 
              requirement: { type: Type.STRING }, 
              action: { type: Type.STRING }, 
              status: { type: Type.STRING } 
            } 
          }
        }
      }
    });
    return JSON.parse(response.text);
  }

  async generateCostEstimation(project: ProjectData): Promise<CostEstimation> {
    return this.generateScaledCost('MVP (Low Traffic)', project);
  }

  async generateScaledCost(scenarioOrMetrics: string | { users: number, storage: number }, project: ProjectData): Promise<CostEstimation> {
    const stack = JSON.stringify(project.architecture?.stack || {});
    let scenarioText = "";
    
    if (typeof scenarioOrMetrics === 'string') {
        scenarioText = `Scenario: ${scenarioOrMetrics}`;
    } else {
        scenarioText = `Metrics: ${scenarioOrMetrics.users.toLocaleString()} Monthly Active Users, ${scenarioOrMetrics.storage}GB Database Storage.`;
    }

    const response = await this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Generate a realistic project cost and resource estimation for: ${project.initialIdea}. 
      ${scenarioText}
      Stack: ${stack}.`,
      config: {
        thinkingConfig: { thinkingBudget: 4000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            monthlyInfrastructure: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  service: { type: Type.STRING }, 
                  estimatedCost: { type: Type.STRING }, 
                  reason: { type: Type.STRING } 
                } 
              } 
            },
            totalProjectHours: { type: Type.STRING },
            suggestedTeamSize: { type: Type.STRING },
            risks: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { 
                  description: { type: Type.STRING }, 
                  impact: { type: Type.STRING } 
                } 
              } 
            }
          }
        }
      }
    });
    return JSON.parse(response.text);
  }

  async generateDevOpsConfig(project: ProjectData): Promise<DevOpsConfig> {
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.ai.models.generateContent({
      model: this.modelPro,
      contents: `You are a DevOps Architect. Generate production-grade deployment configurations for: "${project.initialIdea}".
      ${kb}
      Context:
      - Stack: ${JSON.stringify(project.architecture?.stack)}
      - Database: ${project.architecture?.stack?.database}
      
      Requirements:
      1. 'dockerfile': A production-optimized Dockerfile (multi-stage build if applicable).
      2. 'dockerCompose': A docker-compose.prod.yml for orchestration.
      3. 'ciPipeline': A GitHub Actions workflow (YAML) for CI/CD (Build, Test, Deploy).
      4. 'deploymentGuide': A brief text guide on how to deploy this (e.g., "Push to AWS ECR, deploy to ECS...").
      `,
      config: {
        thinkingConfig: { thinkingBudget: 8000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dockerfile: { type: Type.STRING },
            dockerCompose: { type: Type.STRING },
            ciPipeline: { type: Type.STRING },
            deploymentGuide: { type: Type.STRING }
          },
          required: ['dockerfile', 'dockerCompose', 'ciPipeline', 'deploymentGuide']
        }
      }
    });
    return JSON.parse(response.text);
  }

  async generateActionPlan(project: ProjectData): Promise<Phase[]> {
    const stack = JSON.stringify(project.architecture?.stack || {});
    const response = await this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Generate a detailed phased action plan for: ${project.initialIdea}. Stack: ${stack}.`,
      config: {
        thinkingConfig: { thinkingBudget: 12000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              phase_name: { type: Type.STRING },
              tasks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, estimatedDuration: { type: Type.STRING }, priority: { type: Type.STRING }, role: { type: Type.STRING } } } }
            }
          }
        }
      }
    });
    return JSON.parse(response.text);
  }

  async generateAgentRules(project: ProjectData, config?: AgentRuleConfig): Promise<string> {
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    
    let configPrompt = "";
    if (config) {
        configPrompt = `
        STRICTLY FOLLOW THESE CONFIGURATION RULES:
        - Tone: ${config.tone}
        - Programming Language: ${config.language}
        - Documentation Style: ${config.documentationStyle}
        - Error Handling Pattern: ${config.errorHandling}
        - Testing Framework: ${config.testingFramework}
        - Patterns to Enforce: ${config.preferredPatterns.join(', ')}
        `;
    }

    const response = await this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Create a comprehensive .cursorrules (System Prompt) file for: ${project.initialIdea}. 
      
      Project Context: 
      - Stack: ${JSON.stringify(project.architecture?.stack)}
      - Schema Overview: ${project.schema?.mermaidChart}
      - File Structure: ${JSON.stringify(project.fileStructure)}
      
      ${configPrompt}
      ${kb} 
      
      Output the raw text content for the .cursorrules file. 
      Include sections for: Project Overview, Tech Stack, Coding Standards, Folder Structure, and specific behavioral instructions for the AI agent (e.g. "Don't use try-catch if using Result type").`,
      config: { thinkingConfig: { thinkingBudget: 10000 } }
    });
    return response.text;
  }

  async refineAgentRules(currentRules: string, feedback: string): Promise<string> {
    const prompt = `Current .cursorrules:\n${currentRules}\n\nUser Feedback: ${feedback}\n\nRewrite the rules to incorporate the feedback. Return ONLY the new content.`;
    return this.routeTextTask(prompt);
  }

  async generateImplementationGuide(taskId: string, project: ProjectData): Promise<string> {
    const task = project.tasks?.find(t => t.id === taskId);
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Write a detailed step-by-step implementation guide for this task: "${task?.content}". Context: ${JSON.stringify({ stack: project.architecture?.stack, schema: project.schema?.mermaidChart, api: project.apiSpec })}. ${kb}`,
      config: { thinkingConfig: { thinkingBudget: 12000 } }
    });
    return response.text;
  }

  async generateChecklist(taskId: string, project: ProjectData): Promise<ChecklistItem[]> {
    const task = project.tasks?.find(t => t.id === taskId);
    const response = await this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Break down this task into a technical checklist: "${task?.content}". Context: ${JSON.stringify({ stack: project.architecture?.stack })}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              completed: { type: Type.BOOLEAN }
            },
            required: ['id', 'text', 'completed']
          }
        }
      }
    });
    return JSON.parse(response.text);
  }

  async generateTaskCode(taskId: string, project: ProjectData): Promise<TaskCodeSnippet> {
    const task = project.tasks?.find(t => t.id === taskId);
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const context = {
        task: task?.content,
        stack: project.architecture?.stack,
        design: project.designSystem?.colorPalette,
        files: project.fileStructure,
        api: project.apiSpec?.endpoints
    };

    const response = await this.ai.models.generateContent({
        model: this.modelPro,
        contents: `You are a Senior Software Engineer. Write the actual code to implement this task: "${task?.content}".
        
        Project Context:
        - Tech Stack: ${JSON.stringify(context.stack)}
        - Design Tokens (Tailwind): ${JSON.stringify(context.design)}
        - File Structure: ${JSON.stringify(context.files)}
        ${kb}

        Rules:
        1. Select the most relevant file to create or modify from the file structure (or suggest a new one).
        2. Write production-ready code. Use standard libraries where possible.
        3. If it's a UI component, use the design tokens provided.
        4. If it's an API route, match the API spec.
        
        Output JSON only.`,
        config: {
            thinkingConfig: { thinkingBudget: 12000 },
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    language: { type: Type.STRING },
                    code: { type: Type.STRING },
                    filename: { type: Type.STRING },
                    description: { type: Type.STRING }
                },
                required: ['language', 'code', 'filename', 'description']
            }
        }
    });
    return JSON.parse(response.text);
  }

  async refineTaskCode(currentSnippet: TaskCodeSnippet, feedback: string, projectContext: any): Promise<TaskCodeSnippet> {
    // Code refinement involves JSON, so we stick to Cloud Model to ensure strict schema adherence
    // Local models often struggle with complex JSON output formats unless grammar-constrained.
    const response = await this.ai.models.generateContent({
        model: this.modelPro,
        contents: `
        Current Code (${currentSnippet.language}):
        ${currentSnippet.code}

        User Request: ${feedback}

        Project Context: ${JSON.stringify(projectContext)}

        Rewrite the code to satisfy the request. Return a JSON object with the updated code and description.
        `,
        config: {
            thinkingConfig: { thinkingBudget: 8000 },
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    language: { type: Type.STRING },
                    code: { type: Type.STRING },
                    filename: { type: Type.STRING },
                    description: { type: Type.STRING }
                },
                required: ['language', 'code', 'filename', 'description']
            }
        }
    });
    return JSON.parse(response.text);
  }

  async runProjectHealthCheck(project: ProjectData): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Perform a comprehensive architectural integrity review for: "${project.initialIdea}". 
      Analyze for contradictions between these segments:
      - Stack: ${JSON.stringify(project.architecture?.stack)}
      - Schema: ${project.schema?.mermaidChart}
      - API: ${JSON.stringify(project.apiSpec)}
      - Security: ${JSON.stringify(project.securityContext)}
      - Files: ${JSON.stringify(project.fileStructure)}
      
      Identify 3-5 critical risks or inconsistencies and provide remediation advice.`,
      config: { thinkingConfig: { thinkingBudget: 16000 } }
    });
    return response.text;
  }

  async generateKickoffAssets(project: ProjectData): Promise<string> {
    const prompt = `Write a high-energy kickoff briefing and final instructions for: ${project.initialIdea}.`;
    return this.routeTextTask(prompt);
  }

  async refineSection(section: string, currentData: any, feedback: string): Promise<any> {
    // If the refinement requires JSON output (which almost all sections do), use Cloud.
    // Local is risky for JSON structure currently.
    const response = await this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Refine the ${section} section based on feedback: "${feedback}". Current state: ${JSON.stringify(currentData)}`,
      config: { thinkingConfig: { thinkingBudget: 8000 }, responseMimeType: "application/json" }
    });
    return JSON.parse(response.text);
  }

  async fixJson(brokenJson: string): Promise<any> {
    // This is a perfect task for Local Intelligence if trained, but generic 2B models struggle.
    // Sticking to Flash for reliability.
    const response = await this.ai.models.generateContent({
        model: this.modelFlash,
        contents: `Fix this broken JSON string and return valid JSON:\n\n${brokenJson}`,
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text);
  }

  async generateDriftCheckScript(project: ProjectData): Promise<string> {
    const fileList = JSON.stringify(project.fileStructure);
    
    return `const fs = require('fs');
const path = require('path');

// Auto-generated by 0relai. Use this script to verify file structure integrity.

const BLUEPRINT_STRUCTURE = ${fileList};

function checkStructure(nodes, currentPath = '.') {
    let errors = [];
    nodes.forEach(node => {
        const fullPath = path.join(currentPath, node.name);
        if (!fs.existsSync(fullPath)) {
            errors.push(\`MISSING: \${fullPath}\`);
        } else {
            if (node.type === 'folder' && node.children) {
                errors = [...errors, ...checkStructure(node.children, fullPath)];
            }
        }
    });
    return errors;
}

console.log("🔍 0relai: Starting Architectural Drift Check...");
const drift = checkStructure(BLUEPRINT_STRUCTURE);

if (drift.length > 0) {
    console.error("\\n⚠️  ARCHITECTURAL DRIFT DETECTED:");
    drift.forEach(e => console.error(e));
    process.exit(1);
} else {
    console.log("\\n✅ System Integrity Verified. No drift detected.");
    process.exit(0);
}
`;
  }

  async analyzeDrift(plannedStructure: FileNode[], actualStructureInput: string): Promise<string> {
    const response = await this.ai.models.generateContent({
        model: this.modelPro,
        contents: `
        You are the 0relai Architectural Auditor. Compare the PLANNED file structure vs the ACTUAL structure provided by the user.
        
        PLANNED STRUCTURE (JSON):
        ${JSON.stringify(plannedStructure)}

        ACTUAL STRUCTURE (User Input):
        ${actualStructureInput}

        Analyze for "Architectural Drift".
        1. Identify missing critical files/folders.
        2. Identify unexpected files that might violate the architecture.
        3. Provide a "Drift Score" (0-100%, where 0 is perfect match).
        4. Give specific remediation steps.
        
        Output as a concise Markdown report.
        `,
        config: { thinkingConfig: { thinkingBudget: 8000 } }
    });
    return response.text;
  }

  async createChatSession(project: ProjectData) {
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    
    // Convert Graph to Text Representation
    let topology = "";
    if (project.architecture?.visualEdges && project.architecture?.visualLayout) {
        topology = project.architecture.visualEdges.map(e => {
            const source = project.architecture?.visualLayout?.find(n => n.id === e.from)?.label || e.from;
            const target = project.architecture?.visualLayout?.find(n => n.id === e.to)?.label || e.to;
            return `- ${source} connects to ${target}`;
        }).join('\n');
    }

    // NEW: Inject Agent Rules if defined
    const rules = project.agentRules ? `\n\nADHERE TO THESE PROJECT RULES:\n${project.agentRules}\n` : "";

    const context = `
      You are the Lead Architect for the project "${project.name}".
      
      Project Context:
      - Idea: ${project.initialIdea}
      - Tech Stack: ${JSON.stringify(project.architecture?.stack)}
      - System Topology (Graph):
      ${topology || "Not yet defined"}
      
      - Database Schema (Mermaid): ${project.schema?.mermaidChart}
      - API Endpoints: ${JSON.stringify(project.apiSpec?.endpoints?.map(e => `${e.method} ${e.path}`))}
      - Security Policies: ${JSON.stringify(project.securityContext?.policies?.map(p => p.name))}
      - File Structure: ${JSON.stringify(project.fileStructure)}
      ${rules}
      ${kb}
      
      Your goal is to assist the user in understanding, refining, or implementing this architecture.
      Be concise, technical, and refer to specific parts of the project data.
      Use Markdown for formatting.
    `;

    return this.ai.chats.create({
      model: this.modelPro,
      config: {
        systemInstruction: context,
        thinkingConfig: { thinkingBudget: 8000 }
      },
      history: project.chatHistory?.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      })) || []
    });
  }
}
