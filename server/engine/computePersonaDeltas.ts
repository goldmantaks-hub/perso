interface PersonaDelta {
  empathy?: number;
  humor?: number;
  sociability?: number;
  creativity?: number;
  knowledge?: number;
}

interface SentimentScore {
  positive: number;
  neutral: number;
  negative: number;
}

interface ImageScores {
  aesthetics?: number;
  quality?: number;
}

interface AnalysisInput {
  sentiment: SentimentScore;
  tones: string[];
  contentType?: string;
  imageScores?: ImageScores;
}

export function computePersonaDeltas(input: AnalysisInput): PersonaDelta {
  const deltas: PersonaDelta = { 
    empathy: 0, 
    creativity: 0, 
    humor: 0, 
    knowledge: 0, 
    sociability: 0 
  };

  const { sentiment, tones, imageScores } = input;

  if (sentiment.positive >= 0.9) {
    deltas.empathy! += 2;
  } else if (sentiment.positive >= 0.7) {
    deltas.empathy! += 1;
  }

  if (tones.includes("humorous")) {
    deltas.humor! += 1;
  }

  if (tones.includes("informative")) {
    deltas.knowledge! += 1;
  }

  if ((tones.includes("serene") || tones.includes("nostalgic")) && sentiment.neutral >= 0.6) {
    deltas.sociability! += 1;
  }

  if (imageScores?.aesthetics && imageScores.aesthetics >= 0.75) {
    deltas.creativity! += 1;
  }

  const priority = ["empathy", "creativity", "humor", "knowledge", "sociability"];
  let total = Object.values(deltas).reduce((a, b) => a + b, 0);
  
  while (total > 2) {
    const last = priority.pop();
    if (last && deltas[last as keyof PersonaDelta]) {
      deltas[last as keyof PersonaDelta] = Math.max(0, deltas[last as keyof PersonaDelta]! - 1);
    }
    total = Object.values(deltas).reduce((a, b) => a + b, 0);
  }

  return deltas;
}

export function applyPersonaGrowth(
  currentStats: PersonaDelta,
  deltas: PersonaDelta
): PersonaDelta {
  const newStats = { ...currentStats };
  
  for (const [key, value] of Object.entries(deltas)) {
    if (key in newStats && typeof value === 'number') {
      newStats[key as keyof PersonaDelta] = (newStats[key as keyof PersonaDelta] || 0) + value;
    }
  }
  
  return newStats;
}
