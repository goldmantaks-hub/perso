import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/bottom-nav";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatResponse {
  response: string;
  persona: {
    id: string;
    name: string;
    image: string;
  };
}

export default function ChatPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 현재 사용자의 페르소나 가져오기
  const { data: persona, isLoading: personaLoading } = useQuery({
    queryKey: ['/api/user/persona'],
    queryFn: async () => {
      const res = await fetch('/api/user/persona');
      if (!res.ok) throw new Error('페르소나를 찾을 수 없습니다');
      return res.json();
    },
  });

  // 대화 mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!persona?.id) throw new Error('페르소나가 없습니다');
      
      const res = await apiRequest("POST", `/api/personas/${persona.id}/chat`, {
        message,
      });
      return await res.json() as ChatResponse;
    },
    onSuccess: (data) => {
      // 페르소나 응답 추가
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "-assistant",
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        },
      ]);
    },
    onError: (error: Error) => {
      toast({
        title: "대화 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;

    // 사용자 메시지 추가
    const userMessage: Message = {
      id: Date.now().toString() + "-user",
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    chatMutation.mutate(input);
    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 스크롤 자동 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (personaLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-muted-foreground mb-4">페르소나를 찾을 수 없습니다</p>
        <Button onClick={() => window.location.href = '/profile'}>
          프로필로 이동
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={persona.image} alt={persona.name} />
            <AvatarFallback>{persona.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-semibold">{persona.name}</h1>
            <p className="text-xs text-muted-foreground">
              E{persona.empathy ?? 5} H{persona.humor ?? 5} S{persona.sociability ?? 5} C{persona.creativity ?? 5} K{persona.knowledge ?? 5}
            </p>
          </div>
        </div>
      </header>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Avatar className="w-20 h-20 mb-4">
              <AvatarImage src={persona.image} alt={persona.name} />
              <AvatarFallback>{persona.name[0]}</AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-semibold mb-2">{persona.name}와 대화하기</h2>
            <p className="text-muted-foreground max-w-md">
              무엇이든 물어보세요. 페르소나가 당신의 개성과 성장을 반영하여 답변합니다.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <Avatar className="w-8 h-8 mr-2 shrink-0">
                  <AvatarImage src={persona.image} alt={persona.name} />
                  <AvatarFallback>{persona.name[0]}</AvatarFallback>
                </Avatar>
              )}
              
              <Card className={`max-w-[80%] ${message.role === "user" ? "bg-primary text-primary-foreground" : ""}`}>
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </CardContent>
              </Card>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="sticky bottom-16 bg-background border-t p-4">
        <div className="flex gap-2">
          <Textarea
            data-testid="input-chat-message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            className="min-h-[44px] max-h-32 resize-none"
            disabled={chatMutation.isPending}
          />
          <Button
            data-testid="button-send-message"
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            size="icon"
            className="shrink-0"
          >
            {chatMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
