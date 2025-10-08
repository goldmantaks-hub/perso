import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createPortal } from 'react-dom';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PersonaState {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'joining' | 'leaving';
  joinedAt: number;
  lastSpokeAt: number;
  messageCount: number;
  owner?: {
    name: string;
    username: string;
  };
}

interface ActivePersonasProps {
  activePersonas: PersonaState[];
  dominantPersona: string | null;
  currentTopics: Array<{ topic: string; weight: number }>;
  totalTurns: number;
  onPersonaClick?: (personaId: string) => void;
  recentlyJoined?: Set<string>;
  recentlyLeft?: Set<string>;
}

// 페르소나별 고유 색상 정의
const personaColors: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  'Kai': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    accent: 'bg-blue-500'
  },
  'Espri': {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
    accent: 'bg-pink-500'
  },
  'Luna': {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    accent: 'bg-purple-500'
  },
  'Namu': {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    accent: 'bg-green-500'
  },
  'Milo': {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    accent: 'bg-orange-500'
  },
  'Eden': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    accent: 'bg-indigo-500'
  },
  'Ava': {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    accent: 'bg-rose-500'
  },
  'Rho': {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    accent: 'bg-cyan-500'
  },
  'Noir': {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    accent: 'bg-gray-500'
  },
  'Zara': {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    accent: 'bg-yellow-500'
  }
};

// 페르소나별 이모지
const personaEmojis: Record<string, string> = {
  'Kai': '🧠',
  'Espri': '💖',
  'Luna': '🌙',
  'Namu': '🌱',
  'Milo': '🎭',
  'Eden': '🌿',
  'Ava': '🎨',
  'Rho': '⚡',
  'Noir': '🦉',
  'Zara': '🌟'
};

// 페르소나별 설명
const personaDescriptions: Record<string, string> = {
  'Kai': '지식과 분석을 담당하는 페르소나',
  'Espri': '공감과 감정을 담당하는 페르소나',
  'Luna': '창의성과 상상력을 담당하는 페르소나',
  'Namu': '자연과 평화를 담당하는 페르소나',
  'Milo': '유머와 재미를 담당하는 페르소나',
  'Eden': '철학과 깊이를 담당하는 페르소나',
  'Ava': '예술과 아름다움을 담당하는 페르소나',
  'Rho': '에너지와 활력을 담당하는 페르소나',
  'Noir': '신비와 탐구를 담당하는 페르소나',
  'Zara': '창의성과 영감을 담당하는 페르소나',
  // 추가 페르소나들 (서버에서 동적으로 생성될 수 있음)
  'Default': 'AI 페르소나',
  'Unknown': '알 수 없는 페르소나'
};

