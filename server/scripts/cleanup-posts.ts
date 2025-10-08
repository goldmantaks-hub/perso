import { db } from "../db.js";
import { posts, postConversations, conversations } from "../../shared/schema.js";
import { eq, notInArray } from "drizzle-orm";
import { logger } from "../../shared/logger.js";

/**
 * 대화방(페르소)이 없는 게시물들을 삭제하는 스크립트
 */
async function cleanupPostsWithoutConversations() {
  logger.info('🧹 대화방이 없는 게시물 정리 시작...');

  try {
    // 1. 모든 게시물 조회
    const allPosts = await db.select().from(posts);
    logger.info(`📊 전체 게시물 수: ${allPosts.length}개`);

    // 2. 대화방이 있는 게시물 ID 조회
    const postsWithConversations = await db
      .select({ postId: postConversations.postId })
      .from(postConversations)
      .innerJoin(conversations, eq(postConversations.conversationId, conversations.id));

    const postIdsWithConversations = postsWithConversations.map(pc => pc.postId);
    logger.info(`✅ 대화방이 있는 게시물: ${postIdsWithConversations.length}개`);

    // 3. 대화방이 없는 게시물 필터링
    const postsWithoutConversations = allPosts.filter(
      post => !postIdsWithConversations.includes(post.id)
    );

    logger.info(`🗑️  대화방이 없는 게시물: ${postsWithoutConversations.length}개`);

    if (postsWithoutConversations.length === 0) {
      logger.info('✨ 삭제할 게시물이 없습니다.');
      return {
        success: true,
        deletedCount: 0,
        message: '삭제할 게시물이 없습니다.'
      };
    }

    // 4. 삭제할 게시물 정보 출력
    logger.info('\n📋 삭제될 게시물 목록:');
    postsWithoutConversations.forEach((post, index) => {
      logger.info(`   ${index + 1}. ${post.title} (ID: ${post.id})`);
    });

    // 5. 게시물 삭제
    const postIdsToDelete = postsWithoutConversations.map(p => p.id);
    
    const deleteResult = await db
      .delete(posts)
      .where(notInArray(posts.id, postIdsWithConversations))
      .returning();

    logger.info(`\n✅ ${deleteResult.length}개의 게시물이 삭제되었습니다.`);

    // 6. 삭제 후 통계
    const remainingPosts = await db.select().from(posts);
    logger.info(`\n📊 정리 후 통계:`);
    logger.info(`   전체 게시물: ${allPosts.length}개 → ${remainingPosts.length}개`);
    logger.info(`   삭제된 게시물: ${deleteResult.length}개`);
    logger.info(`   남은 게시물: ${remainingPosts.length}개`);

    return {
      success: true,
      deletedCount: deleteResult.length,
      deletedPosts: deleteResult.map(p => ({ id: p.id, title: p.title })),
      message: `${deleteResult.length}개의 게시물이 삭제되었습니다.`
    };

  } catch (error: any) {
    logger.error('❌ 게시물 정리 실패:', error);
    return {
      success: false,
      error: error.message,
      message: '게시물 정리 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 대화방이 없는 게시물 목록만 조회 (삭제하지 않음)
 */
async function listPostsWithoutConversations() {
  logger.info('📋 대화방이 없는 게시물 조회...');

  try {
    // 1. 모든 게시물 조회
    const allPosts = await db.select().from(posts);

    // 2. 대화방이 있는 게시물 ID 조회
    const postsWithConversations = await db
      .select({ postId: postConversations.postId })
      .from(postConversations)
      .innerJoin(conversations, eq(postConversations.conversationId, conversations.id));

    const postIdsWithConversations = postsWithConversations.map(pc => pc.postId);

    // 3. 대화방이 없는 게시물 필터링
    const postsWithoutConversations = allPosts.filter(
      post => !postIdsWithConversations.includes(post.id)
    );

    logger.info(`\n📊 통계:`);
    logger.info(`   전체 게시물: ${allPosts.length}개`);
    logger.info(`   대화방이 있는 게시물: ${postIdsWithConversations.length}개`);
    logger.info(`   대화방이 없는 게시물: ${postsWithoutConversations.length}개`);

    if (postsWithoutConversations.length > 0) {
      logger.info(`\n📋 대화방이 없는 게시물 목록:`);
      postsWithoutConversations.forEach((post, index) => {
        logger.info(`   ${index + 1}. ${post.title} (ID: ${post.id})`);
        logger.info(`      작성자 ID: ${post.userId}`);
        logger.info(`      생성일: ${post.createdAt}`);
      });
    }

    return {
      success: true,
      totalPosts: allPosts.length,
      postsWithConversations: postIdsWithConversations.length,
      postsWithoutConversations: postsWithoutConversations.length,
      posts: postsWithoutConversations.map(p => ({
        id: p.id,
        title: p.title,
        userId: p.userId,
        createdAt: p.createdAt
      }))
    };

  } catch (error: any) {
    logger.error('❌ 게시물 조회 실패:', error);
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
    listPostsWithoutConversations()
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
    cleanupPostsWithoutConversations()
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
    console.log('  npm run cleanup:posts list   - 대화방이 없는 게시물 목록 조회');
    console.log('  npm run cleanup:posts delete - 대화방이 없는 게시물 삭제');
    process.exit(1);
  }
}

export { cleanupPostsWithoutConversations, listPostsWithoutConversations };

