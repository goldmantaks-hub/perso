import { DialogueMemory } from './dialogueMemory.js';
import { PersonaMemory } from './personaMemory.js';

export class MemorySync {
  private dialogueMemory: DialogueMemory;
  private personaMemory: PersonaMemory;
  
  constructor() {
    this.dialogueMemory = new DialogueMemory();
    this.personaMemory = new PersonaMemory();
  }
  
  async syncDialogueToPersona(
    conversationId: string,
    personaId: string
  ): Promise<void> {
    const context = await this.dialogueMemory.getDialogueContext(conversationId);
    
    await this.personaMemory.storeMemory({
      personaId,
      type: 'interaction',
      data: {
        conversationId,
        participants: context.participants,
        messageCount: context.recentMessages.length
      },
      timestamp: new Date()
    });
  }
  
  async syncGrowthToMemory(
    personaId: string,
    deltas: any
  ): Promise<void> {
    await this.personaMemory.storeMemory({
      personaId,
      type: 'growth',
      data: deltas,
      timestamp: new Date()
    });
  }
  
  async syncRelationship(
    personaId: string,
    targetPersonaId: string,
    affinity: number
  ): Promise<void> {
    const relations = await this.personaMemory.getRelationships(personaId);
    const existing = relations.find(r => r.targetPersonaId === targetPersonaId);
    
    await this.personaMemory.updateRelationship({
      personaId,
      targetPersonaId,
      affinity: existing ? existing.affinity + affinity : affinity,
      interactions: existing ? existing.interactions + 1 : 1,
      lastInteraction: new Date()
    });
  }
  
  getDialogueMemory(): DialogueMemory {
    return this.dialogueMemory;
  }
  
  getPersonaMemory(): PersonaMemory {
    return this.personaMemory;
  }
}
