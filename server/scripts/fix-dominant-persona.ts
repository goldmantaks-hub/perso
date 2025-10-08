import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { conversations, conversationParticipants } from '../../shared/schema.js';

async function fixDominantPersona() {
  console.log('🔧 주도권 수정 시작...\n');

  try {
    // 데이터베이스 연결
    const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/perso';
    const client = postgres(connectionString);
    const db = drizzle(client);
    // 1. 모든 대화방의 주도권 확인
    const allConversations = await db.query.conversations.findMany();
    
    for (const conversation of allConversations) {
      console.log(`\n--- 대화방 ${conversation.id} ---`);
      console.log(`현재 주도권: ${conversation.dominantPersona}`);
      
      // 2. 활성 페르소나 참가자 확인
      const activePersonas = await db.query.conversationParticipants.findMany({
        where: and(
          eq(conversationParticipants.conversationId, conversation.id),
          eq(conversationParticipants.participantType, 'persona')
        )
      });

      console.log(`활성 페르소나 수: ${activePersonas.length}`);
      
      if (activePersonas.length > 0) {
        // 3. 주도권이 활성 페르소나 중에 있는지 확인
        const isDominantActive = activePersonas.some(p => p.participantId === conversation.dominantPersona);
        
        if (!isDominantActive) {
          // 4. 첫 번째 활성 페르소나로 주도권 변경
          const newDominant = activePersonas[0].participantId;
          await db.update(conversations)
            .set({ dominantPersona: newDominant })
            .where(eq(conversations.id, conversation.id));
          
          console.log(`✅ 주도권 변경: ${conversation.dominantPersona} → ${newDominant}`);
        } else {
          console.log(`✅ 주도권이 올바름: ${conversation.dominantPersona}`);
        }
      } else {
        // 활성 페르소나가 없으면 주도권을 null로 설정
        await db.update(conversations)
          .set({ dominantPersona: null })
          .where(eq(conversations.id, conversation.id));
        
        console.log(`✅ 주도권 초기화: ${conversation.dominantPersona} → null`);
      }
    }

    console.log('\n🎉 주도권 수정 완료!');

  } catch (error) {
    console.error('❌ 수정 중 오류 발생:', error);
  } finally {
    await client.end();
  }
}

fixDominantPersona();
