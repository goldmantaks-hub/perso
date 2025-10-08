import { persoRoomManager } from './persoRoom';
import { multiAgentDialogueOrchestrator } from './multiAgentDialogueOrchestrator';
import { checkJoinLeaveEvents, executeJoinLeaveEvents } from './joinLeaveManager';
import { checkHandover, findBestPersonaForTopics } from './handoverManager';
import { getExpandedInfoForPersona } from './infoExpansion';

// 통합 테스트를 위한 시뮬레이션 클래스
class E2ETestSimulator {
  private testResults: Map<string, any> = new Map();
  private errors: string[] = [];
  
  log(step: string, message: string, data?: any) {
    console.log(`[${step}] ${message}`);
    if (data) {
      console.log(`   📊 데이터:`, JSON.stringify(data, null, 2));
    }
  }
  
  recordResult(testName: string, result: any) {
    this.testResults.set(testName, result);
  }
  
  recordError(error: string) {
    this.errors.push(error);
    console.error(`❌ 오류: ${error}`);
  }
  
  getResults() {
    return {
      results: Object.fromEntries(this.testResults),
      errors: this.errors,
      success: this.errors.length === 0
    };
  }
}

async function testConversationFlow() {
  console.log('💬 [CONVERSATION FLOW] 대화 흐름 테스트');
  console.log('=' .repeat(60));
  
  const simulator = new E2ETestSimulator();
  
  try {
    // 1. 초기 대화 생성
    simulator.log('STEP 1', '초기 대화 생성');
    
    const testPostId = `e2e-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const post = {
      id: testPostId,
      content: "인공지능과 인간의 협력에 대해 깊이 있는 대화를 나누고 싶습니다.",
      userId: "test-user"
    };
    
    const analysis = {
      subjects: [
        { topic: 'ai', weight: 0.8 },
        { topic: 'collaboration', weight: 0.7 },
        { topic: 'human', weight: 0.6 },
        { topic: 'technology', weight: 0.5 }
      ],
      sentiment: 'positive',
      confidence: 0.9
    };
    
    const result = await multiAgentDialogueOrchestrator(post, analysis, ['Kai', 'Espri', 'Luna']);
    
    simulator.log('STEP 1', '대화 생성 완료', {
      messages: result.messages.length,
      joinLeaveEvents: result.joinLeaveEvents.length,
      roomId: result.roomId
    });
    
    // 2. 룸 상태 확인
    simulator.log('STEP 2', '룸 상태 확인');
    
    const room = persoRoomManager.getRoom(result.roomId);
    if (!room) {
      throw new Error('룸이 생성되지 않았습니다');
    }
    
    simulator.log('STEP 2', '룸 상태', {
      activePersonas: room.activePersonas.length,
      dominantPersona: room.dominantPersona,
      currentTopics: room.currentTopics,
      totalTurns: room.totalTurns
    });
    
    // 3. 메시지 품질 검증
    simulator.log('STEP 3', '메시지 품질 검증');
    
    const messageQuality = {
      totalMessages: result.messages.length,
      messagesWithThinking: result.messages.filter(m => m.thinking).length,
      messagesWithExpandedInfo: result.messages.filter(m => m.expandedInfo).length,
      uniquePersonas: new Set(result.messages.map(m => m.persona)).size
    };
    
    simulator.log('STEP 3', '메시지 품질', messageQuality);
    
    // 4. 페르소나 다양성 검증
    simulator.log('STEP 4', '페르소나 다양성 검증');
    
    const personaDiversity = {
      activePersonas: room.activePersonas.map(p => ({
        id: p.id,
        status: p.status,
        messageCount: p.messageCount
      })),
      messageDistribution: result.messages.reduce((acc, msg) => {
        acc[msg.persona] = (acc[msg.persona] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
    
    simulator.log('STEP 4', '페르소나 다양성', personaDiversity);
    
    simulator.recordResult('conversationFlow', {
      success: true,
      messageQuality,
      personaDiversity,
      roomState: {
        activePersonas: room.activePersonas.length,
        dominantPersona: room.dominantPersona,
        totalTurns: room.totalTurns
      }
    });
    
    return { success: true, roomId: result.roomId, messageCount: result.messages.length };
    
  } catch (error: any) {
    simulator.recordError(`대화 흐름 테스트 실패: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testHandoverSystem() {
  console.log('\n🔄 [HANDOVER SYSTEM] 주도권 교체 테스트');
  console.log('=' .repeat(60));
  
  const simulator = new E2ETestSimulator();
  
  try {
    // 1. 테스트 룸 생성
    simulator.log('STEP 1', '테스트 룸 생성');
    
    const testRoomId = `handover-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const room = persoRoomManager.createRoom(testRoomId, ['Kai', 'Espri', 'Luna'], ['tech', 'ai']);
    
    simulator.log('STEP 1', '룸 생성 완료', { roomId: room.roomId });
    
    // 2. 초기 주도권 설정
    simulator.log('STEP 2', '초기 주도권 설정');
    
    room.dominantPersona = 'Kai';
    room.turnsSinceDominantChange = 0;
    room.totalTurns = 0;
    
    simulator.log('STEP 2', '초기 주도권', { dominantPersona: room.dominantPersona });
    
    // 3. 턴 증가 시뮬레이션
    simulator.log('STEP 3', '턴 증가 시뮬레이션');
    
    const handoverResults = [];
    
    for (let turn = 1; turn <= 10; turn++) {
      room.totalTurns = turn;
      room.turnsSinceDominantChange++;
      
      // 주도권 교체 확인
      const handoverResult = checkHandover(room);
      
      if (handoverResult.shouldHandover) {
        simulator.log('STEP 3', `턴 ${turn}에서 주도권 교체`, {
          previous: room.dominantPersona,
          new: handoverResult.newDominantPersona,
          reason: handoverResult.reason
        });
        
        room.dominantPersona = handoverResult.newDominantPersona;
        room.turnsSinceDominantChange = 0;
        
        handoverResults.push({
          turn,
          previous: room.dominantPersona,
          new: handoverResult.newDominantPersona,
          reason: handoverResult.reason
        });
      }
    }
    
    simulator.log('STEP 3', '주도권 교체 결과', handoverResults);
    
    // 4. 토픽 기반 주도권 교체 테스트
    simulator.log('STEP 4', '토픽 기반 주도권 교체 테스트');
    
    // 토픽 변경 시뮬레이션
    room.previousTopics = room.currentTopics;
    room.currentTopics = [
      { topic: 'creativity', weight: 0.8 },
      { topic: 'art', weight: 0.6 }
    ];
    
    const topicHandoverResult = checkHandover(room);
    if (topicHandoverResult.shouldHandover) {
      simulator.log('STEP 4', '토픽 변경으로 인한 주도권 교체', {
        previous: room.dominantPersona,
        new: topicHandoverResult.newDominantPersona,
        reason: topicHandoverResult.reason
      });
    }
    
    // 5. 최적 페르소나 선택 테스트
    simulator.log('STEP 5', '최적 페르소나 선택 테스트');
    
    const bestPersona = findBestPersonaForTopics(room.currentTopics, room.activePersonas);
    simulator.log('STEP 5', '최적 페르소나', { bestPersona });
    
    simulator.recordResult('handoverSystem', {
      success: true,
      handoverResults,
      topicHandover: topicHandoverResult.shouldHandover,
      bestPersona,
      finalState: {
        dominantPersona: room.dominantPersona,
        totalTurns: room.totalTurns,
        turnsSinceChange: room.turnsSinceDominantChange
      }
    });
    
    return { success: true, roomId: room.roomId, handoverCount: handoverResults.length };
    
  } catch (error: any) {
    simulator.recordError(`주도권 교체 테스트 실패: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testJoinLeaveEvents() {
  console.log('\n🚪 [JOIN/LEAVE EVENTS] 입장/퇴장 이벤트 테스트');
  console.log('=' .repeat(60));
  
  const simulator = new E2ETestSimulator();
  
  try {
    // 1. 테스트 룸 생성
    simulator.log('STEP 1', '테스트 룸 생성');
    
    const testRoomId = `joinleave-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const room = persoRoomManager.createRoom(testRoomId, ['Kai', 'Espri'], ['tech']);
    
    simulator.log('STEP 1', '룸 생성 완료', { 
      roomId: room.roomId,
      initialPersonas: room.activePersonas.length 
    });
    
    // 2. 입장/퇴장 이벤트 체크
    simulator.log('STEP 2', '입장/퇴장 이벤트 체크');
    
    const events = checkJoinLeaveEvents(room);
    simulator.log('STEP 2', '생성된 이벤트', { 
      eventCount: events.length,
      events: events.map(e => ({ personaId: e.personaId, eventType: e.eventType }))
    });
    
    // 3. 이벤트 실행
    simulator.log('STEP 3', '이벤트 실행');
    
    if (events.length > 0) {
      await executeJoinLeaveEvents(events);
      
      // 업데이트된 룸 상태 확인
      const updatedRoom = persoRoomManager.getRoom(testRoomId);
      if (updatedRoom) {
        simulator.log('STEP 3', '이벤트 실행 후 상태', {
          activePersonas: updatedRoom.activePersonas.length,
          personaList: updatedRoom.activePersonas.map(p => ({
            id: p.id,
            status: p.status
          }))
        });
      }
    }
    
    // 4. 자동 소개 메시지 테스트
    simulator.log('STEP 4', '자동 소개 메시지 테스트');
    
    const joinEvents = events.filter(e => e.eventType === 'join');
    for (const event of joinEvents) {
      if (event.autoIntroduction) {
        simulator.log('STEP 4', `${event.personaId} 자동 소개`, {
          introduction: event.autoIntroduction.substring(0, 100) + '...'
        });
      }
    }
    
    // 5. 룸 정리
    simulator.log('STEP 5', '룸 정리');
    
    const deleteResult = persoRoomManager.removeRoom(testRoomId);
    simulator.log('STEP 5', '룸 삭제', { success: deleteResult });
    
    simulator.recordResult('joinLeaveEvents', {
      success: true,
      eventsGenerated: events.length,
      eventsExecuted: events.length,
      joinEvents: joinEvents.length,
      leaveEvents: events.filter(e => e.eventType === 'leave').length,
      roomCleaned: deleteResult
    });
    
    return { success: true, eventsGenerated: events.length };
    
  } catch (error: any) {
    simulator.recordError(`입장/퇴장 이벤트 테스트 실패: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testInfoExpansion() {
  console.log('\n📊 [INFO EXPANSION] 정보 확장 테스트');
  console.log('=' .repeat(60));
  
  const simulator = new E2ETestSimulator();
  
  try {
    // 1. 각 페르소나 타입별 정보 확장 테스트
    simulator.log('STEP 1', '페르소나 타입별 정보 확장 테스트');
    
    const personaTypes = ['knowledge', 'analyst', 'empath', 'creative', 'humor'];
    const topics = [
      { topic: 'ai', weight: 0.8 },
      { topic: 'technology', weight: 0.6 }
    ];
    const lastMessage = "인공지능의 미래에 대해 어떻게 생각하시나요?";
    
    const expansionResults = [];
    
    for (const personaType of personaTypes) {
      const expandedInfo = await getExpandedInfoForPersona(
        personaType,
        topics,
        lastMessage,
        'test-user'
      );
      
      expansionResults.push({
        personaType,
        hasData: !!expandedInfo,
        dataType: expandedInfo?.type,
        dataKeys: expandedInfo ? Object.keys(expandedInfo.data || {}) : []
      });
      
      simulator.log('STEP 1', `${personaType} 정보 확장`, {
        hasData: !!expandedInfo,
        dataType: expandedInfo?.type
      });
    }
    
    // 2. 정보 확장 품질 검증
    simulator.log('STEP 2', '정보 확장 품질 검증');
    
    const qualityMetrics = {
      totalTypes: personaTypes.length,
      successfulExpansions: expansionResults.filter(r => r.hasData).length,
      uniqueDataTypes: new Set(expansionResults.map(r => r.dataType)).size
    };
    
    simulator.log('STEP 2', '품질 메트릭', qualityMetrics);
    
    simulator.recordResult('infoExpansion', {
      success: true,
      expansionResults,
      qualityMetrics
    });
    
    return { success: true, expansionCount: qualityMetrics.successfulExpansions };
    
  } catch (error: any) {
    simulator.recordError(`정보 확장 테스트 실패: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testSystemIntegration() {
  console.log('\n🔗 [SYSTEM INTEGRATION] 전체 시스템 통합 테스트');
  console.log('=' .repeat(60));
  
  const simulator = new E2ETestSimulator();
  
  try {
    // 1. 전체 워크플로우 시뮬레이션
    simulator.log('STEP 1', '전체 워크플로우 시뮬레이션');
    
    const testPostId = `integration-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const post = {
      id: testPostId,
      content: "AI와 인간의 협력, 창의성, 감정, 지식, 유머 등 다양한 관점에서 대화해보고 싶습니다.",
      userId: "integration-test-user"
    };
    
    const analysis = {
      subjects: [
        { topic: 'ai', weight: 0.9 },
        { topic: 'collaboration', weight: 0.8 },
        { topic: 'creativity', weight: 0.7 },
        { topic: 'emotion', weight: 0.6 },
        { topic: 'knowledge', weight: 0.8 },
        { topic: 'humor', weight: 0.5 }
      ],
      sentiment: 'positive',
      confidence: 0.95
    };
    
    // 2. Multi-agent 오케스트레이션 실행
    simulator.log('STEP 2', 'Multi-agent 오케스트레이션 실행');
    
    const result = await multiAgentDialogueOrchestrator(post, analysis, ['Kai', 'Espri', 'Luna', 'Milo', 'Eden']);
    
    simulator.log('STEP 2', '오케스트레이션 완료', {
      messages: result.messages.length,
      joinLeaveEvents: result.joinLeaveEvents.length,
      roomId: result.roomId
    });
    
    // 3. 룸 상태 및 페르소나 관리 검증
    simulator.log('STEP 3', '룸 상태 및 페르소나 관리 검증');
    
    const room = persoRoomManager.getRoom(result.roomId);
    if (!room) {
      throw new Error('룸이 생성되지 않았습니다');
    }
    
    const roomState = {
      activePersonas: room.activePersonas.length,
      dominantPersona: room.dominantPersona,
      currentTopics: room.currentTopics,
      totalTurns: room.totalTurns,
      lastActivity: room.lastActivity
    };
    
    simulator.log('STEP 3', '룸 상태', roomState);
    
    // 4. 주도권 교체 검증
    simulator.log('STEP 4', '주도권 교체 검증');
    
    const handoverResult = checkHandover(room);
    simulator.log('STEP 4', '주도권 교체 결과', {
      shouldHandover: handoverResult.shouldHandover,
      newDominant: handoverResult.newDominantPersona,
      reason: handoverResult.reason
    });
    
    // 5. 입장/퇴장 이벤트 검증
    simulator.log('STEP 5', '입장/퇴장 이벤트 검증');
    
    const joinLeaveEvents = checkJoinLeaveEvents(room);
    simulator.log('STEP 5', '입장/퇴장 이벤트', {
      eventCount: joinLeaveEvents.length,
      joinEvents: joinLeaveEvents.filter(e => e.eventType === 'join').length,
      leaveEvents: joinLeaveEvents.filter(e => e.eventType === 'leave').length
    });
    
    // 6. 메시지 품질 및 다양성 검증
    simulator.log('STEP 6', '메시지 품질 및 다양성 검증');
    
    const messageAnalysis = {
      totalMessages: result.messages.length,
      uniquePersonas: new Set(result.messages.map(m => m.persona)).size,
      messagesWithThinking: result.messages.filter(m => m.thinking).length,
      messagesWithExpandedInfo: result.messages.filter(m => m.expandedInfo).length,
      personaDistribution: result.messages.reduce((acc, msg) => {
        acc[msg.persona] = (acc[msg.persona] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
    
    simulator.log('STEP 6', '메시지 분석', messageAnalysis);
    
    // 7. 시스템 안정성 검증
    simulator.log('STEP 7', '시스템 안정성 검증');
    
    const stabilityMetrics = {
      roomExists: !!room,
      personasActive: room.activePersonas.length > 0,
      hasDominantPersona: !!room.dominantPersona,
      topicsPresent: room.currentTopics.length > 0,
      messagesGenerated: result.messages.length > 0
    };
    
    simulator.log('STEP 7', '안정성 메트릭', stabilityMetrics);
    
    // 8. 메모리 정리
    simulator.log('STEP 8', '메모리 정리');
    
    const cleanupResult = persoRoomManager.removeRoom(result.roomId);
    simulator.log('STEP 8', '메모리 정리 결과', { success: cleanupResult });
    
    simulator.recordResult('systemIntegration', {
      success: true,
      roomState,
      handoverResult,
      joinLeaveEvents: joinLeaveEvents.length,
      messageAnalysis,
      stabilityMetrics,
      cleanupResult
    });
    
    return { 
      success: true, 
      messageCount: result.messages.length,
      eventCount: result.joinLeaveEvents.length,
      roomCleaned: cleanupResult
    };
    
  } catch (error: any) {
    simulator.recordError(`시스템 통합 테스트 실패: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runE2EIntegrationTests() {
  console.log('🚀 엔드투엔드 통합 테스트 시작');
  console.log('=' .repeat(80));
  
  const startTime = Date.now();
  
  try {
    // 1. 대화 흐름 테스트
    const conversationResult = await testConversationFlow();
    
    // 2. 주도권 교체 테스트
    const handoverResult = await testHandoverSystem();
    
    // 3. 입장/퇴장 이벤트 테스트
    const joinLeaveResult = await testJoinLeaveEvents();
    
    // 4. 정보 확장 테스트
    const expansionResult = await testInfoExpansion();
    
    // 5. 전체 시스템 통합 테스트
    const integrationResult = await testSystemIntegration();
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // 결과 요약
    console.log('\n📊 테스트 결과 요약:');
    console.log('=' .repeat(80));
    
    console.log('1️⃣ 대화 흐름 테스트:');
    console.log(`   성공: ${conversationResult.success ? '✅' : '❌'}`);
    if (conversationResult.success) {
      console.log(`   메시지 수: ${conversationResult.messageCount}개`);
    } else {
      console.log(`   오류: ${conversationResult.error}`);
    }
    
    console.log('\n2️⃣ 주도권 교체 테스트:');
    console.log(`   성공: ${handoverResult.success ? '✅' : '❌'}`);
    if (handoverResult.success) {
      console.log(`   교체 횟수: ${handoverResult.handoverCount}회`);
    } else {
      console.log(`   오류: ${handoverResult.error}`);
    }
    
    console.log('\n3️⃣ 입장/퇴장 이벤트 테스트:');
    console.log(`   성공: ${joinLeaveResult.success ? '✅' : '❌'}`);
    if (joinLeaveResult.success) {
      console.log(`   이벤트 수: ${joinLeaveResult.eventsGenerated}개`);
    } else {
      console.log(`   오류: ${joinLeaveResult.error}`);
    }
    
    console.log('\n4️⃣ 정보 확장 테스트:');
    console.log(`   성공: ${expansionResult.success ? '✅' : '❌'}`);
    if (expansionResult.success) {
      console.log(`   확장 수: ${expansionResult.expansionCount}개`);
    } else {
      console.log(`   오류: ${expansionResult.error}`);
    }
    
    console.log('\n5️⃣ 전체 시스템 통합 테스트:');
    console.log(`   성공: ${integrationResult.success ? '✅' : '❌'}`);
    if (integrationResult.success) {
      console.log(`   메시지 수: ${integrationResult.messageCount}개`);
      console.log(`   이벤트 수: ${integrationResult.eventCount}개`);
      console.log(`   룸 정리: ${integrationResult.roomCleaned ? '✅' : '❌'}`);
    } else {
      console.log(`   오류: ${integrationResult.error}`);
    }
    
    // 전체 성공 여부 판단
    const allTestsPassed = [
      conversationResult.success,
      handoverResult.success,
      joinLeaveResult.success,
      expansionResult.success,
      integrationResult.success
    ].every(result => result === true);
    
    console.log('\n🎯 최종 결과:');
    console.log(`   ${allTestsPassed ? '✅ 모든 통합 테스트 통과!' : '❌ 일부 테스트 실패'}`);
    console.log(`   총 실행 시간: ${totalTime}ms`);
    
    if (!allTestsPassed) {
      console.log('\n⚠️  실패한 테스트가 있습니다. 로그를 확인해주세요.');
    }
    
    return {
      success: allTestsPassed,
      totalTime,
      results: {
        conversation: conversationResult,
        handover: handoverResult,
        joinLeave: joinLeaveResult,
        expansion: expansionResult,
        integration: integrationResult
      }
    };
    
  } catch (error: any) {
    console.error('❌ 통합 테스트 중 오류 발생:', error);
    console.error('🔍 오류 스택:', error.stack);
    return { success: false, error: error.message };
  }
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  runE2EIntegrationTests();
}

export { 
  testConversationFlow, 
  testHandoverSystem, 
  testJoinLeaveEvents, 
  testInfoExpansion, 
  testSystemIntegration 
};
