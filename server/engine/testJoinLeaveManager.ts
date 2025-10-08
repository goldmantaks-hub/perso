import { 
  checkJoinLeaveEvents, 
  generateAutoIntroduction, 
  executeJoinLeaveEvents,
  getPersonaProfile,
  getAllPersonaProfiles,
  JoinLeaveEvent 
} from './joinLeaveManager.js';
import { persoRoomManager } from './persoRoom.js';
import { TopicWeight } from './persoRoom.js';

// 테스트용 데이터
const mockTopics: TopicWeight[] = [
  { topic: 'tech', weight: 0.8 },
  { topic: 'travel', weight: 0.6 },
  { topic: 'cuisine', weight: 0.4 }
];

async function testPersonaProfiles() {
  console.log('\n👥 [PERSONA PROFILES] 페르소나 프로필 테스트');
  console.log('=' .repeat(50));
  
  const allProfiles = getAllPersonaProfiles();
  console.log(`📊 총 ${allProfiles.length}개의 페르소나 프로필:`);
  
  allProfiles.forEach((profile, index) => {
    console.log(`  ${index + 1}. ${profile.name} (${profile.type})`);
    console.log(`     역할: ${profile.role}`);
    console.log(`     입장 확률: ${(profile.joinProbability * 100).toFixed(1)}%`);
    console.log(`     퇴장 확률: ${(profile.leaveProbability * 100).toFixed(1)}%`);
  });
  
  // 특정 페르소나 프로필 테스트
  const kaiProfile = getPersonaProfile('Kai');
  if (kaiProfile) {
    console.log('\n🔍 Kai 프로필 상세:');
    console.log(`  ID: ${kaiProfile.id}`);
    console.log(`  이름: ${kaiProfile.name}`);
    console.log(`  타입: ${kaiProfile.type}`);
    console.log(`  톤: ${kaiProfile.tone}`);
    console.log(`  스타일: ${kaiProfile.style}`);
  }
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
    return;
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
      console.log(`  ${index + 1}. ${event.personaId} ${event.eventType} (${new Date(event.timestamp).toLocaleTimeString()})`);
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
}

async function testAutoIntroduction() {
  console.log('\n💬 [AUTO INTRODUCTION] 자동 소개 메시지 테스트');
  console.log('=' .repeat(50));
  
  const testPersonas = ['Kai', 'Espri', 'Luna', 'Milo'];
  const currentTopics = ['tech', 'travel', 'cuisine'];
  
  for (const personaId of testPersonas) {
    console.log(`\n🎭 ${personaId} 자동 소개 테스트:`);
    
    try {
      const introduction = await generateAutoIntroduction(personaId, currentTopics);
      console.log(`  소개 메시지: "${introduction}"`);
      
      // 메시지 길이 확인
      const messageLength = introduction.length;
      console.log(`  메시지 길이: ${messageLength}자`);
      
      if (messageLength < 10) {
        console.log('  ⚠️  메시지가 너무 짧습니다');
      } else if (messageLength > 100) {
        console.log('  ⚠️  메시지가 너무 깁니다');
      } else {
        console.log('  ✅ 적절한 길이의 메시지입니다');
      }
      
    } catch (error) {
      console.log(`  ❌ 오류 발생: ${error}`);
    }
  }
}

async function testEventExecution() {
  console.log('\n⚡ [EVENT EXECUTION] 이벤트 실행 테스트');
  console.log('=' .repeat(50));
  
  // 테스트용 룸 생성
  const testRoomId = 'execution-test-' + Date.now();
  const initialPersonas = ['Kai', 'Espri'];
  
  persoRoomManager.createRoom(testRoomId, initialPersonas, ['tech']);
  const room = persoRoomManager.getRoom(testRoomId);
  
  if (!room) {
    console.log('❌ 테스트 룸 생성 실패');
    return;
  }
  
  console.log(`🏠 테스트 룸: ${testRoomId}`);
  console.log(`👥 초기 페르소나: ${room.activePersonas.map(p => p.id).join(', ')}`);
  
  // 입장 이벤트 생성
  const mockEvents: JoinLeaveEvent[] = [
    {
      roomId: testRoomId,
      personaId: 'Luna',
      eventType: 'join',
      timestamp: Date.now()
    },
    {
      roomId: testRoomId,
      personaId: 'Milo',
      eventType: 'join',
      timestamp: Date.now()
    }
  ];
  
  console.log('\n📥 입장 이벤트 실행:');
  for (const event of mockEvents) {
    console.log(`  ${event.personaId} 입장 시도...`);
  }
  
  try {
    await executeJoinLeaveEvents(mockEvents);
    
    const updatedRoom = persoRoomManager.getRoom(testRoomId);
    if (updatedRoom) {
      console.log(`✅ 이벤트 실행 완료`);
      console.log(`👥 현재 활성 페르소나: ${updatedRoom.activePersonas.length}명`);
      console.log(`   - ${updatedRoom.activePersonas.map(p => p.id).join(', ')}`);
    }
    
  } catch (error) {
    console.log(`❌ 이벤트 실행 오류: ${error}`);
  }
  
  // 룸 정리
  persoRoomManager.removeRoom(testRoomId);
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
    return;
  }
  
  console.log(`🏠 테스트 룸: ${testRoomId}`);
  console.log(`👥 초기 페르소나: ${room.activePersonas.length}명 (${room.activePersonas.map(p => p.id).join(', ')})`);
  
  // 여러 번 테스트하여 확률 확인
  const testCount = 10;
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
}

async function testAllJoinLeaveFeatures() {
  console.log('🚀 입장/퇴장 이벤트 관리 시스템 테스트 시작');
  console.log('=' .repeat(60));
  
  try {
    await testPersonaProfiles();
    await testJoinLeaveEvents();
    await testAutoIntroduction();
    await testEventExecution();
    await testProbabilityLogic();
    
    console.log('\n✅ 모든 입장/퇴장 이벤트 관리 테스트 완료!');
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
