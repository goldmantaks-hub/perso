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
  activePersonas: PersonaState[];
  currentTopics: TopicWeight[];
  previousTopics: TopicWeight[];
  dominantPersona: string | null;
  turnsSinceDominantChange: number;
  totalTurns: number;
  createdAt: number;
  lastActivity: number;
  dialogueHistory: DialogueMessage[];

  constructor(postId: string, initialPersonas: string[], contexts: string[]) {
    const now = Date.now();
    
    this.roomId = `room-${postId}-${now}`;
    this.postId = postId;
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

    console.log(`[ROOM] Created ${this.roomId} with ${initialPersonas.length} personas, ${contexts.length} topics`);
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

  addMessage(message: DialogueMessage): void {
    this.dialogueHistory.push(message);
    this.lastActivity = Date.now();
    
    const maxHistory = 100;
    if (this.dialogueHistory.length > maxHistory) {
      this.dialogueHistory = this.dialogueHistory.slice(-maxHistory);
    }
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
    const room = new PersoRoom(postId, initialPersonas, contexts);
    this.rooms.set(room.roomId, room);
    return room;
  }
  
  getRoom(roomId: string): PersoRoom | undefined {
    return this.rooms.get(roomId);
  }
  
  getRoomByPostId(postId: string): PersoRoom | undefined {
    return Array.from(this.rooms.values()).find(room => room.postId === postId);
  }

  deleteRoom(roomId: string): boolean {
    const deleted = this.rooms.delete(roomId);
    if (deleted) {
      console.log(`[ROOM] Deleted room ${roomId}`);
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
  
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.CLEANUP_TIMEOUT;
    
    Array.from(this.rooms.entries()).forEach(([roomId, room]) => {
      if (room.lastActivity < cutoff) {
        this.rooms.delete(roomId);
        console.log(`[ROOM] Cleaned up inactive room ${roomId}`);
      }
    });
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
}

export const persoRoomManager = new PersoRoomManager();
persoRoomManager.startCleanupInterval();
