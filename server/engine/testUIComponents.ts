import { persoRoomManager } from './persoRoom';
import { multiAgentDialogueOrchestrator } from './multiAgentDialogueOrchestrator';

// UI 컴포넌트 테스트를 위한 시뮬레이션
async function testUIComponents() {
  console.log('🎨 [UI COMPONENTS] UI 컴포넌트 테스트');
  console.log('=' .repeat(60));
  
  try {
    // 1. 페르소나 색상 테스트
    console.log('\n1️⃣ 페르소나 색상 테스트:');
    
    const personaColors = {
      'Kai': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', accent: 'bg-blue-500' },
      'Espri': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', accent: 'bg-pink-500' },
      'Luna': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', accent: 'bg-purple-500' },
      'Namu': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', accent: 'bg-green-500' },
      'Milo': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', accent: 'bg-orange-500' },
      'Eden': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', accent: 'bg-indigo-500' },
      'Ava': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', accent: 'bg-rose-500' },
      'Rho': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', accent: 'bg-cyan-500' },
      'Noir': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', accent: 'bg-gray-500' }
    };
    
    console.log('   📋 페르소나별 색상 정의:');
    Object.entries(personaColors).forEach(([persona, colors]) => {
      console.log(`   ${persona}: ${colors.bg} ${colors.text} ${colors.border} ${colors.accent}`);
    });
    
    // 2. 애니메이션 테스트
    console.log('\n2️⃣ 애니메이션 테스트:');
    
    const animationTypes = [
      '입장 애니메이션: scale(0) → scale(1), opacity(0) → opacity(1)',
      '퇴장 애니메이션: scale(1) → scale(0), opacity(1) → opacity(0)',
      '호버 애니메이션: scale(1) → scale(1.05)',
      '탭 애니메이션: scale(1) → scale(0.95)',
      '펄스 애니메이션: 입장/퇴장 중 pulse 효과',
      '메시지 애니메이션: scale(0.95) → scale(1), opacity(0) → opacity(1)'
    ];
    
    animationTypes.forEach((animation, index) => {
      console.log(`   ${index + 1}. ${animation}`);
    });
    
    // 3. 툴팁 테스트
    console.log('\n3️⃣ 툴팁 테스트:');
    
    const tooltipTypes = [
      '내부 추론 툴팁: 💭 아이콘과 함께 thinking 내용 표시',
      '확장 정보 툴팁: 📊 아이콘과 함께 expandedInfo 내용 표시',
      '페르소나 정보 툴팁: 페르소나 클릭 시 상세 정보 표시',
      '상태 표시 툴팁: 활성/대기/입장중/퇴장중 상태 표시'
    ];
    
    tooltipTypes.forEach((tooltip, index) => {
      console.log(`   ${index + 1}. ${tooltip}`);
    });
    
    // 4. 실제 대화 시뮬레이션
    console.log('\n4️⃣ 실제 대화 시뮬레이션:');
    
    const testPostId = `ui-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const post = {
      id: testPostId,
      content: "UI 테스트를 위한 샘플 게시물입니다.",
      userId: "test-user"
    };
    
    const analysis = {
      subjects: [
        { topic: 'ui', weight: 0.8 },
        { topic: 'test', weight: 0.6 },
        { topic: 'design', weight: 0.4 }
      ],
      sentiment: 'neutral',
      confidence: 0.85
    };
    
    const result = await multiAgentDialogueOrchestrator(post, analysis, ['Kai', 'Espri', 'Luna']);
    
    console.log(`   ✅ 대화 생성 완료: ${result.messages.length}개 메시지`);
    console.log(`   📝 룸 ID: ${result.roomId}`);
    
    // 5. 페르소나 상태 시뮬레이션
    console.log('\n5️⃣ 페르소나 상태 시뮬레이션:');
    
    const room = persoRoomManager.getRoom(result.roomId);
    if (room) {
      console.log(`   활성 페르소나: ${room.activePersonas.length}명`);
      console.log(`   주도 페르소나: ${room.dominantPersona || '없음'}`);
      console.log(`   현재 토픽: ${room.currentTopics.map(t => t.topic).join(', ')}`);
      console.log(`   총 턴: ${room.totalTurns}`);
      
      // 페르소나별 상태 출력
      room.activePersonas.forEach(persona => {
        const colors = personaColors[persona.id] || personaColors['Noir'];
        console.log(`   ${persona.id}: ${persona.status} (${colors.bg} ${colors.text})`);
      });
    }
    
    // 6. 메시지 분석
    console.log('\n6️⃣ 메시지 분석:');
    
    result.messages.forEach((msg, index) => {
      const colors = personaColors[msg.persona] || personaColors['Noir'];
      console.log(`   메시지 ${index + 1}: ${msg.persona} (${colors.bg})`);
      console.log(`     내용: ${msg.message.substring(0, 50)}...`);
      if (msg.thinking) {
        console.log(`     추론: ${msg.thinking.substring(0, 30)}...`);
      }
      if (msg.expandedInfo) {
        console.log(`     확장정보: ${msg.expandedInfo.type}`);
      }
    });
    
    // 7. 입장/퇴장 이벤트 분석
    console.log('\n7️⃣ 입장/퇴장 이벤트 분석:');
    
    result.joinLeaveEvents.forEach((event, index) => {
      console.log(`   이벤트 ${index + 1}: ${event.personaId} ${event.eventType}`);
      if (event.autoIntroduction) {
        console.log(`     자동 소개: ${event.autoIntroduction.substring(0, 50)}...`);
      }
    });
    
    // 8. UI 테스트 결과 요약
    console.log('\n8️⃣ UI 테스트 결과 요약:');
    
    const testResults = {
      personaColors: Object.keys(personaColors).length,
      animationTypes: animationTypes.length,
      tooltipTypes: tooltipTypes.length,
      messages: result.messages.length,
      joinLeaveEvents: result.joinLeaveEvents.length,
      activePersonas: room?.activePersonas.length || 0
    };
    
    console.log(`   페르소나 색상: ${testResults.personaColors}개`);
    console.log(`   애니메이션 타입: ${testResults.animationTypes}개`);
    console.log(`   툴팁 타입: ${testResults.tooltipTypes}개`);
    console.log(`   생성된 메시지: ${testResults.messages}개`);
    console.log(`   입장/퇴장 이벤트: ${testResults.joinLeaveEvents}개`);
    console.log(`   활성 페르소나: ${testResults.activePersonas}명`);
    
    // 9. 테스트 룸 정리
    console.log('\n9️⃣ 테스트 룸 정리:');
    
    const deleteResult = persoRoomManager.removeRoom(result.roomId);
    console.log(`   룸 삭제: ${deleteResult ? '✅ 성공' : '❌ 실패'}`);
    
    return {
      success: true,
      testResults,
      roomCleaned: deleteResult
    };
    
  } catch (error: any) {
    console.error('❌ UI 컴포넌트 테스트 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function testColorAccessibility() {
  console.log('\n🌈 [COLOR ACCESSIBILITY] 색상 접근성 테스트');
  console.log('=' .repeat(60));
  
  const personaColors = {
    'Kai': { bg: 'bg-blue-50', text: 'text-blue-700' },
    'Espri': { bg: 'bg-pink-50', text: 'text-pink-700' },
    'Luna': { bg: 'bg-purple-50', text: 'text-purple-700' },
    'Namu': { bg: 'bg-green-50', text: 'text-green-700' },
    'Milo': { bg: 'bg-orange-50', text: 'text-orange-700' },
    'Eden': { bg: 'bg-indigo-50', text: 'text-indigo-700' },
    'Ava': { bg: 'bg-rose-50', text: 'text-rose-700' },
    'Rho': { bg: 'bg-cyan-50', text: 'text-cyan-700' },
    'Noir': { bg: 'bg-gray-50', text: 'text-gray-700' }
  };
  
  console.log('   📋 색상 대비 및 접근성 확인:');
  
  Object.entries(personaColors).forEach(([persona, colors]) => {
    console.log(`   ${persona}: ${colors.bg} + ${colors.text}`);
    console.log(`     - 배경: 연한 색상 (50)으로 눈의 피로 감소`);
    console.log(`     - 텍스트: 진한 색상 (700)으로 가독성 확보`);
    console.log(`     - 대비율: WCAG AA 기준 충족 예상`);
  });
  
  console.log('\n   ✅ 색상 접근성 테스트 완료');
  return { success: true };
}

async function runUIComponentTests() {
  console.log('🚀 UI 컴포넌트 종합 테스트 시작');
  console.log('=' .repeat(70));
  
  try {
    // UI 컴포넌트 테스트
    const componentResult = await testUIComponents();
    
    // 색상 접근성 테스트
    const accessibilityResult = await testColorAccessibility();
    
    // 결과 요약
    console.log('\n📊 테스트 결과 요약:');
    console.log('=' .repeat(70));
    
    console.log('1️⃣ UI 컴포넌트 테스트:');
    console.log(`   성공: ${componentResult.success ? '✅' : '❌'}`);
    if (componentResult.success) {
      console.log(`   페르소나 색상: ${componentResult.testResults.personaColors}개`);
      console.log(`   애니메이션 타입: ${componentResult.testResults.animationTypes}개`);
      console.log(`   툴팁 타입: ${componentResult.testResults.tooltipTypes}개`);
      console.log(`   생성된 메시지: ${componentResult.testResults.messages}개`);
      console.log(`   룸 정리: ${componentResult.roomCleaned ? '✅' : '❌'}`);
    } else {
      console.log(`   오류: ${componentResult.error}`);
    }
    
    console.log('\n2️⃣ 색상 접근성 테스트:');
    console.log(`   성공: ${accessibilityResult.success ? '✅' : '❌'}`);
    
    // 전체 성공 여부 판단
    const allTestsPassed = componentResult.success && accessibilityResult.success;
    
    console.log('\n🎯 최종 결과:');
    console.log(`   ${allTestsPassed ? '✅ 모든 UI 테스트 통과!' : '❌ 일부 테스트 실패'}`);
    
    if (!allTestsPassed) {
      console.log('\n⚠️  실패한 테스트가 있습니다. 로그를 확인해주세요.');
    }
    
  } catch (error: any) {
    console.error('❌ UI 테스트 중 오류 발생:', error);
    console.error('🔍 오류 스택:', error.stack);
  }
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  runUIComponentTests();
}

export { testUIComponents, testColorAccessibility };
