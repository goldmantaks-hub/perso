import { PersoRoom, persoRoomManager } from './persoRoom.js';
import { PersonaProfile } from './multiAgentOrchestrator.js';
import OpenAI from 'openai';
import { storage } from '../storage.js';

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

// 페르소나 프로필은 이제 DB에서 가져옵니다
// 기본 입장/퇴장 확률 설정
const DEFAULT_JOIN_PROBABILITY = 0.5; // 50%
const DEFAULT_LEAVE_PROBABILITY = 0.3; // 30%

export async function checkJoinLeaveEvents(room: PersoRoom): Promise<JoinLeaveEvent[]> {
  const events: JoinLeaveEvent[] = [];
  
  try {
    // DB에서 모든 페르소나 가져오기
    const allPersonas = await storage.getAllPersonas();
    
    if (room.activePersonas.length < 6) {
      const activeIds = room.activePersonas.map(p => p.id);
      const inactivePersonas = allPersonas.filter(
        p => !activeIds.includes(p.id)
      );
      
      console.log(`[JOIN/LEAVE] 비활성 페르소나 수: ${inactivePersonas.length}`);
      
      for (const persona of inactivePersonas) {
        // DB 페르소나의 기본 확률 사용 (향후 DB에 확률 필드 추가 가능)
        const joinProbability = DEFAULT_JOIN_PROBABILITY;
        
        if (Math.random() < joinProbability) {
          events.push({
            roomId: room.roomId,
            personaId: persona.id,
            eventType: 'join',
            timestamp: Date.now()
          });
          console.log(`[JOIN/LEAVE] ${persona.name} 입장 이벤트 생성 (확률: ${(joinProbability * 100).toFixed(1)}%)`);
        }
      }
    }
    
    // 페르소나 퇴장 이벤트는 생성하지 않음 (사용자 퇴장 메시지로 통합)
    if (room.activePersonas.length > 4) {
      console.log(`[JOIN/LEAVE] 페르소나 퇴장 이벤트는 생성하지 않음 (사용자 퇴장 메시지로 통합)`);
    }
    
    console.log(`[JOIN/LEAVE] 총 ${events.length}개 이벤트 생성`);
    return events;
    
  } catch (error) {
    console.error('[JOIN/LEAVE] 이벤트 체크 중 오류:', error);
    return [];
  }
}

export async function generateAutoIntroduction(
  personaId: string,
  currentTopics: string[]
): Promise<string> {
  try {
    // DB에서 페르소나 정보 가져오기
    const persona = await storage.getPersona(personaId);
    if (!persona) {
      return `안녕하세요!`;
    }
    
    const topicList = currentTopics.join(', ');
    
    const prompt = `You are ${persona.name}, joining a conversation.

Your characteristics:
- Name: ${persona.name}
- Description: ${persona.description || 'A helpful AI persona'}

Current conversation topics: ${topicList}

Generate a brief, natural introduction (1 sentence) as you join the conversation. Show interest in the current topic while staying true to your personality.

Output only the introduction in Korean, nothing else.`;

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
    return `안녕하세요, ${personaId}입니다!`;
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

// 하드코딩된 페르소나 프로필 함수들을 제거했습니다.
// 이제 모든 페르소나 정보는 DB에서 가져옵니다.
