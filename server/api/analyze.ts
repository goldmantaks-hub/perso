import { Request, Response } from 'express';
import { computePersonaDeltas } from '../engine/computePersonaDeltas.js';

interface Subject {
  kind: 'person' | 'food' | 'place' | 'object' | 'activity';
  confidence: number;
}

function detectSubjects(content: string, media?: string): Subject[] {
  const subjects: Subject[] = [];
  const contentLower = content.toLowerCase();
  
  if (media) {
    subjects.push({ kind: 'object', confidence: 0.7 + Math.random() * 0.2 });
  }
  
  const keywords = {
    person: ['친구', '가족', '사람', '우리', '저', '나', '엄마', '아빠', '동생', '언니', '오빠', '형'],
    food: ['음식', '먹', '맛', '요리', '밥', '빵', '커피', '차', '맥주', '술', '디저트', '케이크'],
    place: ['여행', '장소', '곳', '카페', '식당', '공원', '바다', '산', '집', '회사', '학교'],
    activity: ['운동', '공부', '일', '놀', '게임', '영화', '책', '음악', '춤', '그림', '사진']
  };
  
  for (const [kind, words] of Object.entries(keywords)) {
    if (words.some(word => contentLower.includes(word))) {
      subjects.push({
        kind: kind as Subject['kind'],
        confidence: 0.6 + Math.random() * 0.3
      });
    }
  }
  
  if (subjects.length === 0) {
    subjects.push({ kind: 'object', confidence: 0.5 });
  }
  
  return subjects;
}

function inferContexts(content: string, subjects: Subject[], tones: string[]): string[] {
  const contexts: string[] = [];
  const contentLower = content.toLowerCase();
  
  const contextKeywords = {
    travel: ['여행', '휴가', '바다', '산', '관광', '비행기', '호텔'],
    emotion: ['기쁨', '슬픔', '행복', '우울', '외로', '그리', '사랑', '미움', '화', '감동'],
    cuisine: ['음식', '요리', '맛집', '레시피', '먹방', '식당', '카페'],
    tech: ['기술', '코딩', 'ai', '앱', '프로그램', '개발', '컴퓨터', '스마트폰'],
    art: ['예술', '그림', '사진', '전시', '작품', '디자인', '미술'],
    philosophy: ['생각', '의미', '삶', '인생', '진리', '본질', '존재'],
    humor: ['웃', '재미', '농담', 'ㅋㅋ', 'ㅎㅎ', '개그'],
    social: ['친구', '모임', '파티', '만남', '대화', '관계'],
    analysis: ['분석', '통계', '데이터', '패턴', '경향', '결과'],
    creativity: ['창의', '아이디어', '상상', '영감', '독창'],
    trend: ['유행', '트렌드', '핫', '인기', '최신', '요즘'],
    mystery: ['미스터리', '수수께끼', '비밀', '신비', '궁금']
  };
  
  for (const [context, keywords] of Object.entries(contextKeywords)) {
    if (keywords.some(word => contentLower.includes(word))) {
      contexts.push(context);
    }
  }
  
  if (tones.includes('humorous')) contexts.push('humor');
  if (tones.includes('empathetic')) contexts.push('emotion');
  if (tones.includes('analytical')) contexts.push('analysis');
  
  if (subjects.some(s => s.kind === 'food')) contexts.push('cuisine');
  if (subjects.some(s => s.kind === 'place')) contexts.push('travel');
  
  return [...new Set(contexts)];
}

export async function analyzeSentiment(req: Request, res: Response) {
  try {
    const { content, media } = req.body;
    
    let positive = Math.random();
    let negative = Math.random();
    let neutral = Math.random();
    
    const total = positive + negative + neutral;
    positive = positive / total;
    negative = negative / total;
    neutral = neutral / total;
    
    const sentiment = {
      positive: Math.max(0, Math.min(1, positive)),
      neutral: Math.max(0, Math.min(1, neutral)),
      negative: Math.max(0, Math.min(1, negative)),
    };
    
    const tones: string[] = [];
    if (positive > 0.5) tones.push('joyful');
    if (positive > 0.7) tones.push('optimistic');
    if (negative > 0.4) tones.push('serious');
    if (neutral > 0.5) tones.push('neutral');
    
    const randomTones = ['humorous', 'informative', 'serene', 'nostalgic', 'analytical', 'empathetic'];
    const selectedTone = randomTones[Math.floor(Math.random() * randomTones.length)];
    if (!tones.includes(selectedTone)) {
      tones.push(selectedTone);
    }
    
    const subjects = detectSubjects(content, media);
    const contexts = inferContexts(content, subjects, tones);
    
    const imageScores = media ? {
      aesthetics: Math.max(0, Math.min(1, Math.random() * 0.5 + 0.5)),
      quality: Math.max(0, Math.min(1, Math.random() * 0.5 + 0.5)),
    } : undefined;
    
    const deltas = computePersonaDeltas({
      sentiment,
      tones,
      imageScores,
    });
    
    const deltaLog = Object.entries(deltas)
      .filter(([_, value]) => value && value > 0)
      .map(([key, value]) => `${key.charAt(0).toUpperCase() + key.slice(1)} +${value}`)
      .join(' · ');
    
    if (deltaLog) {
      console.log(`[PERSONA GROWTH] ${deltaLog}`);
    }
    
    console.log(`[ANALYZE] Detected ${subjects.length} subjects, ${contexts.length} contexts: ${contexts.join(', ')}`);
    
    res.json({
      sentiment,
      tones,
      subjects,
      contexts,
      imageScores,
      deltas,
      deltaLog: deltaLog || 'No growth'
    });
  } catch (error) {
    console.error('Analyze sentiment error:', error);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
}

export async function analyzePersonaEffect(req: Request, res: Response) {
  try {
    const { postId, sentiment } = req.body;
    
    res.json({
      personaDeltas: {},
      message: 'Persona effect analysis endpoint - to be implemented'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze persona effect' });
  }
}
