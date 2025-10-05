interface PersonaInfluence {
  personaId: string;
  personaName: string;
  messageCount: number;
  replyRate: number;
  connection: number;
  emotionImpact: number;
  influence: number;
  lastInteraction: number;
}

interface PersonaConnection {
  personaId: string;
  targetPersonaId: string;
  strength: number;
  sharedBias?: string;
}

const DECAY_THRESHOLD_HOURS = 48;
const DECAY_RATE = 0.1;
const STRONG_CONNECTION_THRESHOLD = 0.8;

export function calculateInfluence(
  messageCount: number,
  replyRate: number,
  connection: number,
  emotionImpact: number
): number {
  const influence = 
    (messageCount * 0.4) + 
    (replyRate * 0.3) + 
    (connection * 0.2) + 
    (emotionImpact * 0.1);
  
  return Math.min(influence, 1.0);
}

export function applyDecay(
  influence: number, 
  lastInteractionTimestamp: number
): number {
  const hoursSinceLastInteraction = 
    (Date.now() - lastInteractionTimestamp) / (1000 * 60 * 60);
  
  if (hoursSinceLastInteraction >= DECAY_THRESHOLD_HOURS) {
    const decayedInfluence = influence * (1 - DECAY_RATE);
    return Math.max(decayedInfluence, 0);
  }
  
  return influence;
}

export function updatePersonaInfluence(
  personaId: string,
  personaName: string,
  messageCount: number,
  replyRate: number,
  connection: number,
  emotionImpact: number,
  lastInteraction: number
): PersonaInfluence {
  const baseInfluence = calculateInfluence(
    messageCount,
    replyRate,
    connection,
    emotionImpact
  );
  
  const influence = applyDecay(baseInfluence, lastInteraction);
  
  return {
    personaId,
    personaName,
    messageCount,
    replyRate,
    connection,
    emotionImpact,
    influence,
    lastInteraction
  };
}

export function determineSharedBias(
  sourcePersona: PersonaInfluence,
  targetPersona: PersonaInfluence,
  connectionStrength: number
): PersonaConnection {
  const connection: PersonaConnection = {
    personaId: sourcePersona.personaId,
    targetPersonaId: targetPersona.personaId,
    strength: connectionStrength
  };
  
  if (connectionStrength >= STRONG_CONNECTION_THRESHOLD) {
    const avgEmotionImpact = 
      (sourcePersona.emotionImpact + targetPersona.emotionImpact) / 2;
    
    if (avgEmotionImpact > 0.7) {
      connection.sharedBias = 'positive';
    } else if (avgEmotionImpact < 0.3) {
      connection.sharedBias = 'negative';
    } else {
      connection.sharedBias = 'neutral';
    }
  }
  
  return connection;
}

export function normalizeInfluenceScores(
  personas: PersonaInfluence[]
): PersonaInfluence[] {
  const maxInfluence = Math.max(...personas.map(p => p.influence), 0.01);
  
  return personas.map(persona => ({
    ...persona,
    influence: persona.influence / maxInfluence
  }));
}

export function getInfluenceCategory(influence: number): string {
  if (influence >= 0.8) return 'very-high';
  if (influence >= 0.6) return 'high';
  if (influence >= 0.4) return 'medium';
  if (influence >= 0.2) return 'low';
  return 'very-low';
}

export function getConnectionStrength(
  interactionCount: number,
  sharedEmotions: number,
  responseRate: number
): number {
  const baseStrength = 
    (interactionCount * 0.5) + 
    (sharedEmotions * 0.3) + 
    (responseRate * 0.2);
  
  return Math.min(baseStrength / 10, 1.0);
}
