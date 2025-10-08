import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { conversations, conversationParticipants, posts, personas, users } from '../../shared/schema.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/perso';
const client = postgres(connectionString);
const db = drizzle(client);

async function checkRoomStatus(conversationId: string) {
  try {
    console.log(`[ROOM STATUS] 방 ID: ${conversationId} 상태 확인 중...`);
    
    // 대화방 정보 조회
    const conversation = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    
    if (conversation.length === 0) {
      console.log('❌ 해당 대화방이 존재하지 않습니다.');
      return;
    }
    
    console.log('✅ 대화방 정보:', conversation[0]);
    
    // 게시물 정보 조회
    const post = await db
      .select()
      .from(posts)
      .where(eq(posts.conversationId, conversationId))
      .limit(1);
    
    if (post.length === 0) {
      console.log('❌ 해당 대화방에 연결된 게시물이 없습니다.');
      return;
    }
    
    console.log('✅ 게시물 정보:', {
      id: post[0].id,
      title: post[0].title,
      authorId: post[0].authorId
    });
    
    // 게시물 작성자 정보 조회
    const author = await db
      .select()
      .from(users)
      .where(eq(users.id, post[0].authorId))
      .limit(1);
    
    if (author.length === 0) {
      console.log('❌ 게시물 작성자를 찾을 수 없습니다.');
      return;
    }
    
    console.log('✅ 게시물 작성자:', {
      id: author[0].id,
      username: author[0].username,
      name: author[0].name
    });
    
    // 작성자의 페르소나 조회
    const authorPersonas = await db
      .select()
      .from(personas)
      .where(eq(personas.userId, post[0].authorId));
    
    console.log('✅ 작성자의 페르소나들:', authorPersonas.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description
    })));
    
    // 현재 참가자들 조회
    const participants = await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));
    
    console.log('✅ 현재 참가자들:', participants.map(p => ({
      participantType: p.participantType,
      participantId: p.participantId,
      role: p.role,
      joinedAt: p.joinedAt
    })));
    
    // 소유주 페르소나가 참가자인지 확인
    const ownerPersona = authorPersonas.find(p => 
      participants.some(participant => 
        participant.participantType === 'persona' && 
        participant.participantId === p.id &&
        participant.role === 'owner'
      )
    );
    
    if (ownerPersona) {
      console.log('✅ 소유주 페르소나가 참가 중:', {
        id: ownerPersona.id,
        name: ownerPersona.name
      });
    } else {
      console.log('❌ 소유주 페르소나가 참가하지 않음');
      
      // 소유주 페르소나를 다시 추가
      if (authorPersonas.length > 0) {
        const primaryPersona = authorPersonas[0]; // 첫 번째 페르소나를 기본으로 사용
        
        console.log('🔄 소유주 페르소나를 다시 추가 중...');
        
        await db.insert(conversationParticipants).values({
          conversationId: conversationId,
          participantType: 'persona',
          participantId: primaryPersona.id,
          role: 'owner',
          joinedAt: new Date()
        });
        
        console.log('✅ 소유주 페르소나 추가 완료:', {
          id: primaryPersona.id,
          name: primaryPersona.name
        });
      } else {
        console.log('❌ 작성자의 페르소나가 없어서 추가할 수 없습니다.');
      }
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.end();
  }
}

// 명령행 인수에서 방 ID 가져오기
const conversationId = process.argv[2];
if (!conversationId) {
  console.log('사용법: npm run check:room <conversationId>');
  process.exit(1);
}

checkRoomStatus(conversationId);
