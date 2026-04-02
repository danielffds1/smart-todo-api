export interface GeminiRequestConfig {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiResponse {
  content: string;
  tokens_used: number;
  model: string;
}
