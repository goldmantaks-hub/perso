import { PersonaState, TopicWeight } from './persoRoom.js';

export const TOPIC_WEIGHTS: Record<string, Record<string, number>> = {
  'emotion': { Espri: 0.9, Luna: 0.6, Milo: 0.4, Eden: 0.5 },
  'tech': { Rho: 0.9, Kai: 0.7, Namu: 0.5 },
  'humor': { Milo: 0.9, Ava: 0.7 },
  'philosophy': { Eden: 0.9, Noir: 0.7, Luna: 0.5 },
  'analysis': { Namu: 0.9, Kai: 0.7, Rho: 0.5 },
  'creativity': { Luna: 0.9, Noir: 0.6, Espri: 0.4 },
  'trend': { Ava: 0.9, Milo: 0.6 },
  'travel': { Kai: 0.7, Ava: 0.6, Luna: 0.5 },
  'cuisine': { Milo: 0.7, Ava: 0.6, Espri: 0.5 },
  'art': { Luna: 0.9, Noir: 0.7, Eden: 0.5 },
  'mystery': { Noir: 0.9, Eden: 0.6 },
  'social': { Ava: 0.8, Espri: 0.7, Milo: 0.6 },
};

interface ConversationMessage {
  id?: string;
  persona?: string;
  message: string;
  timestamp?: number;
}

export function selectNextSpeaker(
  currentTopics: TopicWeight[],
  lastMessage: string,
  lastSpeaker: string,
  activePersonas: PersonaState[],
  conversationHistory: ConversationMessage[],
  dominantPersona: string | null,
  turnsSinceDominantChange: number
): string {
  const eligiblePersonas = activePersonas.filter(p => p.status === 'active');
  if (eligiblePersonas.length === 0) {
    return lastSpeaker;
  }
  if (eligiblePersonas.length === 1) {
    return eligiblePersonas[0].id;
  }
  
  const scores: Map<string, number> = new Map();
  
  for (const persona of activePersonas) {
    if (persona.status !== 'active') continue;
    if (persona.id === lastSpeaker) continue;
    
    let score = 0;
    
    for (const {topic, weight} of currentTopics) {
      const affinity = TOPIC_WEIGHTS[topic]?.[persona.id] || 0.3;
      score += affinity * weight * 0.4;
    }
    
    const lastTurnIndex = findLastTurnIndex(persona.id, conversationHistory);
    const recency = lastTurnIndex === -1 ? 1.0 : 
      Math.min(1.0, (conversationHistory.length - lastTurnIndex) / 10);
    score += recency * 0.2;
    
    if (persona.id === dominantPersona && turnsSinceDominantChange < 5) {
      score += 0.2;
    }
    
    const personaTurns = conversationHistory.filter(m => m.persona === persona.id).length;
    const avgParticipation = Math.max(1, conversationHistory.length / activePersonas.length);
    const fairness = Math.max(0, 1.0 - Math.abs(personaTurns - avgParticipation) / (avgParticipation + 0.1));
    score += fairness * 0.1;
    
    const interest = calculateInterestMatch(persona, lastMessage);
    score += interest * 0.1;
    
    scores.set(persona.id, Math.max(0, Math.min(1, score)));
  }
  
  const scoreArray = Array.from(scores.entries());
  const totalScore = scoreArray.reduce((sum, [_, score]) => sum + score, 0);
  
  if (totalScore === 0) {
    return scoreArray[Math.floor(Math.random() * scoreArray.length)][0];
  }
  
  const normalizedScores = new Map(
    scoreArray.map(([id, score]) => [id, score / totalScore])
  );
  
  return weightedRandomSelection(normalizedScores, 0.7);
}

function findLastTurnIndex(personaId: string, history: ConversationMessage[]): number {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].persona === personaId) {
      return i;
    }
  }
  return -1;
}

function calculateInterestMatch(persona: PersonaState, lastMessage: string): number {
  const messageLength = lastMessage.length;
  const baseInterest = Math.random() * 0.5 + 0.3;
  
  if (messageLength > 100) {
    return Math.min(1.0, baseInterest + 0.2);
  }
  
  if (lastMessage.includes('?')) {
    return Math.min(1.0, baseInterest + 0.3);
  }
  
  return baseInterest;
}

function weightedRandomSelection(scores: Map<string, number>, temperature: number): string {
  const entries = Array.from(scores.entries());
  
  const exponentialScores = entries.map(([id, score]) => ({
    id,
    adjustedScore: Math.pow(score, 1 / temperature)
  }));
  
  const total = exponentialScores.reduce((sum, item) => sum + item.adjustedScore, 0);
  const normalizedScores = exponentialScores.map(item => ({
    id: item.id,
    probability: item.adjustedScore / total
  }));
  
  const random = Math.random();
  let cumulative = 0;
  
  for (const { id, probability } of normalizedScores) {
    cumulative += probability;
    if (random <= cumulative) {
      return id;
    }
  }
  
  return normalizedScores[normalizedScores.length - 1].id;
}
