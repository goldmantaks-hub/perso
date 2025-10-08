import { multiAgentDialogueOrchestrator } from './engine/multiAgentDialogueOrchestrator.js';
import { analyzeSentimentFromContent, inferTonesFromContent, detectSubjects, inferContexts } from './api/analyze.js';

console.log('[TEST] Starting multi-agent test...');

const testPost = {
  id: 'test-post-id',
  content: '단계별 디버깅 테스트 - 어느 단계에서 실패하는지 확인',
  userId: 'temp-user-id'
};

try {
  console.log('[TEST] Step 1: Analyzing sentiment...');
  const sentiment = analyzeSentimentFromContent(testPost.content);
  console.log('[TEST] Sentiment:', sentiment);
  
  console.log('[TEST] Step 2: Inferring tones...');
  const tones = inferTonesFromContent(testPost.content, sentiment);
  console.log('[TEST] Tones:', tones);
  
  console.log('[TEST] Step 3: Detecting subjects...');
  const subjects = detectSubjects(testPost.content, undefined);
  console.log('[TEST] Subjects:', subjects);
  
  console.log('[TEST] Step 4: Inferring contexts...');
  const contexts = inferContexts(testPost.content, subjects, tones);
  console.log('[TEST] Contexts:', contexts);
  
  const analysis = {
    sentiment,
    tones,
    subjects,
    contexts
  };
  
  console.log('[TEST] Step 5: Calling multiAgentDialogueOrchestrator...');
  console.log('[TEST] About to call createRoom...');
  
  try {
    const result = await multiAgentDialogueOrchestrator(testPost, analysis);
    console.log('[TEST] Result:', result);
  } catch (error) {
    console.error('[TEST] Error in multiAgentDialogueOrchestrator:', error);
    console.error('[TEST] Error stack:', error.stack);
    
    // createRoom 단계에서 직접 테스트
    console.log('[TEST] Testing createRoom directly...');
    try {
      const { persoRoomManager } = await import('./engine/persoRoom.js');
      const room = persoRoomManager.createRoom(testPost.id, ['test-persona-1'], []);
      console.log('[TEST] Direct createRoom success:', room);
    } catch (createRoomError) {
      console.error('[TEST] Direct createRoom failed:', createRoomError);
      console.error('[TEST] CreateRoom error stack:', createRoomError.stack);
    }
  }
  
} catch (error) {
  console.error('[TEST] Error:', error);
  console.error('[TEST] Error stack:', error.stack);
}
