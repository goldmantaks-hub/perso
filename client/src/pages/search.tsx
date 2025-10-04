import { useState } from "react";
import Navbar from "@/components/navbar";
import BottomNav from "@/components/bottom-nav";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function SearchPage() {
  const currentUser = {
    name: "김지은",
    username: "jieun_kim",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun"
  };

  const [searchQuery, setSearchQuery] = useState("");

  const suggestedUsers = [
    {
      name: "박민수",
      username: "minsu_park",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=minsu",
      bio: "디자이너 | 크리에이터"
    },
    {
      name: "이서연",
      username: "seoyeon_lee",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=seoyeon",
      bio: "여행 좋아하는 사람 ✈️"
    },
    {
      name: "최준호",
      username: "junho_choi",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=junho",
      bio: "개발자 | AI 애호가"
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navbar currentUser={currentUser} />
      
      <main className="max-w-2xl mx-auto px-4 py-4">
        <div className="mb-6">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-muted border-0"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-4">추천 사용자</h2>
            <div className="space-y-4">
              {suggestedUsers.map((user) => (
                <div key={user.username} className="flex items-center gap-3" data-testid={`user-${user.username}`}>
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold" data-testid="text-user-name">{user.name}</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-user-bio">{user.bio}</p>
                  </div>
                  <Button variant="outline" size="sm" data-testid="button-follow">
                    팔로우
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <BottomNav currentUser={currentUser} />
    </div>
  );
}
