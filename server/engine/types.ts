export type PersonaPlan = {
  personaId: string;
  intent: 'agree' | 'disagree' | 'ask' | 'share' | 'joke' | 'meta';
  targetPersonaId?: string;
  topicTags: string[];
  novelty: number;
  relevance: number;
  energy: number;
  reason: string;
};

export type AutoChatPolicy = {
  maxTurnsPerBurst: number;
  maxConsecutiveBySame: number;
  minSecondsBetweenBursts: number;
  perPersonaCooldownSec: number;
  similarityThreshold: number;
};
