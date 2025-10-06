import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { Link, useRoute, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { isAuthenticated } from "@/lib/auth";

export default function PersoPage() {
  const [, params] = useRoute("/perso/:postId");
  const postId = params?.postId;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (!isAuthenticated()) {
      setLocation("/login");
    }
  }, [setLocation]);

  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 메시지 및 게시물 정보 가져오기 (WebSocket으로 실시간 업데이트)
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/perso", postId, "messages"],
    enabled: !!postId,
  });

  // 사용자 페르소나 가져오기 (AI 응답에 사용)
  const { data: userPersona, isLoading: personaLoading, error: personaError } = useQuery<any>({
    queryKey: ['/api/user/persona'],
    enabled: !!postId, // postId가 있을 때만 로드
    retry: false,
  });

  const messages = data?.messages || [];
  const participants = data?.participants || [];
  const post = data?.post;
  const conversationId = data?.conversation?.id;

  // WebSocket으로 실시간 메시지 수신
  const handleNewMessage = useCallback((newMessage: any) => {
    queryClient.setQueryData(["/api/perso", postId, "messages"], (old: any) => {
      if (!old) return old;
      
      // 중복 메시지 체크
      const existingMessage = old.messages?.find((m: any) => {
        // 같은 ID
        if (m.id === newMessage.id) return true;
        
        // 같은 내용 + 비슷한 시간 (5초 이내)
        if (m.content === newMessage.content && 
            m.isAI === newMessage.isAI) {
          const timeDiff = Math.abs(
            new Date(m.createdAt).getTime() - new Date(newMessage.createdAt).getTime()
          );
          if (timeDiff < 5000) return true;
        }
        
        return false;
      });
      
      if (existingMessage) {
        console.log('[PERSO] Duplicate message detected, skipping:', newMessage.id);
        return old;
      }
      
      return {
        ...old,
        messages: [...(old.messages || []), newMessage],
      };
    });
  }, [postId]);

  // 시스템 메시지 수신
  const handleSystemMessage = useCallback((systemMessage: any) => {
    queryClient.setQueryData(["/api/perso", postId, "messages"], (old: any) => {
      if (!old) return old;
      
      // 중복 메시지 체크 (ID 기반)
      const existingMessage = old.messages?.find((m: any) => m.id === systemMessage.id);
      
      if (existingMessage) {
        return old;
      }
      
      return {
        ...old,
        messages: [...(old.messages || []), systemMessage],
      };
    });
  }, [postId]);

  const { leaveConversation } = useWebSocket({
    conversationId,
    onMessage: handleNewMessage,
    onSystemMessage: handleSystemMessage,
    enabled: !!conversationId,
  });

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 뒤로가기 핸들러
  const handleBack = () => {
    leaveConversation();
    setLocation("/feed");
  };

  // 메시지 전송 (낙관적 업데이트)
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!isAuthenticated()) {
        throw new Error('로그인이 필요합니다');
      }
      const response = await apiRequest("POST", `/api/perso/${postId}/messages`, { content, isAI: false });
      return response.json();
    },
    onMutate: async (content: string) => {
      await queryClient.cancelQueries({ queryKey: ["/api/perso", postId, "messages"] });
      
      const previousData = queryClient.getQueryData(["/api/perso", postId, "messages"]);
      
      let currentUser: any;
      try {
        currentUser = await queryClient.ensureQueryData({ queryKey: ['/api/user/persona'] });
      } catch (error) {
        console.error('[PERSO] Failed to get user persona:', error);
        currentUser = null;
      }
      
      const tempId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempId,
        content,
        isAI: false,
        createdAt: new Date().toISOString(),
        user: {
          name: currentUser?.name || '나',
          profileImage: currentUser?.profileImage,
        },
      };
      
      queryClient.setQueryData(["/api/perso", postId, "messages"], (old: any) => ({
        ...old,
        messages: [...(old?.messages || []), optimisticMessage],
      }));
      
      return { previousData, tempId };
    },
    onError: (err: any, content, context: any) => {
      queryClient.setQueryData(["/api/perso", postId, "messages"], context?.previousData);
      
      let errorMessage = "다시 시도해주세요.";
      if (err.message?.includes('로그인')) {
        errorMessage = "로그인이 필요합니다.";
      } else if (err.message?.includes('403') || err.message?.includes('401')) {
        errorMessage = "인증이 만료되었습니다. 다시 로그인해주세요.";
      }
      
      toast({
        title: "메시지 전송 실패",
        description: errorMessage,
        variant: "destructive",
      });
    },
    onSuccess: async (serverMessage: any, sentMessageContent, context: any) => {
      queryClient.setQueryData(["/api/perso", postId, "messages"], (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          messages: (old.messages || []).map((m: any) => 
            m.id === context?.tempId ? serverMessage : m
          ),
        };
      });
      

      let personaData: any;
      try {
        personaData = await queryClient.ensureQueryData({
          queryKey: ['/api/user/persona'],
        });
      } catch (error: any) {
        toast({
          title: "로그인이 필요합니다",
          description: "AI와 대화하려면 로그인해주세요.",
          variant: "destructive",
        });
        return;
      }
      
      const personaId = personaData?.id;
      
      if (!personaId) {
        toast({
          title: "페르소나를 찾을 수 없습니다",
          description: "AI 응답을 생성할 수 없습니다.",
          variant: "destructive",
        });
        return;
      }
      
      setTimeout(async () => {
        try {
          await queryClient.refetchQueries({ queryKey: ["/api/perso", postId, "messages"] });
          const updatedData = await queryClient.ensureQueryData({
            queryKey: ["/api/perso", postId, "messages"],
          }) as any;
          
          const allMessages = updatedData?.messages || [];
          const recentMessages = allMessages.slice(-5);
          
          const response = await apiRequest("POST", `/api/perso/${postId}/ai-response`, {
            personaId,
            recentMessages,
          });
          const aiResponse = await response.json();
          
          const aiContent = aiResponse.content?.trim();
          const aiThinking = aiResponse.thinking?.trim();
          
          if (!aiContent || aiContent.length === 0) {
            console.warn('[PERSO] Empty AI response received, skipping');
            return;
          }
          
          await apiRequest("POST", `/api/perso/${postId}/messages`, { 
            content: aiContent,
            thinking: aiThinking,
            isAI: true,
            personaId,
          });
          
          queryClient.invalidateQueries({ queryKey: ["/api/perso", postId, "messages"] });
        } catch (error: any) {
          console.error('AI 응답 생성 실패:', error);
          
          let errorMessage = "다시 시도해주세요.";
          if (error.message?.includes("OpenAI")) {
            errorMessage = "AI 서비스를 사용할 수 없습니다. 관리자에게 문의하세요.";
          }
          
          toast({
            title: "AI 응답 생성 실패",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }, 1000);
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    
    sendMessageMutation.mutate(message);
    setMessage("");
  };

  // 대화 기록 삭제
  const clearChatMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/perso/${postId}/messages/clear`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/perso", postId, "messages"] });
      toast({
        title: "대화 기록 삭제됨",
        description: "새로운 대화가 시작됩니다.",
      });
    },
    onError: () => {
      toast({
        title: "삭제 실패",
        description: "대화 기록 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* 헤더 */}
      <header className="flex-shrink-0 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <div className="flex items-center gap-2">
            <button className="text-foreground" onClick={handleBack} data-testid="button-back">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => clearChatMutation.mutate()}
              disabled={clearChatMutation.isPending}
              data-testid="button-clear-chat"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">{post?.title ?? '게시물'}의 페르소 공간</h1>
            </div>
            <p className="text-xs text-muted-foreground">
              {(() => {
                // 중복 제거 후 카운트
                const uniquePersonas = new Set(
                  participants
                    .filter((p: any) => p?.type === 'persona')
                    .map((p: any) => p.personaId)
                );
                const uniqueUsers = new Set(
                  participants
                    .filter((p: any) => p?.type === 'user')
                    .map((p: any) => p.userId)
                );
                return `페르소나 ${uniquePersonas.size}명, 회원 ${uniqueUsers.size}명`;
              })()}
            </p>
          </div>
        </div>
        
        {/* 참여자 리스트 */}
        {participants.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <span className="text-xs text-muted-foreground shrink-0">참여 중:</span>
              {(() => {
                const uniqueParticipants = participants.reduce((acc: any[], p: any) => {
                  if (!p) return acc;
                  
                  // 페르소나의 경우 personaId로 중복 체크
                  if (p.type === 'persona') {
                    if (!acc.find((existing: any) => existing.type === 'persona' && existing.personaId === p.personaId)) {
                      acc.push(p);
                    }
                  }
                  // 사용자의 경우 userId로 중복 체크
                  else if (p.type === 'user') {
                    if (!acc.find((existing: any) => existing.type === 'user' && existing.userId === p.userId)) {
                      acc.push(p);
                    }
                  }
                  
                  return acc;
                }, []);
                
                return uniqueParticipants.map((p: any) => {
                  if (p.type === 'persona') {
                    return (
                      <Link key={`persona-${p.personaId}`} href={`/chat/${p.personaId}`}>
                        <div className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-0.5 shrink-0 hover-elevate" data-testid={`participant-persona-${p.personaId}`}>
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={p.personaImage} />
                            <AvatarFallback>AI</AvatarFallback>
                          </Avatar>
                          <span className="text-xs">@{p.username?.split('_')?.[0] ?? '알수없음'}</span>
                        </div>
                      </Link>
                    );
                  } else {
                    return (
                      <div key={`user-${p.userId}`} className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-0.5 shrink-0" data-testid={`participant-user-${p.userId}`}>
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={p.profileImage} />
                          <AvatarFallback>{p.name?.[0] ?? 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs">@{p.username?.split('_')?.[0] ?? '사용자'}</span>
                      </div>
                    );
                  }
                });
              })()}
            </div>
          </div>
        )}
        
        {/* 게시물 정보 */}
        {post && (
          <div className="px-4 pb-4" data-testid="post-info">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm font-medium mb-1">{post.title}</p>
              <p className="text-xs text-muted-foreground mb-2">{post.description}</p>
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.tags.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-[10px] h-5">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 채팅 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg: any) => {
          if (msg.messageType === 'join' || msg.messageType === 'leave' || msg.senderType === 'system') {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className="bg-muted rounded-full px-3 py-1">
                  <p className="text-xs text-muted-foreground" data-testid={`system-message-${msg.id}`}>
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          }
          
          return (
            <div 
              key={msg.id}
              className={`flex gap-3 ${!msg.isAI ? 'justify-end' : 'justify-start'}`}
            >
              {msg.isAI && (
              <Link href={`/chat/${msg.personaId}`}>
                <div className="flex flex-col items-center gap-1">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={msg.persona?.image} />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  {(() => {
                    const participant = participants.find((p: any) => p && p.type === 'persona' && p.personaId === msg.personaId);
                    if (!participant) {
                      return (
                        <Badge variant="secondary" className="text-[10px] px-1 h-4">
                          AI
                        </Badge>
                      );
                    }
                    const username = participant.username?.split('_')?.[0] ?? '알수없음';
                    return (
                      <Badge variant="secondary" className="text-[10px] px-1 h-4">
                        @{username}
                      </Badge>
                    );
                  })()}
                </div>
              </Link>
            )}
            <div className={`flex flex-col gap-1 max-w-[70%] ${!msg.isAI ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {msg.isAI ? msg.persona?.name : msg.user?.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(msg.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {msg.isAI && msg.thinking && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md text-xs text-muted-foreground italic" data-testid={`thinking-${msg.id}`}>
                  <Sparkles className="w-3 h-3" />
                  <span>{msg.thinking}</span>
                </div>
              )}
              <div className={`p-3 rounded-lg ${
                !msg.isAI
                  ? 'bg-primary text-primary-foreground rounded-tr-none' 
                  : 'bg-muted rounded-tl-none'
              }`}>
                <p className="text-sm" data-testid={`message-${msg.id}`}>
                  {msg.content}
                </p>
              </div>
            </div>
            {!msg.isAI && (
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={msg.user?.profileImage} />
                <AvatarFallback>나</AvatarFallback>
              </Avatar>
            )}
          </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="flex-shrink-0 bg-background border-t border-border p-4">
        <div className="flex items-center gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="메시지를 입력하세요..."
            className="flex-1"
            data-testid="input-message"
          />
          <Button 
            onClick={handleSend}
            size="icon"
            data-testid="button-send"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          메시지를 보내면 AI가 응답합니다
        </p>
      </div>
    </div>
  );
}
