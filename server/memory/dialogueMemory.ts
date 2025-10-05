interface DialogueEntry {
  id: string;
  conversationId: string;
  personaId: string;
  content: string;
  emotion: string;
  timestamp: Date;
}

interface DialogueContext {
  conversationId: string;
  recentMessages: DialogueEntry[];
  participants: string[];
}

export class DialogueMemory {
  private conversations: Map<string, DialogueEntry[]> = new Map();
  
  async saveDialogue(entry: DialogueEntry): Promise<void> {
    const history = this.conversations.get(entry.conversationId) || [];
    history.push(entry);
    
    if (history.length > 100) {
      history.shift();
    }
    
    this.conversations.set(entry.conversationId, history);
  }
  
  async getRecentDialogue(
    conversationId: string,
    limit: number = 10
  ): Promise<DialogueEntry[]> {
    const history = this.conversations.get(conversationId) || [];
    return history.slice(-limit);
  }
  
  async getDialogueContext(conversationId: string): Promise<DialogueContext> {
    const history = this.conversations.get(conversationId) || [];
    const participants = Array.from(new Set(history.map(h => h.personaId)));
    
    return {
      conversationId,
      recentMessages: history.slice(-10),
      participants
    };
  }
  
  async clearDialogue(conversationId: string): Promise<void> {
    this.conversations.delete(conversationId);
  }
}
