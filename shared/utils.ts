import { PERSONA_COLORS, PERSONA_STATUS, MESSAGE_TYPES, EVENT_TYPES } from './constants.js';

// 페르소나 색상 유틸리티
export function getPersonaColors(personaId: string) {
  return PERSONA_COLORS[personaId as keyof typeof PERSONA_COLORS] || PERSONA_COLORS.Noir;
}

// 페르소나 상태 유틸리티
export function getPersonaStatusClass(status: string) {
  switch (status) {
    case PERSONA_STATUS.ACTIVE:
      return 'bg-green-100 text-green-800 border-green-200';
    case PERSONA_STATUS.WAITING:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case PERSONA_STATUS.JOINING:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case PERSONA_STATUS.LEAVING:
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

// 메시지 타입 유틸리티
export function getMessageTypeIcon(type: string) {
  switch (type) {
    case MESSAGE_TYPES.EMPATH:
      return '💝';
    case MESSAGE_TYPES.HUMOR:
      return '😄';
    case MESSAGE_TYPES.KNOWLEDGE:
      return '🧠';
    case MESSAGE_TYPES.CREATIVE:
      return '🎨';
    case MESSAGE_TYPES.ANALYTICAL:
      return '📊';
    default:
      return '💬';
  }
}

// 이벤트 타입 유틸리티
export function getEventTypeIcon(eventType: string) {
  switch (eventType) {
    case EVENT_TYPES.JOIN:
      return '➕';
    case EVENT_TYPES.LEAVE:
      return '➖';
    case EVENT_TYPES.HANDOVER:
      return '🔄';
    case EVENT_TYPES.MESSAGE:
      return '💬';
    case EVENT_TYPES.SYSTEM:
      return '⚙️';
    default:
      return '📝';
  }
}

// 시간 포맷팅 유틸리티
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) { // 1분 미만
    return '방금 전';
  } else if (diff < 3600000) { // 1시간 미만
    return `${Math.floor(diff / 60000)}분 전`;
  } else if (diff < 86400000) { // 1일 미만
    return `${Math.floor(diff / 3600000)}시간 전`;
  } else {
    return date.toLocaleDateString('ko-KR');
  }
}

// 메시지 길이 제한 유틸리티
export function truncateMessage(message: string, maxLength: number = 100): string {
  if (message.length <= maxLength) {
    return message;
  }
  return message.substring(0, maxLength) + '...';
}

// 페르소나 이름 검증 유틸리티
export function isValidPersonaName(name: string): boolean {
  const validNames = Object.keys(PERSONA_COLORS);
  return validNames.includes(name);
}

// 랜덤 페르소나 선택 유틸리티
export function getRandomPersona(): string {
  const personas = Object.keys(PERSONA_COLORS);
  return personas[Math.floor(Math.random() * personas.length)];
}

// 페르소나 그룹 유틸리티
export function getPersonaGroup(personaId: string): string {
  const groups = {
    'Kai': 'analyst',
    'Namu': 'analyst', 
    'Rho': 'analyst',
    'Luna': 'creative',
    'Milo': 'creative',
    'Ava': 'creative',
    'Eden': 'philosopher',
    'Noir': 'philosopher',
    'Espri': 'empath'
  };
  
  return groups[personaId as keyof typeof groups] || 'unknown';
}

// 색상 대비 계산 유틸리티
export function getContrastRatio(color1: string, color2: string): number {
  // 간단한 대비율 계산 (실제로는 더 복잡한 계산이 필요)
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);
  
  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);
  
  const l1 = (0.299 * r1 + 0.587 * g1 + 0.114 * b1) / 255;
  const l2 = (0.299 * r2 + 0.587 * g2 + 0.114 * b2) / 255;
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// 애니메이션 지연 계산 유틸리티
export function getAnimationDelay(index: number, baseDelay: number = 100): number {
  return index * baseDelay;
}

// 페르소나 우선순위 계산 유틸리티
export function calculatePersonaPriority(personaId: string, topics: Array<{ topic: string; weight: number }>): number {
  const topicWeights = {
    'Kai': { 'tech': 0.9, 'ai': 0.8, 'science': 0.7 },
    'Espri': { 'emotion': 0.9, 'empathy': 0.8, 'social': 0.7 },
    'Luna': { 'art': 0.9, 'creativity': 0.8, 'aesthetic': 0.7 },
    'Namu': { 'factual': 0.9, 'information': 0.8, 'data': 0.7 },
    'Milo': { 'humor': 0.9, 'fun': 0.8, 'entertainment': 0.7 },
    'Eden': { 'philosophy': 0.9, 'ethics': 0.8, 'values': 0.7 },
    'Ava': { 'travel': 0.9, 'adventure': 0.8, 'exploration': 0.7 },
    'Rho': { 'tech': 0.9, 'innovation': 0.8, 'future': 0.7 },
    'Noir': { 'mystery': 0.9, 'detective': 0.8, 'investigation': 0.7 }
  };
  
  const personaTopics = topicWeights[personaId as keyof typeof topicWeights] || {};
  let priority = 0;
  
  for (const topic of topics) {
    const weight = personaTopics[topic.topic] || 0;
    priority += weight * topic.weight;
  }
  
  return priority;
}
