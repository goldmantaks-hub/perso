import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { conversationParticipants } from '../../shared/schema.js';

async function cleanupDuplicateParticipants() {
  console.log('🔍 중복 참가자 정리 시작...\n');

  try {
    // 데이터베이스 연결
    const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/perso';
    const client = postgres(connectionString);
    const db = drizzle(client);
    // 1. 중복된 사용자 참가자 찾기
    const duplicateUsers = await db.execute(`
      SELECT conversation_id, participant_id, participant_type, user_id, 
             COUNT(*) as count
      FROM conversation_participants 
      WHERE participant_type = 'user'
      GROUP BY conversation_id, participant_id, participant_type, user_id
      HAVING COUNT(*) > 1
    `);

    console.log(`📊 중복된 사용자 참가자 발견: ${duplicateUsers.length}개`);

    for (const duplicate of duplicateUsers) {
      console.log(`\n--- 대화방 ${duplicate.conversation_id} ---`);
      console.log(`사용자 ID: ${duplicate.participant_id}`);
      console.log(`중복 수: ${duplicate.count}`);

      // 중복된 참가자 중 가장 오래된 것만 남기고 나머지 삭제
      const participants = await db.query.conversationParticipants.findMany({
        where: and(
          eq(conversationParticipants.conversationId, duplicate.conversation_id),
          eq(conversationParticipants.participantType, 'user'),
          eq(conversationParticipants.participantId, duplicate.participant_id)
        ),
        orderBy: (participants, { asc }) => [asc(participants.createdAt)]
      });

      // 첫 번째(가장 오래된) 것만 남기고 나머지 삭제
      const toDelete = participants.slice(1);
      
      for (const participant of toDelete) {
        await db.delete(conversationParticipants)
          .where(eq(conversationParticipants.id, participant.id));
        console.log(`✅ 중복 참가자 삭제: ${participant.id}`);
      }
    }

    console.log('\n🎉 중복 참가자 정리 완료!');

  } catch (error) {
    console.error('❌ 정리 중 오류 발생:', error);
  } finally {
    await client.end();
  }
}

cleanupDuplicateParticipants();
