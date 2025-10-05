import { TopicWeight } from './persoRoom.js';

export interface ExpandedInfo {
  type: 'knowledge' | 'analyst' | 'empath' | 'creative' | 'humor';
  data: any;
}

export async function expandKnowledgeInfo(topics: TopicWeight[]): Promise<any> {
  const topicList = topics.map(t => t.topic);
  const facts: string[] = [];
  
  for (const topic of topicList) {
    switch (topic) {
      case 'tech':
        facts.push('최신 AI 기술은 transformer 아키텍처를 기반으로 발전하고 있습니다');
        facts.push('양자 컴퓨팅이 암호화 분야에 혁신을 가져올 것으로 예상됩니다');
        break;
      case 'travel':
        facts.push('제주도는 유네스코 세계자연유산으로 지정된 화산섬입니다');
        facts.push('북유럽은 오로라 관측의 최적지로 알려져 있습니다');
        break;
      case 'cuisine':
        facts.push('발효 음식은 장 건강에 도움을 주는 프로바이오틱스를 함유합니다');
        facts.push('MSG는 자연적으로 다시마와 토마토에도 존재하는 성분입니다');
        break;
      case 'art':
        facts.push('인상주의 화가들은 야외에서 빛의 변화를 포착했습니다');
        facts.push('현대 미술은 개념과 맥락을 중시하는 경향이 있습니다');
        break;
    }
  }
  
  return {
    facts: facts.length > 0 ? facts : ['흥미로운 정보를 찾고 있습니다'],
    sources: ['Wikipedia', 'Academic Database']
  };
}

export async function expandAnalystInfo(userId?: string): Promise<any> {
  const mockPatterns = [
    '최근 7일간 활동 패턴: 저녁 시간대 활동이 60% 증가',
    '선호 토픽: 음식(35%), 여행(28%), 기술(22%)',
    '평균 게시물 길이: 120자'
  ];
  
  return {
    patterns: mockPatterns,
    stats: {
      totalPosts: 42,
      avgEngagement: 8.5,
      peakHour: '20:00-22:00'
    }
  };
}

export async function expandEmotionalInfo(lastMessage: string): Promise<any> {
  const emotions: { type: string; intensity: number }[] = [];
  
  if (lastMessage.includes('!')) {
    emotions.push({ type: 'excitement', intensity: 0.8 });
  }
  if (lastMessage.includes('?')) {
    emotions.push({ type: 'curiosity', intensity: 0.7 });
  }
  if (lastMessage.includes('ㅋ') || lastMessage.includes('ㅎ')) {
    emotions.push({ type: 'joy', intensity: 0.85 });
  }
  if (lastMessage.includes('아') || lastMessage.includes('어')) {
    emotions.push({ type: 'contemplation', intensity: 0.6 });
  }
  
  if (emotions.length === 0) {
    emotions.push({ type: 'neutral', intensity: 0.5 });
  }
  
  return {
    emotions,
    intensity: emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length,
    dominantEmotion: emotions[0]?.type || 'neutral'
  };
}

export async function expandCreativeInfo(topics: TopicWeight[]): Promise<any> {
  const topicList = topics.map(t => t.topic);
  const metaphors: string[] = [];
  const analogies: string[] = [];
  
  for (const topic of topicList) {
    switch (topic) {
      case 'emotion':
        metaphors.push('감정은 파도처럼 밀려왔다 사라지는 것');
        analogies.push('마음은 하늘과 같아서, 구름(감정)이 지나가도 본질은 변하지 않아요');
        break;
      case 'tech':
        metaphors.push('기술은 인류의 날개');
        analogies.push('AI는 거울과 같아서, 우리가 보여준 것을 반영합니다');
        break;
      case 'travel':
        metaphors.push('여행은 마음의 창문을 여는 열쇠');
        analogies.push('새로운 장소는 책의 새 장을 여는 것과 같습니다');
        break;
      case 'cuisine':
        metaphors.push('음식은 문화의 언어');
        analogies.push('요리는 예술 작품을 만드는 것처럼 정성과 감각이 필요해요');
        break;
    }
  }
  
  return {
    metaphors: metaphors.length > 0 ? metaphors : ['모든 경험은 삶이라는 캔버스에 그려지는 그림입니다'],
    analogies: analogies.length > 0 ? analogies : ['이 순간은 강물의 한 방울처럼 소중합니다']
  };
}

export async function expandHumorInfo(topics: TopicWeight[]): Promise<any> {
  const topicList = topics.map(t => t.topic);
  const jokes: string[] = [];
  const references: string[] = [];
  
  for (const topic of topicList) {
    switch (topic) {
      case 'tech':
        jokes.push('개발자가 바에 들어갔는데... 술이 null이래요 ㅋㅋ');
        references.push('스택 오버플로우 = 개발자의 구세주');
        break;
      case 'cuisine':
        jokes.push('라면은 3분이면 끝나는데, 왜 인생은 안 끝나죠?');
        references.push('맛있으면 0칼로리 법칙');
        break;
      case 'travel':
        jokes.push('여행 가고 싶다는 말 = 현실 도피하고 싶다는 뜻');
        references.push('여행은 가기 전이 제일 행복합니다 (여행 준비 = 로망)');
        break;
      case 'social':
        jokes.push('친구: "밥 먹자" 나: "언제?" 친구: "나중에" → 영원히 안 먹음');
        references.push('약속 = 확정적 미정');
        break;
    }
  }
  
  return {
    jokes: jokes.length > 0 ? jokes : ['인생은 코미디, 우리는 관객이자 배우죠 ㅋㅋ'],
    references: references.length > 0 ? references : ['오늘도 화이팅!']
  };
}

export async function getExpandedInfoForPersona(
  personaType: string,
  topics: TopicWeight[],
  lastMessage: string,
  userId?: string
): Promise<ExpandedInfo | null> {
  
  switch (personaType) {
    case 'knowledge':
      const knowledgeData = await expandKnowledgeInfo(topics);
      return { type: 'knowledge', data: knowledgeData };
      
    case 'analyst':
      const analystData = await expandAnalystInfo(userId);
      return { type: 'analyst', data: analystData };
      
    case 'empath':
      const emotionalData = await expandEmotionalInfo(lastMessage);
      return { type: 'empath', data: emotionalData };
      
    case 'creative':
      const creativeData = await expandCreativeInfo(topics);
      return { type: 'creative', data: creativeData };
      
    case 'humor':
      const humorData = await expandHumorInfo(topics);
      return { type: 'humor', data: humorData };
      
    default:
      return null;
  }
}
