import { Settings, Plus, Moon, Sun, Heart, MessageCircle, Share2 } from "lucide-react";
import { Link } from "wouter";
import BottomNav from "@/components/bottom-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import logoImage from "@assets/logo.svg";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  normalizeSentiment, 
  computeWeight, 
  updatePersonaMood, 
  computePersonaDeltas,
  validatePost,
  type SentimentAnalysis,
  type PersonaDeltas
} from "@/lib/persona-stats";

// PostCard 컴포넌트
function PostCard({ post }: { post: any }) {
  const { toast } = useToast();
  const [analyzed, setAnalyzed] = useState(false);

  useEffect(() => {
    // 카드 로드시 자동으로 분석
    if (!analyzed && post.id && post.persona?.id) {
      analyzeAndApplyStats();
    }
  }, [post.id, analyzed]);

  const analyzeAndApplyStats = async () => {
    try {
      // 안티-게이밍: 중복 체크
      const validation = validatePost({
        userId: post.author.id,
        postId: post.id,
        content: post.title + post.description,
      });

      if (!validation.valid) {
        console.log(`[ANTI-GAMING] Post ${post.id} blocked:`, validation.reason);
        setAnalyzed(true);
        return;
      }

      // 1. AI 감성 분석
      const response = await apiRequest("POST", "/api/ai/analyze", {
        content: post.title + " " + post.description,
        imageUrl: post.image,
      });
      const analysisResult = await response.json() as SentimentAnalysis;

      // 2. 무드 계산
      const mood = normalizeSentiment(analysisResult);
      const weight = computeWeight({
        created_at: post.createdAt,
        likes: post.likesCount || 0,
        comments: post.commentsCount || 0,
      });

      // 3. 페르소나 무드 업데이트
      const prevMood = { valence: 0, arousal: 0.5 }; // 기본값
      const newMood = updatePersonaMood(prevMood, mood, weight);
      
      await apiRequest("POST", `/api/personas/${post.persona.id}/mood/update`, {
        valence: newMood.valence,
        arousal: newMood.arousal,
      });

      // 4. 스탯 델타 계산
      const deltas = computePersonaDeltas({
        sentiment: analysisResult,
        tones: analysisResult.tones,
        imageScores: analysisResult.media_scores,
      });

      // 5. 페르소나 성장 반영
      await apiRequest("POST", `/api/personas/${post.persona.id}/growth/auto`, {
        deltas,
      });

      // 6. 토스트 표시
      const deltaText = Object.entries(deltas)
        .filter(([_, value]) => value > 0)
        .map(([key, value]) => {
          const labels: Record<string, string> = {
            empathy: 'Empathy',
            creativity: 'Creativity',
            humor: 'Humor',
            knowledge: 'Knowledge',
            sociability: 'Sociability',
          };
          return `${labels[key]} +${value}`;
        })
        .join(' · ');

      if (deltaText) {
        toast({
          description: deltaText,
          duration: 2000,
        });
      }

      setAnalyzed(true);
    } catch (error) {
      console.error('Failed to analyze post:', error);
      setAnalyzed(true);
    }
  };

  return (
    <div key={post.id} data-testid={`post-${post.id}`}>
      {/* 포스트 헤더 */}
      <div className="flex justify-between items-center mb-4 pt-4">
        <div className="flex items-center gap-2">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.author.profileImage} />
            <AvatarFallback>{post.author.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-bold" data-testid="text-author-name">
              @{post.author.username.split('_')[0]}
            </h2>
            <span className="text-xs text-muted-foreground" data-testid="text-timestamp">
              {new Date(post.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
        </div>
      </div>

      {/* 포스트 카드 */}
      <div className="bg-background rounded-xl overflow-hidden shadow-sm">
        {/* 이미지 */}
        <div className="relative">
          <img 
            src={post.image} 
            alt={post.title}
            className="w-full aspect-square object-cover"
            data-testid="img-post"
          />
        </div>

        {/* 텍스트 내용 */}
        <div className="p-4">
          <p className="text-base font-bold" data-testid="text-post-title">
            {post.title}
          </p>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-post-description">
            {post.description}
          </p>
          
          {/* AI 분석 결과 */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5" data-testid={`tags-${post.id}`}>
              {post.tags.map((tag: string, idx: number) => (
                <Badge 
                  key={idx} 
                  variant="secondary" 
                  className="text-xs"
                  data-testid={`tag-${post.id}-${idx}`}
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
          
          {post.sentiment !== null && post.sentiment !== undefined && (
            <div className="mt-3" data-testid={`sentiment-${post.id}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">감성 분석</span>
                <span className="text-xs font-medium">
                  {post.sentiment >= 0.8 ? '😊' : post.sentiment >= 0.6 ? '🙂' : '😐'}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div 
                  className="bg-primary h-1.5 rounded-full transition-all" 
                  style={{ width: `${post.sentiment * 100}%` }}
                  data-testid={`sentiment-bar-${post.id}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* 액션 버튼 (좋아요, 댓글, 공유) */}
        <PostActions post={post} />

        {/* AI 대화 섹션 */}
        {post.hasPerso && <PersoSection post={post} />}
      </div>
    </div>
  );
}

// PostActions 컴포넌트
function PostActions({ post }: { post: any }) {
  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      return await apiRequest("POST", "/api/likes", { postId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  return (
    <div className="px-4 pb-3 flex items-center gap-4">
      <button 
        onClick={() => likeMutation.mutate(post.id)}
        className={`flex items-center gap-1.5 transition-colors ${
          post.isLiked
            ? 'text-destructive' 
            : 'text-muted-foreground hover:text-destructive'
        }`} 
        data-testid={`button-like-${post.id}`}
      >
        <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
        <span className="text-sm">{post.likesCount}</span>
      </button>
      <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors" data-testid={`button-comment-${post.id}`}>
        <MessageCircle className="w-5 h-5" />
        <span className="text-sm">{post.commentsCount}</span>
      </button>
      <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors" data-testid={`button-share-${post.id}`}>
        <Share2 className="w-5 h-5" />
      </button>
    </div>
  );
}

// PersoSection 컴포넌트
function PersoSection({ post }: { post: any }) {
  return (
    <div className="border-t border-border pt-4">
      <div className="px-4">
        <h3 className="font-bold flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          경험이 공감되어 페르소가 열렸습니다.
        </h3>
        
        {/* 최근 메시지 미리보기 */}
        {post.recentMessages && post.recentMessages.length > 0 && (
          <div className="space-y-2 mb-3">
            {post.recentMessages.map((msg: any) => {
              const displayContent = msg.content.length > 80 
                ? msg.content.substring(0, 80) + '...' 
                : msg.content;
              
              return (
                <div key={msg.id} className="flex gap-2 items-start" data-testid={`preview-message-${msg.id}`}>
                  <Avatar className="w-6 h-6 flex-shrink-0">
                    <AvatarImage src={msg.isAI ? msg.persona?.image : msg.user?.profileImage} />
                    <AvatarFallback>{msg.isAI ? 'AI' : 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">
                      <span className="font-medium">{msg.isAI ? msg.persona?.name : msg.user?.name}</span>: {displayContent}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="p-4 pt-0">
        <Link href={`/perso/${post.id}`}>
          <Button 
            className="w-full bg-primary/10 text-primary hover:bg-primary/20 font-bold"
            variant="secondary"
            data-testid={`button-enter-perso-${post.id}`}
          >
            페르소 입장
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const currentUser = {
    name: "김지은",
    username: "jieun_kim",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun"
  };

  // 게시물 가져오기
  const { data: posts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/posts"],
  });

  const stories = [
    {
      username: "jieun_kim",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun",
      hasNew: true,
      isOwn: true
    },
    {
      username: "minsu_park",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=minsu",
      hasNew: false
    },
    {
      username: "seoyeon_lee",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=seoyeon",
      hasNew: false
    },
    {
      username: "junho_choi",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=junho",
      hasNew: false
    },
    {
      username: "hyejin_kang",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=hyejin",
      hasNew: false
    },
    {
      username: "dongwoo_shin",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=dongwoo",
      hasNew: false
    },
    {
      username: "yuna_jung",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=yuna",
      hasNew: false
    },
    {
      username: "taehoon_kim",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=taehoon",
      hasNew: false
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-16 bg-background/80 backdrop-blur-sm">
        <div className="w-8"></div>
        <img 
          src={logoImage} 
          alt="PERSO" 
          className="h-36 dark:invert-0 invert" 
          data-testid="img-logo" 
        />
        <button 
          onClick={toggleTheme}
          className="text-foreground" 
          data-testid="button-theme-toggle"
        >
          {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
        </button>
      </header>

      {/* 페르소나 공감 상태 */}
      <section className="px-4 py-3">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback>AI</AvatarFallback>
            </Avatar>
            <h2 className="text-sm font-medium text-muted-foreground">
              페르소나와의 공감 상태
            </h2>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-2 mb-1.5">
          <div className="bg-primary h-2 rounded-full" style={{ width: '60%' }}></div>
        </div>
        <p className="text-xs text-muted-foreground">
          감성 80 · 유머 60 · 사교성 75
        </p>
      </section>

      {/* 스토리 섹션 */}
      <section className="py-6">
        <div className="flex overflow-x-auto px-4 gap-5 scrollbar-hide">
          {stories.map((story) => (
            <div key={story.username} className="flex flex-col items-center gap-2 flex-shrink-0 w-20">
              <div className="relative">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={story.avatar} />
                  <AvatarFallback>{story.username[0]}</AvatarFallback>
                </Avatar>
                {story.isOwn && (
                  <button 
                    className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground border-2 border-background"
                    data-testid="button-add-story"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-xs text-center text-foreground" data-testid={`text-story-${story.username}`}>
                @{story.username.split('_')[0]}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 피드 섹션 */}
      <section className="py-2 bg-card rounded-t-2xl min-h-[400px]">
        <div className="px-4 space-y-4">
          {posts.map((post: any) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}
