import { useState, useEffect, useRef } from "react";
import { Brain, Sparkles, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import SystemMessage from "./SystemMessage";

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

interface PersonaState {
  id: string;
  status: 'active' | 'idle' | 'joining' | 'leaving';
  joinedAt: number;
  lastSpokeAt: number;
  messageCount: number;
}

interface EnhancedChatPanelProps {
  postId: string;
  postContent: string;
  analysis: any;
  onSendMessage: (message: string) => void;
  messages: Message[];
  isTyping?: boolean;
  isThinking?: boolean;
  currentUser?: {
    name: string;
    username: string;
    avatar?: string;
  };
  // 새로운 props
  activePersonas?: PersonaState[];
  dominantPersona?: string | null;
  currentTopics?: Array<{ topic: string; weight: number }>;
  totalTurns?: number;
  onPersonaClick?: (personaId: string) => void;
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
  }
};

const personaEmojis: Record<string, string> = {
  'Kai': '🧠',
  'Espri': '💖',
  'Luna': '🌙',
  'Namu': '🌱',
  'Milo': '🎭',
  'Eden': '🌿',
  'Ava': '🎨',
  'Rho': '⚡',
  'Noir': '🦉'
};

export default function EnhancedChatPanel({
  postId,
  postContent,
  analysis,
  onSendMessage,
  messages,
  isTyping = false,
  isThinking = false,
  currentUser,
  activePersonas = [],
  dominantPersona = null,
  currentTopics = [],
  totalTurns = 0,
  onPersonaClick
}: EnhancedChatPanelProps) {
  const [showThinking, setShowThinking] = useState<Set<string>>(new Set());
  const [displayedMessageCount, setDisplayedMessageCount] = useState(20);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // 새로운 메시지가 추가되면 자동으로 표시 개수 증가
  useEffect(() => {
    if (messages.length > displayedMessageCount) {
      setDisplayedMessageCount(prev => Math.min(prev + 1, messages.length));
    }
  }, [messages.length]); // displayedMessageCount 의존성 제거

  const toggleThinking = (messageId: string) => {
    setShowThinking(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const getPersonaColor = (personaId: string) => {
    return personaColors[personaId] || personaColors['Noir'];
  };

  const getPersonaEmoji = (personaId: string) => {
    return personaEmojis[personaId] || '🤖';
  };

  const formatExpandedInfo = (expandedInfo: any) => {
    if (!expandedInfo) return null;

    switch (expandedInfo.type) {
      case 'knowledge':
        return {
          title: '전문 지식 정보',
          content: (
            <div className="space-y-2">
              <div>
                <strong>사실:</strong>
                <ul className="list-disc list-inside ml-2">
                  {expandedInfo.data.facts.map((fact: string, index: number) => (
                    <li key={index} className="text-sm">{fact}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>출처:</strong>
                <div className="text-sm text-muted-foreground">
                  {expandedInfo.data.sources.join(', ')}
                </div>
              </div>
            </div>
          )
        };
      case 'analyst':
        return {
          title: '분석 데이터',
          content: (
            <div className="space-y-2">
              <div>
                <strong>패턴:</strong>
                <ul className="list-disc list-inside ml-2">
                  {expandedInfo.data.patterns.map((pattern: string, index: number) => (
                    <li key={index} className="text-sm">{pattern}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>통계:</strong>
                <div className="text-sm text-muted-foreground">
                  게시물 {expandedInfo.data.stats.totalPosts}개, 
                  평균 참여도 {expandedInfo.data.stats.avgEngagement}
                </div>
              </div>
            </div>
          )
        };
      case 'empath':
        return {
          title: '감정 분석',
          content: (
            <div className="space-y-2">
              <div>
                <strong>주요 감정:</strong>
                <div className="text-sm">
                  {expandedInfo.data.dominantEmotion} (강도: {expandedInfo.data.intensity.toFixed(2)})
                </div>
              </div>
              <div>
                <strong>감지된 감정들:</strong>
                <div className="text-sm text-muted-foreground">
                  {expandedInfo.data.emotions.map((e: any) => 
                    `${e.type}(${e.intensity.toFixed(1)})`
                  ).join(', ')}
                </div>
              </div>
            </div>
          )
        };
      case 'creative':
        return {
          title: '창의적 영감',
          content: (
            <div className="space-y-2">
              <div>
                <strong>비유:</strong>
                <div className="text-sm text-muted-foreground">
                  {expandedInfo.data.metaphors.join(', ')}
                </div>
              </div>
              <div>
                <strong>은유:</strong>
                <div className="text-sm text-muted-foreground">
                  {expandedInfo.data.analogies.join(', ')}
                </div>
              </div>
            </div>
          )
        };
      case 'humor':
        return {
          title: '유머 소재',
          content: (
            <div className="space-y-2">
              <div>
                <strong>재미있는 이야기:</strong>
                <div className="text-sm text-muted-foreground">
                  {expandedInfo.data.jokes.join(', ')}
                </div>
              </div>
              <div>
                <strong>참고사항:</strong>
                <div className="text-sm text-muted-foreground">
                  {expandedInfo.data.references.join(', ')}
                </div>
              </div>
            </div>
          )
        };
      default:
        return null;
    }
  };

  // 메시지 표시 로직: 5개씩 추가 로딩
  const displayMessages = messages.slice(-displayedMessageCount);

  return (
    <div className="bg-background">
      <div className="p-4 space-y-4">
        {/* 지난 대화 보기 버튼 */}
        {messages.length > displayedMessageCount && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisplayedMessageCount(prev => Math.min(prev + 5, messages.length))}
              className="text-xs"
            >
              <ChevronUp className="w-3 h-3 mr-1" />
              지난 대화 5개 더 보기 ({displayedMessageCount}/{messages.length})
            </Button>
          </div>
        )}
        
        <div>
          {displayMessages.map((msg, idx) => {
            // 시스템 메시지 (입장/퇴장/주도권교체/자동소개)는 SystemMessage로 표시
            if (msg.senderType === 'system' || msg.type === 'join' || msg.type === 'leave' || msg.type === 'handover' || msg.type === 'auto-introduction') {
              return (
                <div
                  key={`${msg.id}-${idx}`}
                >
                  <SystemMessage
                    type={msg.type}
                    personaId={msg.sender}
                    personaName={msg.sender}
                    dominantPersona={msg.dominantPersona}
                    dominantPersonaOwner={msg.dominantPersonaOwner}
                    message={msg.message}
                    timestamp={msg.timestamp}
                  />
                </div>
              );
            }

            const colors = msg.senderType === 'ai' ? getPersonaColor(msg.sender) : null;
            const isThinkingVisible = showThinking.has(`${msg.id}-${idx}`);
            console.log(`[THINKING VISIBILITY] Message ${msg.id}:`, {
              messageId: `${msg.id}-${idx}`,
              isThinkingVisible,
              showThinkingSet: Array.from(showThinking)
            });

            return (
              <div
                key={`${msg.id}-${idx}`}
                className={`flex gap-3 mb-4 ${msg.senderType === 'user' ? 'justify-end pr-4' : 'justify-start pl-4'}`}
                data-testid={`message-${msg.senderType}-${idx}`}
              >
                {msg.senderType === 'ai' && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="text-xs bg-secondary">
                      {getPersonaEmoji(msg.sender)}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`flex flex-col ${msg.senderType === 'user' ? 'items-end mr-2' : 'items-start ml-2'} max-w-[80%]`}>
                  {msg.senderType === 'ai' && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-foreground">{msg.sender}</span>
                      <Badge variant="secondary" className="h-5 px-2 text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI
                      </Badge>
                      {msg.index !== undefined && msg.total && (
                        <Badge variant="outline" className="text-xs">
                          {msg.index + 1}/{msg.total}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* 내부 추론 표시 */}
                  {(() => {
                    const hasThinking = msg.senderType === 'ai' && msg.thinking && msg.thinking.trim() !== "" && msg.thinking !== "...";
                    const isThinkingVisible = showThinking.has(`${msg.id}-${idx}`);
                    console.log(`[THINKING DEBUG] EnhancedChatPanel - Message ${msg.id}:`, {
                      senderType: msg.senderType,
                      hasThinking: !!msg.thinking,
                      thinking: msg.thinking,
                      thinkingLength: msg.thinking?.length || 0,
                      willShow: hasThinking,
                      isThinkingVisible: isThinkingVisible,
                      messageKeys: Object.keys(msg),
                      condition: {
                        isAI: msg.senderType === 'ai',
                        hasThinking: !!msg.thinking,
                        notEmpty: msg.thinking && msg.thinking.trim() !== "",
                        notDots: msg.thinking !== "..."
                      }
                    });
                    return hasThinking;
                  })() && (
                    <div className="mb-2">
                      <div className={`px-4 py-2 rounded-2xl border ${colors?.bg || 'bg-muted/50'} ${colors?.border || 'border-border/50'}`}>
                        <div className="flex items-center gap-2">
                          <Brain className="w-3 h-3" />
                          <span className="text-xs font-medium">추론:</span>
                          <span className="text-xs text-muted-foreground italic leading-tight">
                            {msg.thinking}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* 확장 정보 툴팁 */}
                  {msg.senderType === 'ai' && msg.expandedInfo && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="mb-2">
                            <Badge variant="outline" className="text-xs cursor-pointer">
                              📊 확장 정보
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md">
                          {(() => {
                            const info = formatExpandedInfo(msg.expandedInfo);
                            return info ? (
                              <div className="space-y-2">
                                <div className="font-medium">{info.title}</div>
                                {info.content}
                              </div>
                            ) : null;
                          })()}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      msg.senderType === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : colors ? `${colors.bg} ${colors.text} ${colors.border} border` : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>

                {msg.senderType === 'user' && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage 
                      src={msg.user?.avatar || currentUser?.avatar || currentUser?.profileImage || '/default-avatar.png'} 
                      alt={msg.user?.name || currentUser?.name || '사용자'} 
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {(msg.user?.name || currentUser?.name || '사용자')[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
        </div>

        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-end opacity-60"
            data-testid="typing-indicator"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>입력중</span>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
              </div>
            </div>
          </motion.div>
        )}

        {isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-start"
            data-testid="thinking-indicator"
          >
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs">🤖</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2 bg-muted rounded-2xl px-4 py-2">
              <span className="text-sm text-muted-foreground">AI 생각중</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
