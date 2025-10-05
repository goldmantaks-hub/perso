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

export interface PersoRoom {
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
}

export class PersoRoomManager {
  private rooms: Map<string, PersoRoom> = new Map();
  private readonly CLEANUP_TIMEOUT = 30 * 60 * 1000;

  createRoom(postId: string, initialPersonas: string[], contexts: string[]): PersoRoom {
    const roomId = `room-${postId}-${Date.now()}`;
    const now = Date.now();
    
    const activePersonas: PersonaState[] = initialPersonas.map(id => ({
      id,
      status: 'active' as const,
      joinedAt: now,
      lastSpokeAt: 0,
      messageCount: 0
    }));
    
    const currentTopics = this.contextsToTopicWeights(contexts);
    
    const room: PersoRoom = {
      roomId,
      postId,
      activePersonas,
      currentTopics,
      previousTopics: [],
      dominantPersona: null,
      turnsSinceDominantChange: 0,
      totalTurns: 0,
      createdAt: now,
      lastActivity: now
    };
    
    this.rooms.set(roomId, room);
    console.log(`[ROOM] Created ${roomId} with ${initialPersonas.length} personas, ${contexts.length} topics`);
    
    return room;
  }
  
  getRoom(roomId: string): PersoRoom | undefined {
    return this.rooms.get(roomId);
  }
  
  getRoomByPostId(postId: string): PersoRoom | undefined {
    return Array.from(this.rooms.values()).find(room => room.postId === postId);
  }
  
  updateTopics(roomId: string, newContexts: string[]): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    room.previousTopics = room.currentTopics;
    room.currentTopics = this.contextsToTopicWeights(newContexts);
    room.lastActivity = Date.now();
    
    console.log(`[ROOM] Updated topics for ${roomId}: ${newContexts.join(', ')}`);
  }
  
  addPersona(roomId: string, personaId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    room.lastActivity = Date.now();
    
    const existing = room.activePersonas.find(p => p.id === personaId);
    if (existing) {
      existing.status = 'active';
      existing.joinedAt = Date.now();
      console.log(`[ROOM] ${personaId} rejoined ${roomId}`);
      return;
    }
    
    room.activePersonas.push({
      id: personaId,
      status: 'joining',
      joinedAt: Date.now(),
      lastSpokeAt: 0,
      messageCount: 0
    });
    
    console.log(`[ROOM] ${personaId} joined ${roomId}`);
  }
  
  removePersona(roomId: string, personaId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    const persona = room.activePersonas.find(p => p.id === personaId);
    if (persona) {
      persona.status = 'leaving';
    }
    
    if (room.dominantPersona === personaId) {
      const remainingActive = room.activePersonas.filter(
        p => p.id !== personaId && p.status === 'active'
      );
      
      if (remainingActive.length > 0) {
        const newDominant = remainingActive.reduce((prev, curr) => 
          curr.messageCount > prev.messageCount ? curr : prev
        );
        room.dominantPersona = newDominant.id;
        room.turnsSinceDominantChange = 0;
        console.log(`[ROOM] Dominant persona reassigned to ${newDominant.id} after ${personaId} left`);
      } else {
        room.dominantPersona = null;
        console.log(`[ROOM] No dominant persona after ${personaId} left`);
      }
    }
    
    setTimeout(() => {
      const room = this.rooms.get(roomId);
      if (room) {
        room.activePersonas = room.activePersonas.filter(p => p.id !== personaId);
      }
    }, 1000);
    
    room.lastActivity = Date.now();
    console.log(`[ROOM] ${personaId} left ${roomId}`);
  }
  
  recordPersonaTurn(roomId: string, personaId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    const persona = room.activePersonas.find(p => p.id === personaId);
    if (persona) {
      persona.lastSpokeAt = Date.now();
      persona.messageCount++;
      if (persona.status === 'joining') {
        persona.status = 'active';
      }
    }
    
    room.totalTurns++;
    room.turnsSinceDominantChange++;
    room.lastActivity = Date.now();
  }
  
  setDominantPersona(roomId: string, personaId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    if (room.dominantPersona !== personaId) {
      room.dominantPersona = personaId;
      room.turnsSinceDominantChange = 0;
      console.log(`[ROOM] Dominant persona changed to ${personaId} in ${roomId}`);
    }
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
  
  private contextsToTopicWeights(contexts: string[]): TopicWeight[] {
    if (contexts.length === 0) {
      return [{ topic: 'general', weight: 1.0 }];
    }
    
    const weight = 1.0 / contexts.length;
    return contexts.map(topic => ({ topic, weight }));
  }
}

export const persoRoomManager = new PersoRoomManager();

setInterval(() => {
  persoRoomManager.cleanup();
}, 5 * 60 * 1000);
