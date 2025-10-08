import { persoRoomManager } from './persoRoom';

async function testRoomDeletion() {
  console.log('🗑️ [ROOM DELETION] 룸 삭제 테스트');
  console.log('=' .repeat(50));
  
  // 테스트 전 메모리 상태 확인
  const initialStatus = persoRoomManager.getMemoryStatus();
  console.log(`📊 테스트 전 메모리 상태: 총 ${initialStatus.totalRooms}개 룸`);
  
  // 1. 고유 ID로 룸 생성 테스트
  console.log('\n1️⃣ 고유 ID 룸 생성 테스트:');
  const testPostId1 = `deletion-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const testPostId2 = `deletion-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`   생성할 Post ID 1: ${testPostId1}`);
  console.log(`   생성할 Post ID 2: ${testPostId2}`);
  
  // 동시에 두 룸 생성 (ID 충돌 방지 테스트)
  const room1 = persoRoomManager.createRoom(testPostId1, ['Kai', 'Espri'], ['tech']);
  const room2 = persoRoomManager.createRoom(testPostId2, ['Luna', 'Namu'], ['travel']);
  
  console.log(`   룸 1 생성 결과: ✅ 성공 (실제 Room ID: ${room1.roomId})`);
  console.log(`   룸 2 생성 결과: ✅ 성공 (실제 Room ID: ${room2.roomId})`);
  
  // 생성 후 상태 확인
  const afterCreateStatus = persoRoomManager.getMemoryStatus();
  console.log(`   생성 후 룸 수: ${afterCreateStatus.totalRooms}개`);
  
  // 2. 룸 존재 확인
  console.log('\n2️⃣ 룸 존재 확인 테스트:');
  const retrievedRoom1 = persoRoomManager.getRoom(room1.roomId);
  const retrievedRoom2 = persoRoomManager.getRoom(room2.roomId);
  const nonExistentRoom = persoRoomManager.getRoom('non-existent-room');
  
  console.log(`   룸 1 존재: ${retrievedRoom1 ? '✅ 존재' : '❌ 없음'}`);
  console.log(`   룸 2 존재: ${retrievedRoom2 ? '✅ 존재' : '❌ 없음'}`);
  console.log(`   존재하지 않는 룸: ${nonExistentRoom ? '❌ 예상치 못한 존재' : '✅ 없음 (예상됨)'}`);
  
  // 3. 룸 삭제 테스트
  console.log('\n3️⃣ 룸 삭제 테스트:');
  
  // 첫 번째 룸 삭제
  console.log(`   룸 1 삭제 시도: ${room1.roomId}`);
  const deleteResult1 = persoRoomManager.removeRoom(room1.roomId);
  console.log(`   삭제 결과: ${deleteResult1 ? '✅ 성공' : '❌ 실패'}`);
  
  // 삭제 후 룸 1 존재 확인
  const room1AfterDelete = persoRoomManager.getRoom(room1.roomId);
  console.log(`   삭제 후 룸 1 존재: ${room1AfterDelete ? '❌ 여전히 존재' : '✅ 삭제됨'}`);
  
  // 두 번째 룸 삭제
  console.log(`   룸 2 삭제 시도: ${room2.roomId}`);
  const deleteResult2 = persoRoomManager.removeRoom(room2.roomId);
  console.log(`   삭제 결과: ${deleteResult2 ? '✅ 성공' : '❌ 실패'}`);
  
  // 삭제 후 룸 2 존재 확인
  const room2AfterDelete = persoRoomManager.getRoom(room2.roomId);
  console.log(`   삭제 후 룸 2 존재: ${room2AfterDelete ? '❌ 여전히 존재' : '✅ 삭제됨'}`);
  
  // 4. 존재하지 않는 룸 삭제 테스트
  console.log('\n4️⃣ 존재하지 않는 룸 삭제 테스트:');
  const deleteNonExistentResult = persoRoomManager.removeRoom('non-existent-room');
  console.log(`   존재하지 않는 룸 삭제 결과: ${deleteNonExistentResult ? '✅ 성공' : '❌ 실패 (예상됨)'}`);
  
  // 5. 삭제 후 메모리 상태 확인
  const finalStatus = persoRoomManager.getMemoryStatus();
  console.log('\n5️⃣ 삭제 후 메모리 상태:');
  console.log(`   최종 룸 수: ${finalStatus.totalRooms}개`);
  console.log(`   활성 룸: ${finalStatus.activeRooms}개`);
  console.log(`   비활성 룸: ${finalStatus.inactiveRooms}개`);
  
  // 메모리 누수 확인
  const memoryLeak = finalStatus.totalRooms > initialStatus.totalRooms;
  if (memoryLeak) {
    console.log(`   ⚠️  메모리 누수 감지: ${finalStatus.totalRooms - initialStatus.totalRooms}개 룸이 남아있습니다`);
  } else {
    console.log('   ✅ 메모리 누수 없음');
  }
  
  return {
    initialRooms: initialStatus.totalRooms,
    finalRooms: finalStatus.totalRooms,
    memoryLeak,
    deleteSuccess: deleteResult1 && deleteResult2
  };
}

