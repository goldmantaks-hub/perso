import { persoRoomManager } from './persoRoom.js';
import { selectNextSpeaker, generateThinking, PersonaProfile } from './multiAgentOrchestrator.js';
import { checkHandover } from './handoverManager.js';
import { checkJoinLeaveEvents, executeJoinLeaveEvents, getPersonaProfile, getAllPersonaProfiles } from './joinLeaveManager.js';
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
  
  const contexts = analysis.contexts || [];
  const selectedPersonas = initialPersonas || selectInitialPersonas(contexts);
  
  const room = persoRoomManager.createRoom(post.id, selectedPersonas, contexts);
  
  if (!room.dominantPersona && room.activePersonas.length > 0) {
    room.dominantPersona = room.activePersonas[0].id;
    persoRoomManager.setDominantPersona(room.roomId, room.dominantPersona);
  }
  
  const messages: MultiAgentDialogueResult['messages'] = [];
  const conversationHistory: any[] = [];
  const maxTurns = 3 + Math.floor(Math.random() * 3);
  
  let lastSpeaker = '';
  let lastMessage = post.content;
  
  for (let turn = 0; turn < maxTurns; turn++) {
    const nextSpeaker = selectNextSpeaker(
      room.currentTopics,
      lastMessage,
      lastSpeaker,
      room.activePersonas,
      conversationHistory,
      room.dominantPersona,
      room.turnsSinceDominantChange
    );
    
    const personaProfile = getPersonaProfile(nextSpeaker);
    if (!personaProfile) break;
    
    const thinking = await generateThinking(
      personaProfile,
      room.currentTopics,
      lastMessage,
      conversationHistory.map(m => `${m.persona}: ${m.message}`).join('\n')
    );
    
    const expandedInfo = await getExpandedInfoForPersona(
      personaProfile.type,
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
    
    messages.push({
      persona: nextSpeaker,
      message,
      thinking,
      type: personaProfile.type,
      expandedInfo: expandedInfo?.data
    });
    
    conversationHistory.push({
      persona: nextSpeaker,
      message
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
    const events = checkJoinLeaveEvents(updatedRoom);
    
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
  
  return {
    messages,
    joinLeaveEvents,
    roomId: room.roomId
  };
}

function selectInitialPersonas(contexts: string[]): string[] {
  const allPersonas = getAllPersonaProfiles();
  const personaCount = Math.floor(Math.random() * 2) + 3;
  
  if (contexts.length === 0) {
    return allPersonas
      .sort(() => Math.random() - 0.5)
      .slice(0, personaCount)
      .map(p => p.id);
  }
  
  const scored = allPersonas.map(persona => {
    let score = 0;
    for (const context of contexts) {
      const { TOPIC_WEIGHTS } = require('./multiAgentOrchestrator.js');
      const affinity = TOPIC_WEIGHTS[context]?.[persona.id] || 0.3;
      score += affinity;
    }
    return { id: persona.id, score };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, personaCount).map(p => p.id);
}
