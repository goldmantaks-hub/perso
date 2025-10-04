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

  // 메시지 및 게시물 정보 가져오기
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/perso", postId, "messages"],
    queryFn: () => fetch(`/api/perso/${postId}/messages`).then(res => res.json()),
    enabled: !!postId,
  });

  const messages = data?.messages || [];
  const post = data?.post;

  // 메시지 전송
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", `/api/perso/${postId}/messages`, { content, isAI: false });
    },
    onSuccess: async () => {
      // AI 메시지에서 페르소나 ID 찾기 (invalidation 전에)
      const aiMessage = messages.find((m: any) => m.isAI && m.personaId);
      const personaId = aiMessage?.personaId;
      
      // 게시물 정보도 invalidation 전에 캡처
      const currentPost = post;
      
      // 먼저 메시지 목록을 업데이트
      await queryClient.invalidateQueries({ queryKey: ["/api/perso", postId, "messages"] });
      
      // AI 자동 응답 시뮬레이션 (1초 후)
      if (personaId && currentPost) {
        setTimeout(async () => {
          // 게시물 태그 기반 AI 응답 생성
          const tagResponses: Record<string, string[]> = {
            "일상": ["일상의 소중함을 느끼셨네요 ✨", "평범한 순간도 특별하죠!"],
            "힐링": ["힐링이 필요한 시간이었나봐요 🌿", "휴식도 중요하죠!"],
            "카페": ["좋은 카페 추천 부탁드려요 ☕", "카페 분위기 정말 좋아보여요!"],
            "여행": ["여행지가 정말 멋지네요! 🌍", "나도 거기 가보고 싶다!"],
            "풍경": ["경치가 정말 아름답네요!", "사진 잘 찍으셨어요 📸"],
            "자연": ["자연과 함께하는 시간이 좋죠 🌿", "힐링되는 풍경이에요!"],
            "야경": ["야경이 정말 멋지네요! ✨", "밤 풍경 사진 잘 찍으셨어요!"],
            "음식": ["맛있어 보여요! 🍴", "레시피 공유해주세요!"],
            "커피": ["커피 향이 여기까지 느껴지는 것 같아요 ☕", "커피 한잔의 여유가 좋죠!"],
            "취미": ["멋진 취미네요! 👍", "꾸준히 하시는 게 대단해요!"],
            "베이킹": ["베이킹 솜씨가 대단하시네요! 🥐", "나도 배우고 싶어요!"],
            "디저트": ["디저트가 정말 맛있어 보여요! 🍰", "비주얼이 완벽해요!"],
            "요리": ["요리 실력이 대단하시네요! 👨‍🍳", "레시피 알려주세요!"],
            "운동": ["멋진 운동 루틴이네요! 💪", "건강관리 대단해요!"],
            "건강": ["건강 관리 잘하시는군요! 💪", "몸도 마음도 건강해지겠어요!"],
            "피트니스": ["운동 열심히 하시네요! 🏋️", "멋진 체력이에요!"],
            "맛집": ["맛집 추천 감사합니다! 🍽️", "나도 가보고 싶어요!"],
          };
          
          let response = "공감돼요! 멋진 경험이네요 ✨";
          
          if (currentPost.tags && currentPost.tags.length > 0) {
            // 모든 태그를 순회하며 매칭되는 응답 찾기
            for (const tag of currentPost.tags) {
              if (tagResponses[tag]) {
                response = tagResponses[tag][Math.floor(Math.random() * tagResponses[tag].length)];
                break;
              }
            }
          }
          
          await apiRequest("POST", `/api/perso/${postId}/messages`, { 
            content: response,
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
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Link href="/feed">
            <button className="text-foreground" data-testid="button-back">
              <ArrowLeft className="w-6 h-6" />
            </button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-bold">페르소</h1>
            </div>
            <p className="text-xs text-muted-foreground">AI들이 대화 중 · 참여자 {messages.length}명</p>
          </div>
        </div>
        
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
