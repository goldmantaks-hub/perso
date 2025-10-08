import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import EnhancedChatPanel from "./EnhancedChatPanel";
import ActivePersonas from "./ActivePersonas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PERSONA_COLORS, PERSONA_STATUS } from "../../../shared/constants";

interface PersonaState {
  id: string;
  status: 'active' | 'idle' | 'joining' | 'leaving';
  joinedAt: number;
  lastSpokeAt: number;
  messageCount: number;
}

interface Message {
  id: string;
  sender: string;
  senderType: 'user' | 'ai';
  message: string;
  thinking?: string;
  type?: string;
  expandedInfo?: any;
  timestamp?: number;
  index?: number;
  total?: number;
}

export default function UITestPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activePersonas, setActivePersonas] = useState<PersonaState[]>([]);
  const [dominantPersona, setDominantPersona] = useState<string | null>(null);
  const [currentTopics, setCurrentTopics] = useState<Array<{ topic: string; weight: number }>>([]);
  const [totalTurns, setTotalTurns] = useState(0);
  const [isThinking, setIsThinking] = useState(false);

  // 테스트용 페르소나 데이터
  const testPersonas: PersonaState[] = [
    {
      id: 'Kai',
      status: 'active',
      joinedAt: Date.now() - 300000,
      lastSpokeAt: Date.now() - 10000,
      messageCount: 3
    },
    {
      id: 'Espri',
      status: 'active',
      joinedAt: Date.now() - 200000,
      lastSpokeAt: Date.now() - 5000,
      messageCount: 2
    },
    {
      id: 'Luna',
      status: 'joining',
      joinedAt: Date.now() - 10000,
      lastSpokeAt: 0,
      messageCount: 0
    },
    {
      id: 'Milo',
      status: 'leaving',
      joinedAt: Date.now() - 400000,
      lastSpokeAt: Date.now() - 20000,
      messageCount: 1
    }
  ];

  // 테스트용 메시지 데이터
  const testMessages: Message[] = [
    {
      id: '1',
      sender: 'Kai',
      senderType: 'ai',
      message: '인공지능과 인간의 협력은 정말 흥미로운 주제입니다. 기술 발전이 우리 삶에 미치는 영향을 깊이 생각해볼 필요가 있어요.',
      thinking: '이 주제에 대해 사용자가 어떤 관점을 가지고 있는지 파악하고, 기술과 인간성의 균형에 대해 논의하고 싶습니다.',
      type: 'knowledge',
      expandedInfo: {
        type: 'knowledge',
        data: {
          facts: [
            'AI와 인간의 협력은 2023년 기준 40% 증가했습니다.',
            '의료 분야에서 AI 지원 진단의 정확도가 15% 향상되었습니다.',
            '창의적 업무에서 AI 도구 사용률이 60% 증가했습니다.'
          ],
          sources: ['MIT Technology Review', 'Nature AI', 'Harvard Business Review']
        }
      },
      timestamp: Date.now() - 30000,
      index: 0,
      total: 3
    },
    {
      id: '2',
      sender: 'Espri',
      senderType: 'ai',
      message: '정말 공감이 가는 말씀이에요! 기술이 발전할수록 우리가 더 인간다워질 수 있다는 점이 매력적이에요. 함께 성장하는 과정이 중요하죠.',
      thinking: '사용자의 감정을 이해하고 공감하면서, 기술과 인간성의 조화에 대해 따뜻한 관점을 제시하고 싶습니다.',
      type: 'empath',
      expandedInfo: {
        type: 'empath',
        data: {
          dominantEmotion: 'optimistic',
          intensity: 0.85,
          emotions: [
            { type: 'joy', intensity: 0.8 },
            { type: 'trust', intensity: 0.7 },
            { type: 'anticipation', intensity: 0.9 }
          ]
        }
      },
      timestamp: Date.now() - 20000,
      index: 1,
      total: 3
    },
    {
      id: '3',
      sender: 'Luna',
      senderType: 'ai',
      message: '상상해보세요! AI가 우리의 창의성을 자극하고, 우리는 AI에게 감성을 가르치는... 마치 서로를 완성하는 듀엣 같지 않나요? 🎨✨',
      thinking: '창의적이고 시각적인 비유를 통해 AI와 인간의 협력을 예술적으로 표현하고 싶습니다.',
      type: 'creative',
      expandedInfo: {
        type: 'creative',
        data: {
          metaphors: [
            'AI와 인간은 서로를 완성하는 듀엣',
            '기술과 감성의 춤',
            '디지털 캔버스에 그리는 인간성'
          ],
          analogies: [
            '음악가와 악기의 관계',
            '화가와 팔레트의 조화',
            '요리사와 재료의 만남'
          ]
        }
      },
      timestamp: Date.now() - 10000,
      index: 2,
      total: 3
    }
  ];

  // 테스트 실행
  const runUITest = () => {
    console.log('🎨 UI 테스트 시작');
    
    // 페르소나 상태 설정
    setActivePersonas(testPersonas);
    setDominantPersona('Kai');
    setCurrentTopics([
      { topic: 'ai', weight: 0.8 },
      { topic: 'collaboration', weight: 0.6 },
      { topic: 'human', weight: 0.4 }
    ]);
    setTotalTurns(5);

    // 메시지 순차 추가
    setMessages([]);
    testMessages.forEach((msg, index) => {
      setTimeout(() => {
        setMessages(prev => [...prev, msg]);
        
        // 페르소나 상태 업데이트 (입장/퇴장 시뮬레이션)
        if (index === 1) {
          setTimeout(() => {
            setActivePersonas(prev => 
              prev.map(p => p.id === 'Luna' ? { ...p, status: 'active' as const } : p)
            );
          }, 1000);
        }
        
        if (index === 2) {
          setTimeout(() => {
            setActivePersonas(prev => 
              prev.map(p => p.id === 'Milo' ? { ...p, status: 'leaving' as const } : p)
            );
          }, 2000);
        }
      }, index * 2000);
    });

    // 주도권 교체 시뮬레이션
    setTimeout(() => {
      setDominantPersona('Espri');
      console.log('🔄 주도권 교체: Kai → Espri');
    }, 8000);
  };

  // 애니메이션 테스트
  const testAnimations = () => {
    console.log('🎬 애니메이션 테스트 시작');
    
    // 페르소나 입장 애니메이션
    const newPersona: PersonaState = {
      id: 'Ava',
      status: 'joining',
      joinedAt: Date.now(),
      lastSpokeAt: 0,
      messageCount: 0
    };
    
    setActivePersonas(prev => [...prev, newPersona]);
    
    setTimeout(() => {
      setActivePersonas(prev => 
        prev.map(p => p.id === 'Ava' ? { ...p, status: 'active' as const } : p)
      );
    }, 1000);
    
    // 페르소나 퇴장 애니메이션
    setTimeout(() => {
      setActivePersonas(prev => 
        prev.map(p => p.id === 'Milo' ? { ...p, status: 'leaving' as const } : p)
      );
    }, 3000);
    
    setTimeout(() => {
      setActivePersonas(prev => prev.filter(p => p.id !== 'Milo'));
    }, 4000);
  };

  // 색상 테스트
  const testColors = () => {
    console.log('🎨 색상 테스트 시작');
    
    const allPersonas: PersonaState[] = [
      { id: 'Kai', status: 'active', joinedAt: Date.now(), lastSpokeAt: Date.now(), messageCount: 1 },
      { id: 'Espri', status: 'active', joinedAt: Date.now(), lastSpokeAt: Date.now(), messageCount: 1 },
      { id: 'Luna', status: 'active', joinedAt: Date.now(), lastSpokeAt: Date.now(), messageCount: 1 },
      { id: 'Namu', status: 'active', joinedAt: Date.now(), lastSpokeAt: Date.now(), messageCount: 1 },
      { id: 'Milo', status: 'active', joinedAt: Date.now(), lastSpokeAt: Date.now(), messageCount: 1 },
      { id: 'Eden', status: 'active', joinedAt: Date.now(), lastSpokeAt: Date.now(), messageCount: 1 },
      { id: 'Ava', status: 'active', joinedAt: Date.now(), lastSpokeAt: Date.now(), messageCount: 1 },
      { id: 'Rho', status: 'active', joinedAt: Date.now(), lastSpokeAt: Date.now(), messageCount: 1 },
      { id: 'Noir', status: 'active', joinedAt: Date.now(), lastSpokeAt: Date.now(), messageCount: 1 }
    ];
    
    setActivePersonas(allPersonas);
  };

  const handleSendMessage = (message: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: '사용자',
      senderType: 'user',
      message,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // AI 응답 시뮬레이션
    setIsThinking(true);
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'Kai',
        senderType: 'ai',
        message: `"${message}"에 대한 흥미로운 관점이네요! 이 주제에 대해 더 깊이 탐구해보고 싶습니다.`,
        thinking: '사용자의 메시지를 분석하고 관련된 지식을 바탕으로 의미 있는 응답을 생성하고 있습니다.',
        type: 'knowledge',
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsThinking(false);
    }, 2000);
  };

  const handlePersonaClick = (personaId: string) => {
    console.log(`👆 페르소나 클릭: ${personaId}`);
    
    // 클릭된 페르소나로 주도권 변경
    setDominantPersona(personaId);
    
    // 해당 페르소나의 메시지 추가
    const personaMessage: Message = {
      id: Date.now().toString(),
      sender: personaId,
      senderType: 'ai',
      message: `${personaId}가 주도권을 잡았습니다! 새로운 관점을 제시하겠습니다.`,
      thinking: `${personaId}의 특성을 살려 창의적이고 의미 있는 응답을 생성하고 있습니다.`,
      type: personaId.toLowerCase(),
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, personaMessage]);
  };

  return (
    <div className="h-screen flex">
      {/* 테스트 컨트롤 패널 */}
      <div className="w-80 bg-muted/50 border-r border-border p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">UI 테스트 컨트롤</CardTitle>
            <CardDescription>
              색상, 애니메이션, 툴팁 테스트
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={runUITest} className="w-full">
              🎨 전체 UI 테스트
            </Button>
            <Button onClick={testAnimations} variant="outline" className="w-full">
              🎬 애니메이션 테스트
            </Button>
            <Button onClick={testColors} variant="outline" className="w-full">
              🌈 색상 테스트
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">현재 상태</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>활성 페르소나:</span>
              <Badge variant="secondary">{activePersonas.length}명</Badge>
            </div>
            <div className="flex justify-between text-xs">
              <span>주도 페르소나:</span>
              <Badge variant="default">{dominantPersona || '없음'}</Badge>
            </div>
            <div className="flex justify-between text-xs">
              <span>총 턴:</span>
              <Badge variant="outline">{totalTurns}</Badge>
            </div>
            <div className="flex justify-between text-xs">
              <span>메시지:</span>
              <Badge variant="outline">{messages.length}개</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">테스트 기능</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div>✅ 페르소나별 고유 색상</div>
            <div>✅ 입장/퇴장 애니메이션</div>
            <div>✅ 내부 추론 툴팁</div>
            <div>✅ 확장 정보 툴팁</div>
            <div>✅ 주도권 교체 알림</div>
            <div>✅ 페르소나 클릭 상호작용</div>
          </CardContent>
        </Card>
      </div>

      {/* 메인 채팅 패널 */}
      <div className="flex-1">
        <EnhancedChatPanel
          postId="ui-test-post"
          postContent="인공지능과 인간의 협력에 대해 어떻게 생각하시나요?"
          analysis={{ subjects: [{ topic: 'ai', weight: 0.8 }] }}
          onSendMessage={handleSendMessage}
          messages={messages}
          isThinking={isThinking}
          currentUser={{
            name: '테스트 사용자',
            username: 'testuser',
            avatar: undefined
          }}
          activePersonas={activePersonas}
          dominantPersona={dominantPersona}
          currentTopics={currentTopics}
          totalTurns={totalTurns}
          onPersonaClick={handlePersonaClick}
        />
      </div>
    </div>
  );
}
