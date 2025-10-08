import { AutoChatOrchestrator } from './autoChatOrchestrator.js';
import { persoRoomManager } from './persoRoom.js';

const orchestrators = new Map<string, AutoChatOrchestrator>();

function ensureOrchestrator(roomId: string): AutoChatOrchestrator {
  if (!orchestrators.has(roomId)) {
    orchestrators.set(roomId, new AutoChatOrchestrator(roomId));
  }
  return orchestrators.get(roomId)!;
}

export function onPostCreated(roomId: string) {
  console.log(`[AUTO TICK] Post created trigger for room ${roomId}`);
  const orch = ensureOrchestrator(roomId);
  orch.runBurst('post_created').catch(err => {
    console.error(`[AUTO TICK] Error in post_created burst for ${roomId}:`, err);
  });
}

export function onUserMessage(roomId: string) {
  console.log(`[AUTO TICK] User message trigger for room ${roomId}`);
  const orch = ensureOrchestrator(roomId);
  orch.runBurst('user_message').catch(err => {
    console.error(`[AUTO TICK] Error in user_message burst for ${roomId}:`, err);
  });
}

// 주기적인 아이들 틱 (10초마다 체크)
// 사용자 없이도 페르소나들끼리 대화가 계속 진행됨
setInterval(async () => {
  for (const roomId of persoRoomManager.ids()) {
    const room = persoRoomManager.get(roomId);
    if (!room || !room.autoChatEnabled) continue;

    const quietMs = Date.now() - (room.lastMessageAt?.getTime?.() ?? 0);
    // 30초 이상 조용하면 80% 확률로 대화 재개 (사용자 없이도 계속 진행)
    if (quietMs > 30000 && Math.random() < 0.8) {
      console.log(`[AUTO TICK] Idle tick triggered for room ${roomId} (quiet for ${Math.floor(quietMs / 1000)}s)`);
      const orch = ensureOrchestrator(roomId);
      await orch.runBurst('idle_tick').catch(err => {
        console.error(`[AUTO TICK] Error in idle_tick burst for ${roomId}:`, err);
      });
    }
  }
}, 10000);

console.log('[AUTO TICK] Auto-chat tick scheduler started');
