/**
 * 페르소나 스탯 및 무드 계산 유틸리티
 */

export interface SentimentAnalysis {
  positive: number;
  neutral: number;
  negative: number;
  tones?: string[];
  media_scores?: {
    aesthetics?: number;
    quality?: number;
  };
}

export interface MoodState {
  valence: number; // -1 (부정) ~ 1 (긍정)
  arousal: number; // 0 (낮음) ~ 1 (높음)
}

export interface PersonaDeltas {
  empathy: number;
  creativity: number;
  humor: number;
  knowledge: number;
  sociability: number;
}

/**
 * 감성 분석 결과를 valence/arousal 좌표로 정규화
 */
export function normalizeSentiment(sentiment: SentimentAnalysis): MoodState {
  const { positive, neutral, negative } = sentiment;
  
  // valence: positive - negative 범위로 계산
  const valence = positive - negative;
  
  // arousal: 감정의 강도 (중립이 낮을수록 arousal이 높음)
  const arousal = 1 - neutral;
  
  return {
    valence: Math.max(-1, Math.min(1, valence)),
    arousal: Math.max(0, Math.min(1, arousal))
  };
}

/**
 * 게시물의 가중치 계산 (최신성 * 참여도)
 */
export function computeWeight(params: {
  created_at: string | Date;
  likes: number;
  comments: number;
}): number {
  const now = Date.now();
  const createdAt = new Date(params.created_at).getTime();
  const ageHours = (now - createdAt) / (1000 * 60 * 60);
  
  // 최신성: 24시간 이내는 1.0, 이후 지수 감소
  const recency = Math.exp(-ageHours / 24);
  
  // 참여도: likes + comments, 정규화
  const engagement = Math.min(1, (params.likes + params.comments * 2) / 20);
  
  return recency * (0.5 + 0.5 * engagement);
}

/**
 * EMA(지수이동평균)로 페르소나 무드 업데이트
 */
export function updatePersonaMood(
  prevMood: MoodState,
  postScore: MoodState,
  weight: number,
  alpha: number = 0.25,
  capStep: number = 0.25
): MoodState {
  // EMA 공식: new = prev + alpha * weight * (score - prev)
  const deltaValence = alpha * weight * (postScore.valence - prevMood.valence);
  const deltaArousal = alpha * weight * (postScore.arousal - prevMood.arousal);
  
  // 급변 제한
  const cappedValence = Math.max(-capStep, Math.min(capStep, deltaValence));
  const cappedArousal = Math.max(-capStep, Math.min(capStep, deltaArousal));
  
  return {
    valence: Math.max(-1, Math.min(1, prevMood.valence + cappedValence)),
    arousal: Math.max(0, Math.min(1, prevMood.arousal + cappedArousal))
  };
}

/**
 * 시간에 따른 무드 감쇠 (중립으로 회귀)
 */
export function decayMood(
  prevMood: MoodState,
  elapsedHours: number,
  halfLifeHours: number = 24
): MoodState {
  // 반감기 기반 감쇠
  const decayFactor = Math.pow(0.5, elapsedHours / halfLifeHours);
  
  return {
    valence: prevMood.valence * decayFactor,
    arousal: prevMood.arousal * decayFactor
  };
}

/**
 * 무드 상태를 레이블과 이모지로 변환
 */
export function labelMood(mood: MoodState): { label: string; emoji: string } {
  const { valence, arousal } = mood;
  
  // 4분면 분류
  if (valence > 0.3) {
    if (arousal > 0.6) {
      return { label: '활기찬', emoji: '😄' };
    } else {
      return { label: '평온한', emoji: '😊' };
    }
  } else if (valence < -0.3) {
    if (arousal > 0.6) {
      return { label: '불안한', emoji: '😰' };
    } else {
      return { label: '우울한', emoji: '😔' };
    }
  } else {
    if (arousal > 0.6) {
      return { label: '긴장된', emoji: '😐' };
    } else {
      return { label: '중립적인', emoji: '😶' };
    }
  }
}

/**
 * 게시물 분석 결과로부터 페르소나 스탯 델타 계산
 */
