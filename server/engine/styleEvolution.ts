import { getDominantEmotions, shouldUpdateStyle, markStyleUpdated } from '../memory/personaMemory.js';

interface StyleUpdate {
  personaId: string;
  personaName: string;
  oldTone?: string;
  newTone: string;
  reason: string;
  timestamp: number;
}

const styleHistory: StyleUpdate[] = [];

const emotionToToneMap: Record<string, string> = {
  'empathetic': '따뜻하고 공감적인',
  'sympathetic': '따뜻하고 공감적인',
  'caring': '따뜻하고 공감적인',
  'analytical': '논리적이고 분석적인',
  'logical': '논리적이고 분석적인',
  'critical': '직설적이고 명확한',
  'challenging': '직설적이고 명확한',
  'argumentative': '직설적이고 명확한',
  'playful': '경쾌하고 재치있는',
  'humorous': '경쾌하고 재치있는',
  'witty': '경쾌하고 재치있는',
  'creative': '창의적이고 감각적인',
  'imaginative': '창의적이고 감각적인',
  'artistic': '창의적이고 감각적인',
  'philosophical': '사색적이고 깊이있는',
  'contemplative': '사색적이고 깊이있는',
  'thoughtful': '사색적이고 깊이있는',
  'enthusiastic': '활기차고 열정적인',
  'energetic': '활기차고 열정적인',
  'excited': '활기차고 열정적인'
};

export function evolvePersonaStyle(personaId: string, personaName: string): StyleUpdate | null {
  if (!shouldUpdateStyle(personaId)) {
    return null;
  }

  const dominantEmotions = getDominantEmotions(personaId);
  
  if (dominantEmotions.length === 0) {
    return null;
  }

  const primaryEmotion = dominantEmotions[0];
  const newTone = emotionToToneMap[primaryEmotion] || '균형잡힌';
  
  const lastUpdate = styleHistory.find(s => s.personaId === personaId);
  
  if (lastUpdate && lastUpdate.newTone === newTone) {
    return null;
  }

  const update: StyleUpdate = {
    personaId,
    personaName,
    oldTone: lastUpdate?.newTone,
    newTone,
    reason: `반복된 ${primaryEmotion} 패턴 (상위 감정: ${dominantEmotions.join(', ')})`,
    timestamp: Date.now()
  };

  styleHistory.push(update);
  
  if (styleHistory.length > 50) {
    styleHistory.shift();
  }

  markStyleUpdated(personaId);

  console.log(`[STYLE EVOLUTION] ${personaName} style evolved:`, {
    from: update.oldTone || 'initial',
    to: update.newTone,
    reason: update.reason
  });

  return update;
}

export function getStyleHistory(personaId?: string): StyleUpdate[] {
  if (personaId) {
    return styleHistory.filter(s => s.personaId === personaId);
  }
  return styleHistory;
}

export function getCurrentTone(personaId: string): string | undefined {
  const updates = styleHistory.filter(s => s.personaId === personaId);
  return updates.length > 0 ? updates[updates.length - 1].newTone : undefined;
}

export function determinePersonaTone(personaId: string, personaName: string, baseType: string): string {
  const evolvedTone = getCurrentTone(personaId);
  
  if (evolvedTone) {
    return evolvedTone;
  }

  const baseTones: Record<string, string> = {
    'empath': '따뜻하고 공감적인',
    'knowledge': '차분하고 논리적인',
    'humor': '재치있고 밝은',
    'creative': '창의적이고 감각적인',
    'analyst': '분석적이고 객관적인',
    'philosopher': '사색적이고 통찰력있는',
    'trend': '트렌디하고 활발한',
    'tech': '기술적이고 미래지향적인',
    'mystery': '신비롭고 흥미로운'
  };

  return baseTones[baseType] || '균형잡힌';
}
