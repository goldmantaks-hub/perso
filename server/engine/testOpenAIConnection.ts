import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testAPIKeyValidation() {
  console.log('🔑 [API KEY VALIDATION] OpenAI API 키 검증');
  console.log('=' .repeat(50));
  
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
    console.log('💡 해결방법: .env 파일에 OPENAI_API_KEY=your_api_key 추가');
    return false;
  }
  
  console.log('✅ OPENAI_API_KEY 환경변수 설정됨');
  console.log(`📝 API 키 길이: ${apiKey.length}자`);
  console.log(`🔍 API 키 형식: ${apiKey.startsWith('sk-') ? '올바른 형식 (sk-로 시작)' : '잘못된 형식'}`);
  
  return true;
}

async function testSimpleAPI() {
  console.log('\n🧪 [SIMPLE API TEST] 간단한 API 호출 테스트');
  console.log('=' .repeat(50));
  
  const startTime = Date.now();
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "당신은 테스트용 AI입니다. 간단히 '안녕하세요!'라고 답변하세요." },
        { role: "user", content: "안녕하세요!" }
      ],
      temperature: 0.1,
      max_tokens: 20,
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    const response = completion.choices[0]?.message?.content?.trim() || "";
    
    console.log('✅ API 호출 성공!');
    console.log(`📝 응답: "${response}"`);
    console.log(`⏱️  응답 시간: ${responseTime}ms`);
    console.log(`🔢 사용된 토큰: ${completion.usage?.total_tokens || 'N/A'}`);
    
    if (responseTime > 5000) {
      console.log('⚠️  응답 시간이 5초를 초과했습니다. 네트워크 상태를 확인해주세요.');
    } else if (responseTime < 1000) {
      console.log('🚀 매우 빠른 응답 시간입니다!');
    } else {
      console.log('✅ 적절한 응답 시간입니다.');
    }
    
    return true;
    
  } catch (error: any) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log('❌ API 호출 실패!');
    console.log(`⏱️  실패까지 시간: ${responseTime}ms`);
    console.log(`🔍 오류 타입: ${error.constructor.name}`);
    console.log(`📝 오류 메시지: ${error.message}`);
    
    if (error.status) {
      console.log(`🔢 HTTP 상태 코드: ${error.status}`);
    }
    
    if (error.code) {
      console.log(`🏷️  오류 코드: ${error.code}`);
    }
    
    return false;
  }
}

