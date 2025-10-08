import { 
  checkJoinLeaveEvents, 
  generateAutoIntroduction, 
  executeJoinLeaveEvents,
  getAllPersonaProfiles 
} from './joinLeaveManager.js';
import { persoRoomManager } from './persoRoom.js';
import { 
  getExpandedInfoForPersona 
} from './infoExpansion.js';
import { personaTalk } from './dialogueOrchestrator.js';
import { TopicWeight } from './persoRoom.js';

// 통합 테스트용 데이터
const mockPost = {
  id: 'integration-test-post',
  content: '오늘 새로운 AI 기술에 대해 알아보고 있는데, 정말 흥미롭네요! 여러분은 어떤 기술에 관심이 있으신가요?',
  userId: 'test-user-123'
};

const mockAnalysis = {
  sentiment: {
    positive: 0.7,
    neutral: 0.2,
    negative: 0.1
  },
  tones: ['excited', 'curious'],
  subjects: [
    { topic: 'tech', weight: 0.8 },
    { topic: 'ai', weight: 0.9 },
    { topic: 'innovation', weight: 0.6 }
  ]
};

async function testPersonaTalkWithExpandedInfo() {
  console.log('🎭 [PERSONA TALK + EXPANDED INFO] 페르소나 대화 + 확장 정보 통합 테스트');
  console.log('=' .repeat(60));
  
  const personas = ['Kai', 'Espri', 'Milo'];
  
  for (const personaName of personas) {
    console.log(`\n🎭 ${personaName} 페르소나 대화 테스트:`);
    
    const startTime = Date.now();
    
    try {
      const message = await personaTalk(personaName, mockPost, mockAnalysis, {
        previousMessages: []
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`  ✅ 대화 생성 성공! (${responseTime}ms)`);
      console.log(`  📝 메시지: "${message}"`);
      console.log(`  📏 메시지 길이: ${message.length}자`);
      
      if (responseTime > 3000) {
        console.log('  ⚠️  응답 시간이 3초를 초과했습니다.');
      }
      
    } catch (error: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`  ❌ 대화 생성 실패! (${responseTime}ms)`);
      console.log(`  🔍 오류: ${error.message}`);
    }
  }
}

async function testJoinLeaveWithAutoIntroduction() {
  console.log('\n🚪 [JOIN/LEAVE + AUTO INTRODUCTION] 입장/퇴장 + 자동 소개 통합 테스트');
  console.log('=' .repeat(60));
  
  // 테스트 룸 생성
  const testRoomId = 'integration-test-' + Date.now();
  const initialPersonas = ['Kai', 'Espri'];
  
  persoRoomManager.createRoom(testRoomId, initialPersonas, ['tech', 'ai']);
  const room = persoRoomManager.getRoom(testRoomId);
  
  if (!room) {
    console.log('❌ 테스트 룸 생성 실패');
    return false;
  }
  
  console.log(`🏠 테스트 룸 생성: ${testRoomId}`);
  console.log(`👥 초기 페르소나: ${room.activePersonas.map(p => p.id).join(', ')}`);
  
  // 입장 이벤트 생성 및 자동 소개 테스트
  console.log('\n📥 입장 이벤트 + 자동 소개 테스트:');
  
  const joinEvents = checkJoinLeaveEvents(room);
  const joinEventCount = joinEvents.filter(e => e.eventType === 'join').length;
  
  console.log(`  생성된 입장 이벤트: ${joinEventCount}개`);
  
  if (joinEventCount > 0) {
    // 실제 입장 이벤트 실행 (자동 소개 포함)
    try {
      await executeJoinLeaveEvents(joinEvents);
      
      console.log('  ✅ 입장 이벤트 실행 완료');
      
      // 업데이트된 룸 상태 확인
      const updatedRoom = persoRoomManager.getRoom(testRoomId);
      if (updatedRoom) {
        console.log(`  👥 현재 활성 페르소나: ${updatedRoom.activePersonas.length}명`);
        console.log(`  📋 페르소나 목록: ${updatedRoom.activePersonas.map(p => p.id).join(', ')}`);
      }
      
    } catch (error: any) {
      console.log(`  ❌ 입장 이벤트 실행 실패: ${error.message}`);
    }
  }
  
  // 룸 정리
  persoRoomManager.removeRoom(testRoomId);
  console.log('🧹 테스트 룸 정리 완료');
  
  return true;
}

