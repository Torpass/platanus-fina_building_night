export { AIProvider, AnalyzeParams, AIAnalysisResult } from "./types";
export { OpenAIProvider } from "./openai-provider";
export { GoogleProvider } from "./google-provider";

import { AIProvider } from "./types";
import { OpenAIProvider } from "./openai-provider";
import { GoogleProvider } from "./google-provider";

export function createAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || "openai";

  switch (provider.toLowerCase()) {
    case "google":
    case "gemini":
      return new GoogleProvider();
    case "openai":
    default:
      return new OpenAIProvider();
  }
}
