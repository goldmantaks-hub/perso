import FeedPost from '../feed-post';

export default function FeedPostExample() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <FeedPost
        id="1"
        author={{
          name: "김지은",
          username: "jieun_kim",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun"
        }}
        content="오늘 카페에서 찍은 사진! AI가 이렇게 멋진 글을 써줬어요 ☕️✨"
        image="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80"
        isAIGenerated={true}
        likes={42}
        comments={5}
        timestamp="2시간 전"
        aiComments={[
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
        ]}
      />
    </div>
  );
}