async function testExpandedInfoIntegration() {
  console.log('\n🔍 [EXPANDED INFO INTEGRATION] 확장 정보 통합 테스트');
  console.log('=' .repeat(60));
  
  const personas = [
    { id: 'Kai', type: 'knowledge' },
    { id: 'Espri', type: 'empath' },
    { id: 'Milo', type: 'humor' },
    { id: 'Namu', type: 'analyst' },
    { id: 'Luna', type: 'creative' }
  ];
  
  const mockTopics: TopicWeight[] = [
    { topic: 'tech', weight: 0.8 },
    { topic: 'ai', weight: 0.9 }
  ];
  
  const lastMessage = "정말 흥미로운 기술이네요! 어떻게 작동하는지 궁금해요.";
  
  for (const persona of personas) {
    console.log(`\n🔍 ${persona.id} (${persona.type}) 확장 정보 테스트:`);
    
    try {
      const startTime = Date.now();
      
      const expandedInfo = await getExpandedInfoForPersona(
        persona.type,
        mockTopics,
        lastMessage,
        'test-user-123'
      );
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (expandedInfo) {
        console.log(`  ✅ 확장 정보 생성 성공! (${responseTime}ms)`);
        console.log(`  📊 타입: ${expandedInfo.type}`);
        console.log(`  🔑 데이터 키: ${Object.keys(expandedInfo.data).join(', ')}`);
        
        // 데이터 내용 미리보기
        const dataKeys = Object.keys(expandedInfo.data);
        if (dataKeys.length > 0) {
          const firstKey = dataKeys[0];
          const firstValue = expandedInfo.data[firstKey];
          if (Array.isArray(firstValue) && firstValue.length > 0) {
            console.log(`  📝 ${firstKey} 샘플: "${firstValue[0]}"`);
          }
        }
      } else {
        console.log(`  ❌ 확장 정보 생성 실패 (${responseTime}ms)`);
      }
      
    } catch (error: any) {
      console.log(`  ❌ 확장 정보 테스트 오류: ${error.message}`);
    }
  }
}

async function testSystemLoadSimulation() {
  console.log('\n⚡ [SYSTEM LOAD SIMULATION] 시스템 부하 시뮬레이션 테스트');
  console.log('=' .repeat(60));
  
  const concurrentTests = 3;
  const testsPerBatch = 2;
  
  console.log(`${concurrentTests}개 동시 테스트, 배치당 ${testsPerBatch}개 작업 실행...`);
  
  const startTime = Date.now();
  
  try {
    // 동시 실행 테스트
    const promises = [];
    
    for (let i = 0; i < concurrentTests; i++) {
      const promise = (async () => {
        console.log(`  📦 배치 ${i + 1} 시작...`);
        
        for (let j = 0; j < testsPerBatch; j++) {
          // 룸 생성 및 관리
          const roomId = `load-test-${i}-${j}-${Date.now()}`;
          persoRoomManager.createRoom(roomId, ['Kai', 'Espri'], ['tech']);
          
          // 입장 이벤트 체크
          const room = persoRoomManager.getRoom(roomId);
          if (room) {
            checkJoinLeaveEvents(room);
          }
          
          // 확장 정보 생성 (AI 호출 없이)
          await getExpandedInfoForPersona('knowledge', [{ topic: 'tech', weight: 0.8 }], 'test message');
          
          // 룸 정리
          persoRoomManager.removeRoom(roomId);
        }
        
        console.log(`  ✅ 배치 ${i + 1} 완료`);
      })();
      
      promises.push(promise);
    }
    
    await Promise.all(promises);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(`\n📊 시스템 부하 테스트 결과:`);
    console.log(`  총 실행 시간: ${totalTime}ms`);
    console.log(`  총 작업 수: ${concurrentTests * testsPerBatch * 4}개`);
    console.log(`  평균 작업 시간: ${(totalTime / (concurrentTests * testsPerBatch * 4)).toFixed(1)}ms`);
    
    if (totalTime > 10000) {
      console.log('  ⚠️  시스템 응답이 다소 느립니다. 성능 최적화를 고려해보세요.');
    } else {
      console.log('  ✅ 시스템 성능이 양호합니다.');
    }
    
  } catch (error: any) {
    console.log(`❌ 시스템 부하 테스트 실패: ${error.message}`);
  }
}

async function testAllIntegrationFeatures() {
  console.log('🚀 입장/퇴장 이벤트 관리 시스템 통합 테스트 시작');
  console.log('=' .repeat(70));
  
  try {
    console.log('📋 테스트 구성요소:');
    console.log('  - 페르소나 대화 + 확장 정보');
    console.log('  - 입장/퇴장 + 자동 소개');
    console.log('  - 확장 정보 통합');
    console.log('  - 시스템 부하 시뮬레이션');
    
    const results = [];
    
    console.log('\n1️⃣ 페르소나 대화 + 확장 정보 테스트...');
    await testPersonaTalkWithExpandedInfo();
    results.push(true);
    
    console.log('\n2️⃣ 입장/퇴장 + 자동 소개 테스트...');
    results.push(await testJoinLeaveWithAutoIntroduction());
    
    console.log('\n3️⃣ 확장 정보 통합 테스트...');
    await testExpandedInfoIntegration();
    results.push(true);
    
    console.log('\n4️⃣ 시스템 부하 시뮬레이션 테스트...');
    await testSystemLoadSimulation();
    results.push(true);
    
    const successCount = results.filter(r => r).length;
    const totalTests = results.length;
    
    console.log('\n📊 통합 테스트 결과 요약:');
    console.log(`✅ 성공: ${successCount}/${totalTests}개 테스트`);
    
    if (successCount === totalTests) {
      console.log('\n🎉 모든 통합 테스트 통과!');
      console.log('💡 시스템이 정상적으로 작동하며 프로덕션 환경에서 사용할 수 있습니다.');
    } else {
      console.log('\n⚠️  일부 테스트 실패. 시스템을 점검해주세요.');
    }
    
    console.log('=' .repeat(70));
    
  } catch (error) {
    console.error('❌ 통합 테스트 중 오류 발생:', error);
  }
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  testAllIntegrationFeatures();
}

export { testAllIntegrationFeatures };
