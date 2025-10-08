import { PersonaState, TopicWeight } from './persoRoom.js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// TOPIC_WEIGHTS 제거됨 - 향후 DB에 페르소나 관심사 필드 추가 시 동적으로 계산

interface ConversationMessage {
  id?: string;
  persona?: string;
  message: string;
  thinking?: string;
  timestamp?: number;
}

export function selectNextSpeaker(
  currentTopics: TopicWeight[],
  lastMessage: string,
  lastSpeaker: string,
  activePersonas: PersonaState[],
  conversationHistory: ConversationMessage[],
  dominantPersona: string | null,
  turnsSinceDominantChange: number
): string {
  console.log(`[SELECT SPEAKER] Starting speaker selection`);
  console.log(`[SELECT SPEAKER] Active personas: ${activePersonas.length}`);
  console.log(`[SELECT SPEAKER] Last speaker: ${lastSpeaker}`);
  console.log(`[SELECT SPEAKER] Last message: "${lastMessage}"`);
  console.log(`[SELECT SPEAKER] Conversation history length: ${conversationHistory.length}`);

  const eligiblePersonas = activePersonas.filter(p => p.status === 'active');
  console.log(`[SELECT SPEAKER] Eligible personas: ${eligiblePersonas.length}`);

  if (eligiblePersonas.length === 0) {
    console.log(`[SELECT SPEAKER] No eligible personas, returning last speaker: ${lastSpeaker}`);
    return lastSpeaker;
  }
  if (eligiblePersonas.length === 1) {
    console.log(`[SELECT SPEAKER] Only one eligible persona: ${eligiblePersonas[0].id}`);
    return eligiblePersonas[0].id;
  }
  
  const scores: Map<string, number> = new Map();
  
  for (const persona of activePersonas) {
    if (persona.status !== 'active') continue;
    
    let score = 0;
    
    for (const {topic, weight} of currentTopics) {
      // 향후 DB에 페르소나 관심사 필드 추가 시 여기서 계산
      const affinity = Math.random(); // 임시 랜덤 점수
      score += affinity * weight * 0.4;
    }
    
    const lastTurnIndex = findLastTurnIndex(persona.id, conversationHistory);
    const recency = lastTurnIndex === -1 ? 1.0 : 
      Math.min(1.0, (conversationHistory.length - lastTurnIndex) / 10);
    score += recency * 0.2;
    
    if (persona.id === dominantPersona && turnsSinceDominantChange < 5) {
      score += 0.2;
    }
    
    const personaTurns = conversationHistory.filter(m => m.persona === persona.id).length;
    const totalTurns = conversationHistory.length;
    
    if (totalTurns === 0) {
      score += 0.1;
    } else {
      const avgParticipation = totalTurns / activePersonas.length;
      let fairness;
      
      if (personaTurns < avgParticipation) {
        const underrepBonus = (avgParticipation - personaTurns) / (avgParticipation + 1);
        fairness = 1.0 + underrepBonus * 0.15;
      } else {
        fairness = Math.max(0, 1.0 - (personaTurns - avgParticipation) / avgParticipation);
      }
      
      score += fairness * 0.1;
    }
    
    const interest = calculateInterestMatch(persona, lastMessage);
    score += interest * 0.1;
    
    if (persona.id === lastSpeaker) {
      score -= 0.15;
    }
    
    scores.set(persona.id, Math.max(0, Math.min(1, score)));
  }
  
  const scoreArray = Array.from(scores.entries());
  const totalScore = scoreArray.reduce((sum, [_, score]) => sum + score, 0);
  
  if (totalScore === 0) {
    const fallback = scoreArray[Math.floor(Math.random() * scoreArray.length)][0];
    console.log(`[REASONING] Zero total score, random fallback selected: ${fallback}`);
    return fallback;
  }
  
  const normalizedScores = new Map(
    scoreArray.map(([id, score]) => [id, score / totalScore])
  );
  
  const selected = weightedRandomSelection(normalizedScores, 0.7);
  const topScores = scoreArray
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, score]) => `${id}(${(score/totalScore).toFixed(2)})`)
    .join(', ');
  console.log(`[REASONING] Selected ${selected} from scores: ${topScores}`);
  return selected;
}

function findLastTurnIndex(personaId: string, history: ConversationMessage[]): number {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].persona === personaId) {
      return i;
    }
  }
  return -1;
}