async function testBulkRoomDeletion() {
  console.log('\n🔄 [BULK DELETION] 대량 룸 삭제 테스트');
  console.log('=' .repeat(50));
  
  // 1. 여러 룸 생성
  console.log('1️⃣ 대량 룸 생성:');
  const rooms: any[] = [];
  const roomCount = 5;
  
  for (let i = 0; i < roomCount; i++) {
    const postId = `bulk-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const room = persoRoomManager.createRoom(postId, ['Kai'], ['tech']);
    rooms.push(room);
    
    console.log(`   룸 ${i + 1} 생성: ✅ (Post ID: ${postId}, Room ID: ${room.roomId})`);
  }
  
  // 생성 후 상태 확인
  const afterCreateStatus = persoRoomManager.getMemoryStatus();
  console.log(`   생성된 룸 수: ${afterCreateStatus.totalRooms}개`);
  
  // 2. 개별 삭제 테스트
  console.log('\n2️⃣ 개별 삭제 테스트:');
  let successCount = 0;
  
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    const deleteResult = persoRoomManager.removeRoom(room.roomId);
    
    if (deleteResult) {
      successCount++;
      console.log(`   룸 ${i + 1} 삭제: ✅ 성공`);
    } else {
      console.log(`   룸 ${i + 1} 삭제: ❌ 실패`);
    }
  }
  
  console.log(`   총 삭제 성공률: ${successCount}/${rooms.length} (${(successCount/rooms.length*100).toFixed(1)}%)`);
  
  // 3. 정리 후 상태 확인
  const finalStatus = persoRoomManager.getMemoryStatus();
  console.log('\n3️⃣ 정리 후 메모리 상태:');
  console.log(`   남은 룸 수: ${finalStatus.totalRooms}개`);
  
  return {
    createdRooms: roomCount,
    deletedRooms: successCount,
    remainingRooms: finalStatus.totalRooms
  };
}

async function testCleanupFunctionality() {
  console.log('\n🧹 [CLEANUP] 정리 기능 테스트');
  console.log('=' .repeat(50));
  
  // 1. 오래된 룸 생성 (정리 대상)
  console.log('1️⃣ 정리 대상 룸 생성:');
  const oldPostId = `old-room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const oldRoom = persoRoomManager.createRoom(oldPostId, ['Kai'], ['tech']);
  console.log(`   오래된 룸 생성: ✅ 성공 (Room ID: ${oldRoom.roomId})`);
  
  // 2. 정리 전 상태 확인
  const beforeCleanupStatus = persoRoomManager.getMemoryStatus();
  console.log(`   정리 전 룸 수: ${beforeCleanupStatus.totalRooms}개`);
  
  // 3. 정리 작업 실행
  console.log('\n2️⃣ 정리 작업 실행:');
  const cleanupResult = persoRoomManager.cleanup();
  console.log(`   정리된 룸: ${cleanupResult.cleaned}개`);
  console.log(`   실패한 룸: ${cleanupResult.failed}개`);
  
  // 4. 강제 정리 테스트
  console.log('\n3️⃣ 강제 정리 테스트:');
  const forceCleanupResult = persoRoomManager.forceCleanupAllRooms();
  console.log(`   강제 정리된 룸: ${forceCleanupResult.cleaned}개`);
  console.log(`   강제 정리 실패: ${forceCleanupResult.failed}개`);
  
  // 5. 정리 후 상태 확인
  const afterCleanupStatus = persoRoomManager.getMemoryStatus();
  console.log('\n4️⃣ 정리 후 메모리 상태:');
  console.log(`   최종 룸 수: ${afterCleanupStatus.totalRooms}개`);
  
  return {
    beforeCleanup: beforeCleanupStatus.totalRooms,
    cleaned: cleanupResult.cleaned,
    forceCleaned: forceCleanupResult.cleaned,
    afterCleanup: afterCleanupStatus.totalRooms
  };
}

async function runRoomDeletionTests() {
  console.log('🚀 룸 삭제 시스템 종합 테스트 시작');
  console.log('=' .repeat(60));
  
  try {
    // 기본 삭제 테스트
    const basicTestResult = await testRoomDeletion();
    
    // 대량 삭제 테스트
    const bulkTestResult = await testBulkRoomDeletion();
    
    // 정리 기능 테스트
    const cleanupTestResult = await testCleanupFunctionality();
    
    // 결과 요약
    console.log('\n📊 테스트 결과 요약:');
    console.log('=' .repeat(60));
    
    console.log('1️⃣ 기본 삭제 테스트:');
    console.log(`   초기 룸 수: ${basicTestResult.initialRooms}개`);
    console.log(`   최종 룸 수: ${basicTestResult.finalRooms}개`);
    console.log(`   메모리 누수: ${basicTestResult.memoryLeak ? '❌ 있음' : '✅ 없음'}`);
    console.log(`   삭제 성공: ${basicTestResult.deleteSuccess ? '✅ 성공' : '❌ 실패'}`);
    
    console.log('\n2️⃣ 대량 삭제 테스트:');
    console.log(`   생성된 룸: ${bulkTestResult.createdRooms}개`);
    console.log(`   삭제된 룸: ${bulkTestResult.deletedRooms}개`);
    console.log(`   남은 룸: ${bulkTestResult.remainingRooms}개`);
    
    console.log('\n3️⃣ 정리 기능 테스트:');
    console.log(`   정리 전: ${cleanupTestResult.beforeCleanup}개`);
    console.log(`   정리됨: ${cleanupTestResult.cleaned}개`);
    console.log(`   강제 정리됨: ${cleanupTestResult.forceCleaned}개`);
    console.log(`   최종: ${cleanupTestResult.afterCleanup}개`);
    
    // 전체 성공 여부 판단
    const allTestsPassed = 
      !basicTestResult.memoryLeak &&
      basicTestResult.deleteSuccess &&
      bulkTestResult.deletedRooms === bulkTestResult.createdRooms &&
      cleanupTestResult.afterCleanup === 0;
    
    console.log('\n🎯 최종 결과:');
    console.log(`   ${allTestsPassed ? '✅ 모든 테스트 통과!' : '❌ 일부 테스트 실패'}`);
    
    if (!allTestsPassed) {
      console.log('\n⚠️  실패한 테스트가 있습니다. 로그를 확인해주세요.');
    }
    
  } catch (error: any) {
    console.error('❌ 테스트 중 오류 발생:', error);
    console.error('🔍 오류 스택:', error.stack);
  }
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  runRoomDeletionTests();
}

export { testRoomDeletion, testBulkRoomDeletion, testCleanupFunctionality };
