interface PersonaMemoryEntry {
  personaId: string;
  type: 'interaction' | 'learning' | 'growth' | 'relationship';
  data: any;
  timestamp: Date;
}

interface PersonaRelationship {
  personaId: string;
  targetPersonaId: string;
  affinity: number;
  interactions: number;
  lastInteraction: Date;
}

export class PersonaMemory {
  private memories: Map<string, PersonaMemoryEntry[]> = new Map();
  private relationships: Map<string, PersonaRelationship[]> = new Map();
  
  async storeMemory(entry: PersonaMemoryEntry): Promise<void> {
    const history = this.memories.get(entry.personaId) || [];
    history.push(entry);
    
    if (history.length > 500) {
      history.shift();
    }
    
    this.memories.set(entry.personaId, history);
  }
  
  async getMemories(
    personaId: string,
    type?: string,
    limit: number = 50
  ): Promise<PersonaMemoryEntry[]> {
    let history = this.memories.get(personaId) || [];
    
    if (type) {
      history = history.filter(h => h.type === type);
    }
    
    return history.slice(-limit);
  }
  
  async updateRelationship(relationship: PersonaRelationship): Promise<void> {
    const relations = this.relationships.get(relationship.personaId) || [];
    const existing = relations.findIndex(
      r => r.targetPersonaId === relationship.targetPersonaId
    );
    
    if (existing >= 0) {
      relations[existing] = relationship;
    } else {
      relations.push(relationship);
    }
    
    this.relationships.set(relationship.personaId, relations);
  }
  
  async getRelationships(personaId: string): Promise<PersonaRelationship[]> {
    return this.relationships.get(personaId) || [];
  }
}
