import { db } from "./db";
import { 
  persoMessages, 
  conversations, 
  conversationParticipants, 
  messages, 
  postConversations,
  posts 
} from "@shared/schema";
import { eq, sql } from "drizzle-orm";

async function migrateMessages() {
  console.log("🔄 메시징 시스템 마이그레이션 시작...");

  try {
    // 1. 기존 post별로 conversation 생성
    console.log("1️⃣ Post별 conversation 생성 중...");
    
    const existingMessages = await db.select().from(persoMessages);
    const postIds = Array.from(new Set(existingMessages.map(m => m.postId)));
    
    const conversationMap = new Map<string, string>(); // postId -> conversationId
    
    for (const postId of postIds) {
      const postMessages = existingMessages.filter(m => m.postId === postId);
      const firstMessage = postMessages.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )[0];
      
      // Conversation 생성
      const [conv] = await db.insert(conversations).values({
        scopeType: 'post',
        scopeId: postId,
        createdByType: firstMessage.isAI ? 'persona' : 'user',
        createdById: (firstMessage.personaId || firstMessage.userId)!,
        createdAt: firstMessage.createdAt,
        updatedAt: postMessages[postMessages.length - 1]?.createdAt || firstMessage.createdAt,
      }).returning();
      
      conversationMap.set(postId, conv.id);
      
      // post_conversations 연결
      await db.insert(postConversations).values({
        postId,
        conversationId: conv.id,
      });
      
      console.log(`  ✓ Post ${postId.slice(0, 8)}... → Conversation ${conv.id.slice(0, 8)}...`);
    }

    console.log(`✅ ${conversationMap.size}개의 conversation 생성 완료`);

    // 2. 기존 메시지를 새 messages 테이블로 복사
    console.log("\n2️⃣ 메시지 복사 중...");
    
    let migratedCount = 0;
    for (const oldMsg of existingMessages) {
      const conversationId = conversationMap.get(oldMsg.postId);
      if (!conversationId) {
        console.warn(`  ⚠️ Conversation을 찾을 수 없음: ${oldMsg.postId}`);
        continue;
      }
      
      await db.insert(messages).values({
        id: oldMsg.id, // 기존 ID 유지
        conversationId,
        senderType: oldMsg.isAI ? 'persona' : 'user',
        senderId: (oldMsg.personaId || oldMsg.userId)!,
        content: oldMsg.content,
        messageType: 'text',
        createdAt: oldMsg.createdAt,
      });
      
      migratedCount++;
    }
    
    console.log(`✅ ${migratedCount}개의 메시지 복사 완료`);

    // 3. 참가자 자동 생성
    console.log("\n3️⃣ 참가자 생성 중...");
    
    const allMessages = await db.select().from(messages);
    const participantSet = new Set<string>();
    
    for (const msg of allMessages) {
      const key = `${msg.conversationId}|${msg.senderType}|${msg.senderId}`;
      if (!participantSet.has(key)) {
        participantSet.add(key);
        
        await db.insert(conversationParticipants).values({
          conversationId: msg.conversationId,
          participantType: msg.senderType,
          participantId: msg.senderId,
          role: 'member',
          joinedAt: msg.createdAt,
        });
      }
    }
    
    console.log(`✅ ${participantSet.size}명의 참가자 생성 완료`);

    console.log("\n🎉 마이그레이션 완료!");
    console.log("\n📊 요약:");
    console.log(`  - Conversations: ${conversationMap.size}개`);
    console.log(`  - Messages: ${migratedCount}개`);
    console.log(`  - Participants: ${participantSet.size}명`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ 마이그레이션 실패:", error);
    process.exit(1);
  }
}

migrateMessages();
