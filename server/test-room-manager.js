import { persoRoomManager } from './engine/persoRoom.js';

console.log('[ROOM TEST] Starting room manager test...');

try {
  console.log('[ROOM TEST] Step 1: Testing basic room creation...');
  
  const testPostId = 'test-post-' + Date.now();
  const testPersonas = ['persona-1', 'persona-2', 'persona-3'];
  const testContexts = ['tech', 'travel'];
  
  console.log(`[ROOM TEST] Creating room with postId: ${testPostId}`);
  console.log(`[ROOM TEST] Personas:`, testPersonas);
  console.log(`[ROOM TEST] Contexts:`, testContexts);
  
  const room = persoRoomManager.createRoom(testPostId, testPersonas, testContexts);
  
  if (room) {
    console.log('[ROOM TEST] ✅ Room created successfully!');
    console.log(`[ROOM TEST] Room ID: ${room.roomId}`);
    console.log(`[ROOM TEST] Post ID: ${room.postId}`);
    console.log(`[ROOM TEST] Active personas: ${room.activePersonas.length}`);
    console.log(`[ROOM TEST] Current topics: ${room.currentTopics.length}`);
  } else {
    console.log('[ROOM TEST] ❌ Room creation failed - returned null');
  }
  
  console.log('[ROOM TEST] Step 2: Testing room retrieval...');
  const retrievedRoom = persoRoomManager.getRoom(room.roomId);
  
  if (retrievedRoom) {
    console.log('[ROOM TEST] ✅ Room retrieved successfully!');
    console.log(`[ROOM TEST] Retrieved room ID: ${retrievedRoom.roomId}`);
  } else {
    console.log('[ROOM TEST] ❌ Room retrieval failed');
  }
  
  console.log('[ROOM TEST] Step 3: Testing room count...');
  const roomCount = persoRoomManager.getRoomCount();
  console.log(`[ROOM TEST] Total rooms: ${roomCount}`);
  
  console.log('[ROOM TEST] ✅ All tests completed successfully!');
  
} catch (error) {
  console.error('[ROOM TEST] ❌ Error:', error);
  console.error('[ROOM TEST] Error stack:', error.stack);
  console.error('[ROOM TEST] Error details:', {
    message: error.message,
    name: error.name,
    cause: error.cause
  });
}

