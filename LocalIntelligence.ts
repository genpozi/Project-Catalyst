
import { CreateMLCEngine, MLCEngine, InitProgressCallback } from "@mlc-ai/web-llm";

export class LocalIntelligence {
  private static instance: LocalIntelligence;
  private engine: MLCEngine | null = null;
  private modelId = "gemma-2b-it-q4f32_1-MLC"; // Google's Gemma 2B, good balance for browser
  
  public isReady = false;
  public isLoading = false;

  private constructor() {}

  public static getInstance(): LocalIntelligence {
    if (!LocalIntelligence.instance) {
      LocalIntelligence.instance = new LocalIntelligence();
    }
    return LocalIntelligence.instance;
  }

  public async checkCompatibility(): Promise<{ supported: boolean; message?: string }> {
    if (!(navigator as any).gpu) {
        return { supported: false, message: "WebGPU is not supported in this browser." };
    }
    try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (!adapter) {
            return { supported: false, message: "No appropriate GPU adapter found." };
        }
        return { supported: true };
    } catch (e) {
        return { supported: false, message: "Error requesting GPU adapter." };
    }
  }

  public async initialize(onProgress: (phase: string, progress: number, text: string) => void): Promise<void> {
    if (this.isReady) return;
    
    this.isLoading = true;
    try {
      // Create engine with detailed progress callback
      const initCallback: InitProgressCallback = (report) => {
          // Parse report.text to guess phase if needed, or just pass text
          // WebLLM report usually: "Fetching param...", "Loading model..."
          let phase = 'init';
          if (report.text.toLowerCase().includes('fetch')) phase = 'fetch';
          if (report.text.toLowerCase().includes('cache')) phase = 'cache';
          if (report.text.toLowerCase().includes('load')) phase = 'load';
          
          // progress is 0-1
          onProgress(phase, report.progress, report.text);
      };

      this.engine = await CreateMLCEngine(this.modelId, { 
        initProgressCallback: initCallback,
        logLevel: "INFO"
      });
      
      this.isReady = true;
    } catch (error) {
      console.error("Failed to initialize Local Intelligence:", error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  public async chatStream(message: string, onUpdate: (text: string) => void): Promise<string> {
    if (!this.engine || !this.isReady) {
      throw new Error("Local Intelligence Engine not ready.");
    }

    const messages = [
      { role: "system", content: "You are 0relai, a technical software architect. Be concise and precise." },
      { role: "user", content: message }
    ];

    try {
        const chunks = await this.engine.chat.completions.create({
        messages,
        stream: true,
        });

        let fullResponse = "";
        for await (const chunk of chunks) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullResponse += content;
        onUpdate(fullResponse);
        }
        return fullResponse;
    } catch (e) {
        console.error("Local chat error", e);
        throw e;
    }
  }

  // Non-streaming generation for internal logic (Refinement, etc.)
  public async generateText(prompt: string): Promise<string> {
      if (!this.engine || !this.isReady) throw new Error("Local Engine offline");
      
      const messages = [
          { role: "user", content: prompt }
      ];

      const response = await this.engine.chat.completions.create({
          messages,
          stream: false
      });

      return response.choices[0].message.content || "";
  }

  public async unload(): Promise<void> {
      if (this.engine) {
          await this.engine.unload();
          this.engine = null;
          this.isReady = false;
      }
  }
}
