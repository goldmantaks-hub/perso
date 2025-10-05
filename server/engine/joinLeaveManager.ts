import { PersoRoom, persoRoomManager } from './persoRoom.js';
import { PersonaProfile } from './multiAgentOrchestrator.js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface JoinLeaveEvent {
  roomId: string;
  personaId: string;
  eventType: 'join' | 'leave';
  timestamp: number;
  autoIntroduction?: string;
}

const PERSONA_PROFILES: Record<string, PersonaProfile & { joinProbability: number; leaveProbability: number }> = {
  'Kai': {
    id: 'Kai',
    name: 'Kai',
    role: '지식형 - 정보와 전문성 제공',
    type: 'knowledge',
    tone: '차분하고 논리적인',
    style: '근거있는 정보를 제공하며, 배경지식을 쉽게 설명합니다',
    joinProbability: 0.15,
    leaveProbability: 0.10
  },
  'Espri': {
    id: 'Espri',
    name: 'Espri',
    role: '감성형 - 감정적 이해와 공감',
    type: 'empath',
    tone: '따뜻하고 공감적인',
    style: '감정에 집중하며, 위로와 격려를 전합니다',
    joinProbability: 0.15,
    leaveProbability: 0.10
  },
  'Luna': {
    id: 'Luna',
    name: 'Luna',
    role: '창의형 - 예술적이고 상상력 풍부',
    type: 'creative',
    tone: '창의적이고 감각적인',
    style: '비유와 은유를 사용하며, 새로운 관점을 제시합니다',
    joinProbability: 0.15,
    leaveProbability: 0.10
  },
  'Namu': {
    id: 'Namu',
    name: 'Namu',
    role: '분석형 - 데이터와 논리 중심',
    type: 'analyst',
    tone: '분석적이고 객관적인',
    style: '패턴을 찾고, 구조적으로 분석합니다',
    joinProbability: 0.15,
    leaveProbability: 0.10
  },
  'Milo': {
    id: 'Milo',
    name: 'Milo',
    role: '유머형 - 위트있고 유쾌함',
    type: 'humor',
    tone: '재치있고 밝은',
    style: '가볍게 농담을 섞으며, 즐거운 분위기를 만듭니다',
    joinProbability: 0.15,
    leaveProbability: 0.10
  },
  'Eden': {
    id: 'Eden',
    name: 'Eden',
    role: '철학형 - 깊은 사색과 통찰',
    type: 'philosopher',
    tone: '사색적이고 통찰력있는',
    style: '근본적인 질문을 던지고, 의미를 탐구합니다',
    joinProbability: 0.15,
    leaveProbability: 0.10
  },
  'Ava': {
    id: 'Ava',
    name: 'Ava',
    role: '트렌드형 - 최신 트렌드와 문화',
    type: 'trend',
    tone: '트렌디하고 활발한',
    style: '최신 유행과 문화를 언급하며, 생동감있게 말합니다',
    joinProbability: 0.15,
    leaveProbability: 0.10
  },
  'Rho': {
    id: 'Rho',
    name: 'Rho',
    role: '테크형 - 기술과 혁신',
    type: 'tech',
    tone: '기술적이고 미래지향적인',
    style: '기술적 측면을 설명하고, 혁신적 아이디어를 제시합니다',
    joinProbability: 0.15,
    leaveProbability: 0.10
  },
  'Noir': {
    id: 'Noir',
    name: 'Noir',
    role: '미스터리형 - 수수께끼 같은',
    type: 'mystery',
    tone: '신비롭고 흥미로운',
    style: '은유적이고 암시적으로 말하며, 호기심을 자극합니다',
    joinProbability: 0.15,
    leaveProbability: 0.10
  }
};

export function checkJoinLeaveEvents(room: PersoRoom): JoinLeaveEvent[] {
  const events: JoinLeaveEvent[] = [];
  
  if (room.activePersonas.length < 6) {
    const activeIds = room.activePersonas.map(p => p.id);
    const inactivePersonas = Object.values(PERSONA_PROFILES).filter(
      p => !activeIds.includes(p.id)
    );
    
    for (const persona of inactivePersonas) {
      if (Math.random() < persona.joinProbability) {
        events.push({
          roomId: room.roomId,
          personaId: persona.id,
          eventType: 'join',
          timestamp: Date.now()
        });
      }
    }
  }
  
  if (room.activePersonas.length > 4) {
    for (const personaState of room.activePersonas) {
      const profile = PERSONA_PROFILES[personaState.id];
      if (profile && Math.random() < profile.leaveProbability) {
        events.push({
          roomId: room.roomId,
          personaId: personaState.id,
          eventType: 'leave',
          timestamp: Date.now()
        });
      }
    }
  }
  
  return events;
}

export async function generateAutoIntroduction(
  personaId: string,
  currentTopics: string[]
): Promise<string> {
  const persona = PERSONA_PROFILES[personaId];
  if (!persona) {
    return `안녕하세요!`;
  }
  
  const topicList = currentTopics.join(', ');
  
  const prompt = `You are ${persona.name}, a ${persona.type} persona joining a conversation.

Your characteristics:
- Role: ${persona.role}
- Tone: ${persona.tone}
- Style: ${persona.style}

Current conversation topics: ${topicList}

Generate a brief, natural introduction (1 sentence) as you join the conversation. Show interest in the current topic while staying true to your personality.

Output only the introduction in Korean, nothing else.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Introduce yourself briefly." }
      ],
      temperature: 0.8,
      max_tokens: 60,
    });

    const intro = completion.choices[0]?.message?.content?.trim() || `안녕하세요, ${persona.name}입니다!`;
    return intro;
  } catch (error) {
    console.error(`[JOIN] Error generating introduction for ${personaId}:`, error);
    return `안녕하세요, ${persona.name}입니다!`;
  }
}

export async function executeJoinLeaveEvents(events: JoinLeaveEvent[]): Promise<void> {
  for (const event of events) {
    if (event.eventType === 'join') {
      persoRoomManager.addPersona(event.roomId, event.personaId);
      
      const room = persoRoomManager.getRoom(event.roomId);
      if (room) {
        const topicNames = room.currentTopics.map(t => t.topic);
        event.autoIntroduction = await generateAutoIntroduction(event.personaId, topicNames);
        console.log(`[JOIN] ${event.personaId} joined: "${event.autoIntroduction}"`);
      }
    } else if (event.eventType === 'leave') {
      persoRoomManager.removePersona(event.roomId, event.personaId);
      console.log(`[LEAVE] ${event.personaId} left the conversation`);
    }
  }
}

export function getPersonaProfile(personaId: string): (PersonaProfile & { joinProbability: number; leaveProbability: number }) | undefined {
  return PERSONA_PROFILES[personaId];
}

export function getAllPersonaProfiles(): (PersonaProfile & { joinProbability: number; leaveProbability: number })[] {
  return Object.values(PERSONA_PROFILES);
}
