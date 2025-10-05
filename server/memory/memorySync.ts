import { getPersonaMemory, getAllPersonaMemories } from './personaMemory.js';
import { getGrowthPattern, getDominantEmotions } from './personaMemory.js';

let syncInterval: NodeJS.Timeout | null = null;

interface PersonaProfile {
  id: string;
  name: string;
  toneStyle?: string;
  emotionalState?: string;
}

export function startMemorySync(syncCallback: (personaId: string, updates: any) => Promise<void>): void {
  if (syncInterval) {
    console.log('[MEMORY SYNC] Sync already running');
    return;
  }

  console.log('[MEMORY SYNC] Starting 1-hour sync interval');

  syncInterval = setInterval(async () => {
    console.log('[MEMORY SYNC] Running periodic sync...');
    
    const memories = getAllPersonaMemories();
    
    for (const [personaId, memory] of memories.entries()) {
      const growthPattern = getGrowthPattern(personaId);
      const dominantEmotions = getDominantEmotions(personaId);

      if (growthPattern.totalGrowth > 0 || dominantEmotions.length > 0) {
        const updates = {
          personaId,
          personaName: memory.personaName,
          dominantEmotions,
          mostGrownStat: growthPattern.mostGrownStat,
          totalGrowth: growthPattern.totalGrowth,
          interactionCount: memory.interactionCount,
          recentTriggers: growthPattern.recentTriggers
        };

        console.log(`[MEMORY SYNC] Syncing ${memory.personaName}:`, {
          emotions: dominantEmotions.join(', '),
          growth: `${growthPattern.mostGrownStat} (+${growthPattern.totalGrowth})`,
          interactions: memory.interactionCount
        });

        await syncCallback(personaId, updates);
      }
    }

    console.log('[MEMORY SYNC] Sync complete');
  }, 60 * 60 * 1000);
}

export function stopMemorySync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[MEMORY SYNC] Stopped sync interval');
  }
}

export async function forceSyncPersona(personaId: string, syncCallback: (personaId: string, updates: any) => Promise<void>): Promise<void> {
  const memory = getPersonaMemory(personaId);
  
  if (!memory) {
    console.log(`[MEMORY SYNC] No memory found for persona ${personaId}`);
    return;
  }

  const growthPattern = getGrowthPattern(personaId);
  const dominantEmotions = getDominantEmotions(personaId);

  const updates = {
    personaId,
    personaName: memory.personaName,
    dominantEmotions,
    mostGrownStat: growthPattern.mostGrownStat,
    totalGrowth: growthPattern.totalGrowth,
    interactionCount: memory.interactionCount,
    recentTriggers: growthPattern.recentTriggers
  };

  console.log(`[MEMORY SYNC] Force syncing ${memory.personaName}:`, updates);

  await syncCallback(personaId, updates);
}
