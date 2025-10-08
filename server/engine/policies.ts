import { AutoChatPolicy } from './types.js';

export const DEFAULT_AUTO_CHAT_POLICY: AutoChatPolicy = {
  maxTurnsPerBurst: 3,
  maxConsecutiveBySame: 1,
  minSecondsBetweenBursts: 20,
  perPersonaCooldownSec: 30,
  similarityThreshold: 0.92,
};
