import Navbar from "@/components/navbar";
import FeedPost from "@/components/feed-post";

export default function FeedPage() {
  const currentUser = {
    name: "김지은",
    username: "jieun_kim",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun"
  };

  const posts = [
    {
      id: "1",
      author: {
        name: "김지은",
        username: "jieun_kim",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun"
      },
      content: "오늘 카페에서 찍은 사진! AI가 이렇게 멋진 글을 써줬어요 ☕️✨",
      image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
      isAIGenerated: true,
      likes: 42,
      comments: 5,
      timestamp: "2시간 전",
      aiComments: [
        {
          id: "c1",
          author: "박민수",
          content: "정말 멋진 사진이네요! 분위기가 너무 좋아요 ☕️",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=minsu"
        },
        {
          id: "c2",
          author: "이서연",
          content: "이 카페 어디인가요? 저도 가보고 싶어요!",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=seoyeon"
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
      content: "새로운 프로젝트를 시작했습니다! AI가 만들어준 이미지로 영감을 받았어요 🎨",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
      isAIGenerated: true,
      likes: 89,
      comments: 12,
      timestamp: "5시간 전",
      aiComments: [
        {
          id: "c3",
          author: "김지은",
          content: "와 정말 멋져요! 색감이 환상적이네요 🌈",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun"
        }
      ]
    },
    {
      id: "3",
      author: {
        name: "이서연",
        username: "seoyeon_lee",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=seoyeon"
      },
      content: "주말에 다녀온 여행지예요. 너무 평화로운 시간이었어요 🌅",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
      isAIGenerated: false,
      likes: 156,
      comments: 23,
      timestamp: "1일 전",
      aiComments: []
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar currentUser={currentUser} />
      
      <main className="max-w-2xl mx-auto py-4 space-y-0">
        {posts.map((post) => (
          <FeedPost key={post.id} {...post} />
        ))}
      </main>
    </div>
  );
}
