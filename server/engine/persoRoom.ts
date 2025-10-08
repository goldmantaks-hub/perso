export interface PersonaState {
  id: string;
  status: 'active' | 'idle' | 'joining' | 'leaving';
  joinedAt: number;
  lastSpokeAt: number;
  messageCount: number;
}

export interface TopicWeight {
  topic: string;
  weight: number;
}

export interface DialogueMessage {
  id: string;
  personaId?: string;
  userId?: string;
  content: string;
  timestamp: number;
  isAI: boolean;
}

export class PersoRoom {
  roomId: string;
  postId: string;
  conversationId: string | null;
  activePersonas: PersonaState[];
  currentTopics: TopicWeight[];
  previousTopics: TopicWeight[];
  dominantPersona: string | null;
  turnsSinceDominantChange: number;
  totalTurns: number;
  createdAt: number;
  lastActivity: number;
  dialogueHistory: DialogueMessage[];
  
  // 지속적인 대화를 위한 필드들
  lastMessage: string;
  lastSpeaker: string;
  conversationHistory: Array<{ persona: string; message: string; thinking?: string }>;
  isContinuousMode: boolean;
  
  // 자동 대화를 위한 필드들
  autoChatEnabled: boolean;
  lastMessageAt: Date;

  constructor(postId: string, initialPersonas: string[], contexts: string[]) {
    const now = Date.now();
    
    // postId를 기반으로 고정된 roomId 생성 (timestamp 제거)
    this.roomId = `room-${postId}`;
    this.postId = postId;
    this.conversationId = null;
    this.activePersonas = initialPersonas.map(id => ({
      id,
      status: 'active' as const,
      joinedAt: now,
      lastSpokeAt: 0,
      messageCount: 0
    }));
    this.currentTopics = this.contextsToTopicWeights(contexts);
    this.previousTopics = [];
    this.dominantPersona = null;
    this.turnsSinceDominantChange = 0;
    this.totalTurns = 0;
    this.createdAt = now;
    this.lastActivity = now;
    this.dialogueHistory = [];
    
    // 지속적인 대화를 위한 필드 초기화
    this.lastMessage = "";
    this.lastSpeaker = "";
    this.conversationHistory = [];
    this.isContinuousMode = false;
    
    // 자동 대화를 위한 필드 초기화
    this.autoChatEnabled = true;
    this.lastMessageAt = new Date();

    console.log(`[ROOM] Created ${this.roomId} with ${initialPersonas.length} personas, ${contexts.length} topics`);
  }
  
  setConversationId(conversationId: string): void {
    this.conversationId = conversationId;
    console.log(`[ROOM] Set conversationId for ${this.roomId}: ${conversationId}`);
  }

  addPersona(personaId: string): void {
    this.lastActivity = Date.now();
    
    const existing = this.activePersonas.find(p => p.id === personaId);
    if (existing) {
      this.transitionPersonaState(personaId, 'active');
      existing.joinedAt = Date.now();
      console.log(`[ROOM] ${personaId} rejoined ${this.roomId}`);
      return;
    }
    
    this.activePersonas.push({
      id: personaId,
      status: 'joining',
      joinedAt: Date.now(),
      lastSpokeAt: 0,
      messageCount: 0
    });
    
    console.log(`[ROOM] ${personaId} joined ${this.roomId}`);
  }

  removePersona(personaId: string): void {
    const persona = this.activePersonas.find(p => p.id === personaId);
    if (!persona) {
      console.log(`[ROOM] Cannot remove ${personaId} - not found in ${this.roomId}`);
      return;
    }
    
    this.transitionPersonaState(personaId, 'leaving');
    
    if (this.dominantPersona === personaId) {
      this.reassignDominantPersona(personaId);
    }
    
    this.activePersonas = this.activePersonas.filter(p => p.id !== personaId);
    
    this.lastActivity = Date.now();
    console.log(`[ROOM] ${personaId} removed from ${this.roomId}`);
  }

  transitionPersonaState(personaId: string, newState: 'active' | 'idle' | 'joining' | 'leaving'): boolean {
    const persona = this.activePersonas.find(p => p.id === personaId);
    if (!persona) {
      console.log(`[ROOM] Cannot transition ${personaId} - not found in ${this.roomId}`);
      return false;
    }

    const oldState = persona.status;
    persona.status = newState;
    this.lastActivity = Date.now();
    
    console.log(`[ROOM] ${personaId} transitioned from ${oldState} → ${newState} in ${this.roomId}`);
    return true;
  }

  setPersonaIdle(personaId: string): boolean {
    return this.transitionPersonaState(personaId, 'idle');
  }

  setPersonaActive(personaId: string): boolean {
    return this.transitionPersonaState(personaId, 'active');
  }

