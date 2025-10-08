import { PersonaState, TopicWeight } from './persoRoom.js';
// TOPIC_WEIGHTS import 제거됨

interface ConversationMessage {
  persona?: string;
  message: string;
}

export interface HandoverResult {
  shouldHandover: boolean;
  newDominant?: string;
  reason?: string;
}

export function checkHandover(
  currentTopics: TopicWeight[],
  previousTopics: TopicWeight[],
  dominantPersona: string,
  turnsSinceDominantChange: number,
  activePersonas: PersonaState[],
  conversationHistory: ConversationMessage[]
): HandoverResult {
  
  if (currentTopics.length > 0 && previousTopics.length > 0) {
    const topicSimilarity = cosineSimilarity(currentTopics, previousTopics);
    if (topicSimilarity < 0.5) {
      const newDominant = findBestPersonaForTopics(currentTopics, activePersonas);
      if (newDominant) {
        console.log(`[HANDOVER] Topic shift detected (similarity: ${topicSimilarity.toFixed(2)}) → ${newDominant}`);
        return { 
          shouldHandover: true, 
          newDominant,
          reason: 'topic_shift'
        };
      }
    }
  }
  
  if (turnsSinceDominantChange >= 7) {
    const candidates = activePersonas.filter(p => p.id !== dominantPersona && p.status === 'active');
    if (candidates.length > 0) {
      const newDominant = selectByParticipationFairness(candidates, conversationHistory);
      if (newDominant) {
        console.log(`[HANDOVER] Turn-based rotation (7+ turns) → ${newDominant}`);
        return { 
          shouldHandover: true, 
          newDominant,
          reason: 'turn_limit'
        };
      }
    }
  }
  
  return { shouldHandover: false };
}

export function cosineSimilarity(
  topics1: TopicWeight[],
  topics2: TopicWeight[]
): number {
  if (topics1.length === 0 || topics2.length === 0) {
    return 0;
  }
  
  const allTopics = new Set([
    ...topics1.map(t => t.topic),
    ...topics2.map(t => t.topic)
  ]);
  
  const vector1: number[] = [];
  const vector2: number[] = [];
  
  Array.from(allTopics).forEach(topic => {
    const weight1 = topics1.find(t => t.topic === topic)?.weight || 0;
    const weight2 = topics2.find(t => t.topic === topic)?.weight || 0;
    vector1.push(weight1);
    vector2.push(weight2);
  });
  
  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }
  
  return dotProduct / (magnitude1 * magnitude2);
}

export function findBestPersonaForTopics(
  topics: TopicWeight[],
  activePersonas: PersonaState[]
): string | null {
  if (topics.length === 0 || activePersonas.length === 0) {
    return null;
  }
  
  const eligiblePersonas = activePersonas.filter(p => p.status === 'active');
  if (eligiblePersonas.length === 0) {
    return null;
  }
  
  let bestPersona: string | null = null;
  let bestScore = -1;
  
  for (const persona of eligiblePersonas) {
    let score = 0;
    for (const { topic, weight } of topics) {
      // 향후 DB에 페르소나 관심사 필드 추가 시 여기서 계산
      const affinity = Math.random(); // 임시 랜덤 점수
      score += affinity * weight;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestPersona = persona.id;
    }
  }
  
  return bestPersona;
}

function selectByParticipationFairness(
  candidates: PersonaState[],
  conversationHistory: ConversationMessage[]
): string | null {
  if (candidates.length === 0) {
    return null;
  }
  
  const participationCounts = new Map<string, number>();
  for (const message of conversationHistory) {
    if (message.persona) {
      participationCounts.set(
        message.persona,
        (participationCounts.get(message.persona) || 0) + 1
      );
    }
  }
  
  let leastActivePersona: string | null = null;
  let minCount = Infinity;
  
  for (const persona of candidates) {
    const count = participationCounts.get(persona.id) || 0;
    if (count < minCount) {
      minCount = count;
      leastActivePersona = persona.id;
    }
  }
  
  return leastActivePersona;
}
