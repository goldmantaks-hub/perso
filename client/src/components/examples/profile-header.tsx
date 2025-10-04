import ProfileHeader from '../profile-header';

export default function ProfileHeaderExample() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <ProfileHeader
        user={{
          name: "김지은",
          username: "jieun_kim",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun",
          bio: "AI와 함께 창작하는 것을 좋아하는 크리에이터입니다 ✨",
          aiPersona: {
            traits: ["창의적", "긍정적", "예술적", "사교적"]
          }
        }}
        stats={{
          posts: 42,
          followers: 1234,
          following: 567
        }}
        isOwnProfile={true}
      />
    </div>
  );
}
