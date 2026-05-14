import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider, AnalyzeParams, AIAnalysisResult } from "./types";

const apiKey = process.env.AI_API_KEY || "";
const modelName = process.env.AI_MODEL || "gemini-1.5-flash";

export class GoogleProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor() {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = modelName;
  }

  async analyze(params: AnalyzeParams): Promise<AIAnalysisResult> {
    const { imageUrl, caption, comments, systemPrompt } = params;

    const genModel = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: systemPrompt,
    });

    const parts: any[] = [];

    // Agregar caption
    if (caption) {
      parts.push({ text: `Caption: ${caption}\n\n` });
    }

    // Agregar imagen si hay URL
    if (imageUrl) {
      try {
        const imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
          const imageBuffer = await imageResponse.arrayBuffer();
          const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";
          parts.push({
            inlineData: {
              data: Buffer.from(imageBuffer).toString("base64"),
              mimeType,
            },
          });
        }
      } catch (err) {
        console.warn("Failed to fetch image for Google Gemini:", err);
      }
    }

    // Agregar comentarios
    if (comments && comments.length > 0) {
      parts.push({
        text: `Comments:\n${comments.join("\n")}\n\n`,
      });
    }

    parts.push({
      text: "\n\nReturn ONLY a valid JSON object with this exact structure:\n{\n  \"destination\": \"string\",\n  \"experience_type\": \"playa|montaña|gastronomía|aventura|cultural|relax|otro\",\n  \"price_estimate\": \"string\",\n  \"urgency_level\": \"low|medium|high\",\n  \"offer_expiry_date\": \"YYYY-MM-DD or null\",\n  \"keywords\": [\"string\"],\n  \"summary\": \"string\",\n  \"sentiment\": \"positive|neutral|negative\"\n}",
    });

    const result = await genModel.generateContent({
      contents: [{ role: "user", parts }],
    });

    const response = await result.response;
    const text = response.text();

    // Intentar parsear JSON de la respuesta
    let parsed: any;
    try {
      // Buscar JSON en bloques de código markdown
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      console.warn("Failed to parse Gemini response as JSON:", text);
      // Fallback: extraer información manualmente
      parsed = this.fallbackParse(text);
    }

    return {
      destination: parsed.destination || "Unknown",
      experience_type: this.normalizeExperienceType(parsed.experience_type),
      price_estimate: parsed.price_estimate || "N/A",
      urgency_level: this.normalizeUrgency(parsed.urgency_level),
      offer_expiry_date: parsed.offer_expiry_date || undefined,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      summary: parsed.summary || text.substring(0, 200),
      sentiment: this.normalizeSentiment(parsed.sentiment),
    };
  }

  private normalizeExperienceType(value: string): string {
    const valid = ["playa", "montaña", "gastronomía", "aventura", "cultural", "relax", "otro"];
    const lower = (value || "").toLowerCase();
    return valid.find((v) => lower.includes(v)) || "otro";
  }

  private normalizeUrgency(value: string): "low" | "medium" | "high" {
    const lower = (value || "").toLowerCase();
    if (lower.includes("high") || lower.includes("alta")) return "high";
    if (lower.includes("medium") || lower.includes("media")) return "medium";
    return "low";
  }

  private normalizeSentiment(value: string): "positive" | "neutral" | "negative" {
    const lower = (value || "").toLowerCase();
    if (lower.includes("positive") || lower.includes("positivo")) return "positive";
    if (lower.includes("negative") || lower.includes("negativo")) return "negative";
    return "neutral";
  }

  private fallbackParse(text: string): any {
    return {
      destination: text.match(/destination["\s:]+([^",\n}]+)/i)?.[1]?.trim() || "Unknown",
      experience_type: text.match(/experience_type["\s:]+([^",\n}]+)/i)?.[1]?.trim() || "otro",
      price_estimate: text.match(/price["\s:]+([^",\n}]+)/i)?.[1]?.trim() || "N/A",
      urgency_level: "low",
      offer_expiry_date: null,
      keywords: [],
      summary: text.substring(0, 200),
      sentiment: "neutral",
    };
  }
}
