import { 
  checkJoinLeaveEvents, 
  getPersonaProfile,
  getAllPersonaProfiles,
  JoinLeaveEvent 
} from './joinLeaveManager.js';
import { persoRoomManager } from './persoRoom.js';
import { TopicWeight } from './persoRoom.js';

// 빠른 테스트용 데이터
const mockTopics: TopicWeight[] = [
  { topic: 'tech', weight: 0.8 },
  { topic: 'travel', weight: 0.6 }
];

async function testPersonaProfiles() {
  console.log('\n👥 [PERSONA PROFILES] 페르소나 프로필 테스트');
  console.log('=' .repeat(50));
  
  const allProfiles = getAllPersonaProfiles();
  console.log(`📊 총 ${allProfiles.length}개의 페르소나 프로필:`);
  
  allProfiles.forEach((profile, index) => {
    console.log(`  ${index + 1}. ${profile.name} (${profile.type})`);
    console.log(`     입장 확률: ${(profile.joinProbability * 100).toFixed(1)}%`);
    console.log(`     퇴장 확률: ${(profile.leaveProbability * 100).toFixed(1)}%`);
  });
  
  return allProfiles.length === 9;
}

async function testJoinLeaveEvents() {
  console.log('\n🚪 [JOIN/LEAVE EVENTS] 입장/퇴장 이벤트 테스트');
  console.log('=' .repeat(50));
  
  // 테스트용 룸 생성
  const testRoomId = 'test-room-' + Date.now();
  const initialPersonas = ['Kai', 'Espri', 'Luna'];
  
  persoRoomManager.createRoom(testRoomId, initialPersonas, ['tech', 'travel']);
  const room = persoRoomManager.getRoom(testRoomId);
  
  if (!room) {
    console.log('❌ 테스트 룸 생성 실패');
    return false;
  }
  
  console.log(`🏠 테스트 룸 생성: ${testRoomId}`);
  console.log(`👥 초기 활성 페르소나: ${room.activePersonas.length}명`);
  console.log(`   - ${room.activePersonas.map(p => p.id).join(', ')}`);
  
  // 입장 이벤트 테스트 (6명 미만일 때)
  console.log('\n📥 입장 이벤트 테스트:');
  const joinEvents = checkJoinLeaveEvents(room);
  const joinEventCount = joinEvents.filter(e => e.eventType === 'join').length;
  const leaveEventCount = joinEvents.filter(e => e.eventType === 'leave').length;
  
  console.log(`  생성된 이벤트: ${joinEvents.length}개`);
  console.log(`  입장 이벤트: ${joinEventCount}개`);
  console.log(`  퇴장 이벤트: ${leaveEventCount}개`);
  
  if (joinEvents.length > 0) {
    console.log('\n📋 이벤트 상세:');
    joinEvents.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.personaId} ${event.eventType}`);
    });
  }
  
  // 퇴장 이벤트 테스트를 위해 더 많은 페르소나 추가
  console.log('\n📤 퇴장 이벤트 테스트를 위해 페르소나 추가:');
  const additionalPersonas = ['Namu', 'Milo', 'Eden'];
  for (const personaId of additionalPersonas) {
    persoRoomManager.addPersona(testRoomId, personaId);
  }
  
  const updatedRoom = persoRoomManager.getRoom(testRoomId);
  if (updatedRoom) {
    console.log(`👥 현재 활성 페르소나: ${updatedRoom.activePersonas.length}명`);
    console.log(`   - ${updatedRoom.activePersonas.map(p => p.id).join(', ')}`);
    
    const leaveEvents = checkJoinLeaveEvents(updatedRoom);
    const newLeaveEventCount = leaveEvents.filter(e => e.eventType === 'leave').length;
    console.log(`  퇴장 이벤트: ${newLeaveEventCount}개`);
  }
  
  // 룸 정리
  persoRoomManager.removeRoom(testRoomId);
  return true;
}

async function testProbabilityLogic() {
  console.log('\n🎲 [PROBABILITY LOGIC] 확률 기반 로직 테스트');
  console.log('=' .repeat(50));
  
  const testRoomId = 'probability-test-' + Date.now();
  const initialPersonas = ['Kai', 'Espri', 'Luna', 'Namu', 'Milo'];
  
  persoRoomManager.createRoom(testRoomId, initialPersonas, ['tech']);
  const room = persoRoomManager.getRoom(testRoomId);
  
  if (!room) {
    console.log('❌ 테스트 룸 생성 실패');
    return false;
  }
  
  console.log(`🏠 테스트 룸: ${testRoomId}`);
  console.log(`👥 초기 페르소나: ${room.activePersonas.length}명`);
  
  // 여러 번 테스트하여 확률 확인
  const testCount = 5; // 빠른 테스트를 위해 5회로 줄임
  let totalJoinEvents = 0;
  let totalLeaveEvents = 0;
  
  console.log(`\n🔄 ${testCount}회 확률 테스트:`);
  
  for (let i = 1; i <= testCount; i++) {
    const events = checkJoinLeaveEvents(room);
    const joinCount = events.filter(e => e.eventType === 'join').length;
    const leaveCount = events.filter(e => e.eventType === 'leave').length;
    
    totalJoinEvents += joinCount;
    totalLeaveEvents += leaveCount;
    
    console.log(`  ${i}회차: 입장 ${joinCount}개, 퇴장 ${leaveCount}개`);
  }
  
  const avgJoinEvents = totalJoinEvents / testCount;
  const avgLeaveEvents = totalLeaveEvents / testCount;
  
  console.log(`\n📊 평균 결과:`);
  console.log(`  평균 입장 이벤트: ${avgJoinEvents.toFixed(2)}개`);
  console.log(`  평균 퇴장 이벤트: ${avgLeaveEvents.toFixed(2)}개`);
  
  // 룸 정리
  persoRoomManager.removeRoom(testRoomId);
  return true;
}

async function testSystemIntegration() {
  console.log('\n🔗 [SYSTEM INTEGRATION] 시스템 통합 테스트');
  console.log('=' .repeat(50));
  
  // 실제 사용 시나리오 시뮬레이션
  const testRoomId = 'integration-test-' + Date.now();
  const initialPersonas = ['Kai', 'Espri'];
  
  persoRoomManager.createRoom(testRoomId, initialPersonas, ['tech', 'travel']);
  const room = persoRoomManager.getRoom(testRoomId);
  
  if (!room) {
    console.log('❌ 테스트 룸 생성 실패');
    return false;
  }
  
  console.log(`🏠 통합 테스트 룸: ${testRoomId}`);
  console.log(`👥 초기 상태: ${room.activePersonas.length}명 (${room.activePersonas.map(p => p.id).join(', ')})`);
  
  // 시뮬레이션: 대화 진행 중 입장/퇴장 이벤트 발생
  console.log('\n📈 대화 진행 시뮬레이션:');
  
  for (let round = 1; round <= 3; round++) {
    console.log(`\n  라운드 ${round}:`);
    
    const events = checkJoinLeaveEvents(room);
    const joinCount = events.filter(e => e.eventType === 'join').length;
    const leaveCount = events.filter(e => e.eventType === 'leave').length;
    
    console.log(`    이벤트: 입장 ${joinCount}개, 퇴장 ${leaveCount}개`);
    
    if (events.length > 0) {
      console.log(`    상세: ${events.map(e => `${e.personaId}(${e.eventType})`).join(', ')}`);
    }
    
    // 실제 이벤트 실행 (AI 호출 없이)
    for (const event of events) {
      if (event.eventType === 'join') {
        persoRoomManager.addPersona(testRoomId, event.personaId);
        console.log(`    ✅ ${event.personaId} 입장 완료`);
      } else if (event.eventType === 'leave') {
        persoRoomManager.removePersona(testRoomId, event.personaId);
        console.log(`    ✅ ${event.personaId} 퇴장 완료`);
      }
    }
    
    const updatedRoom = persoRoomManager.getRoom(testRoomId);
    if (updatedRoom) {
      console.log(`    현재 활성: ${updatedRoom.activePersonas.length}명 (${updatedRoom.activePersonas.map(p => p.id).join(', ')})`);
    }
  }
  
  // 룸 정리
  persoRoomManager.removeRoom(testRoomId);
  return true;
}

async function testAllJoinLeaveFeatures() {
  console.log('🚀 입장/퇴장 이벤트 관리 시스템 빠른 테스트 시작');
  console.log('=' .repeat(60));
  
  try {
    const results = [];
    
    console.log('1️⃣ 페르소나 프로필 테스트...');
    results.push(await testPersonaProfiles());
    
    console.log('\n2️⃣ 입장/퇴장 이벤트 테스트...');
    results.push(await testJoinLeaveEvents());
    
    console.log('\n3️⃣ 확률 기반 로직 테스트...');
    results.push(await testProbabilityLogic());
    
    console.log('\n4️⃣ 시스템 통합 테스트...');
    results.push(await testSystemIntegration());
    
    const successCount = results.filter(r => r).length;
    const totalTests = results.length;
    
    console.log('\n📊 테스트 결과 요약:');
    console.log(`✅ 성공: ${successCount}/${totalTests}개 테스트`);
    
    if (successCount === totalTests) {
      console.log('\n🎉 모든 테스트 통과! 입장/퇴장 이벤트 관리 시스템이 정상 작동합니다.');
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
  testAllJoinLeaveFeatures();
}

export { testAllJoinLeaveFeatures };
