import { db } from "../db.js";
import { conversations, postConversations } from "../../shared/schema.js";
import { eq, notInArray } from "drizzle-orm";
import { logger } from "../../shared/logger.js";

/**
 * 게시물과 연결되지 않은 고아(orphan) 대화방 정리
 */
async function cleanupOrphanConversations() {
  logger.info('🧹 고아 대화방 정리 시작...');

  try {
    // 1. 모든 post 타입 대화방 조회
    const allConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.scopeType, 'post'));

    logger.info(`📊 전체 post 대화방: ${allConversations.length}개`);

    // 2. post_conversations에 연결된 대화방 ID 조회
    const linkedConversations = await db
      .select({ conversationId: postConversations.conversationId })
      .from(postConversations);

    const linkedIds = linkedConversations.map(lc => lc.conversationId);
    logger.info(`✅ 게시물과 연결된 대화방: ${linkedIds.length}개`);

    // 3. 고아 대화방 찾기
    const orphanConversations = allConversations.filter(
      conv => !linkedIds.includes(conv.id)
    );

    logger.info(`🗑️  고아 대화방: ${orphanConversations.length}개`);

    if (orphanConversations.length === 0) {
      logger.info('✨ 정리할 고아 대화방이 없습니다.');
      return {
        success: true,
        deletedCount: 0,
        message: '정리할 고아 대화방이 없습니다.'
      };
    }

    // 4. 삭제할 대화방 정보 출력
    logger.info('\n📋 삭제될 고아 대화방 목록:');
    orphanConversations.forEach((conv, index) => {
      logger.info(`   ${index + 1}. ID: ${conv.id}`);
      logger.info(`      Scope ID: ${conv.scopeId || 'N/A'}`);
      logger.info(`      생성일: ${conv.createdAt}`);
    });

    // 5. 고아 대화방 삭제 (CASCADE로 참가자, 메시지도 함께 삭제)
    const orphanIds = orphanConversations.map(c => c.id);
    
    const deleteResult = await db
      .delete(conversations)
      .where(notInArray(conversations.id, linkedIds.length > 0 ? linkedIds : ['dummy']))
      .returning();

    logger.info(`\n✅ ${deleteResult.length}개의 고아 대화방이 삭제되었습니다.`);

    // 6. 삭제 후 통계
    const remainingConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.scopeType, 'post'));

    logger.info(`\n📊 정리 후 통계:`);
    logger.info(`   전체 대화방: ${allConversations.length}개 → ${remainingConversations.length}개`);
    logger.info(`   삭제된 대화방: ${deleteResult.length}개`);
    logger.info(`   남은 대화방: ${remainingConversations.length}개`);

    return {
      success: true,
      deletedCount: deleteResult.length,
      deletedConversations: orphanConversations.map(c => ({
        id: c.id,
        scopeId: c.scopeId
      })),
      message: `${deleteResult.length}개의 고아 대화방이 삭제되었습니다.`
    };

  } catch (error: any) {
    logger.error('❌ 고아 대화방 정리 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 고아 대화방 목록 조회
 */
async function listOrphanConversations() {
  logger.info('📋 고아 대화방 조회...');

  try {
    const allConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.scopeType, 'post'));

    const linkedConversations = await db
      .select({ conversationId: postConversations.conversationId })
      .from(postConversations);

    const linkedIds = linkedConversations.map(lc => lc.conversationId);

    const orphanConversations = allConversations.filter(
      conv => !linkedIds.includes(conv.id)
    );

    logger.info(`\n📊 통계:`);
    logger.info(`   전체 대화방: ${allConversations.length}개`);
    logger.info(`   정상 대화방: ${linkedIds.length}개`);
    logger.info(`   고아 대화방: ${orphanConversations.length}개`);

    if (orphanConversations.length > 0) {
      logger.info(`\n📋 고아 대화방 목록:`);
      orphanConversations.forEach((conv, index) => {
        logger.info(`   ${index + 1}. ID: ${conv.id}`);
        logger.info(`      Scope ID: ${conv.scopeId || 'N/A'}`);
        logger.info(`      생성일: ${conv.createdAt}`);
      });
    }

    return {
      success: true,
      totalConversations: allConversations.length,
      linkedConversations: linkedIds.length,
      orphanConversations: orphanConversations.length,
      conversations: orphanConversations
    };

  } catch (error: any) {
    logger.error('❌ 고아 대화방 조회 실패:', error);
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
    listOrphanConversations()
      .then((result) => {
        console.log('\n결과:', result);
        process.exit(0);
      })
      .catch((error) => {
        console.error('오류:', error);
        process.exit(1);
      });
  } else if (command === 'delete' || !command) {
    cleanupOrphanConversations()
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
    console.log('  npm run cleanup:orphan list   - 고아 대화방 목록 조회');
    console.log('  npm run cleanup:orphan delete - 고아 대화방 삭제');
    process.exit(1);
  }
}

export { cleanupOrphanConversations, listOrphanConversations };

