import { Home, Search, PlusCircle, Bell, User } from "lucide-react";
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

  const navItems = [
    { path: "/feed", icon: Home, label: "홈" },
    { path: "/search", icon: Search, label: "검색" },
    { path: null, icon: PlusCircle, label: "글쓰기", action: () => setCreatePostOpen(true) },
    { path: "/activity", icon: Bell, label: "활동" },
    { path: "/profile", icon: User, label: "마이페이지" },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 md:hidden">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item, index) => {
            const isActive = location === item.path;
            const Icon = item.icon;

            if (item.action) {
              return (
                <button
                  key={index}
                  onClick={item.action}
                  className="flex flex-col items-center justify-center flex-1 h-full gap-0.5"
                  data-testid={`bottom-nav-${item.label}`}
                >
                  <Icon className="w-6 h-6" />
                </button>
              );
            }

            return (
              <Link key={index} href={item.path!}>
                <button
                  className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                  data-testid={`bottom-nav-${item.label}`}
                >
                  <Icon className={`w-6 h-6 ${isActive ? "fill-current" : ""}`} />
                </button>
              </Link>
            );
          })}
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