async function testPersonaIntroductionAPI() {
  console.log('\n🎭 [PERSONA INTRODUCTION API] 페르소나 소개 API 테스트');
  console.log('=' .repeat(50));
  
  const personas = [
    { name: 'Kai', type: 'knowledge', role: '지식형' },
    { name: 'Espri', type: 'empath', role: '감성형' },
    { name: 'Milo', type: 'humor', role: '유머형' }
  ];
  
  const topics = ['tech', 'travel'];
  
  for (const persona of personas) {
    console.log(`\n🎭 ${persona.name} (${persona.role}) 소개 생성 테스트:`);
    
    const startTime = Date.now();
    
    try {
      const prompt = `You are ${persona.name}, a ${persona.type} persona joining a conversation.

Your characteristics:
- Role: ${persona.role}
- Tone: ${persona.name === 'Kai' ? '차분하고 논리적인' : persona.name === 'Espri' ? '따뜻하고 공감적인' : '재치있고 밝은'}

Current conversation topics: ${topics.join(', ')}

Generate a brief, natural introduction (1 sentence) as you join the conversation. Show interest in the current topic while staying true to your personality.

Output only the introduction in Korean, nothing else.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Introduce yourself briefly." }
        ],
        temperature: 0.8,
        max_tokens: 60,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const response = completion.choices[0]?.message?.content?.trim() || "";
      
      console.log(`  ✅ 성공! 응답 시간: ${responseTime}ms`);
      console.log(`  📝 소개: "${response}"`);
      console.log(`  🔢 토큰: ${completion.usage?.total_tokens || 'N/A'}`);
      
    } catch (error: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      console.log(`  ❌ 실패! 응답 시간: ${responseTime}ms`);
      console.log(`  🔍 오류: ${error.message}`);
    }
  }
}

async function testMultipleAPICalls() {
  console.log('\n🔄 [MULTIPLE API CALLS] 다중 API 호출 테스트');
  console.log('=' .repeat(50));
  
  const testCount = 5;
  const results: { success: boolean; responseTime: number; tokens?: number }[] = [];
  
  console.log(`${testCount}회 연속 API 호출 테스트 시작...`);
  
  for (let i = 1; i <= testCount; i++) {
    const startTime = Date.now();
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "간단히 숫자만 답변하세요." },
          { role: "user", content: `${i}번째 테스트입니다. 숫자만 답변하세요.` }
        ],
        temperature: 0.1,
        max_tokens: 10,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const response = completion.choices[0]?.message?.content?.trim() || "";
      
      results.push({
        success: true,
        responseTime,
        tokens: completion.usage?.total_tokens
      });
      
      console.log(`  ${i}회차: ✅ 성공 (${responseTime}ms) - "${response}"`);
      
    } catch (error: any) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      results.push({
        success: false,
        responseTime
      });
      
      console.log(`  ${i}회차: ❌ 실패 (${responseTime}ms) - ${error.message}`);
    }
    
    // API 호출 간 간격 (Rate limiting 방지)
    if (i < testCount) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // 결과 분석
  const successCount = results.filter(r => r.success).length;
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  const totalTokens = results.reduce((sum, r) => sum + (r.tokens || 0), 0);
  
  console.log(`\n📊 다중 API 호출 결과:`);
  console.log(`  성공률: ${(successCount / testCount * 100).toFixed(1)}% (${successCount}/${testCount})`);
  console.log(`  평균 응답 시간: ${avgResponseTime.toFixed(0)}ms`);
  console.log(`  총 사용 토큰: ${totalTokens}개`);
  
  if (successCount === testCount) {
    console.log('  🎉 모든 호출이 성공했습니다!');
  } else {
    console.log('  ⚠️  일부 호출이 실패했습니다. API 상태를 확인해주세요.');
  }
}

async function testAPIUsageLimits() {
  console.log('\n📊 [API USAGE LIMITS] API 사용량 제한 테스트');
  console.log('=' .repeat(50));
  
  try {
    // 사용량 정보 조회 (일부 API 키에서는 지원하지 않을 수 있음)
    const usage = await openai.usage.get();
    
    console.log('✅ API 사용량 정보 조회 성공!');
    console.log(`📅 현재 기간: ${usage.current_usage?.period?.start} ~ ${usage.current_usage?.period?.end}`);
    console.log(`🔢 총 사용량: ${usage.current_usage?.total_usage || 'N/A'}`);
    
  } catch (error: any) {
    console.log('⚠️  API 사용량 정보 조회 실패 (일반적인 현상)');
    console.log(`📝 이유: ${error.message}`);
    console.log('💡 일부 API 키는 사용량 조회를 지원하지 않습니다.');
  }
}

async function testAllOpenAIFeatures() {
  console.log('🚀 OpenAI API 연결 및 기능 테스트 시작');
  console.log('=' .repeat(60));
  
  try {
    const results = [];
    
    console.log('1️⃣ API 키 검증...');
    results.push(await testAPIKeyValidation());
    
    if (results[0]) {
      console.log('\n2️⃣ 간단한 API 호출 테스트...');
      results.push(await testSimpleAPI());
      
      console.log('\n3️⃣ 페르소나 소개 API 테스트...');
      await testPersonaIntroductionAPI();
      
      console.log('\n4️⃣ 다중 API 호출 테스트...');
      await testMultipleAPICalls();
      
      console.log('\n5️⃣ API 사용량 제한 테스트...');
      await testAPIUsageLimits();
    } else {
      console.log('\n❌ API 키가 설정되지 않아 추가 테스트를 건너뜁니다.');
    }
    
    const successCount = results.filter(r => r).length;
    const totalTests = results.length;
    
    console.log('\n📊 테스트 결과 요약:');
    console.log(`✅ 성공: ${successCount}/${totalTests}개 테스트`);
    
    if (successCount === totalTests) {
      console.log('\n🎉 모든 OpenAI API 테스트 통과!');
      console.log('💡 API가 정상적으로 작동하며 페르소나 시스템에 사용할 수 있습니다.');
    } else {
      console.log('\n⚠️  일부 테스트 실패. API 설정을 확인해주세요.');
    }
    
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  }
}

// 테스트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  testAllOpenAIFeatures();
}

export { testAllOpenAIFeatures };
