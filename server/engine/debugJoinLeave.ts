import { 
  checkJoinLeaveEvents, 
  executeJoinLeaveEvents,
  generateAutoIntroduction,
  getAllPersonaProfiles 
} from './joinLeaveManager.js';
import { persoRoomManager } from './persoRoom.js';

async function debugJoinLeaveLogic() {
  console.log('🔍 [DEBUG] 입장/퇴장 로직 디버깅');
  console.log('=' .repeat(50));
  
  try {
    // 1. 페르소나 프로필 확인
    console.log('\n1️⃣ 페르소나 프로필 확인:');
    const allProfiles = getAllPersonaProfiles();
    console.log(`   총 ${allProfiles.length}개 페르소나 프로필 로드됨`);
    
    const activeIds = ['Kai', 'Espri'];
    const inactivePersonas = allProfiles.filter(p => !activeIds.includes(p.id));
    console.log(`   비활성 페르소나: ${inactivePersonas.map(p => p.id).join(', ')}`);
    
    // 2. 룸 생성 및 상태 확인
    console.log('\n2️⃣ 룸 생성 및 상태 확인:');
    const testRoomId = `debug-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const initialPersonas = ['Kai', 'Espri'];
    
    const room = persoRoomManager.createRoom(testRoomId, initialPersonas, ['tech', 'ai']);
    
    if (!room) {
      console.log('❌ 룸 생성 실패');
      return;
    }
    
    console.log(`   ✅ 룸 생성 성공: ${room.roomId}`);
    console.log(`   👥 초기 페르소나: ${room.activePersonas.length}명 (${room.activePersonas.map(p => p.id).join(', ')})`);
    console.log(`   📝 현재 토픽: ${room.currentTopics.map(t => t.topic).join(', ')}`);
    
    // 3. 입장 이벤트 체크
    console.log('\n3️⃣ 입장 이벤트 체크:');
    const events = checkJoinLeaveEvents(room);
    console.log(`   생성된 이벤트 수: ${events.length}개`);
    
    if (events.length > 0) {
      console.log('   📋 이벤트 상세:');
      events.forEach((event, index) => {
        console.log(`     ${index + 1}. ${event.personaId} ${event.eventType} (${new Date(event.timestamp).toLocaleTimeString()})`);
      });
    } else {
      console.log('   ⚠️  입장 이벤트가 생성되지 않았습니다.');
      console.log('   🔍 원인 분석:');
      console.log(`     - 활성 페르소나 수: ${room.activePersonas.length}명`);
      console.log(`     - 입장 조건: < 6명 (현재 ${room.activePersonas.length < 6 ? '만족' : '불만족'})`);
      
      const activeIds = room.activePersonas.map(p => p.id);
      const availablePersonas = allProfiles.filter(p => !activeIds.includes(p.id));
      console.log(`     - 사용 가능한 페르소나: ${availablePersonas.length}명`);
      
      if (availablePersonas.length > 0) {
        console.log('     - 확률 테스트:');
        availablePersonas.slice(0, 3).forEach(persona => {
          console.log(`       ${persona.id}: ${(persona.joinProbability * 100).toFixed(1)}% 확률`);
        });
      }
    }
    
    // 4. 자동 소개 생성 테스트 (AI 호출 없이)
    console.log('\n4️⃣ 자동 소개 생성 테스트:');
    const testPersona = 'Luna';
    const testTopics = ['tech', 'ai'];
    
    try {
      console.log(`   🎭 ${testPersona} 자동 소개 생성 중...`);
      const startTime = Date.now();
      
      const introduction = await generateAutoIntroduction(testPersona, testTopics);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`   ✅ 자동 소개 생성 성공! (${responseTime}ms)`);
      console.log(`   📝 소개 내용: "${introduction}"`);
      
    } catch (error: any) {
      console.log(`   ❌ 자동 소개 생성 실패: ${error.message}`);
    }
    
    // 5. 이벤트 실행 테스트
    if (events.length > 0) {
      console.log('\n5️⃣ 이벤트 실행 테스트:');
      
      try {
        console.log(`   🚀 ${events.length}개 이벤트 실행 중...`);
        const startTime = Date.now();
        
        await executeJoinLeaveEvents(events);
        
        // 비동기 처리 완료 대기 (상태 안정화)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.log(`   ✅ 이벤트 실행 완료! (${responseTime}ms)`);
        
        // 업데이트된 룸 상태 확인
        const updatedRoom = persoRoomManager.getRoom(testRoomId);
        if (updatedRoom) {
          console.log(`   👥 현재 활성 페르소나: ${updatedRoom.activePersonas.length}명`);
          console.log(`   📋 페르소나 목록: ${updatedRoom.activePersonas.map(p => p.id).join(', ')}`);
        } else {
          console.log(`   ⚠️  룸 상태 확인 실패 - 룸이 존재하지 않습니다`);
        }
        
      } catch (error: any) {
        console.log(`   ❌ 이벤트 실행 실패: ${error.message}`);
        console.log(`   🔍 오류 상세: ${error.stack}`);
      }
    }
    
    // 6. 룸 정리
    console.log('\n6️⃣ 룸 정리:');
    try {
      const deleteResult = persoRoomManager.removeRoom(testRoomId);
      if (deleteResult) {
        console.log(`   ✅ 룸 삭제 성공`);
      } else {
        console.log(`   ❌ 룸 삭제 실패 - 재시도 중...`);
        // 재시도 로직
        await new Promise(resolve => setTimeout(resolve, 50));
        const retryResult = persoRoomManager.removeRoom(testRoomId);
        console.log(`   ${retryResult ? '✅ 재시도 성공' : '❌ 재시도 실패'}`);
      }
    } catch (error: any) {
      console.log(`   ❌ 룸 삭제 중 예외 발생: ${error.message}`);
    }
    
  } catch (error: any) {
    console.error('❌ 디버깅 중 오류 발생:', error);
    console.error('🔍 오류 스택:', error.stack);
  }
}

async function debugProbabilityLogic() {
  console.log('\n🎲 [DEBUG] 확률 기반 로직 디버깅');
  console.log('=' .repeat(50));
  
  const testRoomId = `probability-debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const initialPersonas = ['Kai', 'Espri'];
  
  persoRoomManager.createRoom(testRoomId, initialPersonas, ['tech']);
  const room = persoRoomManager.getRoom(testRoomId);
  
  if (!room) {
    console.log('❌ 디버그 룸 생성 실패');
    return;
  }
  
  console.log('🎯 확률 기반 입장 테스트 (10회):');
  
  let totalEvents = 0;
  const eventCounts: { [key: string]: number } = {};
  
  for (let i = 1; i <= 10; i++) {
    const events = checkJoinLeaveEvents(room);
    totalEvents += events.length;
    
    events.forEach(event => {
      if (event.eventType === 'join') {
        eventCounts[event.personaId] = (eventCounts[event.personaId] || 0) + 1;
      }
    });
    
    console.log(`  ${i}회차: ${events.length}개 이벤트`);
  }
  
  console.log(`\n📊 확률 테스트 결과:`);
  console.log(`  총 이벤트: ${totalEvents}개`);
  console.log(`  평균: ${(totalEvents / 10).toFixed(2)}개/회`);
  
  if (Object.keys(eventCounts).length > 0) {
    console.log(`  페르소나별 입장 횟수:`);
    Object.entries(eventCounts).forEach(([personaId, count]) => {
      console.log(`    ${personaId}: ${count}회`);
    });
  } else {
    console.log(`  ⚠️  입장 이벤트가 전혀 생성되지 않았습니다.`);
    console.log(`  🔍 확률 설정을 확인해주세요.`);
  }
  
  try {
    const deleteResult = persoRoomManager.removeRoom(testRoomId);
    if (!deleteResult) {
      console.log(`   ⚠️  확률 테스트 룸 삭제 실패`);
    }
  } catch (error: any) {
    console.log(`   ❌ 확률 테스트 룸 삭제 중 오류: ${error.message}`);
  }
}

async function debugMemoryManagement() {
  console.log('\n🧠 [DEBUG] 메모리 관리 디버깅');
  console.log('=' .repeat(50));
  
  // 메모리 상태 확인
  const memoryStatus = persoRoomManager.getMemoryStatus();
  console.log('📊 현재 메모리 상태:');
  console.log(`   총 룸 수: ${memoryStatus.totalRooms}개`);
  console.log(`   활성 룸: ${memoryStatus.activeRooms}개`);
  console.log(`   비활성 룸: ${memoryStatus.inactiveRooms}개`);
  
  if (memoryStatus.oldestRoom) {
    console.log(`   가장 오래된 룸: ${memoryStatus.oldestRoom}`);
  }
  if (memoryStatus.newestRoom) {
    console.log(`   가장 최근 룸: ${memoryStatus.newestRoom}`);
  }
  
  // 정리 작업 실행
  console.log('\n🧹 정리 작업 실행:');
  const cleanupResult = persoRoomManager.cleanup();
  console.log(`   정리된 룸: ${cleanupResult.cleaned}개`);
  console.log(`   실패한 룸: ${cleanupResult.failed}개`);
  
  // 정리 후 상태 확인
  const afterCleanupStatus = persoRoomManager.getMemoryStatus();
  console.log('\n📊 정리 후 메모리 상태:');
  console.log(`   총 룸 수: ${afterCleanupStatus.totalRooms}개`);
  console.log(`   활성 룸: ${afterCleanupStatus.activeRooms}개`);
  console.log(`   비활성 룸: ${afterCleanupStatus.inactiveRooms}개`);
}

async function runAllDebugTests() {
  console.log('🚀 입장/퇴장 이벤트 관리 시스템 디버깅 시작');
  console.log('=' .repeat(60));
  
  try {
    // 테스트 전 메모리 상태 확인
    console.log('📊 테스트 전 메모리 상태:');
    const initialStatus = persoRoomManager.getMemoryStatus();
    console.log(`   총 룸 수: ${initialStatus.totalRooms}개`);
    
    await debugJoinLeaveLogic();
    await debugProbabilityLogic();
    await debugMemoryManagement();
    
    // 테스트 후 메모리 상태 확인
    console.log('\n📊 테스트 후 메모리 상태:');
    const finalStatus = persoRoomManager.getMemoryStatus();
    console.log(`   총 룸 수: ${finalStatus.totalRooms}개`);
    
    // 메모리 누수 확인
    if (finalStatus.totalRooms > initialStatus.totalRooms) {
      console.log(`   ⚠️  메모리 누수 감지: ${finalStatus.totalRooms - initialStatus.totalRooms}개 룸이 남아있습니다`);
      console.log('   🧹 강제 정리 실행 중...');
      const forceCleanupResult = persoRoomManager.forceCleanupAllRooms();
      console.log(`   강제 정리 완료: ${forceCleanupResult.cleaned}개 정리됨`);
    } else {
      console.log('   ✅ 메모리 누수 없음');
    }
    
    console.log('\n✅ 디버깅 완료!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ 디버깅 중 오류 발생:', error);
  }
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllDebugTests();
}

export { runAllDebugTests };
