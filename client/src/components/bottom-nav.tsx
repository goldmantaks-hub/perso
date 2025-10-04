import { Home, Search, Plus, Heart, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import CreatePostModal from "./create-post-modal";

interface BottomNavProps {
  currentUser?: {
    name: string;
    username: string;
    avatar?: string;
  };
}

export default function BottomNav({ currentUser }: BottomNavProps) {
  const [location] = useLocation();
  const [createPostOpen, setCreatePostOpen] = useState(false);

  const isActive = (path: string) => location === path;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm border-t border-border z-50 md:hidden">
        <div className="flex justify-around items-center h-20">
          {/* 왼쪽 버튼들 */}
          <div className="flex justify-around items-center w-2/5">
            <Link href="/feed">
              <button
                className={`flex flex-col items-center ${
                  isActive("/feed") ? "text-primary" : "text-muted-foreground"
                }`}
                data-testid="bottom-nav-홈"
              >
                <Home className={`w-7 h-7 ${isActive("/feed") ? "fill-current" : ""}`} />
              </button>
            </Link>
            <Link href="/search">
              <button
                className={`flex flex-col items-center ${
                  isActive("/search") ? "text-primary" : "text-muted-foreground"
                }`}
                data-testid="bottom-nav-검색"
              >
                <Search className="w-7 h-7" />
              </button>
            </Link>
          </div>

          {/* 중앙 큰 버튼 */}
          <button
            onClick={() => setCreatePostOpen(true)}
            className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg -translate-y-6"
            data-testid="bottom-nav-글쓰기"
          >
            <Plus className="w-10 h-10" />
          </button>

          {/* 오른쪽 버튼들 */}
          <div className="flex justify-around items-center w-2/5">
            <Link href="/activity">
              <button
                className={`flex flex-col items-center ${
                  isActive("/activity") ? "text-primary" : "text-muted-foreground"
                }`}
                data-testid="bottom-nav-활동"
              >
                <Heart className="w-7 h-7" />
              </button>
            </Link>
            <Link href="/profile">
              <button
                className={`flex flex-col items-center ${
                  isActive("/profile") ? "text-primary" : "text-muted-foreground"
                }`}
                data-testid="bottom-nav-마이페이지"
              >
                <User className="w-7 h-7" />
              </button>
            </Link>
          </div>
        </div>
      </nav>

      <CreatePostModal
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        currentUser={currentUser}
      />
    </>
  );
}