const PERSONA_INTEREST_KEYWORDS: Record<string, string[]> = {
  'Kai': ['지식', '학습', '탐구', '분석', '이해', '연구', '발견', '여행', '모험', '세계', 'knowledge', 'learn', 'explore', 'analyze', 'understand', 'research', 'discover', 'travel', 'adventure', 'world'],
  'Espri': ['감정', '공감', '위로', '마음', '느낌', '이해', '따뜻', '사랑', '행복', '슬픔', 'emotion', 'empathy', 'comfort', 'feeling', 'heart', 'warm', 'love', 'happy', 'sad'],
  'Luna': ['상상', '창의', '예술', '아름다움', '감성', '영감', '꿈', '시', '음악', '그림', 'imagination', 'creative', 'art', 'beauty', 'inspiration', 'dream', 'poetry', 'music', 'painting'],
  'Namu': ['논리', '분석', '체계', '구조', '원리', '과학', '데이터', '패턴', '추론', '검증', 'logic', 'analysis', 'system', 'structure', 'principle', 'science', 'data', 'pattern', 'reasoning'],
  'Milo': ['재미', '유머', '웃음', '농담', '즐거움', '놀이', '음식', '맛집', '요리', '먹방', 'fun', 'humor', 'laugh', 'joke', 'enjoy', 'play', 'food', 'restaurant', 'cooking', 'delicious'],
  'Eden': ['철학', '본질', '의미', '진리', '사색', '깨달음', '존재', '우주', '인생', '질문', 'philosophy', 'essence', 'meaning', 'truth', 'contemplation', 'enlightenment', 'existence', 'universe', 'life', 'question'],
  'Ava': ['트렌드', '유행', '소셜', '인기', '스타일', '패션', '미디어', '브랜드', '문화', '최신', 'trend', 'viral', 'social', 'popular', 'style', 'fashion', 'media', 'brand', 'culture', 'latest'],
  'Rho': ['기술', '코딩', '프로그래밍', '시스템', '알고리즘', '개발', '엔지니어', '컴퓨터', '소프트웨어', '최적화', 'technology', 'coding', 'programming', 'system', 'algorithm', 'development', 'engineer', 'computer', 'software', 'optimization'],
  'Noir': ['미스터리', '비밀', '수수께끼', '진실', '숨겨진', '어둠', '심리', '추리', '탐정', '비밀스러운', 'mystery', 'secret', 'riddle', 'truth', 'hidden', 'dark', 'psychology', 'detective', 'enigma', 'cryptic']
};

function calculateInterestMatch(persona: PersonaState, lastMessage: string): number {
  const keywords = PERSONA_INTEREST_KEYWORDS[persona.id] || [];
  const messageLower = lastMessage.toLowerCase();
  
  let matchCount = 0;
  for (const keyword of keywords) {
    if (messageLower.includes(keyword.toLowerCase())) {
      matchCount++;
    }
  }
  
  const keywordScore = Math.min(1.0, matchCount * 0.15);
  
  const hasQuestion = lastMessage.includes('?') || lastMessage.includes('？');
  const questionBonus = hasQuestion ? 0.3 : 0;
  
  const isLongMessage = lastMessage.length > 100;
  const lengthBonus = isLongMessage ? 0.2 : 0;
  
  const hasEmotionalMarkers = /[!！❤️😊😢💕🎉✨]/.test(lastMessage);
  const emotionalBonus = hasEmotionalMarkers && ['Espri', 'Luna', 'Milo'].includes(persona.id) ? 0.15 : 0;
  
  const totalInterest = keywordScore + questionBonus + lengthBonus + emotionalBonus;
  
  return Math.min(1.0, Math.max(0, totalInterest));
}

function weightedRandomSelection(scores: Map<string, number>, temperature: number): string {
  const entries = Array.from(scores.entries());
  
  const exponentialScores = entries.map(([id, score]) => ({
    id,
    adjustedScore: Math.pow(score, 1 / temperature)
  }));
  
  const total = exponentialScores.reduce((sum, item) => sum + item.adjustedScore, 0);
  const normalizedScores = exponentialScores.map(item => ({
    id: item.id,
    probability: item.adjustedScore / total
  }));
  
  const random = Math.random();
  let cumulative = 0;
  
  for (const { id, probability } of normalizedScores) {
    cumulative += probability;
    if (random <= cumulative) {
      return id;
    }
  }
  
  return normalizedScores[normalizedScores.length - 1].id;
}

// PersonaProfile 인터페이스 제거됨 - DB 페르소나 스키마 사용

export async function generateThinking(
  persona: any, // DB 페르소나 객체
  currentTopics: TopicWeight[],
  lastMessage: string,
  conversationContext: string
): Promise<string> {
  const topicList = currentTopics.map(t => t.topic).join(', ');
  
  const prompt = `You are ${persona.name}, a ${persona.type} persona with the following characteristics:
- Role: ${persona.role}
- Tone: ${persona.tone}
- Style: ${persona.style}

Current conversation topics: ${topicList}
Last message: "${lastMessage}"

Generate a brief internal thought (1 sentence) about what you're thinking before responding. This should reflect your personality and perspective on the conversation.

Think about:
- How this topic relates to your expertise
- What you want to contribute
- Your reaction to the last message

Output only the internal thought, nothing else.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "What are you thinking?" }
      ],
      temperature: 0.7,
      max_tokens: 50,
    });

    const thinking = completion.choices[0]?.message?.content?.trim() || "...";
    console.log(`[${persona.name} THINKS]: ${thinking}`);
    console.log(`[THINKING DEBUG] Generated thinking for ${persona.name}:`, {
      thinking,
      length: thinking.length,
      isEmpty: thinking === "..."
    });
    return thinking;
  } catch (error) {
    console.error(`[THINKING] Error generating thought for ${persona.name}:`, error);
    return "...";
  }
}
