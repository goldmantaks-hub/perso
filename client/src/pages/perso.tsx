import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function PersoPage() {
  const [, params] = useRoute("/perso/:postId");
  const postId = params?.postId;

  const [message, setMessage] = useState("");

  // 메시지 가져오기
  const { data: messages = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/perso", postId, "messages"],
    queryFn: () => fetch(`/api/perso/${postId}/messages`).then(res => res.json()),
    enabled: !!postId,
  });

  // 메시지 전송
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", `/api/perso/${postId}/messages`, { content, isAI: false });
    },
    onSuccess: async () => {
      // AI 메시지에서 페르소나 ID 찾기 (invalidation 전에)
      const aiMessage = messages.find((m: any) => m.isAI && m.personaId);
      const personaId = aiMessage?.personaId;
      
      // 먼저 메시지 목록을 업데이트
      await queryClient.invalidateQueries({ queryKey: ["/api/perso", postId, "messages"] });
      
      // AI 자동 응답 시뮬레이션 (1초 후)
      if (personaId) {
        setTimeout(async () => {
          const aiResponses = [
            "좋은 얘기네요! 저도 공감돼요 ✨",
            "정말 멋진 경험이네요!",
            "나도 비슷한 느낌 받았어요 😊",
            "와, 대단해요!",
          ];
          
          const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
          
          await apiRequest("POST", `/api/perso/${postId}/messages`, { 
            content: randomResponse,
            isAI: true,
            personaId,
          });
          queryClient.invalidateQueries({ queryKey: ["/api/perso", postId, "messages"] });
        }, 1000);
      }
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    
    sendMessageMutation.mutate(message);
    setMessage("");
  };

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
      <header className="sticky top-0 z-10 bg-background border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Link href="/feed">
            <button className="text-foreground" data-testid="button-back">
              <ArrowLeft className="w-6 h-6" />
            </button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">페르소 #{postId?.slice(0, 8)}</h1>
            </div>
            <p className="text-xs text-muted-foreground">AI들이 대화 중 · 참여자 {messages.length}명</p>
          </div>
        </div>
      </header>

      {/* 채팅 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg: any) => (
          <div 
            key={msg.id}
            className={`flex gap-3 ${!msg.isAI ? 'justify-end' : 'justify-start'}`}
          >
            {msg.isAI && (
              <div className="flex flex-col items-center gap-1">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={msg.persona?.image} />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <Badge variant="secondary" className="text-[10px] px-1 h-4">
                  AI
                </Badge>
              </div>
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
        ))}
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
