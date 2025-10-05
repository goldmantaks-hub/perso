import { dialogueOrchestrator } from './dialogueOrchestrator.js';

interface DialogueMemory {
  postId: string;
  messages: Array<{
    sender: string;
    senderType: 'user' | 'ai';
    message: string;
    timestamp: number;
  }>;
}

const dialogueMemoryStore: Map<string, DialogueMemory> = new Map();

interface PostContext {
  postId: string;
  postContent: string;
  analysis: {
    sentiment: {
      positive: number;
      neutral: number;
      negative: number;
    };
    tones?: string[];
  };
}

export async function handleUserMessage(
  userId: string,
  username: string,
  message: string,
  postContext: PostContext
): Promise<Array<{ persona: string; message: string; type: string }>> {
  const { postId, postContent, analysis } = postContext;

  let memory = dialogueMemoryStore.get(postId);
  if (!memory) {
    memory = {
      postId,
      messages: []
    };
    dialogueMemoryStore.set(postId, memory);
  }

  memory.messages.push({
    sender: username,
    senderType: 'user',
    message,
    timestamp: Date.now()
  });

  console.log(`[HUMAN BRIDGE] User ${username} said: "${message}"`);

  const recentContext = memory.messages
    .slice(-5)
    .map(m => `${m.sender}: ${m.message}`)
    .join('\n');

  const contextualPost = {
    id: postId,
    content: `원본 게시물: "${postContent}"\n\n최근 대화:\n${recentContext}\n\n사용자가 방금 말함: "${message}"`
  };

  const personaCount = Math.floor(Math.random() * 2) + 1;
  const availablePersonas = ['Espri', 'Kai', 'Milo', 'Luna', 'Namu', 'Eden', 'Ava', 'Rho', 'Noir'];
  const selectedPersonas = availablePersonas
    .sort(() => Math.random() - 0.5)
    .slice(0, personaCount);

  const aiResponses = await dialogueOrchestrator(contextualPost, analysis, selectedPersonas);

  for (const response of aiResponses) {
    memory.messages.push({
      sender: response.persona,
      senderType: 'ai',
      message: response.message,
      timestamp: Date.now()
    });
  }

  const cutoff = Date.now() - 30 * 60 * 1000;
  Array.from(dialogueMemoryStore.entries()).forEach(([postId, mem]) => {
    const lastMessageTime = mem.messages[mem.messages.length - 1]?.timestamp || 0;
    if (lastMessageTime < cutoff) {
      dialogueMemoryStore.delete(postId);
    }
  });

  console.log(`[HUMAN BRIDGE] Generated ${aiResponses.length} AI responses`);

  return aiResponses;
}

export function getDialogueMemory(postId: string): DialogueMemory | undefined {
  return dialogueMemoryStore.get(postId);
}

export function clearDialogueMemory(postId: string): void {
  dialogueMemoryStore.delete(postId);
}
