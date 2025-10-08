import { Request, Response } from 'express';
import { computePersonaDeltas } from '../engine/computePersonaDeltas.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface Subject {
  kind: 'person' | 'food' | 'place' | 'object' | 'activity';
  confidence: number;
}

interface ImageAnalysis {
  description: string;
  objects: string[];
  subjects: Subject[];
  context: string;
}

// OpenAI Vision API를 사용하여 이미지 분석
async function analyzeImageWithVision(imageUrl: string): Promise<ImageAnalysis | null> {
  try {
    console.log(`[IMAGE ANALYSIS] Analyzing image: ${imageUrl}`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "이 이미지를 분석하고 다음 정보를 JSON 형식으로 제공해주세요:\n1. description: 이미지에 대한 간단한 설명 (한국어, 1-2문장)\n2. objects: 이미지에서 보이는 주요 객체들의 배열 (한국어)\n3. context: 이미지의 전체적인 맥락이나 분위기 (한국어, 1문장)\n\n예시: {\"description\": \"맛있어 보이는 파스타 요리\", \"objects\": [\"파스타\", \"접시\", \"포크\"], \"context\": \"레스토랑에서 식사하는 분위기\"}"
            },
            {
              type: "image_url",
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.log('[IMAGE ANALYSIS] No content returned from OpenAI');
      return null;
    }

    // JSON 파싱
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log('[IMAGE ANALYSIS] Could not extract JSON from response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('[IMAGE ANALYSIS] Success:', parsed);

    // 객체 기반으로 subjects 추론
    const subjects: Subject[] = [];
    const objectsLower = parsed.objects.map((o: string) => o.toLowerCase()).join(' ');
    
    if (objectsLower.includes('음식') || objectsLower.includes('요리') || objectsLower.includes('커피') || objectsLower.includes('빵')) {
      subjects.push({ kind: 'food', confidence: 0.9 });
    }
    if (objectsLower.includes('사람') || objectsLower.includes('얼굴')) {
      subjects.push({ kind: 'person', confidence: 0.9 });
    }
    if (objectsLower.includes('건물') || objectsLower.includes('공원') || objectsLower.includes('바다') || objectsLower.includes('산')) {
      subjects.push({ kind: 'place', confidence: 0.9 });
    }
    if (subjects.length === 0) {
      subjects.push({ kind: 'object', confidence: 0.8 });
    }

    return {
      description: parsed.description,
      objects: parsed.objects,
      context: parsed.context,
      subjects
    };
  } catch (error) {
    console.error('[IMAGE ANALYSIS] Error:', error);
    return null;
  }
}

export async function detectSubjects(content: string, media?: string): Promise<{ subjects: Subject[]; imageAnalysis?: ImageAnalysis }> {
  const subjects: Subject[] = [];
  const contentLower = content.toLowerCase();
  
  let imageAnalysis: ImageAnalysis | undefined;
  
  // 이미지가 있으면 Vision API로 분석
  if (media) {
    const analysis = await analyzeImageWithVision(media);
    if (analysis) {
      imageAnalysis = analysis;
      subjects.push(...analysis.subjects);
    } else {
      // Vision API 실패 시 기본값
      subjects.push({ kind: 'object', confidence: 0.8 });
    }
  }
  
  // 텍스트 기반 키워드 분석
  const keywords = {
    person: ['친구', '가족', '사람', '우리', '저', '나', '엄마', '아빠', '동생', '언니', '오빠', '형', 'friend', 'family', 'people', 'person', 'mom', 'dad'],
    food: ['음식', '먹', '맛', '요리', '밥', '빵', '커피', '차', '맥주', '술', '디저트', '케이크', 'food', 'eat', 'taste', 'delicious', 'meal', 'restaurant', 'coffee', 'bread', 'cake'],
    place: ['여행', '장소', '곳', '카페', '식당', '공원', '바다', '산', '집', '회사', '학교', 'travel', 'place', 'cafe', 'park', 'beach', 'mountain', 'home', 'office', 'school'],
    activity: ['운동', '공부', '일', '놀', '게임', '영화', '책', '음악', '춤', '그림', '사진', 'exercise', 'study', 'work', 'play', 'game', 'movie', 'book', 'music', 'dance', 'art', 'photo']
  };
  
  for (const [kind, words] of Object.entries(keywords)) {
    const matchCount = words.filter(word => contentLower.includes(word)).length;
    if (matchCount > 0) {
      const confidence = Math.min(0.95, 0.6 + (matchCount * 0.1));
      // 이미지 분석에서 이미 추가된 경우 중복 방지
      const existingKind = subjects.find(s => s.kind === kind);
      if (!existingKind) {
        subjects.push({
          kind: kind as Subject['kind'],
          confidence
        });
      }
    }
  }
  
  if (subjects.length === 0) {
    subjects.push({ kind: 'object', confidence: 0.5 });
  }
  
  return { subjects, imageAnalysis };
}

export function inferContexts(content: string, subjects: Subject[], tones: string[]): string[] {
  const contexts: string[] = [];
  const contentLower = content.toLowerCase();
  
  const contextKeywords = {
    travel: ['여행', '휴가', '바다', '산', '관광', '비행기', '호텔', 'travel', 'vacation', 'trip', 'beach', 'mountain', 'tourism', 'flight', 'hotel'],
    emotion: ['기쁨', '슬픔', '행복', '우울', '외로', '그리', '사랑', '미움', '화', '감동', 'joy', 'sad', 'happy', 'love', 'emotion', 'feel', 'heart'],
    cuisine: ['음식', '요리', '맛집', '레시피', '먹방', '식당', '카페', 'food', 'cooking', 'recipe', 'restaurant', 'cafe', 'delicious', 'meal'],
    tech: ['기술', '코딩', 'ai', '앱', '프로그램', '개발', '컴퓨터', '스마트폰', 'technology', 'coding', 'app', 'program', 'develop', 'computer', 'software', 'code'],
    art: ['예술', '그림', '사진', '전시', '작품', '디자인', '미술', 'art', 'painting', 'photo', 'exhibition', 'design', 'artwork'],
    philosophy: ['생각', '의미', '삶', '인생', '진리', '본질', '존재', 'think', 'meaning', 'life', 'truth', 'existence', 'philosophy'],
    humor: ['웃', '재미', '농담', 'ㅋㅋ', 'ㅎㅎ', '개그', 'lol', 'funny', 'joke', 'laugh', 'haha'],
    social: ['친구', '모임', '파티', '만남', '대화', '관계', 'friend', 'meeting', 'party', 'social', 'relationship', 'together'],
    analysis: ['분석', '통계', '데이터', '패턴', '경향', '결과', 'analysis', 'data', 'statistics', 'pattern', 'trend', 'result'],
    creativity: ['창의', '아이디어', '상상', '영감', '독창', 'creative', 'idea', 'imagination', 'inspiration', 'original'],
    trend: ['유행', '트렌드', '핫', '인기', '최신', '요즘', 'trend', 'trending', 'popular', 'hot', 'latest'],
    mystery: ['미스터리', '수수께끼', '비밀', '신비', '궁금', 'mystery', 'secret', 'curious', 'wonder']
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
  
  return Array.from(new Set(contexts));
}

export function analyzeSentimentFromContent(content: string): { positive: number; neutral: number; negative: number } {
  const contentLower = content.toLowerCase();
  
  const positiveKeywords = ['좋', '행복', '기쁨', '즐거', '사랑', '완벽', '최고', '대박', '감사', '훌륭', '멋', '예쁘', '아름다', '재미', '웃', 'ㅋㅋ', 'ㅎㅎ', '😊', '😄', '🎉', '❤️', 'good', 'happy', 'great', 'love', 'perfect', 'amazing', 'wonderful', 'excellent', 'beautiful', 'fun'];
  const negativeKeywords = ['슬프', '우울', '힘들', '나쁘', '싫', '화', '미움', '실망', '걱정', '불안', '어려', '아프', '😢', '😭', '😞', 'sad', 'bad', 'hate', 'angry', 'disappointed', 'worried', 'difficult', 'pain'];
  const neutralKeywords = ['생각', '보통', '그냥', '일반', '평범', '괜찮', 'think', 'normal', 'okay', 'just'];
  
  let positiveScore = positiveKeywords.filter(word => contentLower.includes(word)).length;
  let negativeScore = negativeKeywords.filter(word => contentLower.includes(word)).length;
  let neutralScore = neutralKeywords.filter(word => contentLower.includes(word)).length;
  
  if (content.includes('!') || content.includes('!!')) positiveScore += 1;
  if (content.includes('?')) neutralScore += 0.5;
  if (content.includes('...')) neutralScore += 0.5;
  
  const total = positiveScore + negativeScore + neutralScore;
  
  if (total === 0) {
    return { positive: 0.4, neutral: 0.5, negative: 0.1 };
  }
  
  return {
    positive: Math.max(0, Math.min(1, positiveScore / total)),
    neutral: Math.max(0, Math.min(1, neutralScore / total)),
    negative: Math.max(0, Math.min(1, negativeScore / total))
  };
}

export function inferTonesFromContent(content: string, sentiment: { positive: number; neutral: number; negative: number }): string[] {
  const tones: string[] = [];
  const contentLower = content.toLowerCase();
  
  if (sentiment.positive > 0.5) tones.push('joyful');
  if (sentiment.positive > 0.7) tones.push('optimistic');
  if (sentiment.negative > 0.4) tones.push('serious');
  if (sentiment.neutral > 0.5) tones.push('neutral');
  
  if (contentLower.includes('ㅋㅋ') || contentLower.includes('ㅎㅎ') || contentLower.includes('lol') || contentLower.includes('haha')) {
    tones.push('humorous');
  }
  
  if (contentLower.includes('생각') || contentLower.includes('분석') || contentLower.includes('데이터') || contentLower.includes('think') || contentLower.includes('analysis')) {
    tones.push('analytical');
  }
  
  if (contentLower.includes('공감') || contentLower.includes('이해') || contentLower.includes('마음') || contentLower.includes('feel') || contentLower.includes('heart')) {
    tones.push('empathetic');
  }
  
  if (contentLower.includes('옛날') || contentLower.includes('추억') || contentLower.includes('그때') || contentLower.includes('memory') || contentLower.includes('past')) {
    tones.push('nostalgic');
  }
  
  if (contentLower.includes('정보') || contentLower.includes('설명') || contentLower.includes('알려') || contentLower.includes('information') || contentLower.includes('explain')) {
    tones.push('informative');
  }
  
  if (contentLower.includes('평화') || contentLower.includes('조용') || contentLower.includes('고요') || contentLower.includes('calm') || contentLower.includes('peace')) {
    tones.push('serene');
  }
  
  if (tones.length === 0) {
    tones.push('neutral');
  }
  
  return tones;
}

export async function analyzeSentiment(req: Request, res: Response) {
  try {
    const { content, media, imageUrl } = req.body;
    const actualMediaUrl = imageUrl || media;
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: '콘텐츠가 필요합니다' });
    }
    
    const sentiment = analyzeSentimentFromContent(content);
    const tones = inferTonesFromContent(content, sentiment);
    
    const { subjects, imageAnalysis } = await detectSubjects(content, actualMediaUrl);
    const contexts = inferContexts(content, subjects, tones);
    
    const imageScores = actualMediaUrl ? {
      aesthetics: 0.7,
      quality: 0.75,
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
    if (imageAnalysis) {
      console.log(`[IMAGE ANALYSIS] Description: ${imageAnalysis.description}`);
      console.log(`[IMAGE ANALYSIS] Objects: ${imageAnalysis.objects.join(', ')}`);
    }
    
    res.json({
      sentiment,
      tones,
      subjects,
      contexts,
      imageScores,
      deltas,
      deltaLog: deltaLog || 'No growth',
      imageAnalysis
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
