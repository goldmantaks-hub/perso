import { db } from "../db.js";
import { conversations, postConversations, conversationParticipants, messages } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { logger } from "../../shared/logger.js";

/**
 * 빈 대화방(참가자 0명, 메시지 0개)을 정리하는 스크립트
 */
async function cleanupEmptyConversations() {
  logger.info('🧹 빈 대화방 정리 시작...');

  try {
    // 1. 모든 대화방 조회
    const allConversations = await db.select().from(conversations);
    logger.info(`📊 전체 대화방: ${allConversations.length}개`);

    const emptyConversations = [];

    // 2. 각 대화방별 참가자/메시지 확인
    for (const conv of allConversations) {
      const participants = await db
        .select()
        .from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, conv.id));

      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id));

      if (participants.length === 0 && msgs.length === 0) {
        emptyConversations.push({
          id: conv.id,
          scopeType: conv.scopeType,
          scopeId: conv.scopeId,
          createdAt: conv.createdAt
        });
      }
    }

    logger.info(`🗑️  빈 대화방: ${emptyConversations.length}개`);

    if (emptyConversations.length === 0) {
      logger.info('✨ 정리할 빈 대화방이 없습니다.');
      return {
        success: true,
        deletedCount: 0,
        message: '정리할 빈 대화방이 없습니다.'
      };
    }

    // 3. 삭제할 대화방 정보 출력
    logger.info('\n📋 삭제될 빈 대화방 목록:');
    emptyConversations.forEach((conv, index) => {
      logger.info(`   ${index + 1}. ${conv.scopeType} (ID: ${conv.id})`);
      logger.info(`      Scope ID: ${conv.scopeId || 'N/A'}`);
      logger.info(`      생성일: ${conv.createdAt}`);
    });

    // 4. 빈 대화방 삭제
    const deletedConvIds = [];
    for (const conv of emptyConversations) {
      // post_conversations 연결 삭제
      await db
        .delete(postConversations)
        .where(eq(postConversations.conversationId, conv.id));

      // conversation 삭제
      await db
        .delete(conversations)
        .where(eq(conversations.id, conv.id));

      deletedConvIds.push(conv.id);
    }

    logger.info(`\n✅ ${deletedConvIds.length}개의 빈 대화방이 삭제되었습니다.`);

    // 5. 삭제 후 통계
    const remainingConversations = await db.select().from(conversations);
    logger.info(`\n📊 정리 후 통계:`);
    logger.info(`   전체 대화방: ${allConversations.length}개 → ${remainingConversations.length}개`);
    logger.info(`   삭제된 대화방: ${deletedConvIds.length}개`);
    logger.info(`   남은 대화방: ${remainingConversations.length}개`);

    return {
      success: true,
      deletedCount: deletedConvIds.length,
      deletedConversations: emptyConversations.map(c => ({
        id: c.id,
        scopeType: c.scopeType,
        scopeId: c.scopeId
      })),
      message: `${deletedConvIds.length}개의 빈 대화방이 삭제되었습니다.`
    };

  } catch (error: any) {
    logger.error('❌ 빈 대화방 정리 실패:', error);
    return {
      success: false,
      error: error.message,
      message: '빈 대화방 정리 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 빈 대화방 목록만 조회 (삭제하지 않음)
 */
async function listEmptyConversations() {
  logger.info('📋 빈 대화방 조회...');

  try {
    const allConversations = await db.select().from(conversations);
    const emptyConversations = [];

    for (const conv of allConversations) {
      const participants = await db
        .select()
        .from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, conv.id));

      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id));

      if (participants.length === 0 && msgs.length === 0) {
        emptyConversations.push({
          id: conv.id,
          scopeType: conv.scopeType,
          scopeId: conv.scopeId,
          createdAt: conv.createdAt
        });
      }
    }

    logger.info(`\n📊 통계:`);
    logger.info(`   전체 대화방: ${allConversations.length}개`);
    logger.info(`   정상 대화방: ${allConversations.length - emptyConversations.length}개`);
    logger.info(`   빈 대화방: ${emptyConversations.length}개`);

    if (emptyConversations.length > 0) {
      logger.info(`\n📋 빈 대화방 목록:`);
      emptyConversations.forEach((conv, index) => {
        logger.info(`   ${index + 1}. ${conv.scopeType} (ID: ${conv.id})`);
        logger.info(`      Scope ID: ${conv.scopeId || 'N/A'}`);
        logger.info(`      생성일: ${conv.createdAt}`);
      });
    }

    return {
      success: true,
      totalConversations: allConversations.length,
      normalConversations: allConversations.length - emptyConversations.length,
      emptyConversations: emptyConversations.length,
      conversations: emptyConversations
    };

  } catch (error: any) {
    logger.error('❌ 빈 대화방 조회 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  if (command === 'list') {
    // 목록만 조회
    listEmptyConversations()
      .then((result) => {
        console.log('\n결과:', result);
        process.exit(0);
      })
      .catch((error) => {
        console.error('오류:', error);
        process.exit(1);
      });
  } else if (command === 'delete' || !command) {
    // 삭제 실행
    cleanupEmptyConversations()
      .then((result) => {
        console.log('\n결과:', result);
        process.exit(0);
      })
      .catch((error) => {
        console.error('오류:', error);
        process.exit(1);
      });
  } else {
    console.log('사용법:');
    console.log('  npm run cleanup:conversations list   - 빈 대화방 목록 조회');
    console.log('  npm run cleanup:conversations delete - 빈 대화방 삭제');
    process.exit(1);
  }
}

export { cleanupEmptyConversations, listEmptyConversations };