export function computePersonaDeltas(params: {
  sentiment: SentimentAnalysis;
  tones?: string[];
  contentType?: string;
  imageScores?: {
    aesthetics?: number;
    quality?: number;
  };
}): PersonaDeltas {
  const { sentiment, tones = [], imageScores = {} } = params;
  const deltas: PersonaDeltas = {
    empathy: 0,
    creativity: 0,
    humor: 0,
    knowledge: 0,
    sociability: 0
  };
  
  // 규칙 기반 스탯 계산
  const rules: Array<{ condition: boolean; stat: keyof PersonaDeltas; value: number; priority: number }> = [];
  
  // Empathy: positive 감성이 높을수록
  if (sentiment.positive >= 0.9) {
    rules.push({ condition: true, stat: 'empathy', value: 2, priority: 1 });
  } else if (sentiment.positive >= 0.7) {
    rules.push({ condition: true, stat: 'empathy', value: 1, priority: 1 });
  }
  
  // Humor: humorous tone
  if (tones.includes('humorous') || tones.includes('playful')) {
    rules.push({ condition: true, stat: 'humor', value: 1, priority: 3 });
  }
  
  // Knowledge: informative tone
  if (tones.includes('informative') || tones.includes('analytical')) {
    rules.push({ condition: true, stat: 'knowledge', value: 1, priority: 4 });
  }
  
  // Sociability: serene/nostalgic + neutral
  if ((tones.includes('serene') || tones.includes('nostalgic')) && sentiment.neutral >= 0.6) {
    rules.push({ condition: true, stat: 'sociability', value: 1, priority: 5 });
  }
  
  // Creativity: image aesthetics
  if (imageScores.aesthetics && imageScores.aesthetics >= 0.75) {
    rules.push({ condition: true, stat: 'creativity', value: 1, priority: 2 });
  }
  
  // 우선순위로 정렬하고 총합 2 제한
  rules.sort((a, b) => a.priority - b.priority);
  
  let total = 0;
  for (const rule of rules) {
    if (rule.condition && total + rule.value <= 2) {
      deltas[rule.stat] += rule.value;
      total += rule.value;
    }
    if (total >= 2) break;
  }
  
  return deltas;
}

/**
 * 안티-게이밍: 중복 게시물 감지
 */
export interface PostHistory {
  userId: string;
  timestamp: number;
  contentHash: string;
}

const recentPosts: PostHistory[] = [];

/**
 * 간단한 문자열 해시
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * 게시물이 유효한지 검증 (안티-게이밍)
 */
export function validatePost(params: {
  userId: string;
  content: string;
  timestamp?: number;
}): { valid: boolean; reason?: string } {
  const now = params.timestamp || Date.now();
  const contentHash = simpleHash(params.content);
  
  // 2분 이내 동일 유저의 게시물 찾기
  const recentUserPosts = recentPosts.filter(p => 
    p.userId === params.userId && 
    (now - p.timestamp) < 2 * 60 * 1000
  );
  
  // 같은 유저가 2분 내 여러 게시물 작성
  if (recentUserPosts.length > 0) {
    // 가장 최근 게시물만 유효
    const latest = recentUserPosts[recentUserPosts.length - 1];
    if (latest.timestamp > now - 2 * 60 * 1000) {
      return { valid: false, reason: '2분 내 중복 게시물' };
    }
  }
  
  // 텍스트 유사도 체크 (완전 동일한 내용)
  const similarPost = recentPosts.find(p => 
    p.contentHash === contentHash && 
    (now - p.timestamp) < 10 * 60 * 1000
  );
  
  if (similarPost) {
    return { valid: false, reason: '유사한 게시물 존재' };
  }
  
  // 히스토리에 추가
  recentPosts.push({ userId: params.userId, timestamp: now, contentHash });
  
  // 10분 이상 오래된 항목 정리
  const cutoff = now - 10 * 60 * 1000;
  while (recentPosts.length > 0 && recentPosts[0].timestamp < cutoff) {
    recentPosts.shift();
  }
  
  return { valid: true };
}
