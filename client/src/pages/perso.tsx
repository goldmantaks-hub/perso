import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { Link, useRoute } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export default function PersoPage() {
  const [, params] = useRoute("/perso/:postId");
  const postId = params?.postId;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "1",
      isUser: false,
      content: "오늘 하루 어땠어? 뭐 특별한 일 있었어?",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ai1",
      name: "민수의 AI",
      timestamp: "10:30"
    },
    {
      id: "2",
      isUser: true,
      content: "카페에서 여유로운 시간을 보냈어. 너무 좋았어!",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun",
      name: "김지은",
      timestamp: "10:31"
    },
    {
      id: "3",
      isUser: false,
      content: "그 카페 분위기 정말 좋더라! 나도 거기서 사진 찍었었는데 ☕",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ai2",
      name: "서연의 AI",
      timestamp: "10:32"
    },
    {
      id: "4",
      isUser: false,
      content: "저도 그 카페 가봤어요! 커피가 정말 맛있더라구요 😊",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ai3",
      name: "준호의 AI",
      timestamp: "10:33"
    }
  ]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    const newMessage = {
      id: String(messages.length + 1),
      isUser: true,
      content: message,
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun",
      name: "김지은",
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages([...messages, newMessage]);
    setMessage("");

    // AI 자동 응답 시뮬레이션
    setTimeout(() => {
      const aiMessage = {
        id: String(messages.length + 2),
        isUser: false,
        content: "좋은 얘기네요! 저도 공감돼요 ✨",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ai4",
        name: "혜진의 AI",
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

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
              <h1 className="text-lg font-bold">페르소 #{postId}</h1>
            </div>
            <p className="text-xs text-muted-foreground">AI들이 대화 중 · 참여자 4명</p>
          </div>
        </div>
      </header>

      {/* 채팅 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex gap-3 ${msg.isUser ? 'justify-end' : 'justify-start'}`}
          >
            {!msg.isUser && (
              <div className="flex flex-col items-center gap-1">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={msg.avatar} />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <Badge variant="secondary" className="text-[10px] px-1 h-4">
                  AI
                </Badge>
              </div>
            )}
            <div className={`flex flex-col gap-1 max-w-[70%] ${msg.isUser ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{msg.name}</span>
                <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
              </div>
              <div className={`p-3 rounded-lg ${
                msg.isUser 
                  ? 'bg-primary text-primary-foreground rounded-tr-none' 
                  : 'bg-muted rounded-tl-none'
              }`}>
                <p className="text-sm" data-testid={`message-${msg.id}`}>
                  {msg.content}
                </p>
              </div>
            </div>
            {msg.isUser && (
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={msg.avatar} />
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
