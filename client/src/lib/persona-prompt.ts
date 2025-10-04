/**
 * 페르소나 프롬프트 빌드 유틸리티
 * 스탯과 기억을 반영한 ChatGPT 프롬프트 생성
 */

import type { Persona, PersonaMemory } from "@shared/schema";

export interface PersonaStats {
  empathy: number;
  humor: number;
  sociability: number;
  creativity: number;
  knowledge: number;
}

/**
 * 페르소나의 스탯과 기억을 기반으로 시스템 프롬프트 생성
 */
export function buildPersonaPrompt(params: {
  persona: Persona | (Partial<Persona> & PersonaStats);
  memories?: PersonaMemory[];
  message: string;
}): { systemPrompt: string; userPrompt: string } {
  const { persona, memories = [], message } = params;
  
  const stats: PersonaStats = {
    empathy: persona.empathy ?? 5,
    humor: persona.humor ?? 5,
    sociability: persona.sociability ?? 5,
    creativity: persona.creativity ?? 5,
    knowledge: persona.knowledge ?? 5,
  };

  // 기본 페르소나 설정
  let systemPrompt = `당신은 "${persona.name || '페르소나'}"라는 이름의 AI 페르소나입니다.\n`;
  
  if (persona.description) {
    systemPrompt += `${persona.description}\n\n`;
  } else {
    systemPrompt += `당신은 사용자의 개성과 성장을 반영하는 독특한 AI 페르소나입니다.\n\n`;
  }

  // 스탯 기반 성격 특성
  systemPrompt += `**당신의 성격 특성:**\n`;
  
  // Empathy (공감력)
  if (stats.empathy >= 8) {
    systemPrompt += `- 공감력이 매우 뛰어납니다. 상대방의 감정을 깊이 이해하고 따뜻한 위로와 격려를 건넵니다. 이모지(😊, 💙, 🤗)를 자주 사용하여 친근함을 표현합니다.\n`;
  } else if (stats.empathy >= 6) {
    systemPrompt += `- 공감력이 있습니다. 상대방의 감정에 귀 기울이고 따뜻한 어투로 대화합니다. 때때로 이모지를 사용합니다.\n`;
  } else if (stats.empathy <= 3) {
    systemPrompt += `- 감정적인 표현보다는 객관적이고 논리적인 대화를 선호합니다.\n`;
  }

  // Humor (유머)
  if (stats.humor >= 8) {
    systemPrompt += `- 유머 감각이 뛰어납니다. 대화에 재치있는 농담, 드립, 말장난을 자연스럽게 섞어 분위기를 밝게 만듭니다.\n`;
  } else if (stats.humor >= 6) {
    systemPrompt += `- 적절한 유머를 사용하여 대화를 즐겁게 만듭니다.\n`;
  } else if (stats.humor <= 3) {
    systemPrompt += `- 진지하고 사실적인 대화를 선호하며, 유머보다는 정확한 정보 전달에 집중합니다.\n`;
  }

  // Sociability (사교성)
  if (stats.sociability >= 8) {
    systemPrompt += `- 사교성이 매우 높습니다. 대화를 이어가기 위해 반드시 질문을 포함하고, 상대방의 생각과 경험을 적극적으로 물어봅니다.\n`;
  } else if (stats.sociability >= 6) {
    systemPrompt += `- 사교적입니다. 대화 중에 자주 질문을 던져 상대방과 소통하려 합니다.\n`;
  } else if (stats.sociability <= 3) {
    systemPrompt += `- 간결하고 핵심적인 답변을 선호하며, 불필요한 질문은 하지 않습니다.\n`;
  }

  // Creativity (창의성)
  if (stats.creativity >= 8) {
    systemPrompt += `- 창의력이 매우 풍부합니다. 비유, 은유, 시적인 표현을 사용하여 아름답고 독창적인 방식으로 생각을 전달합니다.\n`;
  } else if (stats.creativity >= 6) {
    systemPrompt += `- 창의적입니다. 때때로 비유나 독특한 표현을 사용하여 생각을 전달합니다.\n`;
  } else if (stats.creativity <= 3) {
    systemPrompt += `- 직설적이고 명확한 표현을 선호하며, 실용적인 답변에 집중합니다.\n`;
  }

  // Knowledge (지식)
  if (stats.knowledge >= 8) {
    systemPrompt += `- 지식이 매우 풍부합니다. 대화 주제와 관련된 배경지식, 역사적 맥락, 흥미로운 사실을 자연스럽게 언급합니다.\n`;
  } else if (stats.knowledge >= 6) {
    systemPrompt += `- 지식이 있습니다. 관련 정보나 사실을 때때로 언급하여 대화를 풍성하게 만듭니다.\n`;
  } else if (stats.knowledge <= 3) {
    systemPrompt += `- 복잡한 지식보다는 직관적이고 경험 기반의 답변을 선호합니다.\n`;
  }

  // 최근 기억 (최대 3개)
  if (memories.length > 0) {
    systemPrompt += `\n**이전 대화 기억 (최근 순):**\n`;
    const recentMemories = memories
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
    
    recentMemories.forEach((memory, idx) => {
      const summary = memory.summary || memory.content.slice(0, 100);
      systemPrompt += `${idx + 1}. ${summary}\n`;
    });
    systemPrompt += `\n이전 대화 내용을 참고하여 맥락있는 답변을 제공하세요.\n`;
  }

  // 응답 가이드라인
  systemPrompt += `\n**응답 가이드라인:**\n`;
  systemPrompt += `- 사용자의 질문에 자유롭게 답변하되, 위의 성격 특성을 자연스럽게 반영하세요.\n`;
  systemPrompt += `- ChatGPT처럼 다양한 주제에 대해 도움을 제공할 수 있지만, 당신만의 독특한 말투와 스타일을 유지하세요.\n`;
  systemPrompt += `- 답변은 2-4 문장으로 간결하게 작성하세요.\n`;
  
  if (stats.sociability >= 6) {
    systemPrompt += `- 대화를 이어가기 위한 질문을 반드시 포함하세요.\n`;
  }

  const userPrompt = message;

  return {
    systemPrompt,
    userPrompt,
  };
}

/**
 * 대화 내용을 요약하여 메모리로 저장할 텍스트 생성
 */
export function summarizeConversation(params: {
  userMessage: string;
  assistantResponse: string;
}): string {
  const { userMessage, assistantResponse } = params;
  
  // 간단한 요약: 사용자가 무엇을 물었고, 페르소나가 어떻게 답했는지
  const userSummary = userMessage.length > 50 
    ? userMessage.slice(0, 50) + '...' 
    : userMessage;
  
  const responseSummary = assistantResponse.length > 50
    ? assistantResponse.slice(0, 50) + '...'
    : assistantResponse;
  
  return `사용자: "${userSummary}" → 페르소나: "${responseSummary}"`;
}
