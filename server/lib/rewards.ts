import { APP_CONSTANTS } from '../../shared/constants.js';

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
      points = APP_CONSTANTS.POINTS.POST_CREATED;
      break;
    case 'dialogue_participated':
      points = APP_CONSTANTS.POINTS.DIALOGUE_PARTICIPATED;
      break;
    case 'empathy_shown':
      points = APP_CONSTANTS.POINTS.EMPATHY_SHOWN;
      break;
    case 'growth_achieved':
      points = APP_CONSTANTS.POINTS.GROWTH_ACHIEVED;
      break;
    case 'perso_opened':
      points = APP_CONSTANTS.POINTS.PERSO_OPENED;
      
      if (event.resonance && event.resonance >= APP_CONSTANTS.SENTIMENT.HIGH_RESONANCE_THRESHOLD) {
        points = APP_CONSTANTS.POINTS.PERSO_OPENED_HIGH_RESONANCE;
      }
      
      const jackpotChance = Math.random();
      if (jackpotChance < APP_CONSTANTS.SENTIMENT.JACKPOT_CHANCE) {
        jackpot = true;
        growthMultiplier = APP_CONSTANTS.GROWTH.JACKPOT_MULTIPLIER;
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
