import { storage } from '../storage.js';

interface EmotionPattern {
  emotion: string;
  count: number;
  lastOccurrence: number;
}

interface GrowthEvent {
  timestamp: number;
  stat: string;
  delta: number;
  trigger: string;
}

interface PersonaMemoryData {
  personaId: string;
  personaName: string;
  emotionPatterns: Map<string, EmotionPattern>;
  growthHistory: GrowthEvent[];
  interactionCount: number;
  dominantEmotions: string[];
  lastStyleUpdate: number;
}

const personaMemories: Map<string, PersonaMemoryData> = new Map();

const emotionToValueMap: { [key: string]: number } = {
  '매우 슬픔': 1,
  '슬픔': 2,
  '보통': 5,
  '행복': 7,
  '매우 행복': 9,
  '기쁨': 8,
  '흥분': 9,
  '차분함': 6,
  '호기심': 7,
};

export async function recordEmotion(personaId: string, personaName: string, emotion: string, trigger?: string): Promise<void> {
  let memory = personaMemories.get(personaId);
  
  if (!memory) {
    memory = {
      personaId,
      personaName,
      emotionPatterns: new Map(),
      growthHistory: [],
      interactionCount: 0,
      dominantEmotions: [],
      lastStyleUpdate: Date.now()
    };
    personaMemories.set(personaId, memory);
  }

  const pattern = memory.emotionPatterns.get(emotion);
  if (pattern) {
    pattern.count++;
    pattern.lastOccurrence = Date.now();
  } else {
    memory.emotionPatterns.set(emotion, {
      emotion,
      count: 1,
      lastOccurrence: Date.now()
    });
  }

  memory.interactionCount++;

  updateDominantEmotions(memory);

  // DB에 감정 로그 저장
  const value = emotionToValueMap[emotion] || 5;
  try {
    await storage.createEmotionLog({
      personaId,
      emotion,
      value,
      trigger: trigger || 'interaction',
    });
  } catch (error) {
    console.error(`[EMOTION LOG ERROR] Failed to save emotion log for ${personaName}:`, error);
  }

  console.log(`[PERSONA MEMORY] ${personaName} emotion recorded: ${emotion} (total: ${memory.interactionCount})`);
}

export async function recordGrowth(
  personaId: string,
  personaName: string,
  stat: string,
  delta: number,
  trigger: string
): Promise<void> {
  let memory = personaMemories.get(personaId);
  
  if (!memory) {
    memory = {
      personaId,
      personaName,
      emotionPatterns: new Map(),
      growthHistory: [],
      interactionCount: 0,
      dominantEmotions: [],
      lastStyleUpdate: Date.now()
    };
    personaMemories.set(personaId, memory);
  }

  memory.growthHistory.push({
    timestamp: Date.now(),
    stat,
    delta,
    trigger
  });

  if (memory.growthHistory.length > 100) {
    memory.growthHistory.shift();
  }

  // DB에 성장 로그 저장
  try {
    await storage.createGrowthLog({
      personaId,
      stat,
      delta,
      trigger,
    });
  } catch (error) {
    console.error(`[GROWTH LOG ERROR] Failed to save growth log for ${personaName}:`, error);
  }

  console.log(`[DELTA] ${personaName}: ${stat} +${delta} (${trigger})`);
  console.log(`[PERSONA MEMORY] ${personaName} growth: ${stat} +${delta} (${trigger})`);
}

function updateDominantEmotions(memory: PersonaMemoryData): void {
  const emotions = Array.from(memory.emotionPatterns.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(p => p.emotion);

  memory.dominantEmotions = emotions;
}

export function getPersonaMemory(personaId: string): PersonaMemoryData | undefined {
  return personaMemories.get(personaId);
}

export function getDominantEmotions(personaId: string): string[] {
  const memory = personaMemories.get(personaId);
  return memory?.dominantEmotions || [];
}

export function getGrowthPattern(personaId: string): {
  mostGrownStat: string;
  totalGrowth: number;
  recentTriggers: string[];
} {
  const memory = personaMemories.get(personaId);
  
  if (!memory || memory.growthHistory.length === 0) {
    return {
      mostGrownStat: 'none',
      totalGrowth: 0,
      recentTriggers: []
    };
  }

  const statGrowth = new Map<string, number>();
  for (const event of memory.growthHistory) {
    const current = statGrowth.get(event.stat) || 0;
    statGrowth.set(event.stat, current + event.delta);
  }

  const mostGrownStat = Array.from(statGrowth.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

  const totalGrowth = Array.from(statGrowth.values())
    .reduce((sum, val) => sum + val, 0);

  const recentTriggers = memory.growthHistory
    .slice(-10)
    .map(e => e.trigger);

  return {
    mostGrownStat,
    totalGrowth,
    recentTriggers
  };
}

export function shouldUpdateStyle(personaId: string): boolean {
  const memory = personaMemories.get(personaId);
  
  if (!memory) return false;

  const hoursSinceUpdate = (Date.now() - memory.lastStyleUpdate) / (1000 * 60 * 60);
  const hasEnoughInteractions = memory.interactionCount >= 10;

  return hoursSinceUpdate >= 1 && hasEnoughInteractions;
}

export function markStyleUpdated(personaId: string): void {
  const memory = personaMemories.get(personaId);
  if (memory) {
    memory.lastStyleUpdate = Date.now();
    console.log(`[PERSONA MEMORY] ${memory.personaName} style update marked at ${new Date().toISOString()}`);
  }
}

export function getAllPersonaMemories(): Map<string, PersonaMemoryData> {
  return personaMemories;
}

export function clearAllPersonaMemories(): void {
  personaMemories.clear();
  console.log('[PERSONA MEMORY] All persona memories cleared');
}

export function clearPersonaMemory(personaId: string): void {
  personaMemories.delete(personaId);
  console.log(`[PERSONA MEMORY] Memory cleared for persona ${personaId}`);
}
