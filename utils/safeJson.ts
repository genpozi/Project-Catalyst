
/**
 * robustly cleans and parses JSON strings returned by LLMs.
 * Handles Markdown code blocks, preambles, and common syntax errors.
 */
export function cleanAndParseJson<T>(response: string): T {
  if (!response) {
    throw new Error("Empty response received from AI");
  }

  let cleaned = response.trim();

  // 1. Strip Markdown code blocks (```json ... ```)
  // This regex matches the start and end of code blocks, capturing the content inside
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = cleaned.match(codeBlockRegex);
  if (match && match[1]) {
    cleaned = match[1];
  }

  // 2. Remove any text before the first '{' or '[' if the model added conversational filler
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  
  let startIndex = -1;
  
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIndex = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIndex = firstBrace;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
  }

  if (startIndex > 0) {
    cleaned = cleaned.substring(startIndex);
  }

  // 3. Remove any text after the last '}' or ']'
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  
  let endIndex = -1;
  
  if (lastBrace !== -1 && lastBracket !== -1) {
    endIndex = Math.max(lastBrace, lastBracket);
  } else if (lastBrace !== -1) {
    endIndex = lastBrace;
  } else if (lastBracket !== -1) {
    endIndex = lastBracket;
  }

  if (endIndex !== -1 && endIndex < cleaned.length - 1) {
    cleaned = cleaned.substring(0, endIndex + 1);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.error("Failed to parse JSON:", cleaned);
    throw new Error(`JSON Parse Error: ${(e as Error).message}. content: ${cleaned.substring(0, 50)}...`);
  }
}
