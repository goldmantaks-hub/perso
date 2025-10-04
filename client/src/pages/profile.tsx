import Navbar from "@/components/navbar";
import BottomNav from "@/components/bottom-nav";
import ProfileHeader from "@/components/profile-header";
import FeedPost from "@/components/feed-post";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfilePage() {
  const currentUser = {
    name: "김지은",
    username: "jieun_kim",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun"
  };

  const profileData = {
    user: {
      name: "김지은",
      username: "jieun_kim",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun",
      bio: "AI와 함께 창작하는 것을 좋아하는 크리에이터입니다 ✨",
      aiPersona: {
        traits: ["창의적", "긍정적", "예술적", "사교적"]
      }
    },
    stats: {
      posts: 42,
      followers: 1234,
      following: 567
    }
  };

  const userPosts = [
    {
      id: "1",
      author: currentUser,
      content: "오늘 카페에서 찍은 사진! AI가 이렇게 멋진 글을 써줬어요 ☕️✨",
      image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
      isAIGenerated: true,
      likes: 42,
      comments: 5,
      timestamp: "2시간 전",
      aiComments: []
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar currentUser={currentUser} />
      
      <main className="max-w-2xl mx-auto py-4 space-y-0">
        <ProfileHeader {...profileData} isOwnProfile={true} />

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="posts" data-testid="tab-posts">게시물</TabsTrigger>
            <TabsTrigger value="ai-activity" data-testid="tab-ai-activity">AI 활동</TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="space-y-6 mt-6">
            {userPosts.map((post) => (
              <FeedPost key={post.id} {...post} />
            ))}
          </TabsContent>
          
          <TabsContent value="ai-activity" className="mt-6">
            <div className="text-center py-12 text-muted-foreground">
              AI 페르소나의 활동 내역이 여기에 표시됩니다
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav currentUser={currentUser} />
    </div>
  );
}
