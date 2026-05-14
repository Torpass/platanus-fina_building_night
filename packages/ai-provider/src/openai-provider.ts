import OpenAI from "openai";
import { AIProvider, AnalyzeParams, AIAnalysisResult } from "./types";

const apiKey = process.env.AI_API_KEY || "";
const baseURL = process.env.AI_BASE_URL || undefined;
const model = process.env.AI_MODEL || "gpt-4o";

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async analyze(params: AnalyzeParams): Promise<AIAnalysisResult> {
    const { imageUrl, caption, comments, systemPrompt } = params;

    const userContent = [
      `Caption: ${caption}`,
      imageUrl ? `Image URL: ${imageUrl}` : "",
      comments && comments.length > 0
        ? `Comments: ${comments.join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const completion = await this.client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 800,
    });

    const raw = completion.choices[0]?.message?.content || "";

    // Stubbed parsing — real implementation would use structured outputs / JSON mode
    return {
      destination: "Unknown",
      experience_type: "Travel",
      price_estimate: "$0",
      urgency_level: "low",
      offer_expiry_date: undefined,
      keywords: [],
      summary: raw,
      sentiment: "neutral",
    };
  }
}
