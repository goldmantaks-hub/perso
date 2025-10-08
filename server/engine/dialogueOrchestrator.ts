import OpenAI from "openai";
import { getExpandedInfoForPersona, ExpandedInfo } from './infoExpansion.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface PersonaCharacteristics {
  type: string;
  role: string;
  tone: string;
  style: string;
}

const personaProfiles: Record<string, PersonaCharacteristics> = {
  'Kai': {
    type: 'knowledge',
    role: '지식형 - 정보와 전문성 제공',
    tone: '차분하고 논리적인',
    style: '근거있는 정보를 제공하며, 배경지식을 쉽게 설명합니다'
  },
  'Espri': {
    type: 'empath',
    role: '감성형 - 감정적 이해와 공감',
    tone: '따뜻하고 공감적인',
    style: '감정에 집중하며, 위로와 격려를 전합니다'
  },
  'Luna': {
    type: 'creative',
    role: '창의형 - 예술적이고 상상력 풍부',
    tone: '창의적이고 감각적인',
    style: '비유와 은유를 사용하며, 새로운 관점을 제시합니다'
  },
  'Namu': {
    type: 'analyst',
    role: '분석형 - 데이터와 논리 중심',
    tone: '분석적이고 객관적인',
    style: '패턴을 찾고, 구조적으로 분석합니다'
  },
  'Milo': {
    type: 'humor',
    role: '유머형 - 위트있고 유쾌함',
    tone: '재치있고 밝은',
    style: '가볍게 농담을 섞으며, 즐거운 분위기를 만듭니다'
  },
  'Eden': {
    type: 'philosopher',
    role: '철학형 - 깊은 사색과 통찰',
    tone: '사색적이고 통찰력있는',
    style: '근본적인 질문을 던지고, 의미를 탐구합니다'
  },
  'Ava': {
    type: 'trend',
    role: '트렌드형 - 최신 트렌드와 문화',
    tone: '트렌디하고 활발한',
    style: '최신 유행과 문화를 언급하며, 생동감있게 말합니다'
  },
  'Rho': {
    type: 'tech',
    role: '테크형 - 기술과 혁신',
    tone: '기술적이고 미래지향적인',
    style: '기술적 측면을 설명하고, 혁신적 아이디어를 제시합니다'
  },
  'Noir': {
    type: 'mystery',
    role: '미스터리형 - 수수께끼 같은',
    tone: '신비롭고 흥미로운',
    style: '은유적이고 암시적으로 말하며, 호기심을 자극합니다'
  }
};

interface Post {
  id?: string;
  content: string;
  userId?: string;
  title?: string;
  image?: string;
}

interface Analysis {
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  tones?: string[];
  deltas?: any;
}

interface DialogueContext {
  previousMessages?: Array<{
    persona: string;
    message: string;
  }>;
}