  recordPersonaTurn(personaId: string): void {
    const persona = this.activePersonas.find(p => p.id === personaId);
    if (persona) {
      persona.lastSpokeAt = Date.now();
      persona.messageCount++;
      
      if (persona.status === 'joining') {
        this.transitionPersonaState(personaId, 'active');
      }
    }
    
    this.totalTurns++;
    this.turnsSinceDominantChange++;
    this.lastActivity = Date.now();
  }

  getRecentMessages(count: number = 10): DialogueMessage[] {
    return this.dialogueHistory.slice(-count);
  }

  clearDialogueHistory(): void {
    this.dialogueHistory = [];
    console.log(`[ROOM] Cleared dialogue history for ${this.roomId}`);
  }

  setDominantPersona(personaId: string): void {
    if (this.dominantPersona !== personaId) {
      this.dominantPersona = personaId;
      this.turnsSinceDominantChange = 0;
      console.log(`[ROOM] Dominant persona changed to ${personaId} in ${this.roomId}`);
    }
  }

  updateTopics(newContexts: string[]): void {
    this.previousTopics = this.currentTopics;
    this.currentTopics = this.contextsToTopicWeights(newContexts);
    this.lastActivity = Date.now();
    
    console.log(`[ROOM] Updated topics for ${this.roomId}: ${newContexts.join(', ')}`);
  }

  getActivePersonas(): PersonaState[] {
    return this.activePersonas.filter(p => p.status === 'active');
  }

  getPersonaState(personaId: string): PersonaState | undefined {
    return this.activePersonas.find(p => p.id === personaId);
  }

  isActive(): boolean {
    return this.getActivePersonas().length > 0;
  }

  getLastMessages(n: number): Array<{ personaId?: string; userId?: string; text: string }> {
    return this.dialogueHistory
      .slice(-n)
      .map(msg => ({
        personaId: msg.personaId,
        userId: msg.userId,
        text: msg.content
      }));
  }

  addMessage(message: { personaId?: string; userId?: string; text: string; createdAt: Date }): void {
    const dialogueMsg: DialogueMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      personaId: message.personaId,
      userId: message.userId,
      content: message.text,
      timestamp: message.createdAt.getTime(),
      isAI: !!message.personaId
    };

    this.dialogueHistory.push(dialogueMsg);
    this.lastMessageAt = message.createdAt;
    this.lastActivity = message.createdAt.getTime();

    // 페르소나 상태 업데이트
    if (message.personaId) {
      const persona = this.activePersonas.find(p => p.id === message.personaId);
      if (persona) {
        persona.lastSpokeAt = message.createdAt.getTime();
        persona.messageCount++;
      }
    }
  }

  private reassignDominantPersona(leavingPersonaId: string): void {
    const remainingActive = this.activePersonas.filter(
      p => p.id !== leavingPersonaId && p.status === 'active'
    );
    
    if (remainingActive.length > 0) {
      const newDominant = remainingActive.reduce((prev, curr) => 
        curr.messageCount > prev.messageCount ? curr : prev
      );
      this.dominantPersona = newDominant.id;
      this.turnsSinceDominantChange = 0;
      console.log(`[ROOM] Dominant persona reassigned to ${newDominant.id} after ${leavingPersonaId} left`);
    } else {
      this.dominantPersona = null;
      console.log(`[ROOM] No dominant persona after ${leavingPersonaId} left`);
    }
  }

  private contextsToTopicWeights(contexts: string[]): TopicWeight[] {
    if (contexts.length === 0) {
      return [{ topic: 'general', weight: 1.0 }];
    }
    
    const weight = 1.0 / contexts.length;
    return contexts.map(topic => ({ topic, weight }));
  }
}

export class PersoRoomManager {
  private rooms: Map<string, PersoRoom> = new Map();
  private readonly CLEANUP_TIMEOUT = 30 * 60 * 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  createRoom(postId: string, initialPersonas: string[], contexts: string[]): PersoRoom {
    // 같은 postId에 대한 기존 Room이 있는지 확인
    const existingRoom = this.getRoomByPostId(postId);
    if (existingRoom) {
      console.log(`[ROOM] Reusing existing room ${existingRoom.roomId} for post ${postId}`);
      return existingRoom;
    }
    
    // 새 Room 생성
    const room = new PersoRoom(postId, initialPersonas, contexts);
    this.rooms.set(room.roomId, room);
    return room;
  }
  
  getRoomByPostId(postId: string): PersoRoom | undefined {
    return Array.from(this.rooms.values()).find(room => room.postId === postId);
  }

  deleteRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      console.warn(`[ROOM] Cannot delete room ${roomId} - room not found`);
      return false;
    }
    
    const deleted = this.rooms.delete(roomId);
    if (deleted) {
      console.log(`[ROOM] Successfully deleted room ${roomId}`);
    } else {
      console.error(`[ROOM] Failed to delete room ${roomId} - unknown error`);
    }
    return deleted;
  }

  getAllRooms(): PersoRoom[] {
    return Array.from(this.rooms.values());
  }

  getActiveRooms(): PersoRoom[] {
    return this.getAllRooms().filter(room => room.isActive());
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  ids(): string[] {
    return Array.from(this.rooms.keys());
  }

  get(roomId: string): PersoRoom | undefined {
    return this.rooms.get(roomId);
  }
  
  cleanup(): { cleaned: number; failed: number } {
    const now = Date.now();
    const cutoff = now - this.CLEANUP_TIMEOUT;
    
    let cleaned = 0;
    let failed = 0;
    
    const roomsToCleanup = Array.from(this.rooms.entries()).filter(([roomId, room]) => {
      return room.lastActivity < cutoff;
    });
    
    roomsToCleanup.forEach(([roomId, room]) => {
      try {
        const deleted = this.rooms.delete(roomId);
        if (deleted) {
          cleaned++;
          console.log(`[ROOM] Cleaned up inactive room ${roomId}`);
        } else {
          failed++;
          console.error(`[ROOM] Failed to cleanup room ${roomId}`);
        }
      } catch (error) {
        failed++;
        console.error(`[ROOM] Exception during cleanup of room ${roomId}:`, error);
      }
    });
    
    if (cleaned > 0 || failed > 0) {
      console.log(`[ROOM] Cleanup completed: ${cleaned} cleaned, ${failed} failed`);
    }
    
    return { cleaned, failed };
  }

  startCleanupInterval(): void {
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 5 * 60 * 1000);
    }
  }

  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  addPersona(roomId: string, personaId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      console.log(`[ROOM] Cannot add ${personaId} - room ${roomId} not found`);
      return false;
    }
    
    room.addPersona(personaId);
    return true;
  }

  removePersona(roomId: string, personaId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      console.log(`[ROOM] Cannot remove ${personaId} - room ${roomId} not found`);
      return false;
    }
    
    room.removePersona(personaId);
    return true;
  }

  removeRoom(roomId: string): boolean {
    try {
      const result = this.deleteRoom(roomId);
      if (!result) {
        console.error(`[ROOM] Failed to remove room ${roomId}`);
      }
      return result;
    } catch (error) {
      console.error(`[ROOM] Exception while removing room ${roomId}:`, error);
      return false;
    }
  }

  setDominantPersona(roomId: string, personaId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      console.log(`[ROOM] Cannot set dominant persona - room ${roomId} not found`);
      return false;
    }
    
    room.setDominantPersona(personaId);
    return true;
  }

  recordPersonaTurn(roomId: string, personaId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) {
      console.log(`[ROOM] Cannot record turn - room ${roomId} not found`);
      return false;
    }
    
    room.recordPersonaTurn(personaId);
    return true;
  }

  // 강제로 모든 룸 정리 (테스트용)
  forceCleanupAllRooms(): { cleaned: number; failed: number } {
    console.log(`[ROOM] Force cleanup requested - ${this.rooms.size} rooms to clean`);
    
    let cleaned = 0;
    let failed = 0;
    
    const roomIds = Array.from(this.rooms.keys());
    
    roomIds.forEach(roomId => {
      try {
        const deleted = this.rooms.delete(roomId);
        if (deleted) {
          cleaned++;
          console.log(`[ROOM] Force cleaned room ${roomId}`);
        } else {
          failed++;
          console.error(`[ROOM] Failed to force clean room ${roomId}`);
        }
      } catch (error) {
        failed++;
        console.error(`[ROOM] Exception during force cleanup of room ${roomId}:`, error);
      }
    });
    
    console.log(`[ROOM] Force cleanup completed: ${cleaned} cleaned, ${failed} failed`);
    return { cleaned, failed };
  }

  // 메모리 상태 확인
  getMemoryStatus(): {
    totalRooms: number;
    activeRooms: number;
    inactiveRooms: number;
    oldestRoom?: string;
    newestRoom?: string;
  } {
    const rooms = Array.from(this.rooms.values());
    const activeRooms = rooms.filter(room => room.isActive());
    const inactiveRooms = rooms.filter(room => !room.isActive());
    
    const sortedByAge = rooms.sort((a, b) => a.createdAt - b.createdAt);
    
    return {
      totalRooms: rooms.length,
      activeRooms: activeRooms.length,
      inactiveRooms: inactiveRooms.length,
      oldestRoom: sortedByAge[0]?.roomId,
      newestRoom: sortedByAge[sortedByAge.length - 1]?.roomId
    };
  }
}

export const persoRoomManager = new PersoRoomManager();
persoRoomManager.startCleanupInterval();
