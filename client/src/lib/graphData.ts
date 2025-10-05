interface GraphNode {
  id: string;
  label: string;
  moodColor: string;
  size: number;
  influence: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
  color: string;
  strength: number;
  emotionColor?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const MOOD_COLOR_MAP: Record<string, string> = {
  'happy': '#FFD700',
  'excited': '#FF6B6B',
  'calm': '#4ECDC4',
  'thoughtful': '#95E1D3',
  'creative': '#C44569',
  'analytical': '#556FB5',
  'empathetic': '#F38181',
  'humorous': '#FFA502',
  'mysterious': '#9B59B6',
  'neutral': '#95A5A6'
};

const EMOTION_COLOR_MAP: Record<string, string> = {
  'positive': '#4CAF50',
  'neutral': '#9E9E9E',
  'negative': '#F44336',
  'empathetic': '#FF6B9D',
  'analytical': '#2196F3',
  'playful': '#FFEB3B',
  'creative': '#9C27B0'
};

export function getMoodColor(mood: string): string {
  return MOOD_COLOR_MAP[mood.toLowerCase()] || MOOD_COLOR_MAP['neutral'];
}

export function getEmotionColor(emotion: string): string {
  return EMOTION_COLOR_MAP[emotion.toLowerCase()] || EMOTION_COLOR_MAP['neutral'];
}

export function createGraphNode(
  personaId: string,
  personaName: string,
  mood: string,
  influence: number
): GraphNode {
  const baseSize = 20;
  const size = baseSize + (influence * 30);
  
  return {
    id: personaId,
    label: personaName,
    moodColor: getMoodColor(mood),
    size,
    influence
  };
}

export function createGraphLink(
  sourceId: string,
  targetId: string,
  connectionStrength: number,
  emotion: string = 'neutral'
): GraphLink {
  return {
    source: sourceId,
    target: targetId,
    color: getEmotionColor(emotion),
    strength: connectionStrength,
    emotionColor: getEmotionColor(emotion)
  };
}

export function buildGraphData(
  personas: Array<{
    id: string;
    name: string;
    mood: string;
    influence: number;
  }>,
  connections: Array<{
    sourceId: string;
    targetId: string;
    strength: number;
    emotion?: string;
  }>
): GraphData {
  const nodes = personas.map(p => 
    createGraphNode(p.id, p.name, p.mood, p.influence)
  );
  
  const links = connections
    .filter(c => c.strength > 0.1)
    .map(c => 
      createGraphLink(c.sourceId, c.targetId, c.strength, c.emotion)
    );
  
  return { nodes, links };
}

export function calculateNodePositions(
  nodes: GraphNode[],
  width: number,
  height: number
): GraphNode[] {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;
  
  return nodes.map((node, index) => {
    const angle = (index / nodes.length) * 2 * Math.PI;
    const influenceFactor = 1 + (node.influence * 0.3);
    
    return {
      ...node,
      x: centerX + Math.cos(angle) * radius * influenceFactor,
      y: centerY + Math.sin(angle) * radius * influenceFactor
    };
  });
}

export function filterWeakConnections(
  links: GraphLink[],
  threshold: number = 0.2
): GraphLink[] {
  return links.filter(link => link.strength >= threshold);
}

export function getNodeGlowIntensity(influence: number): number {
  return 5 + (influence * 15);
}

export function getLinkOpacity(strength: number): number {
  return Math.max(0.3, Math.min(1.0, strength));
}

export interface EmotionTimelineData {
  timestamp: number;
  emotion: string;
  intensity: number;
  personaName: string;
}

export function prepareEmotionTimeline(
  emotionHistory: Array<{
    timestamp: number;
    emotion: string;
    intensity: number;
    personaName: string;
  }>,
  limit: number = 50
): EmotionTimelineData[] {
  return emotionHistory
    .slice(-limit)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function aggregateEmotionsByTime(
  timeline: EmotionTimelineData[],
  intervalMinutes: number = 5
): Array<{
  time: string;
  positive: number;
  neutral: number;
  negative: number;
}> {
  const groups = new Map<string, { positive: number; neutral: number; negative: number; count: number }>();
  
  timeline.forEach(item => {
    const timeKey = new Date(
      Math.floor(item.timestamp / (intervalMinutes * 60 * 1000)) * intervalMinutes * 60 * 1000
    ).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    
    if (!groups.has(timeKey)) {
      groups.set(timeKey, { positive: 0, neutral: 0, negative: 0, count: 0 });
    }
    
    const group = groups.get(timeKey)!;
    
    if (['positive', 'empathetic', 'playful', 'enthusiastic'].includes(item.emotion)) {
      group.positive += item.intensity;
    } else if (['negative', 'critical', 'argumentative'].includes(item.emotion)) {
      group.negative += item.intensity;
    } else {
      group.neutral += item.intensity;
    }
    
    group.count++;
  });
  
  return Array.from(groups.entries()).map(([time, data]) => ({
    time,
    positive: data.positive / data.count,
    neutral: data.neutral / data.count,
    negative: data.negative / data.count
  }));
}
