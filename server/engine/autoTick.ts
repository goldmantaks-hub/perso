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

// 각 방마다 다음 대화 시간을 저장 (자연스러운 간격)
const roomNextChatTime = new Map<string, number>();

// 각 방마다 랜덤한 대화 간격 생성 (30-90초)
function getRandomChatInterval(): number {
  return 30000 + Math.random() * 60000; // 30-90초
}

// 각 방마다 랜덤한 확률 (50-90%)
function getRandomChatProbability(): number {
  return 0.5 + Math.random() * 0.4; // 0.5-0.9
}

// 주기적인 아이들 틱 (5초마다 체크 - 더 세밀한 타이밍)
// 사용자 없이도 페르소나들끼리 대화가 계속 진행됨
setInterval(async () => {
  const now = Date.now();
  
  for (const roomId of persoRoomManager.ids()) {
    const room = persoRoomManager.get(roomId);
    if (!room || !room.autoChatEnabled) continue;

    const quietMs = now - (room.lastMessageAt?.getTime?.() ?? 0);
    
    // 각 방마다 다음 대화 시간이 없으면 생성
    if (!roomNextChatTime.has(roomId)) {
      roomNextChatTime.set(roomId, now + getRandomChatInterval());
    }
    
    const nextChatTime = roomNextChatTime.get(roomId)!;
    const probability = getRandomChatProbability();
    
    // 다음 대화 시간이 되었고 랜덤 확률 통과하면 대화 시작
    if (now >= nextChatTime && quietMs > 25000 && Math.random() < probability) {
      console.log(`[AUTO TICK] Idle tick triggered for room ${roomId} (quiet for ${Math.floor(quietMs / 1000)}s, probability: ${(probability * 100).toFixed(0)}%)`);
      const orch = ensureOrchestrator(roomId);
      
      // 다음 대화 시간 재설정 (자연스러운 간격)
      roomNextChatTime.set(roomId, now + getRandomChatInterval());
      
      await orch.runBurst('idle_tick').catch(err => {
        console.error(`[AUTO TICK] Error in idle_tick burst for ${roomId}:`, err);
      });
    }
  }
}, 5000); // 5초마다 체크

console.log('[AUTO TICK] Auto-chat tick scheduler started');
