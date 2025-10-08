import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { messages } from '../../shared/schema.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/perso';
const client = postgres(connectionString);
const db = drizzle(client);

async function checkThinkingFields() {
  try {
    console.log('🔍 최근 메시지들의 thinking 필드 확인 중...\n');
    
    // 최근 10개 메시지 조회
    const recentMessages = await db
      .select({
        id: messages.id,
        content: messages.content,
        thinking: messages.thinking,
        senderType: messages.senderType,
        senderId: messages.senderId,
        createdAt: messages.createdAt
      })
      .from(messages)
      .orderBy(messages.createdAt)
      .limit(10);

    console.log(`📊 총 ${recentMessages.length}개의 최근 메시지:\n`);

    recentMessages.forEach((msg, index) => {
      console.log(`[${index + 1}] 메시지 ID: ${msg.id}`);
      console.log(`   발신자 타입: ${msg.senderType}`);
      console.log(`   발신자 ID: ${msg.senderId}`);
      console.log(`   내용: ${msg.content?.substring(0, 50)}...`);
      console.log(`   thinking 필드: ${msg.thinking ? `"${msg.thinking}"` : 'null'}`);
      console.log(`   thinking 길이: ${msg.thinking?.length || 0}`);
      console.log(`   생성일: ${msg.createdAt}`);
      console.log('---');
    });

    // thinking 필드가 있는 메시지 개수
    const messagesWithThinking = recentMessages.filter(msg => msg.thinking && msg.thinking !== '...');
    console.log(`\n✅ thinking 필드가 있는 메시지: ${messagesWithThinking.length}개`);
    console.log(`❌ thinking 필드가 없는 메시지: ${recentMessages.length - messagesWithThinking.length}개`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.end();
  }
}

checkThinkingFields();
