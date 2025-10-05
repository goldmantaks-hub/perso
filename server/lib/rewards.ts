interface RewardEvent {
  type: 'post_created' | 'dialogue_participated' | 'empathy_shown' | 'growth_achieved';
  personaId: string;
  value: number;
  metadata?: any;
}

interface RewardResult {
  points: number;
  badges?: string[];
  levelUp?: boolean;
  newLevel?: number;
}

export function calculateReward(event: RewardEvent): RewardResult {
  let points = 0;
  const badges: string[] = [];
  
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
  }
  
  points *= event.value;
  
  return { points, badges };
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
