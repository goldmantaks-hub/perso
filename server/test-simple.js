import { storage } from './storage.js';

console.log('[SIMPLE TEST] Starting simple test...');

try {
  console.log('[SIMPLE TEST] Step 1: Testing storage.getConversationByPostId...');
  
  // 기존 conversation이 있는지 확인
  const existingConversation = await storage.getConversationByPost('test-post-id');
  console.log('[SIMPLE TEST] Existing conversation:', existingConversation);
  
  console.log('[SIMPLE TEST] Step 2: Testing storage.createConversationForPost...');
  
  // 새 conversation 생성 시도
  const newConversation = await storage.createConversationForPost('test-post-id', 'user', 'temp-user-id');
  console.log('[SIMPLE TEST] Created conversation:', newConversation);
  
  console.log('[SIMPLE TEST] ✅ All tests completed successfully!');
  
} catch (error) {
  console.error('[SIMPLE TEST] ❌ Error:', error);
  console.error('[SIMPLE TEST] Error stack:', error.stack);
  console.error('[SIMPLE TEST] Error details:', {
    message: error.message,
    name: error.name,
    cause: error.cause
  });
}
