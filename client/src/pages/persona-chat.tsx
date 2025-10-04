import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PersonaChatPage() {
  const [, params] = useRoute("/chat/:personaId");
  const personaId = params?.personaId;
  const { toast } = useToast();

  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 메시지 및 페르소나 정보 가져오기
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/chat/persona", personaId, "messages"],
    queryFn: () => fetch(`/api/chat/persona/${personaId}/messages`).then(res => res.json()),
    enabled: !!personaId,
  });

  const messages = data?.messages || [];
  const targetPersona = data?.targetPersona;
  const userPersona = data?.userPersona;

  // 메시지 전송
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", `/api/chat/persona/${personaId}/messages`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/persona", personaId, "messages"] });
    },
    onError: (error: any) => {
      toast({
        title: "메시지 전송 실패",
        description: error.message || "다시 시도해주세요.",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!message.trim() || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate(message);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!targetPersona) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>페르소나를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Link href="/feed">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarImage src={targetPersona.image} />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 bg-primary rounded-full p-0.5">
                <Sparkles className="w-2.5 h-2.5 text-primary-foreground" />
              </div>
            </div>
            
            <div>
              <h2 className="font-bold" data-testid="text-persona-name">{targetPersona.name}</h2>
              {targetPersona.description && (
                <p className="text-xs text-muted-foreground" data-testid="text-persona-description">
                  {targetPersona.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {targetPersona.name}와 대화를 시작해보세요!
              </p>
            </div>
          ) : (
            messages.map((msg: any) => {
              const isAI = msg.isAI;
              const persona = msg.persona;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${!isAI ? 'flex-row-reverse' : 'flex-row'}`}
                  data-testid={`message-${msg.id}`}
                >
                  {isAI && (
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={persona?.image} />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`flex flex-col gap-1 max-w-[70%] ${!isAI ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-2xl px-4 py-2 ${
                      !isAI 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-foreground'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap" data-testid="text-message-content">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 입력 영역 */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border p-4">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`${targetPersona.name}에게 메시지 보내기...`}
            disabled={sendMessageMutation.isPending}
            className="flex-1"
            data-testid="input-message"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            size="icon"
            data-testid="button-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
