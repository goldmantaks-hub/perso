interface DialogueMessage {
  id: string;
  postId: string;
  sender: string;
  senderType: 'user' | 'ai';
  personaName?: string;
  message: string;
  sentiment?: {
    positive: number;
    neutral: number;
    negative: number;
  };
  timestamp: number;
}

const messageStore: Map<string, DialogueMessage[]> = new Map();
const MAX_MESSAGES_PER_POST = 50;

export function storeMessage(message: DialogueMessage): void {
  const postId = message.postId;
  
  let messages = messageStore.get(postId);
  if (!messages) {
    messages = [];
    messageStore.set(postId, messages);
  }

  messages.push(message);

  if (messages.length > MAX_MESSAGES_PER_POST) {
    messages.shift();
  }

  console.log(`[DIALOGUE MEMORY] Stored message for post ${postId} (${messages.length}/${MAX_MESSAGES_PER_POST})`);
}

export function getMessages(postId: string, limit?: number): DialogueMessage[] {
  const messages = messageStore.get(postId) || [];
  
  if (limit) {
    return messages.slice(-limit);
  }
  
  return messages;
}

export function getRecentMessages(postId: string, minutes: number = 30): DialogueMessage[] {
  const messages = messageStore.get(postId) || [];
  const cutoff = Date.now() - (minutes * 60 * 1000);
  
  return messages.filter(m => m.timestamp >= cutoff);
}

export function clearMessages(postId: string): void {
  messageStore.delete(postId);
  console.log(`[DIALOGUE MEMORY] Cleared messages for post ${postId}`);
}

export function cleanupOldMessages(maxAgeMinutes: number = 120): void {
  const cutoff = Date.now() - (maxAgeMinutes * 60 * 1000);
  let cleaned = 0;

  for (const [postId, messages] of messageStore.entries()) {
    const recentMessages = messages.filter(m => m.timestamp >= cutoff);
    
    if (recentMessages.length === 0) {
      messageStore.delete(postId);
      cleaned++;
    } else if (recentMessages.length < messages.length) {
      messageStore.set(postId, recentMessages);
    }
  }

  if (cleaned > 0) {
    console.log(`[DIALOGUE MEMORY] Cleaned up ${cleaned} old post conversations`);
  }
}

export function getMessageStats(postId: string): {
  total: number;
  userMessages: number;
  aiMessages: number;
  averageSentiment: { positive: number; neutral: number; negative: number };
} {
  const messages = messageStore.get(postId) || [];
  
  const userMessages = messages.filter(m => m.senderType === 'user').length;
  const aiMessages = messages.filter(m => m.senderType === 'ai').length;
  
  const sentiments = messages
    .filter(m => m.sentiment)
    .map(m => m.sentiment!);
  
  const averageSentiment = sentiments.length > 0
    ? {
        positive: sentiments.reduce((sum, s) => sum + s.positive, 0) / sentiments.length,
        neutral: sentiments.reduce((sum, s) => sum + s.neutral, 0) / sentiments.length,
        negative: sentiments.reduce((sum, s) => sum + s.negative, 0) / sentiments.length,
      }
    : { positive: 0, neutral: 0, negative: 0 };

  return {
    total: messages.length,
    userMessages,
    aiMessages,
    averageSentiment
  };
}
