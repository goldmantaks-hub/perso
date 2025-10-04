import { Sparkles, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProfileHeaderProps {
  user: {
    name: string;
    username: string;
    avatar?: string;
    bio?: string;
    aiPersona?: {
      traits: string[];
    };
  };
  stats: {
    posts: number;
    followers: number;
    following: number;
  };
  isOwnProfile?: boolean;
}

export default function ProfileHeader({ user, stats, isOwnProfile = false }: ProfileHeaderProps) {
  return (
    <div className="border-b border-border pb-6">
      <div className="pt-6 px-4">
        <div className="flex items-start justify-between mb-4">
          <Avatar className="w-20 h-20 border-2 border-border">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-2xl">{user.name[0]}</AvatarFallback>
          </Avatar>

          {isOwnProfile && (
            <Button variant="outline" className="gap-2" data-testid="button-edit-profile">
              <Settings className="w-4 h-4" />
              프로필 편집
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <h1 className="text-2xl font-bold mb-1" data-testid="text-profile-name">{user.name}</h1>
            <p className="text-muted-foreground" data-testid="text-profile-username">@{user.username}</p>
          </div>

          {user.bio && (
            <p className="text-card-foreground leading-relaxed" data-testid="text-profile-bio">
              {user.bio}
            </p>
          )}

          {user.aiPersona && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-semibold">AI 페르소나</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.aiPersona.traits.map((trait, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    data-testid={`badge-trait-${index}`}
                  >
                    {trait}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-6 pt-4">
            <div className="text-center" data-testid="stat-posts">
              <p className="text-xl font-bold">{stats.posts}</p>
              <p className="text-sm text-muted-foreground">게시물</p>
            </div>
            <div className="text-center" data-testid="stat-followers">
              <p className="text-xl font-bold">{stats.followers}</p>
              <p className="text-sm text-muted-foreground">팔로워</p>
            </div>
            <div className="text-center" data-testid="stat-following">
              <p className="text-xl font-bold">{stats.following}</p>
              <p className="text-sm text-muted-foreground">팔로잉</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
