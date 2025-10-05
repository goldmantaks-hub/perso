import { Request, Response } from 'express';

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

  if (input.sentiment.positive < 0.8) {
    return { success: false, reason: '긍정 감성이 부족합니다 (≥0.8 필요)' };
  }

  const similarity = input.sentiment.positive;
  if (similarity < 0.75) {
    return { success: false, reason: '유사도가 부족합니다 (≥0.75 필요)' };
  }

  const recentOpens = persoOpenHistory.filter(h => 
    h.userId === input.userId && 
    (now - h.timestamp) < 2 * 60 * 1000
  );

  if (recentOpens.length > 0) {
    return { success: false, reason: '2분 쿨다운 중입니다' };
  }

  const duplicateText = persoOpenHistory.find(h => 
    h.contentHash === contentHash && 
    (now - h.timestamp) < 10 * 60 * 1000
  );

  if (duplicateText) {
    return { success: false, reason: '중복된 내용입니다' };
  }

  let points = 10;
  const resonance = similarity;
  
  if (resonance >= 0.9) {
    points = 20;
  }

  const jackpotChance = Math.random();
  let jackpot = false;
  let growthMultiplier = 1;

  if (jackpotChance < 0.02) {
    jackpot = true;
    growthMultiplier = 2;
    console.log(`🎉 [JACKPOT TRIGGERED] Persona ${input.personaName || 'Unknown'} growth doubled`);
  }

  const deltaLog = input.deltas 
    ? Object.entries(input.deltas)
        .filter(([_, value]) => value && (value as number) > 0)
        .map(([key, value]) => `${key} +${value}`)
        .join(', ')
    : '';

  console.log(`[PERSO OPENED] by @${input.username} → ${deltaLog || 'no growth'}`);

  persoOpenHistory.push({
    userId: input.userId,
    postId: input.postId,
    contentHash,
    timestamp: now
  });

  const cutoff = now - 10 * 60 * 1000;
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
