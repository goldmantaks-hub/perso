import { db } from "../db.js";
import { conversations, postConversations, conversationParticipants, posts, personas } from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { logger } from "../../shared/logger.js";

/**
 * 기존 대화방에 방장(owner) 역할을 설정하는 스크립트
 */
async function assignOwnersToExistingConversations() {
  logger.info('👑 기존 대화방에 방장 설정 시작...');

  try {
    // 1. 모든 post 타입 대화방 조회
    const allConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.scopeType, 'post'));

    logger.info(`📊 전체 post 대화방: ${allConversations.length}개`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 2. 각 대화방별 처리
    for (const conv of allConversations) {
      try {
        // post_conversations에서 postId 찾기
        const [postConv] = await db
          .select()
          .from(postConversations)
          .where(eq(postConversations.conversationId, conv.id));

        if (!postConv) {
          logger.warn(`⚠️  대화방 ${conv.id}에 연결된 게시물 없음`);
          skippedCount++;
          continue;
        }

        // 게시물 정보 조회
        const [post] = await db
          .select()
          .from(posts)
          .where(eq(posts.id, postConv.postId));

        if (!post) {
          logger.warn(`⚠️  게시물 ${postConv.postId} 찾을 수 없음`);
          skippedCount++;
          continue;
        }

        // 작성자의 페르소나 조회
        const [authorPersona] = await db
          .select()
          .from(personas)
          .where(eq(personas.userId, post.userId));

        if (!authorPersona) {
          logger.warn(`⚠️  사용자 ${post.userId}의 페르소나 없음 (게시물: ${post.title})`);
          skippedCount++;
          continue;
        }

        // 해당 페르소나가 이미 참가자인지 확인
        const existingParticipants = await db
          .select()
          .from(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.conversationId, conv.id),
              eq(conversationParticipants.participantType, 'persona'),
              eq(conversationParticipants.participantId, authorPersona.id)
            )
          );

        if (existingParticipants.length > 0) {
          // 이미 참가자로 있으면 role을 owner로 업데이트
          await db
            .update(conversationParticipants)
            .set({ role: 'owner' })
            .where(
              and(
                eq(conversationParticipants.conversationId, conv.id),
                eq(conversationParticipants.participantType, 'persona'),
                eq(conversationParticipants.participantId, authorPersona.id)
              )
            );

          logger.info(`✅ ${post.title}: ${authorPersona.name} → owner로 업데이트`);
          updatedCount++;
        } else {
          // 참가자로 없으면 owner로 추가
          await db
            .insert(conversationParticipants)
            .values({
              conversationId: conv.id,
              participantType: 'persona',
              participantId: authorPersona.id,
              role: 'owner',
            });

          logger.info(`✅ ${post.title}: ${authorPersona.name} → owner로 추가`);
          updatedCount++;
        }

      } catch (error: any) {
        logger.error(`❌ 대화방 ${conv.id} 처리 실패:`, error.message);
        errorCount++;
      }
    }

    logger.info(`\n📊 결과 요약:`);
    logger.info(`   전체 대화방: ${allConversations.length}개`);
    logger.info(`   방장 설정 완료: ${updatedCount}개 ✅`);
    logger.info(`   건너뜀: ${skippedCount}개`);
    logger.info(`   실패: ${errorCount}개`);

    return {
      success: true,
      total: allConversations.length,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errorCount,
      message: `${updatedCount}개 대화방에 방장 설정 완료`
    };

  } catch (error: any) {
    logger.error('❌ 방장 설정 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 현재 방장 상태 확인
 */
async function checkOwnerStatus() {
  logger.info('🔍 방장 상태 확인...');

  try {
    // 모든 post 대화방의 참가자 조회
    const allConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.scopeType, 'post'));

    let conversationsWithOwner = 0;
    let conversationsWithoutOwner = 0;
    let totalParticipants = 0;
    let ownerCount = 0;

    for (const conv of allConversations) {
      const participants = await db
        .select()
        .from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, conv.id));

      totalParticipants += participants.length;

      const owners = participants.filter(p => p.role === 'owner');
      ownerCount += owners.length;

      if (owners.length > 0) {
        conversationsWithOwner++;
      } else {
        conversationsWithoutOwner++;
      }
    }

    logger.info(`\n📊 방장 상태:`);
    logger.info(`   전체 대화방: ${allConversations.length}개`);
    logger.info(`   방장 있는 대화방: ${conversationsWithOwner}개 ✅`);
    logger.info(`   방장 없는 대화방: ${conversationsWithoutOwner}개 ${conversationsWithoutOwner > 0 ? '⚠️' : ''}`);
    logger.info(`   총 참가자 수: ${totalParticipants}명`);
    logger.info(`   총 방장 수: ${ownerCount}명`);

    return {
      success: true,
      totalConversations: allConversations.length,
      withOwner: conversationsWithOwner,
      withoutOwner: conversationsWithoutOwner,
      totalParticipants,
      totalOwners: ownerCount
    };

  } catch (error: any) {
    logger.error('❌ 방장 상태 확인 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  if (command === 'check') {
    // 상태만 확인
    checkOwnerStatus()
      .then((result) => {
        console.log('\n결과:', result);
        process.exit(0);
      })
      .catch((error) => {
        console.error('오류:', error);
        process.exit(1);
      });
  } else if (command === 'assign' || !command) {
    // 방장 설정 실행
    assignOwnersToExistingConversations()
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
    console.log('  npm run assign:owners check  - 현재 방장 상태 확인');
    console.log('  npm run assign:owners assign - 기존 대화방에 방장 설정');
    process.exit(1);
  }
}

export { assignOwnersToExistingConversations, checkOwnerStatus };

