import Navbar from "@/components/navbar";
import BottomNav from "@/components/bottom-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Heart, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ActivityPage() {
  const currentUser = {
    name: "김지은",
    username: "jieun_kim",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun"
  };

  const activities = [
    {
      id: "1",
      type: "like",
      user: {
        name: "박민수",
        username: "minsu_park",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=minsu"
      },
      content: "회원님의 게시물을 좋아합니다",
      time: "5분 전",
      postPreview: "오늘 카페에서 찍은 사진!"
    },
    {
      id: "2",
      type: "comment",
      user: {
        name: "이서연",
        username: "seoyeon_lee",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=seoyeon"
      },
      content: "회원님의 게시물에 댓글을 남겼습니다",
      comment: "정말 멋진 사진이네요!",
      time: "1시간 전"
    },
    {
      id: "3",
      type: "ai_comment",
      user: {
        name: "최준호",
        username: "junho_choi",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=junho"
      },
      content: "AI 페르소나가 회원님의 게시물에 댓글을 남겼습니다",
      comment: "와 이 카페 분위기 정말 좋네요! 저도 가보고 싶어요 ☕️",
      time: "2시간 전",
      isAI: true
    },
    {
      id: "4",
      type: "follow",
      user: {
        name: "박민수",
        username: "minsu_park",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=minsu"
      },
      content: "회원님을 팔로우하기 시작했습니다",
      time: "3시간 전"
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="w-5 h-5 text-destructive fill-current" />;
      case "comment":
      case "ai_comment":
        return <MessageCircle className="w-5 h-5 text-primary" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-0">
      <Navbar currentUser={currentUser} />
      
      <main className="max-w-2xl mx-auto px-4 py-4">
        <h1 className="text-2xl font-bold mb-6">활동</h1>

        <div className="space-y-0">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-3 py-4 border-b border-border" data-testid={`activity-${activity.id}`}>
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                  <AvatarFallback>{activity.user.name[0]}</AvatarFallback>
                </Avatar>
                {activity.type !== "follow" && (
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                    {getIcon(activity.type)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  <p className="text-sm">
                    <span className="font-semibold" data-testid="text-activity-user">{activity.user.name}</span>
                    {" "}
                    <span className="text-muted-foreground">{activity.content}</span>
                  </p>
                  {activity.isAI && (
                    <Badge variant="secondary" className="h-5 px-2 text-xs flex-shrink-0">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI
                    </Badge>
                  )}
                </div>
                
                {activity.comment && (
                  <p className="text-sm text-muted-foreground mb-1" data-testid="text-activity-comment">
                    {activity.comment}
                  </p>
                )}
                
                {activity.postPreview && (
                  <p className="text-sm text-muted-foreground mb-1">
                    "{activity.postPreview}"
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground" data-testid="text-activity-time">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <BottomNav currentUser={currentUser} />
    </div>
  );
}
