import { persoRoomManager } from './persoRoom.js';

async function testRoomCreation() {
  console.log('🏠 [ROOM CREATION] 룸 생성 테스트');
  console.log('=' .repeat(50));
  
  try {
    // 1. 기본 룸 생성 테스트
    console.log('\n1️⃣ 기본 룸 생성 테스트:');
    const testRoomId = 'test-room-' + Date.now();
    const initialPersonas = ['Kai', 'Espri', 'Luna'];
    const contexts = ['tech', 'travel'];
    
    console.log(`📝 생성 시도: roomId=${testRoomId}, personas=${initialPersonas.join(',')}, contexts=${contexts.join(',')}`);
    
    const room = persoRoomManager.createRoom(testRoomId, initialPersonas, contexts);
    
    if (room) {
      console.log('✅ 룸 생성 성공!');
      console.log(`   Room ID: ${room.roomId}`);
      console.log(`   Post ID: ${room.postId}`);
      console.log(`   활성 페르소나: ${room.activePersonas.length}명`);
      console.log(`   현재 토픽: ${room.currentTopics.length}개`);
      console.log(`   생성 시간: ${new Date(room.createdAt).toLocaleString()}`);
    } else {
      console.log('❌ 룸 생성 실패 - null 반환');
      return false;
    }
    
    // 2. 룸 조회 테스트
    console.log('\n2️⃣ 룸 조회 테스트:');
    const retrievedRoom = persoRoomManager.getRoom(room.roomId);
    if (retrievedRoom) {
      console.log('✅ 룸 조회 성공!');
      console.log(`   활성 페르소나: ${retrievedRoom.activePersonas.map(p => p.id).join(', ')}`);
    } else {
      console.log('❌ 룸 조회 실패');
      return false;
    }
    
    // 3. 페르소나 추가 테스트
    console.log('\n3️⃣ 페르소나 추가 테스트:');
    const addResult = persoRoomManager.addPersona(room.roomId, 'Milo');
    if (addResult) {
      console.log('✅ 페르소나 추가 성공!');
      const updatedRoom = persoRoomManager.getRoom(room.roomId);
      if (updatedRoom) {
        console.log(`   현재 활성 페르소나: ${updatedRoom.activePersonas.length}명`);
        console.log(`   페르소나 목록: ${updatedRoom.activePersonas.map(p => p.id).join(', ')}`);
      }
    } else {
      console.log('❌ 페르소나 추가 실패');
    }
    
    // 4. 페르소나 제거 테스트
    console.log('\n4️⃣ 페르소나 제거 테스트:');
    const removeResult = persoRoomManager.removePersona(room.roomId, 'Luna');
    if (removeResult) {
      console.log('✅ 페르소나 제거 성공!');
      const updatedRoom = persoRoomManager.getRoom(room.roomId);
      if (updatedRoom) {
        console.log(`   현재 활성 페르소나: ${updatedRoom.activePersonas.length}명`);
        console.log(`   페르소나 목록: ${updatedRoom.activePersonas.map(p => p.id).join(', ')}`);
      }
    } else {
      console.log('❌ 페르소나 제거 실패');
    }
    
    // 5. 룸 정리
    console.log('\n5️⃣ 룸 정리 테스트:');
    const deleteResult = persoRoomManager.removeRoom(room.roomId);
    if (deleteResult) {
      console.log('✅ 룸 삭제 성공!');
    } else {
      console.log('❌ 룸 삭제 실패');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ 룸 생성 테스트 중 오류:', error);
    return false;
  }
}

async function testMultipleRooms() {
  console.log('\n🏢 [MULTIPLE ROOMS] 다중 룸 테스트');
  console.log('=' .repeat(50));
  
  try {
    const roomCount = 3;
    const createdRooms: string[] = [];
    
    // 여러 룸 생성
    for (let i = 1; i <= roomCount; i++) {
      const roomId = `multi-test-${i}-${Date.now()}`;
      const personas = ['Kai', 'Espri'];
      const contexts = ['tech'];
      
      const room = persoRoomManager.createRoom(roomId, personas, contexts);
      if (room) {
        createdRooms.push(room.roomId);
        console.log(`✅ 룸 ${i} 생성 성공: ${room.roomId}`);
      } else {
        console.log(`❌ 룸 ${i} 생성 실패`);
      }
    }
    
    console.log(`\n📊 총 ${createdRooms.length}개 룸 생성됨`);
    console.log(`📊 전체 룸 수: ${persoRoomManager.getRoomCount()}개`);
    
    // 모든 룸 정리
    for (const roomId of createdRooms) {
      persoRoomManager.removeRoom(roomId);
    }
    
    console.log('🧹 모든 룸 정리 완료');
    return true;
    
  } catch (error) {
    console.error('❌ 다중 룸 테스트 중 오류:', error);
    return false;
  }
}

async function testRoomManagerMethods() {
  console.log('\n🔧 [ROOM MANAGER METHODS] 룸 매니저 메서드 테스트');
  console.log('=' .repeat(50));
  
  try {
    // 테스트 룸 생성
    const testRoomId = 'method-test-' + Date.now();
    const room = persoRoomManager.createRoom(testRoomId, ['Kai', 'Espri'], ['tech']);
    
    if (!room) {
      console.log('❌ 테스트 룸 생성 실패');
      return false;
    }
    
    console.log('✅ 테스트 룸 생성 성공');
    
    // setDominantPersona 테스트
    console.log('\n👑 주도 페르소나 설정 테스트:');
    const dominantResult = persoRoomManager.setDominantPersona(room.roomId, 'Kai');
    if (dominantResult) {
      console.log('✅ 주도 페르소나 설정 성공');
      const updatedRoom = persoRoomManager.getRoom(room.roomId);
      if (updatedRoom) {
        console.log(`   현재 주도 페르소나: ${updatedRoom.dominantPersona}`);
      }
    } else {
      console.log('❌ 주도 페르소나 설정 실패');
    }
    
    // recordPersonaTurn 테스트
    console.log('\n📝 페르소나 턴 기록 테스트:');
    const turnResult = persoRoomManager.recordPersonaTurn(room.roomId, 'Kai');
    if (turnResult) {
      console.log('✅ 페르소나 턴 기록 성공');
      const updatedRoom = persoRoomManager.getRoom(room.roomId);
      if (updatedRoom) {
        const kaiPersona = updatedRoom.activePersonas.find(p => p.id === 'Kai');
        if (kaiPersona) {
          console.log(`   Kai 메시지 수: ${kaiPersona.messageCount}`);
          console.log(`   마지막 발언: ${new Date(kaiPersona.lastSpokeAt).toLocaleString()}`);
        }
      }
    } else {
      console.log('❌ 페르소나 턴 기록 실패');
    }
    
    // 룸 정리
    persoRoomManager.removeRoom(room.roomId);
    console.log('🧹 테스트 룸 정리 완료');
    
    return true;
    
  } catch (error) {
    console.error('❌ 룸 매니저 메서드 테스트 중 오류:', error);
    return false;
  }
}

async function testAllRoomFeatures() {
  console.log('🚀 룸 생성 및 관리 시스템 테스트 시작');
  console.log('=' .repeat(60));
  
  try {
    const results = [];
    
    console.log('1️⃣ 기본 룸 생성 테스트...');
    results.push(await testRoomCreation());
    
    console.log('\n2️⃣ 다중 룸 테스트...');
    results.push(await testMultipleRooms());
    
    console.log('\n3️⃣ 룸 매니저 메서드 테스트...');
    results.push(await testRoomManagerMethods());
    
    const successCount = results.filter(r => r).length;
    const totalTests = results.length;
    
    console.log('\n📊 테스트 결과 요약:');
    console.log(`✅ 성공: ${successCount}/${totalTests}개 테스트`);
    
    if (successCount === totalTests) {
      console.log('\n🎉 모든 룸 생성 테스트 통과!');
    } else {
      console.log('\n⚠️  일부 테스트 실패. 시스템을 점검해주세요.');
    }
    
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  }
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  testAllRoomFeatures();
}

export { testAllRoomFeatures };
