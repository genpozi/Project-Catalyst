
import { GoogleGenAI, Type, Chat, GenerateContentResponse, FunctionCall, FunctionResponse } from "@google/genai";
import { LocalIntelligence } from "./LocalIntelligence";
import { cleanAndParseJson } from "./utils/safeJson";
import { validateArchitecture, validateSchema, validateFileStructure, validateDesignSystem } from "./utils/validators";
import { AGENT_PERSONAS, AgentRoleId } from "./utils/agentPersonas";
import { TOOL_REGISTRY, AgentTool } from "./utils/tools";
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

  /**
   * Retries an async operation with exponential backoff.
   */
  private async retryWithBackoff<T>(operation: () => Promise<T>, retries = 3, initialDelay = 1000): Promise<T> {
      let currentTry = 0;
      while (true) {
          try {
              return await operation();
          } catch (error: any) {
              currentTry++;
              if (currentTry > retries) throw error;
              
              // Only retry on 429 (Too Many Requests) or 5xx (Server Errors)
              const status = error?.status || error?.response?.status;
              if (status && (status === 429 || status >= 500)) {
                  const delay = initialDelay * Math.pow(2, currentTry - 1);
                  console.warn(`Gemini API Error ${status}. Retrying in ${delay}ms... (Attempt ${currentTry}/${retries})`);
                  await new Promise(resolve => setTimeout(resolve, delay));
              } else {
                  throw error; // Re-throw non-retriable errors immediately
              }
          }
      }
  }

  // --- Router Logic ---
  private async routeTextTask(prompt: string, preferLocal = true): Promise<string> {
      if (preferLocal && this.local.isReady) {
          try {
              console.log("Routing to Local Intelligence...");
              return await this.local.generateText(prompt);
          } catch (e) {
              console.warn("Local inference failed, falling back to cloud", e);
          }
      }
      
      const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
          model: this.modelFlash,
          contents: prompt
      }));
      return response.text || "";
  }

  // Raw generation for simple prompts
  async generateRaw(systemPrompt: string, userPrompt: string, model: string = this.modelPro): Promise<string> {
      const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
          model: model,
          contents: userPrompt,
          config: {
              systemInstruction: systemPrompt,
              thinkingConfig: model === this.modelPro ? { thinkingBudget: 4000 } : undefined 
          }
      }));
      return response.text || "";
  }

  /**
   * Advanced Agent Loop with Function Calling Support.
   * Allows the model to call tools, receive results, and continue thinking.
   */
  async generateAgentTurn(
      systemPrompt: string, 
      userPrompt: string, 
      tools: AgentTool[], 
      project: ProjectData,
      model: string = this.modelPro
  ): Promise<string> {
      // 1. Initial Request
      const toolDecls = tools.map(t => t.declaration);
      
      // Start a chat session to maintain context of tool calls
      const chat = this.ai.chats.create({
          model: model,
          config: {
              systemInstruction: systemPrompt,
              tools: toolDecls.length > 0 ? [{ functionDeclarations: toolDecls }] : undefined,
              thinkingConfig: model === this.modelPro ? { thinkingBudget: 4000 } : undefined 
          }
      });

      let response: GenerateContentResponse = await this.retryWithBackoff<GenerateContentResponse>(() => chat.sendMessage({ message: userPrompt }));
      
      // 2. Loop for Tool Calls
      let maxTurns = 5; // Prevent infinite loops
      
      while (response.functionCalls && response.functionCalls.length > 0 && maxTurns > 0) {
          maxTurns--;
          
          const functionResponses: FunctionResponse[] = [];
          
          for (const call of response.functionCalls) {
              const tool = tools.find(t => t.declaration.name === call.name);
              let result: any = "Error: Tool not found";
              
              if (tool) {
                  try {
                      console.log(`[Agent] Calling tool: ${call.name}`, call.args);
                      result = await tool.execute(call.args, project);
                  } catch (e: any) {
                      result = `Error executing tool: ${e.message}`;
                  }
              }
              
              functionResponses.push({
                  id: call.id,
                  name: call.name,
                  response: { result }
              });
          }

          // Send results back to model
          response = await this.retryWithBackoff<GenerateContentResponse>(() => chat.sendMessage(functionResponses));
      }

      return response.text || "";
  }

  private getKnowledgeContext(docs?: KnowledgeDoc[]): string {
      if (!docs || docs.length === 0) return "";
      const snippets = docs.map(d => `<doc title="${d.title}" type="${d.type}">\n${d.content}\n</doc>`).join('\n');
      return `\n<knowledge_base>\n${snippets}\n</knowledge_base>\n`;
  }

  async analyzeAudioIdea(audioBase64: string) {
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
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
    }));
    return cleanAndParseJson(response.text || "{}");
  }

  async generateBrainstorming(idea: string, type: string, constraints: string, imageBase64?: string): Promise<BrainstormingData> {
    const parts: any[] = [{ text: `Act as a senior product strategist. Analyze this project: TYPE: ${type}, IDEA: ${idea}, CONSTRAINTS: ${constraints}. Generate strategic foundation JSON including personas and user journeys.` }];
    if (imageBase64) {
      parts.push({ inlineData: { mimeType: 'image/png', data: imageBase64 } });
    }
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
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
    }));
    return cleanAndParseJson(response.text || "{}");
  }

  async generateResearch(idea: string): Promise<ResearchReportData> {
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
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
    }));
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter((c: any) => c.web)
        .map((chunk: any) => chunk.web) || [];

    const data = cleanAndParseJson<ResearchReportData>(response.text || "{}");
    return { ...data, sources };
  }

  async generateArchitecture(project: ProjectData): Promise<ArchitectureData> {
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
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
    }));
    const raw = cleanAndParseJson(response.text || "{}");
    return validateArchitecture(raw);
  }

  async syncSpecFromGraph(currentArch: ArchitectureData, nodes: ArchitectureNode[], edges: ArchitectureEdge[]): Promise<ArchitectureData> {
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
        model: this.modelPro,
        contents: `
        You are a System Architect.
        The user has drawn a system diagram with the following Nodes and Edges.
        
        NODES: ${JSON.stringify(nodes.map(n => ({ type: n.type, label: n.label })))}
        EDGES: ${JSON.stringify(edges)}
        
        CURRENT SPEC: ${JSON.stringify(currentArch.stack)}

        Task: Update the architectural specification (Stack, Dependencies, Rationale) to match the visual diagram.
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
    }));
    
    const newArch = cleanAndParseJson<ArchitectureData>(response.text || "{}");
    const validated = validateArchitecture(newArch);
    return {
        ...currentArch,
        stack: validated.stack,
        patterns: validated.patterns,
        dependencies: validated.dependencies,
    };
  }

  async generateGraphLayout(stack: TechStack): Promise<{ nodes: ArchitectureNode[], edges: ArchitectureEdge[] }> {
      const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
          model: this.modelFlash,
          contents: `
          Generate a visual node graph layout for this Tech Stack: ${JSON.stringify(stack)}.
          
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
      }));
      return cleanAndParseJson(response.text || "{}");
  }

  async optimizeGraphLayout(nodes: any[], edges: any[], type: 'architecture' | 'erd'): Promise<any[]> {
      const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
          model: this.modelFlash,
          contents: `
          Optimize the layout of this ${type} diagram to minimize crossing lines and group related items logically.
          Nodes: ${JSON.stringify(nodes.map(n => ({ id: n.id, label: n.label || n.name, type: n.type || 'table' })))}
          Edges/Relations: ${JSON.stringify(edges)}
          
          Return ONLY the array of nodes with UPDATED 'x' and 'y' coordinates. 
          Keep the layout within a 1000x800 canvas.
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
      }));
      return cleanAndParseJson(response.text || "[]");
  }

  async generateCloudInfrastructure(project: ProjectData): Promise<{ iacCode: string; cloudDiagram: string }> {
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `You are a Senior DevOps Engineer. 
      Generate infrastructure assets for this project: "${project.initialIdea}"
      Tech Stack: ${JSON.stringify(project.architecture?.stack)}
      ${kb}
      
      Requirements:
      1. 'iacCode': A complete, production-ready 'main.tf' Terraform configuration.
      2. 'cloudDiagram': A Mermaid.js 'C4Container' diagram syntax.
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
    }));
    return cleanAndParseJson(response.text || "{}");
  }

  async generateProjectManifest(project: ProjectData): Promise<{ filename: string; content: string; installCommand: string }> {
    const frontend = project.architecture?.stack?.frontend || "Modern JavaScript Framework";
    const backend = project.architecture?.stack?.backend || "Node.js or Python";
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Generate the dependency manifest file for: Frontend: ${frontend}, Backend: ${backend}.`,
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
    }));
    return cleanAndParseJson(response.text || "{}");
  }

  async generateGitScript(project: ProjectData): Promise<string> {
    const backendStack = project.architecture?.stack?.backend || "Generic";
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Generate a bash script to initialize git and create .gitignore for stack: ${backendStack}. Return ONLY raw script.`,
    }));
    let script = response.text || "";
    if (script.startsWith('```')) script = script.replace(/^```[a-z]*\n/, '').replace(/```$/, '');
    return script;
  }

  async generateSchema(project: ProjectData): Promise<SchemaData> {
    const db = project.architecture?.stack?.database || "General SQL";
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
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
    }));
    const raw = cleanAndParseJson(response.text || "{}");
    return validateSchema(raw);
  }

  async generateFileStructure(project: ProjectData): Promise<FileNode[]> {
    const stack = JSON.stringify(project.architecture?.stack);
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Create a comprehensive file structure for: ${project.initialIdea}. Stack: ${stack}. ${kb}`,
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
    }));
    const raw = cleanAndParseJson<any[]>(response.text || "[]");
    return validateFileStructure(raw);
  }

  async generateFilePreview(file: FileNode, project: ProjectData): Promise<string> {
    const stack = JSON.stringify(project.architecture?.stack);
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
        model: this.modelPro,
        contents: `You are a Senior Software Engineer. Write the ACTUAL CODE content for this file: "${file.name}".
        File Purpose: ${file.description}
        Tech Stack: ${stack}
        ${kb}
        Return raw file content only.`,
        config: { thinkingConfig: { thinkingBudget: 8000 } }
    }));
    let content = response.text || "";
    if (content.startsWith('```')) content = content.replace(/^```[a-z]*\n/, '').replace(/```$/, '');
    return content;
  }

  async parseTreeToStructure(treeOutput: string): Promise<FileNode[]> {
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
        model: this.modelFlash,
        contents: `Convert this file tree text output into a JSON array of FileNode objects.\n${treeOutput}`,
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
    }));
    const raw = cleanAndParseJson<any[]>(response.text || "[]");
    return validateFileStructure(raw);
  }

  async generateDesignSystem(project: ProjectData): Promise<DesignSystem> {
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
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
    }));
    const raw = cleanAndParseJson(response.text || "{}");
    return validateDesignSystem(raw);
  }

  async generateWireframe(project: ProjectData): Promise<string> {
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Generate a single-file HTML prototype for: "${project.initialIdea}". Use Tailwind CSS. Return raw HTML.`,
    }));
    let html = response.text || "";
    if (html.startsWith('```')) html = html.replace(/^```[a-z]*\n/, '').replace(/```$/, '');
    return html;
  }

  async generateApiSpec(project: ProjectData): Promise<ApiSpecification> {
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
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
    }));
    return cleanAndParseJson(response.text || "{}");
  }

  async generateSecurityContext(project: ProjectData): Promise<SecurityContext> {
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Define security and QA policies for: ${project.initialIdea}. ${kb}`,
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
    }));
    return cleanAndParseJson(response.text || "{}");
  }

  async generateComplianceChecklist(standard: string, project: ProjectData): Promise<ComplianceItem[]> {
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Generate ${standard} compliance checklist for: "${project.initialIdea}".`,
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
    }));
    return cleanAndParseJson(response.text || "[]");
  }

  async generateCostEstimation(project: ProjectData): Promise<CostEstimation> {
    return this.generateScaledCost('MVP', project);
  }

  async generateScaledCost(scenario: any, project: ProjectData): Promise<CostEstimation> {
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Generate cost estimation for: ${project.initialIdea}. Scenario: ${JSON.stringify(scenario)}.`,
      config: {
        thinkingConfig: { thinkingBudget: 4000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            monthlyInfrastructure: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { service: { type: Type.STRING }, estimatedCost: { type: Type.STRING }, reason: { type: Type.STRING } } } },
            totalProjectHours: { type: Type.STRING },
            suggestedTeamSize: { type: Type.STRING },
            risks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, impact: { type: Type.STRING } } } }
          }
        }
      }
    }));
    return cleanAndParseJson(response.text || "{}");
  }

  async generateDevOpsConfig(project: ProjectData): Promise<DevOpsConfig> {
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Generate DevOps config for: "${project.initialIdea}".`,
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
    }));
    return cleanAndParseJson(response.text || "{}");
  }

  async generateActionPlan(project: ProjectData): Promise<Phase[]> {
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Generate action plan for: ${project.initialIdea}.`,
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
    }));
    return cleanAndParseJson(response.text || "[]");
  }

  async generateAgentRules(project: ProjectData, config?: AgentRuleConfig): Promise<string> {
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Create .cursorrules for: ${project.initialIdea}. ${kb} Config: ${JSON.stringify(config)}`,
      config: { thinkingConfig: { thinkingBudget: 10000 } }
    }));
    return response.text || "";
  }

  async refineAgentRules(currentRules: string, feedback: string): Promise<string> {
    const prompt = `Rewrite these rules based on feedback: ${feedback}\n\nRules:\n${currentRules}`;
    return this.routeTextTask(prompt);
  }

  async generateImplementationGuide(taskId: string, project: ProjectData): Promise<string> {
    const task = project.tasks?.find(t => t.id === taskId);
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Write implementation guide for task: "${task?.content}".`,
      config: { thinkingConfig: { thinkingBudget: 12000 } }
    }));
    return response.text || "";
  }

  async generateChecklist(taskId: string, project: ProjectData): Promise<ChecklistItem[]> {
    const task = project.tasks?.find(t => t.id === taskId);
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Create checklist for task: "${task?.content}".`,
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
    }));
    return cleanAndParseJson(response.text || "[]");
  }

  async generateTaskCode(taskId: string, project: ProjectData): Promise<TaskCodeSnippet> {
    const task = project.tasks?.find(t => t.id === taskId);
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
        model: this.modelPro,
        contents: `Write code for task: "${task?.content}".`,
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
    }));
    return cleanAndParseJson(response.text || "{}");
  }

  async refineTaskCode(currentSnippet: TaskCodeSnippet, feedback: string, projectContext: any): Promise<TaskCodeSnippet> {
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
        model: this.modelPro,
        contents: `Refine code based on feedback: "${feedback}".\nCode:\n${currentSnippet.code}`,
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
    }));
    return cleanAndParseJson(response.text || "{}");
  }

  async runProjectHealthCheck(project: ProjectData): Promise<string> {
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Review architecture for risks: "${project.initialIdea}".`,
      config: { thinkingConfig: { thinkingBudget: 16000 } }
    }));
    return response.text || "";
  }

  async generateKickoffAssets(project: ProjectData): Promise<string> {
    const prompt = `Write kickoff briefing for: ${project.initialIdea}.`;
    return this.routeTextTask(prompt);
  }

  async refineSection(section: string, currentData: any, feedback: string): Promise<any> {
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Refine ${section} based on: "${feedback}". Current: ${JSON.stringify(currentData)}`,
      config: { thinkingConfig: { thinkingBudget: 8000 }, responseMimeType: "application/json" }
    }));
    return cleanAndParseJson(response.text || "{}");
  }

  async fixJson(brokenJson: string): Promise<any> {
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
        model: this.modelFlash,
        contents: `Fix this JSON:\n\n${brokenJson}`,
        config: { responseMimeType: "application/json" }
    }));
    return cleanAndParseJson(response.text || "{}");
  }

  async generateDriftCheckScript(project: ProjectData): Promise<string> {
    const fileList = JSON.stringify(project.fileStructure);
    return `const fs = require('fs'); const path = require('path'); const BLUEPRINT = ${fileList}; console.log('Checking drift...');`;
  }

  async analyzeDrift(plannedStructure: FileNode[], actualStructureInput: string): Promise<string> {
    const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
        model: this.modelPro,
        contents: `Compare planned vs actual file structure. Planned: ${JSON.stringify(plannedStructure)}. Actual: ${actualStructureInput}.`,
        config: { thinkingConfig: { thinkingBudget: 8000 } }
    }));
    return response.text || "";
  }

  // REVERSE ENGINEERING (Enhanced)
  async reverseEngineerProject(fileStructure: FileNode[], readmeContent?: string, packageJsonContent?: string): Promise<Partial<ProjectData>> {
      // 1. Convert complex tree to simple list for prompt
      const flatten = (nodes: FileNode[], path = ''): string[] => {
          let res: string[] = [];
          nodes.forEach(n => {
              const fullPath = path ? `${path}/${n.name}` : n.name;
              res.push(fullPath);
              if (n.children) res = res.concat(flatten(n.children, fullPath));
          });
          return res;
      };
      
      const fileList = flatten(fileStructure).slice(0, 500); 

      // 2. Pre-extract dependencies if package.json exists to save context window and improve accuracy
      let dependencyList: { name: string, description: string }[] = [];
      if (packageJsonContent) {
          try {
              const pkg = JSON.parse(packageJsonContent);
              const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
              // Take top 20 deps for context
              dependencyList = Object.keys(allDeps).slice(0, 20).map(d => ({ name: d, description: 'Detected in package.json' }));
          } catch (e) {}
      }

      const response = await this.retryWithBackoff<GenerateContentResponse>(() => this.ai.models.generateContent({
          model: this.modelPro,
          contents: `
          Reverse Engineer this project based on its file structure and key files.
          
          Files:
          ${fileList.join('\n')}
          
          README:
          ${readmeContent || 'N/A'}
          
          package.json:
          ${packageJsonContent || 'N/A'}
          
          Task:
          1. Infer the "initialIdea" (Project Description).
          2. Deduce the Tech Stack.
          3. Infer project type.
          4. List key dependencies (if not already extracted).
          `,
          config: {
              thinkingConfig: { thinkingBudget: 8000 },
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                      initialIdea: { type: Type.STRING },
                      projectType: { type: Type.STRING },
                      architecture: {
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
                              dependencies: { 
                                  type: Type.ARRAY, 
                                  items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } } } 
                              }
                          }
                      }
                  }
              }
          }
      }));

      const parsed = cleanAndParseJson<any>(response.text || "{}");
      
      // Merge manually extracted deps if AI missed them or to bolster list
      if (parsed.architecture && dependencyList.length > 0) {
          parsed.architecture.dependencies = [...(parsed.architecture.dependencies || []), ...dependencyList];
          // Dedupe
          const seen = new Set();
          parsed.architecture.dependencies = parsed.architecture.dependencies.filter((d: any) => {
              if (seen.has(d.name)) return false;
              seen.add(d.name);
              return true;
          });
      }

      return parsed;
  }

  async createChatSession(project: ProjectData, roleId: AgentRoleId = 'ARCHITECT') {
    const persona = AGENT_PERSONAS[roleId] || AGENT_PERSONAS['ARCHITECT'];
    const knowledgeBase = this.getKnowledgeContext(project.knowledgeBase);
    
    const systemInstruction = `
${persona.systemPrompt(project)}

${knowledgeBase}

<global_constraints>
- You are strictly acting as the ${persona.name}.
- Do not hallucinate features not present in the provided context.
- Be concise and actionable.
</global_constraints>
`;

    return this.ai.chats.create({
      model: this.modelPro,
      config: { 
          systemInstruction, 
          thinkingConfig: { thinkingBudget: 8000 } 
      },
      history: project.chatHistory?.map(msg => ({ 
          role: msg.role, 
          parts: [{ text: msg.text }] 
      })) || []
    });
  }
}
