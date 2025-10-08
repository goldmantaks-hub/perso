import { db } from "../db.js";
import { conversationParticipants, personas, users, conversations, postConversations } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { logger } from "../../shared/logger.js";

/**
 * 참가자 개념 분석 스크립트
 * 1. 참가자 타입 확인 (사용자 / 페르소나)
 * 2. 각 그룹별 입장 상태 확인
 */
async function analyzeParticipants() {
  logger.info('🔍 참가자 개념 분석 시작...\n');

  try {
    // 1. 모든 참가자 조회
    const allParticipants = await db
      .select()
      .from(conversationParticipants);

    logger.info(`📊 전체 참가자 수: ${allParticipants.length}명`);

    // 2. 참가자 타입별 분류
    const userParticipants = allParticipants.filter(p => p.participantType === 'user');
    const personaParticipants = allParticipants.filter(p => p.participantType === 'persona');
    const otherParticipants = allParticipants.filter(p => 
      p.participantType !== 'user' && p.participantType !== 'persona'
    );

    logger.info(`\n📋 참가자 타입별 분류:`);
    logger.info(`   👤 사용자 (user): ${userParticipants.length}명`);
    logger.info(`   🤖 페르소나 (persona): ${personaParticipants.length}명`);
    if (otherParticipants.length > 0) {
      logger.info(`   ❓ 기타 타입: ${otherParticipants.length}명`);
      otherParticipants.forEach(p => {
        logger.info(`      - ${p.participantType}: ${p.participantId}`);
      });
    }

    // 3. 역할(role)별 분류
    logger.info(`\n👑 역할(role)별 분류:`);
    const ownerCount = allParticipants.filter(p => p.role === 'owner').length;
    const moderatorCount = allParticipants.filter(p => p.role === 'moderator').length;
    const memberCount = allParticipants.filter(p => p.role === 'member').length;
    const otherRoles = allParticipants.filter(p => 
      p.role !== 'owner' && p.role !== 'moderator' && p.role !== 'member'
    );

    logger.info(`   👑 방장 (owner): ${ownerCount}명`);
    logger.info(`   🛡️  모더레이터 (moderator): ${moderatorCount}명`);
    logger.info(`   👥 일반 멤버 (member): ${memberCount}명`);
    if (otherRoles.length > 0) {
      logger.info(`   ❓ 기타 역할: ${otherRoles.length}명`);
    }

    // 4. isActive 상태별 분류
    logger.info(`\n✅ 활성 상태별 분류:`);
    const activeCount = allParticipants.filter(p => p.isActive).length;
    const inactiveCount = allParticipants.filter(p => !p.isActive).length;

    logger.info(`   ✅ 활성 (isActive=true): ${activeCount}명`);
    logger.info(`   ❌ 비활성 (isActive=false): ${inactiveCount}명`);

    // 5. 대화방별 참가자 통계
    logger.info(`\n🏠 대화방별 참가자 분석:`);
    const allConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.scopeType, 'post'));

    logger.info(`   전체 post 대화방: ${allConversations.length}개`);

    for (const conv of allConversations) {
      const participants = await db
        .select()
        .from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, conv.id));

      const users = participants.filter(p => p.participantType === 'user');
      const personas = participants.filter(p => p.participantType === 'persona');
      const owners = participants.filter(p => p.role === 'owner');

      // 게시물 정보 가져오기
      const [postConv] = await db
        .select()
        .from(postConversations)
        .where(eq(postConversations.conversationId, conv.id));

      logger.info(`\n   대화방 ID: ${conv.id.substring(0, 8)}...`);
      logger.info(`      게시물 ID: ${postConv?.postId?.substring(0, 8) || 'N/A'}...`);
      logger.info(`      총 참가자: ${participants.length}명`);
      logger.info(`      👤 사용자: ${users.length}명`);
      logger.info(`      🤖 페르소나: ${personas.length}명`);
      logger.info(`      👑 방장: ${owners.length}명 ${owners.map(o => 
        `(${o.participantType}: ${o.participantId.substring(0, 8)}...)`
      ).join(', ')}`);
    }

    // 6. 사용자 그룹 상세 분석
    logger.info(`\n\n👤 사용자 그룹 상세 분석:`);
    logger.info(`   총 사용자 참가자: ${userParticipants.length}명`);
    
    const userStats = {
      owner: userParticipants.filter(p => p.role === 'owner').length,
      moderator: userParticipants.filter(p => p.role === 'moderator').length,
      member: userParticipants.filter(p => p.role === 'member').length,
      active: userParticipants.filter(p => p.isActive).length,
      inactive: userParticipants.filter(p => !p.isActive).length,
    };

    logger.info(`   역할 분포:`);
    logger.info(`      👑 방장: ${userStats.owner}명`);
    logger.info(`      🛡️  모더레이터: ${userStats.moderator}명`);
    logger.info(`      👥 일반 멤버: ${userStats.member}명`);
    logger.info(`   상태 분포:`);
    logger.info(`      ✅ 활성: ${userStats.active}명`);
    logger.info(`      ❌ 비활성: ${userStats.inactive}명`);

    // 7. 페르소나 그룹 상세 분석
    logger.info(`\n\n🤖 페르소나 그룹 상세 분석:`);
    logger.info(`   총 페르소나 참가자: ${personaParticipants.length}명`);
    
    const personaStats = {
      owner: personaParticipants.filter(p => p.role === 'owner').length,
      moderator: personaParticipants.filter(p => p.role === 'moderator').length,
      member: personaParticipants.filter(p => p.role === 'member').length,
      active: personaParticipants.filter(p => p.isActive).length,
      inactive: personaParticipants.filter(p => !p.isActive).length,
    };

    logger.info(`   역할 분포:`);
    logger.info(`      👑 방장: ${personaStats.owner}명`);
    logger.info(`      🛡️  모더레이터: ${personaStats.moderator}명`);
    logger.info(`      👥 일반 멤버: ${personaStats.member}명`);
    logger.info(`   상태 분포:`);
    logger.info(`      ✅ 활성: ${personaStats.active}명`);
    logger.info(`      ❌ 비활성: ${personaStats.inactive}명`);

    // 8. 결론
    logger.info(`\n\n📝 결론:`);
    logger.info(`   ✅ 참가자는 두 종류입니다: 사용자(user) / 페르소나(persona)`);
    logger.info(`   ✅ 기타 타입은 ${otherParticipants.length}개 존재`);
    logger.info(`   ✅ 역할은 세 종류: owner / moderator / member`);
    logger.info(`   ✅ 활성 상태는 두 종류: active / inactive`);

    return {
      success: true,
      summary: {
        total: allParticipants.length,
        byType: {
          user: userParticipants.length,
          persona: personaParticipants.length,
          other: otherParticipants.length,
        },
        byRole: {
          owner: ownerCount,
          moderator: moderatorCount,
          member: memberCount,
        },
        byStatus: {
          active: activeCount,
          inactive: inactiveCount,
        },
        userStats,
        personaStats,
      }
    };

  } catch (error: any) {
    logger.error('❌ 참가자 분석 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeParticipants()
    .then((result) => {
      if (result.success) {
        console.log('\n✅ 분석 완료!');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('오류:', error);
      process.exit(1);
    });
}

export { analyzeParticipants };

