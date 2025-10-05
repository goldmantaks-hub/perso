import { useState, useEffect } from "react";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PersoPage() {
  const [, params] = useRoute("/perso/:postId");
  const postId = params?.postId;
  const { toast } = useToast();

  const [message, setMessage] = useState("");

  // 메시지 및 게시물 정보 가져오기
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

  // AI 자동 대화 (15초마다)
  useEffect(() => {
    if (!postId || participants.length === 0) return;

    const aiParticipants = participants.filter((p: any) => p && p.type === 'persona');
    if (aiParticipants.length < 2) return;

    const interval = setInterval(async () => {
      try {
        const personaIds = aiParticipants.map((p: any) => p.personaId);
        const recentMessages = messages.slice(-5);

        const response = await apiRequest("POST", "/api/ai/converse", {
          postId,
          personaIds,
          recentMessages,
        });

        const conversationData = await response.json();
        
        if (conversationData.responses && conversationData.responses.length > 0) {
          for (const resp of conversationData.responses) {
            await apiRequest("POST", `/api/perso/${postId}/messages`, {
              content: resp.content,
              isAI: true,
              personaId: resp.personaId,
            });
          }
          
          queryClient.invalidateQueries({ queryKey: ["/api/perso", postId, "messages"] });
        }
      } catch (error) {
        console.error('AI 자동 대화 실패:', error);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [postId, participants, messages]);

  // 메시지 전송
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", `/api/perso/${postId}/messages`, { content, isAI: false });
    },
    onSuccess: async (_, sentMessageContent) => {
      // 페르소나 데이터 확보 (로딩 중이면 완료 대기)
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
      
      // AI 자동 응답 생성 (OpenAI 기반, 1초 후)
      setTimeout(async () => {
        try {
          // 최신 메시지 목록을 확실하게 가져오기 (refetch 후 데이터 반환)
          await queryClient.refetchQueries({ queryKey: ["/api/perso", postId, "messages"] });
          const updatedData = await queryClient.ensureQueryData({
            queryKey: ["/api/perso", postId, "messages"],
          }) as any;
          
          const allMessages = updatedData?.messages || [];
          
          // 최근 5개 메시지 (방금 보낸 메시지 포함 보장)
          const recentMessages = allMessages.slice(-5);
          
          // OpenAI를 사용한 AI 응답 생성 (apiRequest는 이미 에러 체크함)
          const response = await apiRequest("POST", `/api/perso/${postId}/ai-response`, {
            personaId,
            recentMessages,
          });
          const aiResponse = await response.json();
          
          // AI 응답을 메시지로 저장
          await apiRequest("POST", `/api/perso/${postId}/messages`, { 
            content: aiResponse.response,
            isAI: true,
            personaId,
          });
          
          queryClient.invalidateQueries({ queryKey: ["/api/perso", postId, "messages"] });
        } catch (error: any) {
          console.error('AI 응답 생성 실패:', error);
          
          // OpenAI 키 미설정 등의 특정 에러 메시지 처리
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <div className="flex items-center gap-2">
            <Link href="/feed">
              <button className="text-foreground" data-testid="button-back">
                <ArrowLeft className="w-6 h-6" />
              </button>
            </Link>
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
              <h1 className="text-lg font-bold">@{post?.author?.username?.split('_')?.[0] ?? '알수없음'}의 페르소</h1>
            </div>
            <p className="text-xs text-muted-foreground">AI들이 대화 중 · 참여자 {participants.length}명</p>
          </div>
        </div>
        
        {/* 참여 페르소나 리스트 */}
        {participants.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <span className="text-xs text-muted-foreground shrink-0">참여 중:</span>
              {(() => {
                const uniquePersonas = participants
                  .filter((p: any) => p && p.type === 'persona')
                  .reduce((acc: any[], p: any) => {
                    if (!acc.find((existing: any) => existing.personaId === p.personaId)) {
                      acc.push(p);
                    }
                    return acc;
                  }, []);
                
                return uniquePersonas.map((p: any) => (
                  <Link key={p.personaId} href={`/chat/${p.personaId}`}>
                    <div className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-0.5 shrink-0 hover-elevate" data-testid={`participant-${p.personaId}`}>
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={p.personaImage} />
                        <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                      <span className="text-xs">@{p.username?.split('_')?.[0] ?? '알수없음'}</span>
                    </div>
                  </Link>
                ));
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
          if (msg.messageType === 'join' || msg.senderType === 'system') {
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
      </div>

      {/* 입력 영역 */}
      <div className="sticky bottom-0 bg-background border-t border-border p-4">
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
          AI들이 자동으로 대화에 참여합니다
        </p>
      </div>
    </div>
  );
}
