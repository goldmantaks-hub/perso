import { db } from "../db.js";
import { posts, conversations, postConversations, conversationParticipants, messages } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { logger } from "../../shared/logger.js";

/**
 * 게시물별 대화방 상세 정보 조회
 */
async function checkPostConversations() {
  logger.info('🔍 게시물별 대화방 상태 확인 시작...');

  try {
    // 1. 모든 게시물 조회
    const allPosts = await db.select().from(posts).orderBy(posts.createdAt);
    logger.info(`📊 전체 게시물: ${allPosts.length}개\n`);

    // 2. 각 게시물별 상세 정보 조회
    for (const post of allPosts) {
      logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      logger.info(`📝 게시물: "${post.title}"`);
      logger.info(`   ID: ${post.id}`);
      logger.info(`   작성일: ${post.createdAt}`);

      // 대화방 연결 정보 조회
      const postConv = await db
        .select()
        .from(postConversations)
        .where(eq(postConversations.postId, post.id));

      if (postConv.length === 0) {
        logger.warn(`   ⚠️  대화방 연결 없음 (post_conversations에 없음)`);
        continue;
      }

      const convId = postConv[0].conversationId;
      logger.info(`   ✅ 대화방 연결됨: ${convId}`);

      // 대화방 상세 정보 조회
      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, convId));

      if (!conv) {
        logger.error(`   ❌ 대화방 데이터 없음 (conversations 테이블)`);
        continue;
      }

      logger.info(`   📍 대화방 타입: ${conv.scopeType}`);
      logger.info(`   📍 생성자: ${conv.createdByType} (${conv.createdById})`);
      logger.info(`   📍 생성일: ${conv.createdAt}`);

      // 참가자 조회
      const participants = await db
        .select()
        .from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, convId));

      logger.info(`   👥 참가자: ${participants.length}명`);
      participants.forEach((p, idx) => {
        logger.info(`      ${idx + 1}. ${p.participantType} (${p.participantId}) - ${p.role}`);
      });

      // 메시지 조회
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, convId));

      logger.info(`   💬 메시지: ${msgs.length}개`);
      
      if (msgs.length > 0) {
        // 메시지 타입별 분류
        const systemMsgs = msgs.filter(m => m.messageType === 'system' || m.messageType === 'join' || m.messageType === 'leave');
        const aiMsgs = msgs.filter(m => m.senderType === 'persona' && m.messageType !== 'system' && m.messageType !== 'join' && m.messageType !== 'leave');
        const userMsgs = msgs.filter(m => m.senderType === 'user');

        logger.info(`      - 시스템 메시지: ${systemMsgs.length}개`);
        logger.info(`      - AI 메시지: ${aiMsgs.length}개`);
        logger.info(`      - 사용자 메시지: ${userMsgs.length}개`);

        // 최근 메시지 5개 미리보기
        const recentMsgs = msgs.slice(-5);
        logger.info(`   📋 최근 메시지 (최대 5개):`);
        recentMsgs.forEach((m, idx) => {
          const preview = m.content.length > 50 ? m.content.substring(0, 50) + '...' : m.content;
          logger.info(`      ${idx + 1}. [${m.senderType}/${m.messageType}] ${preview}`);
        });
      } else {
        logger.warn(`      ⚠️  메시지가 없습니다 (빈 대화방)`);
      }

      logger.info('');
    }

    logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    logger.info(`\n✅ 검사 완료`);

    // 요약 통계
    const summary = {
      totalPosts: allPosts.length,
      postsWithConversations: 0,
      postsWithMessages: 0,
      totalMessages: 0,
      totalParticipants: 0
    };

    for (const post of allPosts) {
      const postConv = await db
        .select()
        .from(postConversations)
        .where(eq(postConversations.postId, post.id));

      if (postConv.length > 0) {
        summary.postsWithConversations++;

        const convId = postConv[0].conversationId;
        const msgs = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, convId));

        if (msgs.length > 0) {
          summary.postsWithMessages++;
        }
        summary.totalMessages += msgs.length;

        const participants = await db
          .select()
          .from(conversationParticipants)
          .where(eq(conversationParticipants.conversationId, convId));

        summary.totalParticipants += participants.length;
      }
    }

    logger.info(`\n📊 요약 통계:`);
    logger.info(`   전체 게시물: ${summary.totalPosts}개`);
    logger.info(`   대화방 있는 게시물: ${summary.postsWithConversations}개`);
    logger.info(`   메시지가 있는 게시물: ${summary.postsWithMessages}개`);
    logger.info(`   메시지가 없는 게시물: ${summary.postsWithConversations - summary.postsWithMessages}개`);
    logger.info(`   총 메시지 수: ${summary.totalMessages}개`);
    logger.info(`   총 참가자 수: ${summary.totalParticipants}명`);

    return {
      success: true,
      summary,
      posts: allPosts.map(p => ({
        id: p.id,
        title: p.title
      }))
    };

  } catch (error: any) {
    logger.error('❌ 검사 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  checkPostConversations()
    .then((result) => {
      console.log('\n결과:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('오류:', error);
      process.exit(1);
    });
}

export { checkPostConversations };