export async function personaTalk(
  personaName: string,
  post: Post,
  analysis: Analysis,
  context: DialogueContext = {}
): Promise<string> {
  const profile = personaProfiles[personaName];
  
  if (!profile) {
    throw new Error(`Unknown persona: ${personaName}`);
  }

  const previousConversation = context.previousMessages
    ? context.previousMessages
        .map(m => `${m.persona}: ${m.message}`)
        .join('\n')
    : '';

  // 확장 정보 가져오기
  const topics = (analysis as any).subjects || [];
  const lastMessage = context.previousMessages?.[context.previousMessages.length - 1]?.message || '';
  const expandedInfo = await getExpandedInfoForPersona(
    profile.type,
    topics,
    lastMessage,
    post.userId
  );

  // 확장 정보를 시스템 프롬프트에 통합
  let expandedInfoText = '';
  if (expandedInfo) {
    switch (expandedInfo.type) {
      case 'knowledge':
        expandedInfoText = `[전문 지식 정보]\n${expandedInfo.data.facts.join('\n')}\n출처: ${expandedInfo.data.sources.join(', ')}\n`;
        break;
      case 'analyst':
        expandedInfoText = `[분석 데이터]\n${expandedInfo.data.patterns.join('\n')}\n통계: 게시물 ${expandedInfo.data.stats.totalPosts}개, 평균 참여도 ${expandedInfo.data.stats.avgEngagement}\n`;
        break;
      case 'empath':
        expandedInfoText = `[감정 분석]\n주요 감정: ${expandedInfo.data.dominantEmotion} (강도: ${expandedInfo.data.intensity.toFixed(2)})\n감지된 감정들: ${expandedInfo.data.emotions.map((e: any) => `${e.type}(${e.intensity.toFixed(1)})`).join(', ')}\n`;
        break;
      case 'creative':
        expandedInfoText = `[창의적 영감]\n비유: ${expandedInfo.data.metaphors.join(', ')}\n은유: ${expandedInfo.data.analogies.join(', ')}\n`;
        break;
      case 'humor':
        expandedInfoText = `[유머 소재]\n재미있는 이야기: ${expandedInfo.data.jokes.join(', ')}\n참고사항: ${expandedInfo.data.references.join(', ')}\n`;
        break;
    }
  }

  const systemPrompt = `당신은 ${personaName}입니다.

[당신의 특성]
- 역할: ${profile.role}
- 말투: ${profile.tone}
- 스타일: ${profile.style}

[게시물 내용]
"${post.content}"

[감성 분석 결과]
- 긍정: ${(analysis.sentiment.positive * 100).toFixed(0)}%
- 중립: ${(analysis.sentiment.neutral * 100).toFixed(0)}%
- 부정: ${(analysis.sentiment.negative * 100).toFixed(0)}%
${analysis.tones ? `- 감지된 톤: ${analysis.tones.join(', ')}` : ''}

${expandedInfoText}

${previousConversation ? `[이전 대화]\n${previousConversation}\n` : ''}

[지침]
1. 당신의 역할과 성격에 맞게 자연스럽게 반응하세요
2. 게시물의 감성과 내용을 고려하여 대화하세요
3. ${expandedInfoText ? '위의 확장 정보를 활용하여 더 풍부한 답변을 제공하세요' : ''}
4. 이전 대화가 있다면 맥락을 이어가되, 반복하지 마세요
5. 1-2문장으로 간결하게 답하세요
6. 자연스러운 한국어로 대화하세요
7. 페르소나의 이름을 언급하지 마세요`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "게시물에 반응해주세요." }
      ],
      temperature: 0.8,
      max_tokens: 150,
    });

    return completion.choices[0]?.message?.content?.trim() || "...";
  } catch (error) {
    console.error(`[Dialogue] Error generating response for ${personaName}:`, error);
    return `[${personaName}의 응답을 생성할 수 없습니다]`;
  }
}

export async function dialogueOrchestrator(
  post: Post,
  analysis: Analysis,
  requestedPersonas?: string[]
): Promise<Array<{ persona: string; message: string; type: string }>> {
  const availablePersonas = ['Espri', 'Kai', 'Milo', 'Luna', 'Namu', 'Eden', 'Ava', 'Rho', 'Noir'];
  
  let selectedPersonas: string[];
  
  if (requestedPersonas && requestedPersonas.length > 0) {
    selectedPersonas = requestedPersonas;
  } else {
    const personaCount = Math.floor(Math.random() * 3) + 2;
    selectedPersonas = availablePersonas
      .sort(() => Math.random() - 0.5)
      .slice(0, personaCount);
  }

  const dialogues: Array<{ persona: string; message: string; type: string }> = [];
  const context: DialogueContext = { previousMessages: [] };

  console.log(`[REASONING] Selected ${selectedPersonas.length} personas based on ${requestedPersonas ? 'request' : 'random selection'}: ${selectedPersonas.join(', ')}`);

  for (const personaName of selectedPersonas) {
    const profile = personaProfiles[personaName];
    if (!profile) continue;

    const message = await personaTalk(personaName, post, analysis, context);
    
    dialogues.push({
      persona: personaName,
      message,
      type: profile.type
    });

    context.previousMessages = context.previousMessages || [];
    context.previousMessages.push({ persona: personaName, message });

    console.log(`[CHAT] ${personaName}: "${message}"`);
    console.log(`[DIALOGUE] ${personaName} (${profile.type}): ${message}`);
  }

  return dialogues;
}
