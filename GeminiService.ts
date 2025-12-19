
import { GoogleGenAI, Type } from "@google/genai";
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
  CostEstimation
} from './types';

export class GeminiService {
  private ai: GoogleGenAI;
  private modelFlash = "gemini-3-flash-preview";
  private modelPro = "gemini-3-pro-preview";
  private modelAudio = "gemini-2.5-flash-native-audio-preview-09-2025";

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
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
    const parts: any[] = [{ text: `Act as a senior product strategist. Analyze this project: TYPE: ${type}, IDEA: ${idea}, CONSTRAINTS: ${constraints}. Generate strategic foundation JSON.` }];
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
            features: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    return JSON.parse(response.text);
  }

  async generateResearch(idea: string): Promise<{ summary: string; sources: any[] }> {
    const response = await this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Perform a deep technical feasibility research for: ${idea}. Mention competitors and modern tech trends.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => chunk.web) || [];
    return { summary: response.text, sources };
  }

  async generateArchitecture(project: ProjectData): Promise<ArchitectureData> {
    const response = await this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Architect a production-ready system for: ${project.initialIdea}. Stack choice justification required. Features: ${JSON.stringify(project.brainstormingResults?.features)}`,
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

  async generateCloudInfrastructure(project: ProjectData): Promise<{ iacCode: string; cloudDiagram: string }> {
    const response = await this.ai.models.generateContent({
      model: this.modelPro,
      contents: `You are a Senior DevOps Engineer. 
      Generate infrastructure assets for this project: "${project.initialIdea}"
      Tech Stack: ${JSON.stringify(project.architecture?.stack)}
      
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
    // Provide safe defaults to prevent "undefined" leaking into the prompt if previous phases were skipped
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
    const response = await this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Design a database schema for: ${project.initialIdea}. Stack: ${db}.`,
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
    const response = await this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Create a comprehensive file structure for: ${project.initialIdea}. Stack: ${stack}.`,
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

  async generateDesignSystem(project: ProjectData): Promise<DesignSystem> {
    const response = await this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Design a UI/UX design system for: ${project.initialIdea}.`,
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
    const response = await this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Define API specification for: ${project.initialIdea}.`,
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
    const response = await this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Define security and QA policies for: ${project.initialIdea}.`,
      config: {
        thinkingConfig: { thinkingBudget: 8000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            policies: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, implementationHint: { type: Type.STRING } } } },
            testingStrategy: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, description: { type: Type.STRING } } } },
            compliance: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { standard: { type: Type.STRING }, requirement: { type: Type.STRING } } } }
          }
        }
      }
    });
    return JSON.parse(response.text);
  }

  async generateCostEstimation(project: ProjectData): Promise<CostEstimation> {
    const stack = JSON.stringify(project.architecture?.stack || {});
    const response = await this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Generate a realistic project cost and resource estimation for: ${project.initialIdea}. Consider the selected stack: ${stack}.`,
      config: {
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

  async generateAgentRules(project: ProjectData): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Create a .cursorrules file for: ${project.initialIdea}. Context: ${JSON.stringify({ stack: project.architecture?.stack, schema: project.schema?.mermaidChart, files: project.fileStructure, api: project.apiSpec })}. Include specific instructions for coding style, folder management, and RLS policies.`,
      config: { thinkingConfig: { thinkingBudget: 10000 } }
    });
    return response.text;
  }

  async generateImplementationGuide(taskId: string, project: ProjectData): Promise<string> {
    const task = project.tasks?.find(t => t.id === taskId);
    const response = await this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Write a detailed step-by-step implementation guide for this task: "${task?.content}". Context: ${JSON.stringify({ stack: project.architecture?.stack, schema: project.schema?.mermaidChart, api: project.apiSpec })}`,
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
    const response = await this.ai.models.generateContent({
      model: this.modelFlash,
      contents: `Write a high-energy kickoff briefing and final instructions for: ${project.initialIdea}.`,
    });
    return response.text;
  }

  async refineSection(section: string, currentData: any, feedback: string): Promise<any> {
    const response = await this.ai.models.generateContent({
      model: this.modelPro,
      contents: `Refine the ${section} section based on feedback: "${feedback}". Current state: ${JSON.stringify(currentData)}`,
      config: { thinkingBudget: 8000, responseMimeType: "application/json" }
    });
    return JSON.parse(response.text);
  }
}
