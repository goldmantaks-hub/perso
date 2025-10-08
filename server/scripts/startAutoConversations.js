// 기존 게시물들에 대해 자동 대화를 시작하는 스크립트
import { storage } from '../storage.js';
import { analyzeSentiment } from '../api/analyze.js';
import { multiAgentDialogueOrchestrator } from '../engine/multiAgentDialogueOrchestrator.js';

async function startAutoConversations() {
  try {
    console.log('[AUTO CONVERSATION SCRIPT] Starting auto conversations for existing posts...');
    
    // 모든 게시물 가져오기
    const posts = await storage.getAllPosts();
    console.log(`[AUTO CONVERSATION SCRIPT] Found ${posts.length} posts`);
    
    for (const post of posts) {
      try {
        console.log(`[AUTO CONVERSATION SCRIPT] Processing post ${post.id}: "${post.content.substring(0, 50)}..."`);
        
        // 게시물 분석
        const analysis = await analyzeSentiment(post.content);
        
        // 자동 대화 시작
        const result = await multiAgentDialogueOrchestrator(
          {
            id: post.id,
            content: post.content,
            userId: post.userId
          },
          analysis
        );
        
        console.log(`[AUTO CONVERSATION SCRIPT] ✅ Started conversation for post ${post.id} - ${result.messages.length} messages, ${result.joinLeaveEvents.length} events`);
        
        // 각 게시물 사이에 2초 대기 (API 제한 방지)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`[AUTO CONVERSATION SCRIPT] ❌ Error processing post ${post.id}:`, error);
      }
    }
    
    console.log('[AUTO CONVERSATION SCRIPT] ✅ Completed auto conversation setup for all posts');
    
  } catch (error) {
    console.error('[AUTO CONVERSATION SCRIPT] ❌ Fatal error:', error);
  }
}

// 스크립트 실행
startAutoConversations();

