import { Request, Response } from 'express';
import { APP_CONSTANTS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../shared/constants.js';

interface PersoOpenHistory {
  userId: string;
  postId: string;
  contentHash: string;
  timestamp: number;
}

const persoOpenHistory: PersoOpenHistory[] = [];

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

interface OpenPersoInput {
  userId: string;
  username: string;
  postId: string;
  content: string;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  deltas?: any;
  personaName?: string;
}

export async function openPerso(input: OpenPersoInput): Promise<{
  success: boolean;
  reason?: string;
  points?: number;
  jackpot?: boolean;
  growthMultiplier?: number;
}> {
  const now = Date.now();
  const contentHash = simpleHash(input.content);

  if (input.sentiment.positive < APP_CONSTANTS.SENTIMENT.MIN_POSITIVE_THRESHOLD) {
    return { success: false, reason: ERROR_MESSAGES.INSUFFICIENT_POSITIVE_SENTIMENT };
  }

  const similarity = input.sentiment.positive;
  if (similarity < APP_CONSTANTS.SENTIMENT.MIN_SIMILARITY_THRESHOLD) {
    return { success: false, reason: ERROR_MESSAGES.INSUFFICIENT_SIMILARITY };
  }

  const recentOpens = persoOpenHistory.filter(h => 
    h.userId === input.userId && 
    (now - h.timestamp) < APP_CONSTANTS.TIME.COOLDOWN_PERIOD
  );

  if (recentOpens.length > 0) {
    return { success: false, reason: ERROR_MESSAGES.COOLDOWN_ACTIVE };
  }

  const duplicateText = persoOpenHistory.find(h => 
    h.contentHash === contentHash && 
    (now - h.timestamp) < APP_CONSTANTS.TIME.DUPLICATE_CHECK_PERIOD
  );

  if (duplicateText) {
    return { success: false, reason: ERROR_MESSAGES.DUPLICATE_CONTENT };
  }

  let points = APP_CONSTANTS.POINTS.PERSO_OPENED;
  const resonance = similarity;
  
  if (resonance >= APP_CONSTANTS.SENTIMENT.HIGH_RESONANCE_THRESHOLD) {
    points = APP_CONSTANTS.POINTS.PERSO_OPENED_HIGH_RESONANCE;
  }

  const jackpotChance = Math.random();
  let jackpot = false;
  let growthMultiplier = APP_CONSTANTS.GROWTH.DEFAULT_MULTIPLIER;

  if (jackpotChance < APP_CONSTANTS.SENTIMENT.JACKPOT_CHANCE) {
    jackpot = true;
    growthMultiplier = APP_CONSTANTS.GROWTH.JACKPOT_MULTIPLIER;
    console.log(`[JACKPOT] Triggered for ${input.personaName || 'Unknown'} - growth doubled`);
  }

  const deltaLog = input.deltas 
    ? Object.entries(input.deltas)
        .filter(([_, value]) => value && (value as number) > 0)
        .map(([key, value]) => `${key} +${value}`)
        .join(', ')
    : '';

  console.log(`[OPEN] Perso triggered by similarity ${similarity.toFixed(2)} (by @${input.username}) → ${deltaLog || 'no growth'}`);

  persoOpenHistory.push({
    userId: input.userId,
    postId: input.postId,
    contentHash,
    timestamp: now
  });

  const cutoff = now - APP_CONSTANTS.TIME.ROOM_CLEANUP_PERIOD;
  while (persoOpenHistory.length > 0 && persoOpenHistory[0].timestamp < cutoff) {
    persoOpenHistory.shift();
  }

  return {
    success: true,
    points,
    jackpot,
    growthMultiplier
  };
}

export async function getPersonaById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    res.json({
      id,
      message: 'Get persona endpoint - to be implemented'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get persona' });
  }
}

export async function updatePersonaStats(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { deltas } = req.body;
    
    res.json({
      id,
      updated: true,
      message: 'Update persona stats endpoint - to be implemented'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update persona stats' });
  }
}

export async function getPersonaRelations(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    res.json({
      relations: [],
      message: 'Get persona relations endpoint - to be implemented'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get persona relations' });
  }
}
