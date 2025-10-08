import { persoRoomManager } from './persoRoom';
import { multiAgentDialogueOrchestrator } from './multiAgentDialogueOrchestrator';
import { checkJoinLeaveEvents, executeJoinLeaveEvents } from './joinLeaveManager';
import { checkHandover } from './handoverManager';

// 웹소켓 이벤트 시뮬레이션을 위한 Mock 클래스
class MockSocket {
  private events: Map<string, any[]> = new Map();
  
  emit(event: string, data: any) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(data);
    console.log(`[MOCK] Emitted ${event}:`, JSON.stringify(data, null, 2));
  }
  
  getEmittedEvents(event: string): any[] {
    return this.events.get(event) || [];
  }
  
  getAllEvents(): Map<string, any[]> {
    return new Map(this.events);
  }
  
  clear() {
    this.events.clear();
  }
}

async function testWebSocketIntegration() {
  console.log('🔌 [WEBSOCKET INTEGRATION] 웹소켓 통합 테스트');
  console.log('=' .repeat(60));
  
  const mockSocket = new MockSocket();
  const testPostId = `websocket-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // 1. AI 대화 오케스트레이션 테스트
    console.log('\n1️⃣ AI 대화 오케스트레이션 테스트:');
    
    const post = {
      id: testPostId,
      content: "인공지능과 인간의 협력에 대해 어떻게 생각하시나요?",
      userId: "test-user"
    };
    
    const analysis = {
      subjects: [
        { topic: "ai", weight: 0.8 },
        { topic: "collaboration", weight: 0.6 },
        { topic: "human", weight: 0.4 }
      ],
      sentiment: "neutral",
      confidence: 0.85
    };
    
    const result = await multiAgentDialogueOrchestrator(post, analysis, ['Kai', 'Espri', 'Luna']);
    
    console.log(`   ✅ 오케스트레이션 완료: ${result.messages.length}개 메시지, ${result.joinLeaveEvents.length}개 이벤트`);
    console.log(`   📝 룸 ID: ${result.roomId}`);
    
    // 2. 페르소나 상태 업데이트 시뮬레이션
    console.log('\n2️⃣ 페르소나 상태 업데이트 시뮬레이션:');
    
    const room = persoRoomManager.getRoom(result.roomId);
    if (room) {
      // 페르소나 상태 업데이트 이벤트 시뮬레이션
      mockSocket.emit('persona:status:update', {
        postId: testPostId,
        roomId: result.roomId,
        activePersonas: room.activePersonas.map(p => ({
          id: p.id,
          status: p.status,
          joinedAt: p.joinedAt,
          lastSpokeAt: p.lastSpokeAt,
          messageCount: p.messageCount
        })),
        dominantPersona: room.dominantPersona,
        currentTopics: room.currentTopics,
        totalTurns: room.totalTurns
      });
      
      console.log(`   ✅ 페르소나 상태 업데이트 전송: ${room.activePersonas.length}명 활성`);
    }
    
    // 3. 입장/퇴장 이벤트 시뮬레이션
    console.log('\n3️⃣ 입장/퇴장 이벤트 시뮬레이션:');
    
    for (const event of result.joinLeaveEvents) {
      console.log(`   📋 처리 중인 이벤트: ${event.eventType} - ${event.personaId}`);
      
      // 시스템 메시지 생성
      let systemMessage = '';
      if (event.eventType === 'join') {
        systemMessage = `${event.personaId} 페르소나가 대화에 참여했습니다`;
      } else if (event.eventType === 'leave') {
        systemMessage = `${event.personaId} 페르소나가 대화를 떠났습니다`;
      }
      
      // 시스템 메시지 전송
      if (systemMessage) {
        mockSocket.emit('message:system', {
          id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          postId: testPostId,
          roomId: result.roomId,
          senderType: 'system',
          senderId: 'system',
          messageType: event.eventType,
          content: systemMessage,
          timestamp: Date.now()
        });
      }
      
      // 페르소나 이벤트 전송
      mockSocket.emit('persona:event', {
        postId: testPostId,
        roomId: result.roomId,
        personaId: event.personaId,
        eventType: event.eventType,
        autoIntroduction: event.autoIntroduction,
        timestamp: Date.now()
      });
      
      // 자동 소개 메시지가 있는 경우
      if (event.autoIntroduction) {
        mockSocket.emit('persona:auto-introduction', {
          postId: testPostId,
          roomId: result.roomId,
          personaId: event.personaId,
          introduction: event.autoIntroduction,
          timestamp: Date.now()
        });
      }
    }
    
    // 4. 대화 메시지 시뮬레이션
    console.log('\n4️⃣ 대화 메시지 시뮬레이션:');
    
    for (let i = 0; i < result.messages.length; i++) {
      const msg = result.messages[i];
      
      // 메시지 전송
      mockSocket.emit('ai:dialogue:message', {
        postId: testPostId,
        roomId: result.roomId,
        persona: msg.persona,
        message: msg.message,
        thinking: msg.thinking,
        type: msg.type,
        expandedInfo: msg.expandedInfo,
        index: i,
        total: result.messages.length,
        timestamp: Date.now()
      });
      
      // 주도권 교체 확인
      if (room) {
        const handoverResult = checkHandover(room);
        if (handoverResult.shouldHandover) {
          console.log(`   🔄 주도권 교체 감지: ${handoverResult.newDominantPersona}`);
          
          mockSocket.emit('persona:handover', {
            postId: testPostId,
            roomId: result.roomId,
            previousDominant: room.dominantPersona,
            newDominant: handoverResult.newDominantPersona,
            reason: handoverResult.reason,
            timestamp: Date.now()
          });
        }
      }
      
      console.log(`   📤 메시지 ${i + 1}/${result.messages.length} 전송: ${msg.persona}`);
    }
    
    // 5. 대화 완료 알림
    console.log('\n5️⃣ 대화 완료 알림:');
    
    mockSocket.emit('ai:dialogue:complete', {
      postId: testPostId,
      roomId: result.roomId,
      totalMessages: result.messages.length,
      totalEvents: result.joinLeaveEvents.length
    });
    
    // 감정 데이터 생성
    const emotionData = result.messages.map(msg => ({
      timestamp: Date.now(),
      emotion: msg.type === 'empath' ? 'empathetic' :
               msg.type === 'humor' ? 'playful' :
               msg.type === 'knowledge' ? 'analytical' :
               msg.type === 'creative' ? 'imaginative' : 'neutral',
      intensity: 0.8,
      personaName: msg.persona
    }));
    
    mockSocket.emit('conversation:end', {
      postId: testPostId,
      roomId: result.roomId,
      emotionData,
      timestamp: Date.now()
    });
    
    console.log(`   ✅ 대화 완료: ${result.messages.length}개 메시지, ${result.joinLeaveEvents.length}개 이벤트`);
    
    // 6. 전송된 이벤트 분석
    console.log('\n6️⃣ 전송된 이벤트 분석:');
    
    const allEvents = mockSocket.getAllEvents();
    console.log(`   📊 총 이벤트 타입: ${allEvents.size}개`);
    
    for (const [eventType, events] of allEvents) {
      console.log(`   📋 ${eventType}: ${events.length}개`);
      
      if (eventType === 'persona:status:update') {
        const statusEvent = events[0];
        console.log(`      활성 페르소나: ${statusEvent.activePersonas.length}명`);
        console.log(`      주도 페르소나: ${statusEvent.dominantPersona || '없음'}`);
        console.log(`      현재 토픽: ${statusEvent.currentTopics.map((t: any) => t.topic).join(', ')}`);
      } else if (eventType === 'ai:dialogue:message') {
        console.log(`      메시지 페르소나: ${events.map((e: any) => e.persona).join(', ')}`);
      } else if (eventType === 'persona:event') {
        console.log(`      이벤트 타입: ${events.map((e: any) => `${e.personaId}(${e.eventType})`).join(', ')}`);
      }
    }
    
    return {
      success: true,
      totalEvents: Array.from(allEvents.values()).reduce((sum, events) => sum + events.length, 0),
      eventTypes: allEvents.size,
      messages: result.messages.length,
      joinLeaveEvents: result.joinLeaveEvents.length
    };
    
  } catch (error: any) {
    console.error('❌ 웹소켓 통합 테스트 실패:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // 테스트 룸 정리
    try {
      const deleteResult = persoRoomManager.removeRoom(result.roomId);
      console.log(`\n🧹 테스트 룸 정리: ${deleteResult ? '✅ 성공' : '❌ 실패'}`);
    } catch (error: any) {
      console.log(`   ⚠️  룸 정리 중 오류: ${error.message}`);
    }
  }
}

async function testPersonaStatusMonitoring() {
  console.log('\n👥 [PERSONA STATUS] 페르소나 상태 모니터링 테스트');
  console.log('=' .repeat(60));
  
  const mockSocket = new MockSocket();
  const testPostId = `status-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // 1. 룸 생성
    const room = persoRoomManager.createRoom(testPostId, ['Kai', 'Espri'], ['tech']);
    console.log(`   ✅ 룸 생성: ${room.roomId}`);
    
    // 2. 페르소나 상태 요청 시뮬레이션
    console.log('\n2️⃣ 페르소나 상태 요청 시뮬레이션:');
    
    mockSocket.emit('persona:status:request', {
      postId: testPostId,
      roomId: room.roomId
    });
    
    // 3. 상태 업데이트 전송
    mockSocket.emit('persona:status:update', {
      postId: testPostId,
      roomId: room.roomId,
      activePersonas: room.activePersonas.map(p => ({
        id: p.id,
        status: p.status,
        joinedAt: p.joinedAt,
        lastSpokeAt: p.lastSpokeAt,
        messageCount: p.messageCount
      })),
      dominantPersona: room.dominantPersona,
      currentTopics: room.currentTopics,
      totalTurns: room.totalTurns,
      lastActivity: room.lastActivity
    });
    
    console.log(`   ✅ 상태 업데이트 전송: ${room.activePersonas.length}명 활성`);
    
    // 4. 룸 정리 요청 시뮬레이션
    console.log('\n3️⃣ 룸 정리 요청 시뮬레이션:');
    
    mockSocket.emit('room:cleanup:request', {
      roomId: room.roomId
    });
    
    const cleanupResult = persoRoomManager.removeRoom(room.roomId);
    mockSocket.emit('room:cleanup:result', {
      cleaned: cleanupResult ? 1 : 0,
      failed: cleanupResult ? 0 : 1,
      timestamp: Date.now()
    });
    
    console.log(`   ✅ 룸 정리 완료: ${cleanupResult ? '성공' : '실패'}`);
    
    return {
      success: true,
      roomCreated: true,
      statusUpdated: true,
      roomCleaned: cleanupResult
    };
    
  } catch (error: any) {
    console.error('❌ 페르소나 상태 모니터링 테스트 실패:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function runWebSocketIntegrationTests() {
  console.log('🚀 웹소켓 통합 시스템 종합 테스트 시작');
  console.log('=' .repeat(70));
  
  try {
    // AI 대화 오케스트레이션 테스트
    const orchestrationResult = await testWebSocketIntegration();
    
    // 페르소나 상태 모니터링 테스트
    const statusResult = await testPersonaStatusMonitoring();
    
    // 결과 요약
    console.log('\n📊 테스트 결과 요약:');
    console.log('=' .repeat(70));
    
    console.log('1️⃣ AI 대화 오케스트레이션:');
    console.log(`   성공: ${orchestrationResult.success ? '✅' : '❌'}`);
    if (orchestrationResult.success) {
      console.log(`   총 이벤트: ${orchestrationResult.totalEvents}개`);
      console.log(`   이벤트 타입: ${orchestrationResult.eventTypes}개`);
      console.log(`   메시지: ${orchestrationResult.messages}개`);
      console.log(`   입장/퇴장 이벤트: ${orchestrationResult.joinLeaveEvents}개`);
    } else {
      console.log(`   오류: ${orchestrationResult.error}`);
    }
    
    console.log('\n2️⃣ 페르소나 상태 모니터링:');
    console.log(`   성공: ${statusResult.success ? '✅' : '❌'}`);
    if (statusResult.success) {
      console.log(`   룸 생성: ${statusResult.roomCreated ? '✅' : '❌'}`);
      console.log(`   상태 업데이트: ${statusResult.statusUpdated ? '✅' : '❌'}`);
      console.log(`   룸 정리: ${statusResult.roomCleaned ? '✅' : '❌'}`);
    } else {
      console.log(`   오류: ${statusResult.error}`);
    }
    
    // 전체 성공 여부 판단
    const allTestsPassed = orchestrationResult.success && statusResult.success;
    
    console.log('\n🎯 최종 결과:');
    console.log(`   ${allTestsPassed ? '✅ 모든 웹소켓 통합 테스트 통과!' : '❌ 일부 테스트 실패'}`);
    
    if (!allTestsPassed) {
      console.log('\n⚠️  실패한 테스트가 있습니다. 로그를 확인해주세요.');
    }
    
  } catch (error: any) {
    console.error('❌ 웹소켓 통합 테스트 중 오류 발생:', error);
    console.error('🔍 오류 스택:', error.stack);
  }
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  runWebSocketIntegrationTests();
}

export { testWebSocketIntegration, testPersonaStatusMonitoring };
