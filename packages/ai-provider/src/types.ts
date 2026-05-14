export interface AnalyzeParams {
  imageUrl: string;
  caption: string;
  comments?: string[];
  systemPrompt: string;
}

export interface AIAnalysisResult {
  destination: string;
  experience_type: string;
  price_estimate: string;
  urgency_level: string;
  offer_expiry_date?: string;
  keywords: string[];
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
}

export interface AIProvider {
  analyze(params: AnalyzeParams): Promise<AIAnalysisResult>;
}
