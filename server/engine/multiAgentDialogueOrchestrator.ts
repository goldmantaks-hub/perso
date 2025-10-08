import { persoRoomManager } from './persoRoom.js';
import { selectNextSpeaker, generateThinking } from './multiAgentOrchestrator.js';
import { checkHandover } from './handoverManager.js';
import { checkJoinLeaveEvents, executeJoinLeaveEvents } from './joinLeaveManager.js';
import { storage } from '../storage.js';
import { getExpandedInfoForPersona } from './infoExpansion.js';
import { personaTalk } from './dialogueOrchestrator.js';

interface Post {
  id: string;
  content: string;
  userId?: string;
}

interface Analysis {
  sentiment: any;
  tones?: string[];
  contexts?: string[];
  subjects?: any[];
}

interface MultiAgentDialogueResult {
  messages: Array<{
    persona: string;
    message: string;
    thinking?: string;
    type: string;
    expandedInfo?: any;
  }>;
  joinLeaveEvents: Array<{
    personaId: string;
    eventType: 'join' | 'leave';
    autoIntroduction?: string;
  }>;
  roomId: string;
}

export async function multiAgentDialogueOrchestrator(
  post: Post,
  analysis: Analysis,
  initialPersonas?: string[]
): Promise<MultiAgentDialogueResult> {
  console.log(`[MULTI AGENT] Starting multiAgentDialogueOrchestrator for post ${post.id}`);
  console.log(`[MULTI AGENT] Post content: "${post.content}"`);
  console.log(`[MULTI AGENT] Analysis:`, analysis);
  
  const contexts = analysis.contexts || [];
  console.log(`[MULTI AGENT] Contexts:`, contexts);
  
  const selectedPersonas = initialPersonas || await selectInitialPersonas(contexts);
  console.log(`[MULTI AGENT] Selected personas:`, selectedPersonas);
  
  console.log(`[MULTI AGENT] About to create conversation for post.id: ${post.id}`);
  
  // 먼저 데이터베이스에 대화방(conversation) 생성
  let conversation;
  try {
    conversation = await storage.createConversationForPost(post.id, 'user', post.userId);
    console.log(`[MULTI AGENT] Created conversation:`, conversation.id);
  } catch (error) {
    // 이미 존재하는 경우 기존 대화방 가져오기
    console.log(`[MULTI AGENT] Conversation already exists, fetching existing one`);
    conversation = await storage.getConversationByPost(post.id);
    if (!conversation) {
      throw new Error(`Failed to create or find conversation for post ${post.id}`);
    }
    console.log(`[MULTI AGENT] Using existing conversation:`, conversation.id);
  }
  
  console.log(`[MULTI AGENT] About to create room with post.id: ${post.id}`);
  const room = persoRoomManager.createRoom(post.id, selectedPersonas, contexts);
  console.log(`[MULTI AGENT] Created room:`, room.roomId);
  
  if (!room.dominantPersona && room.activePersonas.length > 0) {
    room.dominantPersona = room.activePersonas[0].id;
    persoRoomManager.setDominantPersona(room.roomId, room.dominantPersona);
  }
  
  const messages: MultiAgentDialogueResult['messages'] = [];
  const conversationHistory: any[] = [];
  // 초기 대화는 3-6턴으로 시작
  const initialTurns = 3 + Math.floor(Math.random() * 3);
  
  let lastSpeaker = '';
  let lastMessage = post.content;
  
  // 초기 대화 진행
  for (let turn = 0; turn < initialTurns; turn++) {
    console.log(`[MULTI AGENT] Turn ${turn + 1}/${initialTurns} starting...`);
    console.log(`[MULTI AGENT] Room state:`, {
      currentTopics: room.currentTopics,
      lastMessage: lastMessage,
      lastSpeaker: lastSpeaker,
      activePersonas: room.activePersonas.length,
      conversationHistory: conversationHistory.length,
      dominantPersona: room.dominantPersona,
      turnsSinceDominantChange: room.turnsSinceDominantChange
    });
    
    let nextSpeaker: string;
    try {
      nextSpeaker = selectNextSpeaker(
        room.currentTopics,
        lastMessage,
        lastSpeaker,
        room.activePersonas,
        conversationHistory,
        room.dominantPersona,
        room.turnsSinceDominantChange
      );
      console.log(`[MULTI AGENT] Selected next speaker: ${nextSpeaker}`);
    } catch (error) {
      console.error(`[MULTI AGENT] Error in selectNextSpeaker:`, error);
      console.error(`[MULTI AGENT] Error stack:`, error.stack);
      throw error;
    }
    
    // DB에서 페르소나 정보 가져오기
    const persona = await storage.getPersona(nextSpeaker);
    if (!persona) break;
    
    const thinking = await generateThinking(
      persona,
      room.currentTopics,
      lastMessage,
      conversationHistory.map(m => `${m.persona}: ${m.message}`).join('\n')
    );
    
    const expandedInfo = await getExpandedInfoForPersona(
      'general', // DB 페르소나에 type 필드가 없으므로 기본값 사용
      room.currentTopics,
      lastMessage,
      post.userId
    );
    
    const personaContext = {
      previousMessages: conversationHistory.map(m => ({
        persona: m.persona,
        message: m.message
      }))
    };
    
    const message = await personaTalk(nextSpeaker, post, analysis, personaContext);
    
    console.log(`[CHAT] ${nextSpeaker}: "${message}"`);
    
    // 페르소나를 participant로 추가 (메시지 저장 전)
    try {
      await storage.addParticipant({
        conversationId: conversation.id,
        participantType: 'persona',
        participantId: nextSpeaker,
        role: 'member',
      });
      console.log(`[INITIAL] Persona ${nextSpeaker} added as participant`);
    } catch (error) {
      // Unique constraint 에러는 무시 (이미 participant임)
      console.log(`[INITIAL] Persona ${nextSpeaker} already a participant`);
    }
    
    // 메시지를 데이터베이스에 저장
    try {
      const savedMessage = await storage.createMessageInConversation({
        conversationId: conversation.id, // 실제 conversation ID 사용
        senderType: 'persona',
        senderId: nextSpeaker,
        content: message,
        messageType: 'text',
        thinking: thinking,
        meta: expandedInfo?.data ? { expandedInfo: expandedInfo.data } : undefined
      });
      
      console.log(`[INITIAL] Message saved to DB with ID: ${savedMessage.id}`);
      
    } catch (error) {
      console.error(`[INITIAL] Error saving message to DB:`, error);
    }
    
    messages.push({
      persona: nextSpeaker,
      message,
      thinking,
      type: 'general', // DB 페르소나에 type 필드가 없으므로 기본값 사용
      expandedInfo: expandedInfo?.data
    });
    
    conversationHistory.push({
      persona: nextSpeaker,
      message,
      thinking
    });
    
    persoRoomManager.recordPersonaTurn(room.roomId, nextSpeaker);
    
    const updatedRoom = persoRoomManager.getRoom(room.roomId);
    if (updatedRoom) {
      const handoverResult = checkHandover(
        updatedRoom.currentTopics,
        updatedRoom.previousTopics,
        updatedRoom.dominantPersona || '',
        updatedRoom.turnsSinceDominantChange,
        updatedRoom.activePersonas,
        conversationHistory
      );
      
      if (handoverResult.shouldHandover && handoverResult.newDominant) {
        persoRoomManager.setDominantPersona(room.roomId, handoverResult.newDominant);
      }
    }
    
    lastSpeaker = nextSpeaker;
    lastMessage = message;
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const joinLeaveEvents: any[] = [];
  const updatedRoom = persoRoomManager.getRoom(room.roomId);
  if (updatedRoom) {
    const events = await checkJoinLeaveEvents(updatedRoom);
    
    for (const event of events) {
      if (event.eventType === 'join') {
        joinLeaveEvents.push({
          personaId: event.personaId,
          eventType: 'join',
          autoIntroduction: event.autoIntroduction
        });
      } else {
        joinLeaveEvents.push({
          personaId: event.personaId,
          eventType: 'leave'
        });
      }
    }
    
    await executeJoinLeaveEvents(events);
  }
  
  // 방 상태 업데이트 (지속적인 대화를 위해)
  const finalRoom = persoRoomManager.getRoom(room.roomId);
  if (finalRoom) {
    finalRoom.lastMessage = lastMessage;
    finalRoom.lastSpeaker = lastSpeaker;
    finalRoom.conversationHistory = conversationHistory;
    finalRoom.isContinuousMode = true;
    
    console.log(`[CONTINUE SETUP] Room ${room.roomId} prepared for continuous conversation`);
    console.log(`[CONTINUE SETUP] Last message: "${lastMessage}"`);
    console.log(`[CONTINUE SETUP] Last speaker: ${lastSpeaker}`);
    console.log(`[CONTINUE SETUP] Active personas: ${finalRoom.activePersonas.length}`);
    
    // 지속적인 대화 시작 (8초 간격)
    setTimeout(() => {
      console.log(`[CONTINUE SETUP] Starting continueConversation for room ${room.roomId}`);
      continueConversation(room.roomId, 8000);
    }, 3000); // 3초 후 시작
  } else {
    console.error(`[CONTINUE SETUP] Failed to get final room ${room.roomId}`);
  }
  
  return {
    messages,
    joinLeaveEvents,
    roomId: room.roomId
  };
}

// 지속적인 대화를 위한 함수
export async function continueConversation(
  roomId: string,
  intervalMs: number = 8000 // 8초 간격
): Promise<void> {
  const room = persoRoomManager.getRoom(roomId);
  if (!room) {
    console.log(`[CONTINUE] Room ${roomId} not found`);
    return;
  }

  console.log(`[CONTINUE] Starting continuous conversation for room ${roomId}`);
  
  const conversationInterval = setInterval(async () => {
    try {
      const currentRoom = persoRoomManager.getRoom(roomId);
      if (!currentRoom || currentRoom.activePersonas.length === 0) {
        console.log(`[CONTINUE] Room ${roomId} no longer active, stopping conversation`);
        clearInterval(conversationInterval);
        return;
      }

      // 마지막 메시지 가져오기
      const lastMessage = currentRoom.lastMessage || "대화를 계속해봅시다.";
      const lastSpeaker = currentRoom.lastSpeaker || '';
      
      // 다음 화자 선택
      const nextSpeaker = selectNextSpeaker(
        currentRoom.currentTopics,
        lastMessage,
        lastSpeaker,
        currentRoom.activePersonas,
        currentRoom.conversationHistory,
        currentRoom.dominantPersona,
        currentRoom.turnsSinceDominantChange
      );

      // DB에서 페르소나 정보 가져오기
      const persona = await storage.getPersona(nextSpeaker);
      if (!persona) {
        console.log(`[CONTINUE] Persona ${nextSpeaker} not found`);
        return;
      }

      // 내부 추론 생성
      const thinking = await generateThinking(
        persona,
        currentRoom.currentTopics,
        lastMessage,
        currentRoom.conversationHistory.map(m => `${m.persona}: ${m.message}`).join('\n')
      );

      // 확장 정보 가져오기
      const expandedInfo = await getExpandedInfoForPersona(
        'general',
        currentRoom.currentTopics,
        lastMessage,
        undefined
      );

      // 페르소나 대화 생성
      const personaContext = {
        previousMessages: currentRoom.conversationHistory.map(m => ({
          persona: m.persona,
          message: m.message
        }))
      };

      // 간단한 게시물 컨텍스트 생성
      const postContext = {
        id: roomId,
        content: lastMessage,
        userId: undefined
      };

      const message = await personaTalk(nextSpeaker, postContext, { contexts: [], sentiment: { positive: 0.5, neutral: 0.3, negative: 0.2 }, tones: [] }, personaContext);
      
      console.log(`[CONTINUE] ${nextSpeaker}: "${message}"`);

      // 방 상태 업데이트
      currentRoom.lastMessage = message;
      currentRoom.lastSpeaker = nextSpeaker;
      currentRoom.conversationHistory.push({
        persona: nextSpeaker,
        message,
        thinking
      });

      // 턴 기록
      persoRoomManager.recordPersonaTurn(roomId, nextSpeaker);

      // 주도권 교체 체크
      const updatedRoom = persoRoomManager.getRoom(roomId);
      if (updatedRoom) {
        const handoverResult = checkHandover(
          updatedRoom.currentTopics,
          updatedRoom.previousTopics,
          updatedRoom.dominantPersona || '',
          updatedRoom.turnsSinceDominantChange,
          updatedRoom.activePersonas,
          updatedRoom.conversationHistory
        );
        
        if (handoverResult.shouldHandover && handoverResult.newDominant) {
          persoRoomManager.setDominantPersona(roomId, handoverResult.newDominant);
        }
      }

             // 메시지를 데이터베이스에 저장
             try {
               // roomId에서 postId 추출 (roomId 형식: room-{postId}-{timestamp})
               const postId = roomId.replace('room-', '').split('-').slice(0, -1).join('-');
               const conversation = await storage.getConversationByPost(postId);
               
               if (!conversation) {
                 console.error(`[CONTINUE] No conversation found for post ${postId}`);
                 return;
               }
               
               // 페르소나를 participant로 추가 (메시지 저장 전)
               try {
                 await storage.addParticipant({
                   conversationId: conversation.id,
                   participantType: 'persona',
                   participantId: nextSpeaker,
                   role: 'member',
                 });
                 console.log(`[CONTINUE] Persona ${nextSpeaker} added as participant`);
               } catch (error) {
                 // 이미 participant면 무시
                 console.log(`[CONTINUE] Persona ${nextSpeaker} already a participant`);
               }
               
               const savedMessage = await storage.createMessageInConversation({
                 conversationId: conversation.id,
                 senderType: 'persona',
                 senderId: nextSpeaker,
                 content: message,
                 messageType: 'text',
                 thinking: thinking,
                 meta: expandedInfo?.data ? { expandedInfo: expandedInfo.data } : undefined
               });
        
        console.log(`[CONTINUE] Message saved to DB with ID: ${savedMessage.id}`);
        
        // WebSocket으로 메시지 브로드캐스트 (연결된 클라이언트가 있다면)
        const io = getIO();
        if (io) {
          const messageData = {
            id: savedMessage.id,
            conversationId: roomId,
            senderType: 'persona',
            senderId: nextSpeaker,
            content: message,
            thinking: thinking,
            messageType: 'text',
            createdAt: savedMessage.createdAt.toISOString(),
            persona: {
              id: persona.id,
              name: persona.name,
              image: persona.image,
            },
            expandedInfo: expandedInfo?.data
          };

          io.to(`conversation:${roomId}`).emit('message:new', messageData);
          console.log(`[CONTINUE] Message broadcasted via WebSocket`);
        }
        
      } catch (error) {
        console.error(`[CONTINUE] Error saving message to DB:`, error);
        
        // DB 저장 실패 시에도 WebSocket으로는 전송
        const io = getIO();
        if (io) {
          const messageData = {
            id: `continue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            conversationId: roomId,
            senderType: 'persona',
            senderId: nextSpeaker,
            content: message,
            thinking: thinking,
            messageType: 'text',
            createdAt: new Date().toISOString(),
            persona: {
              id: persona.id,
              name: persona.name,
              image: persona.image,
            },
            expandedInfo: expandedInfo?.data
          };

          io.to(`conversation:${roomId}`).emit('message:new', messageData);
        }
      }

    } catch (error) {
      console.error(`[CONTINUE] Error in conversation loop for room ${roomId}:`, error);
    }
  }, intervalMs);

  // 30분 후 자동 중지
  setTimeout(() => {
    console.log(`[CONTINUE] Stopping conversation for room ${roomId} after 30 minutes`);
    clearInterval(conversationInterval);
  }, 30 * 60 * 1000);
}

// IO 인스턴스를 가져오는 헬퍼 함수 (websocket.ts에서 export 필요)
function getIO() {
  try {
    // websocket.ts에서 export된 io 인스턴스를 가져옴
    return (global as any).ioInstance;
  } catch (error) {
    console.error('[CONTINUE] Could not get IO instance:', error);
    return null;
  }
}

async function selectInitialPersonas(contexts: string[]): Promise<string[]> {
  console.log(`[SELECT PERSONAS] Starting selectInitialPersonas with contexts:`, contexts);
  
  try {
    const allPersonas = await storage.getAllPersonas();
    console.log(`[SELECT PERSONAS] Found ${allPersonas.length} total personas`);
    
    const personaCount = Math.floor(Math.random() * 2) + 3;
    console.log(`[SELECT PERSONAS] Will select ${personaCount} personas`);
    
    if (contexts.length === 0) {
      const selected = allPersonas
        .sort(() => Math.random() - 0.5)
        .slice(0, personaCount)
        .map(p => p.id);
      console.log(`[SELECT PERSONAS] Selected random personas:`, selected);
      return selected;
    }
    
    // 컨텍스트 기반 점수 계산 (향후 DB에 관심사 필드 추가 가능)
    const scored = allPersonas.map(persona => {
      let score = Math.random(); // 기본 랜덤 점수
      // 향후 DB에 관심사/전문분야 필드 추가 시 여기서 계산
      return { id: persona.id, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    return scored.slice(0, personaCount).map(p => p.id);
  } catch (error) {
    console.error('[DIALOGUE] 초기 페르소나 선택 중 오류:', error);
    // 오류 시 기본 페르소나 반환
    return ['Kai', 'Espri', 'Luna'];
  }
}
