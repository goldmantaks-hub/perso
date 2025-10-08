import { db } from "../db.js";
import { messages, conversationParticipants, conversations } from "../../shared/schema.js";
import { eq, and } from "drizzle-orm";
import { logger } from "../../shared/logger.js";

/**
 * 기존 메시지 발신자들을 participant로 소급 등록
 */
async function migrateParticipants() {
  logger.info('🔄 기존 메시지 발신자 participant 마이그레이션 시작...\n');

  try {
    // 모든 post 대화방 조회
    const allConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.scopeType, 'post'));

    logger.info(`📊 전체 대화방: ${allConversations.length}개`);

    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const conv of allConversations) {
      // 이 대화방의 모든 메시지 발신자 조회
      const msgs = await db
        .select({
          senderType: messages.senderType,
          senderId: messages.senderId,
        })
        .from(messages)
        .where(eq(messages.conversationId, conv.id));

      // 발신자 중복 제거
      const uniqueSenders = new Map<string, { type: string; id: string }>();
      msgs.forEach(msg => {
        if (msg.senderType === 'persona' || msg.senderType === 'user') {
          const key = `${msg.senderType}-${msg.senderId}`;
          uniqueSenders.set(key, { type: msg.senderType, id: msg.senderId });
        }
      });

      logger.info(`\n대화방 ${conv.id.substring(0, 8)}...`);
      logger.info(`  고유 발신자: ${uniqueSenders.size}명`);

      // 각 발신자를 participant로 추가
      for (const [key, sender] of uniqueSenders) {
        try {
          // 이미 participant인지 확인
          const existing = await db
            .select()
            .from(conversationParticipants)
            .where(
              and(
                eq(conversationParticipants.conversationId, conv.id),
                eq(conversationParticipants.participantType, sender.type),
                eq(conversationParticipants.participantId, sender.id)
              )
            );

          if (existing.length > 0) {
            logger.info(`  ⏭️  ${sender.type} ${sender.id.substring(0, 8)}... 이미 존재`);
            skippedCount++;
            continue;
          }

          // participant로 추가
          await db.insert(conversationParticipants).values({
            conversationId: conv.id,
            participantType: sender.type as 'user' | 'persona',
            participantId: sender.id,
            role: 'member',
          });

          logger.info(`  ✅ ${sender.type} ${sender.id.substring(0, 8)}... 추가됨`);
          addedCount++;

        } catch (error: any) {
          logger.error(`  ❌ ${key} 추가 실패:`, error.message);
          errorCount++;
        }
      }
    }

    logger.info(`\n📊 결과 요약:`);
    logger.info(`   전체 대화방: ${allConversations.length}개`);
    logger.info(`   추가됨: ${addedCount}명 ✅`);
    logger.info(`   건너뜀 (이미 존재): ${skippedCount}명`);
    logger.info(`   실패: ${errorCount}명`);

    return {
      success: true,
      totalConversations: allConversations.length,
      added: addedCount,
      skipped: skippedCount,
      errors: errorCount,
      message: `${addedCount}명의 participant가 추가되었습니다.`
    };

  } catch (error: any) {
    logger.error('❌ 마이그레이션 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 마이그레이션 전 미리보기
 */
async function previewMigration() {
  logger.info('🔍 마이그레이션 미리보기...\n');

  try {
    const allConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.scopeType, 'post'));

    logger.info(`📊 전체 대화방: ${allConversations.length}개\n`);

    let totalSenders = 0;
    let totalExisting = 0;
    let totalToAdd = 0;

    for (const conv of allConversations) {
      const msgs = await db
        .select({
          senderType: messages.senderType,
          senderId: messages.senderId,
        })
        .from(messages)
        .where(eq(messages.conversationId, conv.id));

      const uniqueSenders = new Map<string, { type: string; id: string }>();
      msgs.forEach(msg => {
        if (msg.senderType === 'persona' || msg.senderType === 'user') {
          const key = `${msg.senderType}-${msg.senderId}`;
          uniqueSenders.set(key, { type: msg.senderType, id: msg.senderId });
        }
      });

      const existingParticipants = await db
        .select()
        .from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, conv.id));

      const toAdd = uniqueSenders.size - existingParticipants.length;

      logger.info(`대화방 ${conv.id.substring(0, 8)}...`);
      logger.info(`  메시지 발신자: ${uniqueSenders.size}명`);
      logger.info(`  현재 participant: ${existingParticipants.length}명`);
      logger.info(`  추가될 예정: ${Math.max(0, toAdd)}명\n`);

      totalSenders += uniqueSenders.size;
      totalExisting += existingParticipants.length;
      totalToAdd += Math.max(0, toAdd);
    }

    logger.info(`\n📊 전체 통계:`);
    logger.info(`   총 발신자: ${totalSenders}명`);
    logger.info(`   현재 participant: ${totalExisting}명`);
    logger.info(`   추가될 예정: ${totalToAdd}명`);

    return {
      success: true,
      totalConversations: allConversations.length,
      totalSenders,
      totalExisting,
      totalToAdd,
    };

  } catch (error: any) {
    logger.error('❌ 미리보기 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  if (command === 'preview') {
    // 미리보기
    previewMigration()
      .then((result) => {
        console.log('\n결과:', result);
        process.exit(0);
      })
      .catch((error) => {
        console.error('오류:', error);
        process.exit(1);
      });
  } else if (command === 'migrate' || !command) {
    // 마이그레이션 실행
    migrateParticipants()
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
    console.log('  npm run migrate:participants preview  - 마이그레이션 미리보기');
    console.log('  npm run migrate:participants migrate  - 마이그레이션 실행');
    process.exit(1);
  }
}

export { migrateParticipants, previewMigration };

