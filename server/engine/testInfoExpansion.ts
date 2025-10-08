import { 
  getExpandedInfoForPersona, 
  expandKnowledgeInfo, 
  expandAnalystInfo, 
  expandEmotionalInfo, 
  expandCreativeInfo, 
  expandHumorInfo 
} from './infoExpansion.js';
import { TopicWeight } from './persoRoom.js';

// 테스트용 데이터
const mockTopics: TopicWeight[] = [
  { topic: 'tech', weight: 0.8 },
  { topic: 'travel', weight: 0.6 },
  { topic: 'cuisine', weight: 0.4 }
];

const mockEmotionalTopics: TopicWeight[] = [
  { topic: 'emotion', weight: 0.9 },
  { topic: 'social', weight: 0.7 }
];

const mockLastMessage = "정말 신기한 기술이네요! 어떻게 작동하는지 궁금해요 ㅋㅋ";

async function testKnowledgeExpansion() {
  console.log('\n🧠 [KNOWLEDGE] 지식형 페르소나 확장 정보 테스트');
  console.log('=' .repeat(50));
  
  const knowledgeData = await expandKnowledgeInfo(mockTopics);
  console.log('📚 전문 지식 정보:');
  knowledgeData.facts.forEach((fact: string, index: number) => {
    console.log(`  ${index + 1}. ${fact}`);
  });
  console.log(`📖 출처: ${knowledgeData.sources.join(', ')}`);
  
  const expandedInfo = await getExpandedInfoForPersona('knowledge', mockTopics, mockLastMessage);
  console.log('\n🔍 통합된 확장 정보:');
  console.log(`타입: ${expandedInfo?.type}`);
  console.log(`데이터 키: ${Object.keys(expandedInfo?.data || {})}`);
}

async function testAnalystExpansion() {
  console.log('\n📊 [ANALYST] 분석형 페르소나 확장 정보 테스트');
  console.log('=' .repeat(50));
  
  const analystData = await expandAnalystInfo('test-user-123');
  console.log('📈 분석 패턴:');
  analystData.patterns.forEach((pattern: string, index: number) => {
    console.log(`  ${index + 1}. ${pattern}`);
  });
  console.log(`📊 통계: 게시물 ${analystData.stats.totalPosts}개, 평균 참여도 ${analystData.stats.avgEngagement}`);
  
  const expandedInfo = await getExpandedInfoForPersona('analyst', mockTopics, mockLastMessage, 'test-user-123');
  console.log('\n🔍 통합된 확장 정보:');
  console.log(`타입: ${expandedInfo?.type}`);
  console.log(`데이터 키: ${Object.keys(expandedInfo?.data || {})}`);
}

async function testEmpathExpansion() {
  console.log('\n💝 [EMPATH] 감성형 페르소나 확장 정보 테스트');
  console.log('=' .repeat(50));
  
  const emotionalData = await expandEmotionalInfo(mockLastMessage);
  console.log('💭 감정 분석:');
  console.log(`  주요 감정: ${emotionalData.dominantEmotion}`);
  console.log(`  감정 강도: ${emotionalData.intensity.toFixed(2)}`);
  console.log('  감지된 감정들:');
  emotionalData.emotions.forEach((emotion: any, index: number) => {
    console.log(`    ${index + 1}. ${emotion.type} (강도: ${emotion.intensity.toFixed(1)})`);
  });
  
  const expandedInfo = await getExpandedInfoForPersona('empath', mockEmotionalTopics, mockLastMessage);
  console.log('\n🔍 통합된 확장 정보:');
  console.log(`타입: ${expandedInfo?.type}`);
  console.log(`데이터 키: ${Object.keys(expandedInfo?.data || {})}`);
}

async function testCreativeExpansion() {
  console.log('\n🎨 [CREATIVE] 창의형 페르소나 확장 정보 테스트');
  console.log('=' .repeat(50));
  
  const creativeData = await expandCreativeInfo(mockEmotionalTopics);
  console.log('✨ 창의적 영감:');
  console.log('  비유:');
  creativeData.metaphors.forEach((metaphor: string, index: number) => {
    console.log(`    ${index + 1}. ${metaphor}`);
  });
  console.log('  은유:');
  creativeData.analogies.forEach((analogy: string, index: number) => {
    console.log(`    ${index + 1}. ${analogy}`);
  });
  
  const expandedInfo = await getExpandedInfoForPersona('creative', mockEmotionalTopics, mockLastMessage);
  console.log('\n🔍 통합된 확장 정보:');
  console.log(`타입: ${expandedInfo?.type}`);
  console.log(`데이터 키: ${Object.keys(expandedInfo?.data || {})}`);
}

async function testHumorExpansion() {
  console.log('\n😄 [HUMOR] 유머형 페르소나 확장 정보 테스트');
  console.log('=' .repeat(50));
  
  const humorData = await expandHumorInfo(mockTopics);
  console.log('😂 유머 소재:');
  console.log('  재미있는 이야기:');
  humorData.jokes.forEach((joke: string, index: number) => {
    console.log(`    ${index + 1}. ${joke}`);
  });
  console.log('  참고사항:');
  humorData.references.forEach((ref: string, index: number) => {
    console.log(`    ${index + 1}. ${ref}`);
  });
  
  const expandedInfo = await getExpandedInfoForPersona('humor', mockTopics, mockLastMessage);
  console.log('\n🔍 통합된 확장 정보:');
  console.log(`타입: ${expandedInfo?.type}`);
  console.log(`데이터 키: ${Object.keys(expandedInfo?.data || {})}`);
}

async function testAllPersonaTypes() {
  console.log('🚀 역할 기반 정보 확장 시스템 테스트 시작');
  console.log('=' .repeat(60));
  
  try {
    await testKnowledgeExpansion();
    await testAnalystExpansion();
    await testEmpathExpansion();
    await testCreativeExpansion();
    await testHumorExpansion();
    
    console.log('\n✅ 모든 페르소나 타입별 확장 정보 테스트 완료!');
    console.log('=' .repeat(60));
    
    // 통합 테스트
    console.log('\n🔄 통합 테스트: 모든 페르소나 타입 동시 테스트');
    const allTypes = ['knowledge', 'analyst', 'empath', 'creative', 'humor'];
    const results = await Promise.all(
      allTypes.map(async (type) => {
        const info = await getExpandedInfoForPersona(type, mockTopics, mockLastMessage);
        return { type, hasData: !!info?.data, dataKeys: Object.keys(info?.data || {}) };
      })
    );
    
    console.log('📋 결과 요약:');
    results.forEach(result => {
      console.log(`  ${result.type}: ${result.hasData ? '✅' : '❌'} (${result.dataKeys.length}개 데이터 키)`);
    });
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  }
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  testAllPersonaTypes();
}

export { testAllPersonaTypes };
