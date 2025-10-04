import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AnalysisRequest {
  postId?: string;
  content: string;
  mediaUrl: string;
}

interface AnalysisResponse {
  tags: string[];
  sentiment: number;
  persona_effect: {
    empathy: number;
    creativity: number;
    knowledge: number;
    humor: number;
    sociability: number;
  };
}

export function useAIAnalysis() {
  return useMutation({
    mutationFn: async (request: AnalysisRequest) => {
      const res = await apiRequest("POST", "/api/analyze", request);
      const data = await res.json() as AnalysisResponse;
      
      // persona_effect 콘솔 출력 (차후 PersonaGrowth API 연결 예정)
      if (data.persona_effect) {
        console.log("Persona Effect:", data.persona_effect);
      }
      
      return data;
    },
  });
}
