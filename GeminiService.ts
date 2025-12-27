import { GoogleGenAI, Type, Chat, FunctionDeclaration, GenerateContentResponse } from "@google/genai";
import { 
  ProjectData, BrainstormingData, ResearchReportData, ArchitectureData, SchemaData, 
  FileNode, DesignSystem, ApiSpecification, SecurityContext, Phase, 
  AgentRuleConfig, CostEstimation, DevOpsConfig, ChecklistItem, TaskCodeSnippet, 
  ArchitectureNode, ArchitectureEdge, TechStack 
} from "./types";
import { cleanAndParseJson } from "./utils/safeJson";
import { AgentTool } from "./utils/tools";

export class GeminiService {
  private ai: GoogleGenAI;
  // Using recommended models from guidelines
  private modelFlash = "gemini-3-flash-preview"; 
  private modelPro = "gemini-3-pro-preview"; 

  constructor() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.warn("API_KEY is missing. GeminiService might fail on requests.");
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  private getKnowledgeContext(kb: any[] | undefined): string {
    if (!kb || kb.length === 0) return "";
    return "Knowledge Base:\n" + kb.map(d => `- ${d.title}: ${d.content}`).join("\n");
  }

  // Helper for retrying
  private async retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries === 0) throw error;
      // Retry on 429 or 5xx
      if (error?.status === 429 || (error?.status && error.status >= 500)) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryWithBackoff(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async analyzeAudioIdea(audioBase64: string): Promise<{ idea: string; type: string; constraints: string } | null> {
    try {
      const response = await this.ai.models.generateContent({
        model: this.modelFlash,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "audio/webm",
                data: audioBase64
              }
            },
            {
              text: "Analyze this audio idea. Extract the core project description, the type of application, and any technical constraints."
            }
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
            }
          }
        }
      }) as GenerateContentResponse;
      return cleanAndParseJson(response.text || "{}");
    } catch (e) {
      console.error("Audio analysis error", e);
      return null;
    }
  }

  async generateBrainstorming(idea: string, type: string, constraints: string, imageBase64?: string): Promise<BrainstormingData> {
    const parts: any[] = [{ text: `Generate a brainstorming session for a ${type}. Idea: ${idea}. Constraints: ${constraints}.` }];
    if (imageBase64) {
      parts.push({ inlineData: { mimeType: "image/png", data: imageBase64 } });
    }

    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: { type: Type.ARRAY, items: { type: Type.STRING } },
            usps: { type: Type.ARRAY, items: { type: Type.STRING } },
            personas: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { role: { type: Type.STRING }, description: { type: Type.STRING }, painPoints: { type: Type.ARRAY, items: { type: Type.STRING } } } } },
            userJourneys: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { personaRole: { type: Type.STRING }, goal: { type: Type.STRING }, steps: { type: Type.ARRAY, items: { type: Type.STRING } } } } },
            features: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    })) as GenerateContentResponse;
    return cleanAndParseJson(response.text || "{}");
  }

  async refineSection(section: string, currentData: any, feedback: string): Promise<any> {
    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Refine the ${section} section based on this feedback: "${feedback}".
      Current Data: ${JSON.stringify(currentData)}
      Return the updated data structure in JSON format matching the original schema.`,
      config: { responseMimeType: "application/json" }
    })) as GenerateContentResponse;
    return cleanAndParseJson(response.text || "{}");
  }

  async refineAgentRules(currentRules: string, feedback: string): Promise<string> {
    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Refine these agent rules based on feedback: "${feedback}".
      Current Rules:
      ${currentRules}
      
      Return the updated rules as markdown text.`
    })) as GenerateContentResponse;
    return response.text || currentRules;
  }

  async generateResearch(idea: string): Promise<ResearchReportData> {
    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Perform market research and technical feasibility analysis for: ${idea}.
      Identify competitors, verify technical viability, and list sources.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            competitors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, url: { type: Type.STRING }, strengths: { type: Type.ARRAY, items: { type: Type.STRING } }, weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } }, priceModel: { type: Type.STRING } } } },
            sources: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { uri: { type: Type.STRING }, title: { type: Type.STRING } } } }
          }
        }
      }
    })) as GenerateContentResponse;
    
    // Google Search grounding handling
    let sources: { uri: string; title: string }[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        sources = response.candidates[0].groundingMetadata.groundingChunks
            .map((c: any) => c.web ? { uri: c.web.uri, title: c.web.title } : null)
            .filter((s: any) => s !== null);
    }

    const data = cleanAndParseJson<ResearchReportData>(response.text || "{}");
    if (sources.length > 0) data.sources = sources;
    return data;
  }

  async generateArchitecture(project: ProjectData): Promise<ArchitectureData> {
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Design a technical architecture for: ${project.initialIdea}. ${kb}.
      Define the tech stack, key patterns, and external dependencies.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stack: { type: Type.OBJECT, properties: { frontend: { type: Type.STRING }, backend: { type: Type.STRING }, database: { type: Type.STRING }, styling: { type: Type.STRING }, deployment: { type: Type.STRING }, rationale: { type: Type.STRING } } },
            patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
            dependencies: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } } } }
          }
        }
      }
    })) as GenerateContentResponse;
    
    // Generate initial graph layout in a separate step or inferred
    const data = cleanAndParseJson<ArchitectureData>(response.text || "{}");
    // We can run graph layout generation here or let the UI handle it.
    // Let's generate a default layout.
    const graph = await this.generateGraphLayout(data.stack);
    data.visualLayout = graph.nodes;
    data.visualEdges = graph.edges;
    
    return data;
  }

  async generateCostEstimation(project: ProjectData): Promise<CostEstimation> {
    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Estimate costs and resources for: ${project.initialIdea} using stack: ${JSON.stringify(project.architecture?.stack)}.`,
      config: {
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
    })) as GenerateContentResponse;
    return cleanAndParseJson(response.text || "{}");
  }

  async generateSchema(project: ProjectData): Promise<SchemaData> {
    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Design a database schema for: ${project.initialIdea}. Stack: ${JSON.stringify(project.architecture?.stack)}.
      Return tables, a mermaid.js ER diagram string, Prisma schema, and SQL schema.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tables: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, columns: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, constraints: { type: Type.STRING }, description: { type: Type.STRING } } } } } } },
            mermaidChart: { type: Type.STRING },
            prismaSchema: { type: Type.STRING },
            sqlSchema: { type: Type.STRING }
          }
        }
      }
    })) as GenerateContentResponse;
    return cleanAndParseJson(response.text || "{}");
  }

  async generateFileStructure(project: ProjectData): Promise<FileNode[]> {
    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Generate a file structure for a ${project.architecture?.stack.frontend} + ${project.architecture?.stack.backend} project.
      Project: ${project.initialIdea}.
      Return a recursive JSON structure of files and folders.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["file", "folder"] },
                    description: { type: Type.STRING },
                    children: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: {type: Type.STRING}, type: {type: Type.STRING}, description: {type: Type.STRING}, children: {type: Type.ARRAY, items: {type: Type.OBJECT, properties: {name: {type: Type.STRING}, type: {type: Type.STRING}}}} } } }
                }
            }
        }
      }
    })) as GenerateContentResponse;
    return cleanAndParseJson(response.text || "[]");
  }

  async generateDesignSystem(project: ProjectData): Promise<DesignSystem> {
    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Create a design system for: ${project.initialIdea}. Style: ${project.architecture?.stack.styling}.`,
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
    })) as GenerateContentResponse;
    return cleanAndParseJson(response.text || "{}");
  }

  async generateApiSpec(project: ProjectData): Promise<ApiSpecification> {
    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Design an API specification for: ${project.initialIdea}. Stack: ${project.architecture?.stack.backend}.
      Define endpoints, methods, and auth mechanism.`,
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
    })) as GenerateContentResponse;
    return cleanAndParseJson(response.text || "{}");
  }

  async generateSecurityContext(project: ProjectData): Promise<SecurityContext> {
    const kb = this.getKnowledgeContext(project.knowledgeBase);
    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Define security and QA policies for: ${project.initialIdea}. ${kb}. 
      Include recommended HTTP security headers, rate limiting strategy, and a Role-Based Access Control (RBAC) matrix suitable for this type of application.`,
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
            },
            rbacMatrix: {
                type: Type.OBJECT,
                properties: {
                    roles: { type: Type.ARRAY, items: { type: Type.STRING } },
                    resources: { type: Type.ARRAY, items: { type: Type.STRING } },
                    permissions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                role: { type: Type.STRING },
                                resource: { type: Type.STRING },
                                actions: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                        }
                    }
                }
            },
            securityHeaders: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        value: { type: Type.STRING },
                        status: { type: Type.STRING },
                        description: { type: Type.STRING }
                    }
                }
            },
            rateLimitConfig: {
                type: Type.OBJECT,
                properties: {
                    strategy: { type: Type.STRING },
                    limit: { type: Type.INTEGER },
                    windowInSeconds: { type: Type.INTEGER },
                    provider: { type: Type.STRING }
                }
            }
          }
        }
      }
    })) as GenerateContentResponse;
    return cleanAndParseJson(response.text || "{}");
  }

  async generateAgentRules(project: ProjectData, config?: AgentRuleConfig): Promise<string> {
    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Generate .cursorrules / system instructions for an AI coding agent working on this project.
      Project Context: ${JSON.stringify(project.architecture)}
      Config: ${JSON.stringify(config)}
      
      The rules should cover:
      - Coding style (${config?.language})
      - Architecture enforcement
      - Testing requirements
      - Error handling patterns
      
      Return raw markdown content for the file.`,
    })) as GenerateContentResponse;
    return response.text || "";
  }

  async generateActionPlan(project: ProjectData): Promise<Phase[]> {
    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Create a step-by-step implementation plan for: ${project.initialIdea}.
      Break it down into phases (Setup, MVP, Feature A, Feature B, Launch).
      Assign roles and time estimates.`,
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
                  }
                }
              }
            }
          }
        }
      }
    })) as GenerateContentResponse;
    return cleanAndParseJson(response.text || "[]");
  }

  async generateImplementationGuide(taskId: string, projectData: ProjectData): Promise<string> {
    const task = projectData.tasks?.find(t => t.id === taskId);
    if (!task) return "";

    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Write a detailed implementation guide for this task: "${task.content}".
      Context: ${projectData.initialIdea}. Stack: ${JSON.stringify(projectData.architecture?.stack)}.
      Include code snippets and file locations.`,
    })) as GenerateContentResponse;
    return response.text || "";
  }

  async generateChecklist(taskId: string, projectData: ProjectData): Promise<ChecklistItem[]> {
    const task = projectData.tasks?.find(t => t.id === taskId);
    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Create a QA checklist for task: "${task?.content}".`,
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
            }
          }
        }
      }
    })) as GenerateContentResponse;
    return cleanAndParseJson(response.text || "[]");
  }

  async generateTaskCode(taskId: string, projectData: ProjectData): Promise<TaskCodeSnippet> {
    const task = projectData.tasks?.find(t => t.id === taskId);
    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Write the code for task: "${task?.content}".
      Stack: ${JSON.stringify(projectData.architecture?.stack)}.
      Return JSON with filename, language, and code.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            filename: { type: Type.STRING },
            language: { type: Type.STRING },
            code: { type: Type.STRING },
            description: { type: Type.STRING }
          }
        }
      }
    })) as GenerateContentResponse;
    return cleanAndParseJson(response.text || "{}");
  }

  async refineTaskCode(currentCode: TaskCodeSnippet, feedback: string, projectData: ProjectData): Promise<TaskCodeSnippet> {
    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Refine this code based on feedback: "${feedback}".
      Current Code:
      \`\`\`${currentCode.language}
      ${currentCode.code}
      \`\`\`
      Return updated JSON structure.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            filename: { type: Type.STRING },
            language: { type: Type.STRING },
            code: { type: Type.STRING },
            description: { type: Type.STRING }
          }
        }
      }
    })) as GenerateContentResponse;
    return cleanAndParseJson(response.text || "{}");
  }

  async generateKickoffAssets(projectData: ProjectData): Promise<string> {
    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Generate a Kickoff Briefing for the team working on ${projectData.name}.
      Include: Vision, Architecture Summary, Immediate Next Steps (from Action Plan), and success metrics.
      Format as Markdown.`,
    })) as GenerateContentResponse;
    return response.text || "";
  }

  async generateCloudInfrastructure(projectData: ProjectData): Promise<{ iacCode: string; cloudDiagram: string }> {
    const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
        model: this.modelPro,
        contents: `Generate Infrastructure as Code (Terraform) and a Mermaid C4 System Context diagram for: ${projectData.initialIdea}.
        Stack: ${JSON.stringify(projectData.architecture?.stack)}.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    iacCode: { type: Type.STRING },
                    cloudDiagram: { type: Type.STRING }
                }
            }
        }
    })) as GenerateContentResponse;
    return cleanAndParseJson(response.text || "{}");
  }

  async generateScaledCost(params: { users: number; storage: number }, projectData: ProjectData): Promise<CostEstimation> {
      // Re-run cost estimation with specific params
      const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
          model: this.modelFlash,
          contents: `Estimate monthly cloud costs for ${params.users} MAU and ${params.storage}GB storage.
          Stack: ${JSON.stringify(projectData.architecture?.stack)}.
          Also update risk assessment based on this scale.`,
          config: {
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
      })) as GenerateContentResponse;
      return cleanAndParseJson(response.text || "{}");
  }

  async syncSpecFromGraph(currentArch: ArchitectureData, nodes: ArchitectureNode[], edges: ArchitectureEdge[]): Promise<ArchitectureData> {
      const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
          model: this.modelFlash,
          contents: `Update the technology stack description based on this visual graph structure:
          Nodes: ${JSON.stringify(nodes.map(n => ({ label: n.label, type: n.type })))}
          Edges: ${JSON.stringify(edges)}
          
          Current Stack: ${JSON.stringify(currentArch?.stack)}
          
          Return the updated Stack object in JSON.`,
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                      stack: { type: Type.OBJECT, properties: { frontend: { type: Type.STRING }, backend: { type: Type.STRING }, database: { type: Type.STRING }, styling: { type: Type.STRING }, deployment: { type: Type.STRING }, rationale: { type: Type.STRING } } },
                      patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
                      dependencies: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } } } }
                  }
              }
          }
      })) as GenerateContentResponse;
      const data = cleanAndParseJson<ArchitectureData>(response.text || "{}");
      return { ...currentArch, ...data };
  }

  async generateGraphLayout(stack: TechStack): Promise<{ nodes: ArchitectureNode[], edges: ArchitectureEdge[] }> {
      const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
          model: this.modelFlash,
          contents: `Generate a node-edge graph representing this tech stack: ${JSON.stringify(stack)}.
          Nodes should have types (frontend, backend, database, cache, queue, external, deployment).
          Edges represent communication protocols.
          Return JSON.`,
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                      nodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, type: { type: Type.STRING }, label: { type: Type.STRING }, x: { type: Type.NUMBER }, y: { type: Type.NUMBER } } } },
                      edges: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, from: { type: Type.STRING }, to: { type: Type.STRING }, protocol: { type: Type.STRING } } } }
                  }
              }
          }
      })) as GenerateContentResponse;
      return cleanAndParseJson(response.text || "{}");
  }

  async optimizeGraphLayout(nodes: any[], edges: any[], type: string): Promise<any[]> {
      // Basic AI layout suggestion (simplified)
      const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
          model: this.modelFlash,
          contents: `Given these nodes and edges for a ${type} diagram, suggest x/y coordinates (0-800 range) to minimize crossing and group logic.
          Nodes: ${JSON.stringify(nodes)}
          Edges: ${JSON.stringify(edges)}
          Return JSON array of {id, x, y}.`,
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
                      }
                  }
              }
          }
      })) as GenerateContentResponse;
      return cleanAndParseJson(response.text || "[]");
  }

  async generateFilePreview(node: FileNode, projectData: ProjectData): Promise<string> {
      const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
          model: this.modelPro,
          contents: `Generate the code content for file: "${node.name}" (${node.description || 'file'}).
          Path context: inferred.
          Project Stack: ${JSON.stringify(projectData.architecture?.stack)}.
          Return ONLY the code.`,
      })) as GenerateContentResponse;
      // Remove markdown code blocks if present
      let text = response.text || "";
      text = text.replace(/```[a-z]*\n/g, '').replace(/```$/g, '');
      return text;
  }

  async generateWireframe(projectData: ProjectData): Promise<string> {
      const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
          model: this.modelPro,
          contents: `Generate a single HTML file containing a Tailwind CSS wireframe for the main dashboard of this project: ${projectData.name}.
          Design System: ${JSON.stringify(projectData.designSystem?.colorPalette)}.
          Return ONLY valid HTML code.`,
      })) as GenerateContentResponse;
      let text = response.text || "";
      const match = text.match(/```html\s*([\s\S]*?)\s*```/);
      if (match) return match[1];
      return text;
  }

  async generateComplianceChecklist(standard: string, projectData: ProjectData): Promise<any[]> {
      const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
          model: this.modelPro,
          contents: `Generate a compliance checklist for ${standard} for this project: ${projectData.initialIdea}.
          Return JSON array of items.`,
          config: {
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
                          status: { type: Type.STRING, enum: ["Pending", "Met", "N/A"] }
                      }
                  }
              }
          }
      })) as GenerateContentResponse;
      return cleanAndParseJson(response.text || "[]");
  }

  async fixJson(jsonString: string): Promise<any> {
      const response = await this.ai.models.generateContent({
          model: this.modelFlash,
          contents: `Fix this malformed JSON string and return valid JSON:\n${jsonString}`,
          config: { responseMimeType: "application/json" }
      }) as GenerateContentResponse;
      return cleanAndParseJson(response.text || "{}");
  }

  async generateDevOpsConfig(projectData: ProjectData): Promise<DevOpsConfig> {
      const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
          model: this.modelPro,
          contents: `Generate DevOps configuration files for: ${projectData.name}. Stack: ${JSON.stringify(projectData.architecture?.stack)}.
          Return JSON with dockerfile, dockerCompose, ciPipeline (GitHub Actions), and deploymentGuide.`,
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                      dockerfile: { type: Type.STRING },
                      dockerCompose: { type: Type.STRING },
                      ciPipeline: { type: Type.STRING },
                      deploymentGuide: { type: Type.STRING }
                  }
              }
          }
      })) as GenerateContentResponse;
      return cleanAndParseJson(response.text || "{}");
  }

  async analyzeDrift(plannedStructure: FileNode[], actualTree: string): Promise<string> {
      const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
          model: this.modelPro,
          contents: `Compare the planned file structure vs the actual file tree output.
          Planned: ${JSON.stringify(plannedStructure)}
          Actual (tree command output):
          ${actualTree}
          
          Report discrepancies, missing files, and unexpected files. Output Markdown.`,
      })) as GenerateContentResponse;
      return response.text || "Analysis failed.";
  }

  async parseTreeToStructure(treeString: string): Promise<FileNode[]> {
      const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
          model: this.modelFlash,
          contents: `Convert this 'tree' command output into a JSON recursive file structure.
          Tree:
          ${treeString}
          
          Schema: Recursive FileNode { name, type: "file"|"folder", children: [] }`,
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          name: { type: Type.STRING },
                          type: { type: Type.STRING },
                          children: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: {type: Type.STRING}, type: {type: Type.STRING}, description: {type: Type.STRING}, children: {type: Type.ARRAY, items: {type: Type.OBJECT, properties: {name: {type: Type.STRING}, type: {type: Type.STRING}}}} } } }
                      }
                  }
              }
          }
      })) as GenerateContentResponse;
      return cleanAndParseJson(response.text || "[]");
  }

  async reverseEngineerProject(fileStructure: any, readme: string, packageJson: string): Promise<any> {
      const response = await this.retryWithBackoff(() => this.ai.models.generateContent({
          model: this.modelPro,
          contents: `Analyze this imported project and reverse-engineer the architectural blueprint.
          Files: ${JSON.stringify(fileStructure)}
          README: ${readme}
          Package.json: ${packageJson}
          
          Return JSON with: initialIdea, projectType, architecture (stack, patterns).`,
          config: { responseMimeType: "application/json" }
      })) as GenerateContentResponse;
      return cleanAndParseJson(response.text || "{}");
  }

  async createChatSession(projectData: ProjectData, roleId: string): Promise<Chat> {
      const chat = this.ai.chats.create({
          model: this.modelPro,
          config: {
              systemInstruction: `You are an expert software architect assistant (${roleId}).
              Context: ${JSON.stringify(projectData.architecture)}
              Goal: Assist the user in refining the blueprint. Be concise and technical.`
          }
      });
      return chat;
  }

  async runProjectHealthCheck(projectData: ProjectData): Promise<string> {
      const response = await this.ai.models.generateContent({
          model: this.modelPro,
          contents: `Perform a health check on this project blueprint.
          Data: ${JSON.stringify({ architecture: projectData.architecture, schema: projectData.schema, api: projectData.apiSpec })}
          Identify inconsistencies, missing components, or scalability risks. Output Markdown.`,
      }) as GenerateContentResponse;
      return response.text || "";
  }

  async generateAgentTurn(systemPrompt: string, userPrompt: string, tools: AgentTool[], projectData: ProjectData): Promise<string> {
      // Map AgentTools to GenAI FunctionDeclarations
      const toolDecls: FunctionDeclaration[] = tools.map(t => t.declaration);
      
      const response = await this.ai.models.generateContent({
          model: this.modelPro,
          contents: userPrompt,
          config: {
              systemInstruction: systemPrompt,
              tools: toolDecls.length > 0 ? [{ functionDeclarations: toolDecls }] : undefined
          }
      }) as GenerateContentResponse;

      // Handle function calls
      if (response.functionCalls && response.functionCalls.length > 0) {
          // For simplicity in this demo, we execute sequentially and only 1 turn of tools.
          // A full agent loop would re-feed the tool output to the model.
          const call = response.functionCalls[0];
          const tool = tools.find(t => t.declaration.name === call.name);
          if (tool) {
              const result = await tool.execute(call.args, projectData);
              // Feed result back to model to get final text
              const followUp = await this.ai.models.generateContent({
                  model: this.modelPro,
                  contents: [
                      { role: 'user', parts: [{ text: userPrompt }] },
                      { role: 'model', parts: [{ functionCall: call }] },
                      { role: 'function', parts: [{ functionResponse: { name: call.name, response: { result } } }] }
                  ],
                  config: { systemInstruction: systemPrompt }
              }) as GenerateContentResponse;
              return followUp.text || "";
          }
      }

      return response.text || "";
  }
}