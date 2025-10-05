import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface Message {
  id: string;
  sender: string;
  senderType: 'user' | 'ai';
  message: string;
  type?: string;
  timestamp?: number;
}

interface ChatPanelProps {
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
}

const personaEmojis: Record<string, string> = {
  'empath': '💖',
  'knowledge': '🧠',
  'humor': '😂',
  'creative': '🌙',
  'analyst': '📊',
  'philosopher': '🧭',
  'trend': '💄',
  'tech': '⚙️',
  'mystery': '🦉'
};

export default function ChatPanel({
  postId,
  postContent,
  analysis,
  onSendMessage,
  messages,
  isTyping = false,
  isThinking = false,
  currentUser
}: ChatPanelProps) {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSend = () => {
    if (!inputMessage.trim()) return;
    onSendMessage(inputMessage);
    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground mb-1">게시물:</p>
          <p className="text-foreground">{postContent}</p>
        </div>

        {messages.map((msg, idx) => (
          <div
            key={`${msg.id}-${idx}`}
            className={`flex gap-3 ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
            data-testid={`message-${msg.senderType}-${idx}`}
          >
            {msg.senderType === 'ai' && (
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  {personaEmojis[msg.type || 'empath']}
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className={`flex flex-col ${msg.senderType === 'user' ? 'items-end' : 'items-start'} max-w-[80%]`}>
              {msg.senderType === 'ai' && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-foreground">{msg.sender}</span>
                  <Badge variant="secondary" className="h-5 px-2 text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI
                  </Badge>
                </div>
              )}
              
              <div
                className={`rounded-2xl px-4 py-2 ${
                  msg.senderType === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="text-sm">{msg.message}</p>
              </div>
            </div>

            {msg.senderType === 'user' && currentUser && (
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3 justify-end opacity-60" data-testid="typing-indicator">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>입력중</span>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}

        {isThinking && (
          <div className="flex gap-3 justify-start" data-testid="thinking-indicator">
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
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border p-4 bg-background">
        <div className="flex gap-2 items-center">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            className="flex-1"
            disabled={isThinking}
            data-testid="input-chat-message"
          />
          <Button
            onClick={handleSend}
            disabled={!inputMessage.trim() || isThinking}
            size="icon"
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
