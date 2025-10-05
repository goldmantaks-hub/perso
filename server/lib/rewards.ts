interface RewardEvent {
  type: 'post_created' | 'dialogue_participated' | 'empathy_shown' | 'growth_achieved' | 'perso_opened';
  personaId: string;
  value: number;
  resonance?: number;
  metadata?: any;
}

interface RewardResult {
  points: number;
  badges?: string[];
  levelUp?: boolean;
  newLevel?: number;
  jackpot?: boolean;
  growthMultiplier?: number;
}

export function calculateReward(event: RewardEvent): RewardResult {
  let points = 0;
  const badges: string[] = [];
  let jackpot = false;
  let growthMultiplier = 1;
  
  switch (event.type) {
    case 'post_created':
      points = 10;
      break;
    case 'dialogue_participated':
      points = 5;
      break;
    case 'empathy_shown':
      points = 15;
      break;
    case 'growth_achieved':
      points = 20;
      break;
    case 'perso_opened':
      points = 10;
      
      if (event.resonance && event.resonance >= 0.9) {
        points = 20;
      }
      
      const jackpotChance = Math.random();
      if (jackpotChance < 0.02) {
        jackpot = true;
        growthMultiplier = 2;
        console.log(`[JACKPOT] Triggered for persona ${event.personaId} - growth doubled`);
      }
      break;
  }
  
  points *= event.value;
  
  return { points, badges, jackpot, growthMultiplier };
}

export function checkLevelUp(currentPoints: number, currentLevel: number): RewardResult {
  const pointsForNextLevel = currentLevel * 100;
  
  if (currentPoints >= pointsForNextLevel) {
    return {
      points: currentPoints,
      levelUp: true,
      newLevel: currentLevel + 1
    };
  }
  
  return {
    points: currentPoints,
    levelUp: false
  };
}

export function grantBadge(
  personaId: string,
  badgeType: string,
  criteria: any
): string | null {
  const badges = {
    'empathy_master': 'Empathy 10회 이상',
    'dialogue_expert': 'Dialogue 50회 참여',
    'knowledge_seeker': 'Knowledge +100',
    'social_butterfly': 'Sociability 8 이상'
  };
  
  return null;
}
