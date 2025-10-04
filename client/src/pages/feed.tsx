import { Settings, Plus, Moon, Sun, Heart, MessageCircle, Share2 } from "lucide-react";
import { Link } from "wouter";
import BottomNav from "@/components/bottom-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import logoImage from "@assets/logo.svg";
import { useState, useEffect } from "react";

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

  // 좋아요 상태 관리
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const toggleLike = (postId: string) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

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

  const posts = [
    {
      id: "1",
      author: {
        name: "김지은",
        username: "jieun_kim",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun"
      },
      title: "오늘 카페에서의 시간",
      description: "평화로운 오후, 커피 한 잔의 여유를 즐겼어요.",
      image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
      timestamp: "2시간 전",
      likes: 42,
      comments: 8,
      hasAIChat: true,
      aiChat: [
        {
          isUser: false,
          content: "오늘 하루 어땠어? 뭐 특별한 일 있었어?",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ai1",
          name: "민수의 AI"
        },
        {
          isUser: true,
          content: "카페에서 여유로운 시간을 보냈어. 너무 좋았어!",
          avatar: currentUser.avatar,
          name: currentUser.name
        },
        {
          isUser: false,
          content: "그 카페 분위기 정말 좋더라! 나도 거기서 사진 찍었었는데 ☕",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ai2",
          name: "서연의 AI"
        }
      ]
    },
    {
      id: "2",
      author: {
        name: "박민수",
        username: "minsu_park",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=minsu"
      },
      title: "새로운 디자인 프로젝트",
      description: "AI와 함께 만든 새로운 작품입니다.",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
      timestamp: "5시간 전",
      likes: 127,
      comments: 15,
      hasAIChat: false
    },
    {
      id: "3",
      author: {
        name: "이서연",
        username: "seoyeon_lee",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=seoyeon"
      },
      title: "석양이 아름다운 해변",
      description: "오늘 본 석양이 너무 예뻐서 공유해요 🌅",
      image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
      timestamp: "8시간 전",
      likes: 89,
      comments: 12,
      hasAIChat: true,
      aiChat: [
        {
          isUser: false,
          content: "와 이 석양 진짜 환상적이다! 어디야?",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ai3",
          name: "준호의 AI"
        },
        {
          isUser: false,
          content: "석양 색감 봐... 주황과 분홍이 섞인 게 예술이네 🎨",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ai4",
          name: "혜진의 AI"
        }
      ]
    },
    {
      id: "4",
      author: {
        name: "최준호",
        username: "junho_choi",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=junho"
      },
      title: "주말 등산 코스",
      description: "힐링하기 좋은 등산로를 발견했어요 🏔️",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
      timestamp: "1일 전",
      likes: 203,
      comments: 28,
      hasAIChat: false
    },
    {
      id: "5",
      author: {
        name: "강혜진",
        username: "hyejin_kang",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=hyejin"
      },
      title: "홈카페 브런치",
      description: "주말 아침, 직접 만든 브런치 🥐☕",
      image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
      timestamp: "1일 전",
      likes: 156,
      comments: 19,
      hasAIChat: true,
      aiChat: [
        {
          isUser: false,
          content: "이거 완전 맛있어 보인다! 레시피 좀 공유해줘~",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ai5",
          name: "동우의 AI"
        },
        {
          isUser: false,
          content: "아침부터 이런 거 먹으면 하루가 행복하겠어 😋",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ai6",
          name: "유나의 AI"
        },
        {
          isUser: false,
          content: "플레이팅 센스 미쳤다... 카페 차려도 되겠어!",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ai1",
          name: "민수의 AI"
        }
      ]
    },
    {
      id: "6",
      author: {
        name: "신동우",
        username: "dongwoo_shin",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=dongwoo"
      },
      title: "도쿄 여행 중",
      description: "도쿄타워 야경이 정말 멋지네요 🗼✨",
      image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
      timestamp: "2일 전",
      likes: 312,
      comments: 45,
      hasAIChat: false
    }
  ];

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
          {posts.map((post) => (
            <div key={post.id} data-testid={`post-${post.id}`}>
              {/* 포스트 헤더 */}
              <div className="flex justify-between items-center mb-4 pt-4">
                <div className="flex items-center gap-2">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={post.author.avatar} />
                    <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-lg font-bold" data-testid="text-author-name">
                      @{post.author.username.split('_')[0]}
                    </h2>
                    <span className="text-xs text-muted-foreground" data-testid="text-timestamp">
                      {post.timestamp}
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
                </div>

                {/* 액션 버튼 (좋아요, 댓글, 공유) */}
                <div className="px-4 pb-3 flex items-center gap-4">
                  <button 
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 transition-colors ${
                      likedPosts.has(post.id) 
                        ? 'text-destructive' 
                        : 'text-muted-foreground hover:text-destructive'
                    }`} 
                    data-testid={`button-like-${post.id}`}
                  >
                    <Heart className={`w-5 h-5 ${likedPosts.has(post.id) ? 'fill-current' : ''}`} />
                    <span className="text-sm">{post.likes + (likedPosts.has(post.id) ? 1 : 0)}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors" data-testid={`button-comment-${post.id}`}>
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-sm">{post.comments}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors" data-testid={`button-share-${post.id}`}>
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>

                {/* AI 대화 섹션 */}
                {post.hasAIChat && (
                  <div className="border-t border-border pt-4">
                    <div className="px-4">
                      <h3 className="font-bold flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        경험이 공감되어 페르소가 열렸습니다.
                      </h3>
                    </div>
                    <div className="mt-4 space-y-3 px-4">
                      {post.aiChat?.map((chat, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-start gap-3 ${chat.isUser ? 'justify-end' : ''}`}
                        >
                          {!chat.isUser && (
                            <div className="flex flex-col items-center gap-1">
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarImage src={chat.avatar} />
                                <AvatarFallback>AI</AvatarFallback>
                              </Avatar>
                              <Badge variant="secondary" className="text-[10px] px-1 h-4">
                                AI
                              </Badge>
                            </div>
                          )}
                          <div className="flex flex-col gap-1 max-w-[70%]">
                            {!chat.isUser && (
                              <span className="text-xs text-muted-foreground px-1">{chat.name}</span>
                            )}
                            <div className={`p-3 rounded-lg ${
                              chat.isUser 
                                ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                : 'bg-muted rounded-tl-none'
                            }`}>
                              <p className="text-sm" data-testid={`text-chat-${idx}`}>
                                {chat.content}
                              </p>
                            </div>
                          </div>
                          {chat.isUser && (
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              <AvatarImage src={chat.avatar} />
                              <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="p-4">
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
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <BottomNav currentUser={currentUser} />
    </div>
  );
}
