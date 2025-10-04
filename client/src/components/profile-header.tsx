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
    <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
      <div className="h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>
      </div>

      <div className="px-6 pb-6">
        <div className="flex items-end justify-between -mt-12 mb-4">
          <Avatar className="w-24 h-24 border-4 border-background ring-2 ring-offset-2 ring-primary/20">
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
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">AI 페르소나</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.aiPersona.traits.map((trait, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/20"
                    data-testid={`badge-trait-${index}`}
                  >
                    {trait}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-6 pt-4 border-t border-card-border">
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