export default function ActivePersonas({ 
  activePersonas, 
  dominantPersona, 
  currentTopics, 
  totalTurns, 
  onPersonaClick,
  recentlyJoined = new Set(),
  recentlyLeft = new Set()
}: ActivePersonasProps) {
  console.log('[ActivePersonas] Props received:', { 
    activePersonas, 
    dominantPersona, 
    currentTopics, 
    totalTurns 
  });
  
  // 각 페르소나의 메시지 카운트 디버깅
  activePersonas.forEach(persona => {
    console.log(`[ActivePersonas] ${persona.name}: messageCount = ${persona.messageCount}`, persona);
    console.log(`[TOOLTIP DEBUG] ${persona.name}:`, {
      name: persona.name,
      emoji: personaEmojis[persona.name] || '🤖',
      description: personaDescriptions[persona.name] || 'AI 페르소나'
    });
  });
  
  // 애니메이션 상태는 이제 props로 받음
  const [hoveredPersona, setHoveredPersona] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (personaId: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredPersona(personaId);
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleMouseLeave = () => {
    setHoveredPersona(null);
  };

  // 페르소나 상태 변화 감지
  useEffect(() => {
    const newJoined = new Set<string>();
    const newLeft = new Set<string>();

    activePersonas.forEach(persona => {
      if (persona.status === 'joining') {
        newJoined.add(persona.id);
      } else if (persona.status === 'leaving') {
        newLeft.add(persona.id);
      }
    });

    if (newJoined.size > 0) {
      setRecentlyJoined(newJoined);
      setTimeout(() => setRecentlyJoined(new Set()), 3000);
    }

    if (newLeft.size > 0) {
      setRecentlyLeft(newLeft);
      setTimeout(() => setRecentlyLeft(new Set()), 3000);
    }
  }, [activePersonas]);

  const getPersonaColor = (personaId: string) => {
    return personaColors[personaId] || personaColors['Noir'];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="text-xs bg-green-500 text-white">활성</Badge>;
      case 'idle':
        return <Badge variant="secondary" className="text-xs">대기</Badge>;
      case 'joining':
        return <Badge variant="outline" className="text-xs animate-pulse bg-blue-100 text-blue-700 border-blue-300">입장중</Badge>;
      case 'leaving':
        return <Badge variant="destructive" className="text-xs animate-pulse bg-red-100 text-red-700 border-red-300">퇴장중</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
    <div className="bg-background border-b border-border p-4 overflow-visible">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">활성 페르소나</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>총 {activePersonas.length}명</span>
            <span>•</span>
            <span>{totalTurns}턴</span>
          </div>
        </div>

        {/* 현재 토픽 표시 */}
        {currentTopics.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {currentTopics.map((topic, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {topic.topic} ({Math.round(topic.weight * 100)}%)
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 활성 페르소나 목록 - 가로 스크롤 */}
        <div className="relative">
          <div className="overflow-x-auto overflow-y-visible pb-2 persona-scroll" style={{
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }}>
            <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
            <AnimatePresence>
              {activePersonas.map((persona, index) => {
                const colors = getPersonaColor(persona.id);
                const isDominant = persona.id === dominantPersona;
                const isJoining = recentlyJoined.has(persona.id);
                const isLeaving = recentlyLeft.has(persona.id);
                
                return (
                  <motion.div
                    key={`${persona.id}-${index}`}
                    initial={isJoining ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={isLeaving ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`relative cursor-pointer ${colors.bg} rounded-lg p-2 flex-shrink-0 min-w-[140px] ${
                      isDominant ? 'ring-0 ring-primary ring-offset-0' : ''
                    } ${isJoining ? 'animate-pulse' : ''} ${isLeaving ? 'animate-pulse' : ''}`}
                    onClick={() => onPersonaClick?.(persona.id)}
                    onMouseEnter={(e) => handleMouseEnter(persona.id, e)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="relative group">
                      <div 
                        className="flex items-center gap-2 min-w-0 cursor-pointer"
                        title={`${persona.name || 'Unknown'} - 메시지 ${persona.messageCount}개, 상태: ${persona.status}`}
                      >
                        <Avatar className="w-6 h-6 flex-shrink-0">
                          <AvatarFallback className={`text-xs ${colors.text}`}>
                            {personaEmojis[persona.name] || '🤖'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <span className={`text-xs font-medium ${colors.text} truncate`}>
                            {persona.owner ? `${persona.owner.name}의 ${persona.name || 'Unknown'}` : (persona.name || 'Unknown')}
                          </span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {getStatusBadge(persona.status)}
                            {isDominant && (
                              <Badge variant="default" className="text-xs bg-primary text-white">
                                주도
                              </Badge>
                            )}
                          </div>
                        </div>
                        {persona.messageCount > 0 && (
                          <div className={`w-2 h-2 ${colors.accent} rounded-full flex-shrink-0`} />
                        )}
                      </div>
                      
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            </div>
          </div>
        </div>

        {/* 주도권 교체 알림 */}
        {dominantPersona && (() => {
          const dominantPersonaData = activePersonas.find(p => p.id === dominantPersona);
          const displayName = dominantPersonaData?.owner 
            ? `${dominantPersonaData.owner.name}의 ${dominantPersonaData.name}`
            : dominantPersonaData?.name || dominantPersona;
          
          return (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-xs text-muted-foreground"
            >
              현재 주도 페르소나: <span className="font-medium text-foreground">{displayName}</span>
            </motion.div>
          );
        })()}
    </div>
    {hoveredPersona && (() => {
      const persona = activePersonas.find(p => p.id === hoveredPersona);
      if (!persona) return null;
      
      return createPortal(
        <div 
          className="fixed px-3 py-2 bg-gray-900 text-white text-xs rounded-md shadow-lg z-[99999] pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="font-medium mb-1">
            {persona.owner ? `${persona.owner.name}의 ${persona.name || 'Unknown'}` : (persona.name || 'Unknown')}
          </div>
          <div className="text-gray-300 text-xs mb-1">
            {personaDescriptions[persona.name] || 
             (persona.name ? `${persona.name} 페르소나` : 'AI 페르소나')}
          </div>
          <div className="text-xs space-y-0.5">
            <div>메시지: {persona.messageCount}개</div>
            <div>상태: {persona.status}</div>
            {persona.lastSpokeAt > 0 && (
              <div>
                마지막 발언: {new Date(persona.lastSpokeAt).toLocaleTimeString()}
              </div>
            )}
          </div>
          {/* 툴팁 화살표 */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
        </div>,
        document.body
      );
    })()}
    </>
  );
}