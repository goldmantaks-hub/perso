import OpenAI from 'openai';
import { db } from '../db.js';
import { personas } from '@shared/schema';
import { eq } from 'drizzle-orm';

type GenArgs = {
  personaId: string;
  context: { subjects: string[]; contexts: string[]; tones: string[]; sentiment: { positive: number; neutral: number; negative: number } };
  roomMessages: { personaId?: string; text: string }[];
  intent: string;
  targetPersonaId?: string;
  postContent: string;
};

export async function generatePersonaLine(args: GenArgs): Promise<{ message: string; thinking: string }> {
  const persona = await loadPersona(args.personaId);
  const recent = args.roomMessages.slice(-6).map(m => `${m.personaId ?? 'User'}: ${m.text}`).join('\n');

  // 실제 키 확인
  const hasKey = !!process.env.OPENAI_API_KEY;

  if (!hasKey) {
    // 스텁: 의도/주제 반영한 짧은 한줄 생성
    const tag = args.context.subjects[0] ?? 'topic';
    const tone = args.context.tones?.[0] ?? 'neutral';
    return {
      message: `[stub:${persona.name}/${args.intent}] ${tag}에 대해 ${tone} 톤으로 한마디.`,
      thinking: `[stub thinking] ${persona.name}이 ${tag}에 대해 ${tone} 톤으로 생각 중...`
    };
  }

  return await realLLM(persona, recent, args);
}

async function loadPersona(personaId: string) {
  const [persona] = await db.select().from(personas).where(eq(personas.id, personaId)).limit(1);
  
  if (!persona) {
    // 기본 페르소나 반환
    return { 
      id: personaId, 
      name: personaId, 
      traits: ['curious'], 
      speechStyle: 'concise', 
      maxChars: 180 
    };
  }

  return {
    id: persona.id,
    name: persona.name,
    traits: ['curious'],
    speechStyle: persona.tone || persona.style || 'concise',
    maxChars: 180
  };
}

async function realLLM(persona: any, recent: string, args: GenArgs): Promise<{ message: string; thinking: string }> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const intentDescriptions = {
    agree: '동의하고 지지하는',
    disagree: '다른 관점을 제시하는',
    ask: '질문하고 탐구하는',
    share: '경험이나 지식을 나누는',
    joke: '유머러스하게 반응하는',
    meta: '대화 자체에 대해 언급하는'
  };

  const sentimentScore = args.context.sentiment.positive - args.context.sentiment.negative;
  const sentimentText = sentimentScore > 0.3 ? '긍정적' : sentimentScore < -0.3 ? '부정적' : '중립적';

  const systemPrompt = `당신은 ${persona.name}입니다.
성향: ${persona.traits?.join(', ') || 'curious'}
말투: ${persona.speechStyle || 'concise'}

현재 대화 주제: ${args.context.subjects.join(', ')}
대화 맥락: ${args.context.contexts.join(', ')}
대화 톤: ${args.context.tones.join(', ')}
분위기: ${sentimentText}

당신의 의도: ${intentDescriptions[args.intent as keyof typeof intentDescriptions] || args.intent}
${args.targetPersonaId ? `응답 대상: ${args.targetPersonaId}` : ''}

**중요**: 
- 한국어로 간결하게 1-2문장만 응답하세요
- 최대 100자 이내로 작성하세요
- 자연스럽고 대화체로 작성하세요
- 페르소나의 성격을 반영하세요`;

  const userPrompt = `게시물 원본:
"${args.postContent}"

최근 대화:
${recent}

**중요**: 게시물 원본 주제에 맞춰 대화하세요. 최근 대화만 보고 전혀 다른 주제로 빠지지 마세요.

위 맥락을 고려하여, ${persona.name}의 관점에서 ${intentDescriptions[args.intent as keyof typeof intentDescriptions] || args.intent} 응답을 작성하세요.`;

  try {
    // 메시지 생성
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 100,
    });

    const response = completion.choices[0]?.message?.content?.trim() || '';
    
    // 최대 길이 제한
    const finalMessage = response.length > 180 ? response.substring(0, 177) + '...' : response;
    
    // thinking 생성
    const thinking = await generateThinking(persona, args.context, recent, args.postContent);
    
    return {
      message: finalMessage,
      thinking: thinking
    };
  } catch (error) {
    console.error('[LLM] Error generating response:', error);
    // 에러 시 스텁 반환
    const tag = args.context.subjects[0] ?? 'topic';
    const tone = args.context.tones?.[0] ?? 'neutral';
    return {
      message: `[error fallback:${persona.name}] ${tag}에 대해 ${tone} 톤으로 한마디.`,
      thinking: `[error fallback thinking] ${persona.name}이 ${tag}에 대해 ${tone} 톤으로 생각 중...`
    };
  }
}

// thinking 생성 함수 추가
async function generateThinking(persona: any, context: any, recent: string, postContent: string): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const thinkingPrompt = `당신은 "${persona.name}"입니다. 다음 대화에 응답하기 전에 내부적으로 무엇을 생각하고 있는지 1문장으로 표현하세요.

게시물 원본: "${postContent}"
최근 대화: ${recent}
주제: ${context.subjects.join(', ')}
분위기: ${context.sentiment.positive > 0.3 ? '긍정적' : context.sentiment.negative > 0.3 ? '부정적' : '중립적'}

게시물 주제와 최근 대화를 고려하여 1문장으로 간결하게 내부 생각을 표현하세요.`;

  try {
    const thinkingCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `당신은 ${persona.name}입니다. ${persona.description || ''}` },
        { role: "user", content: thinkingPrompt }
      ],
      temperature: 0.7,
      max_tokens: 50,
    });

    return thinkingCompletion.choices[0]?.message?.content?.trim() || "";
  } catch (error) {
    console.error('[LLM] Error generating thinking:', error);
    return "";
  }
}
