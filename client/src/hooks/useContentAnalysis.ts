import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface ContentFeatures {
  contentType: "text" | "image" | "video" | "audio";
  topics: string[];
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  tones: string[];
  imageScores?: {
    aesthetics?: number;
    brand?: string;
    subjects?: string[];
  };
  sourceTrust: number;
}

export interface PersonaRoutingResult {
  routing: {
    selectedPersonas: string[];
    scores: Record<string, number>;
    reasons: string[];
  };
  output: {
    postId: string;
    personas: {
      id: string;
      role: string;
      tone: string;
      reason: string;
      summary?: string;
      actions?: string[];
    }[];
  };
}

export function useContentAnalysis() {
  return useMutation({
    mutationFn: async (data: { content: string; imageUrl?: string; userId?: string }) => {
      const response = await apiRequest("POST", "/api/content/analyze", data);
      return await response.json() as ContentFeatures;
    },
  });
}

export function usePersonaRouting() {
  return useMutation({
    mutationFn: async (data: { features: ContentFeatures; postId?: string }) => {
      const response = await apiRequest("POST", "/api/personas/route", data);
      return await response.json() as PersonaRoutingResult;
    },
  });
}
