import { useState } from "react";
import { Sparkles, Home, PlusCircle, User, LogOut, Moon, Sun } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  currentUser?: {
    name: string;
    username: string;
    avatar?: string;
  };
}

export default function Navbar({ currentUser }: NavbarProps) {
  const [location, setLocation] = useLocation();
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-background border-b border-border hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/feed" className="flex items-center gap-2" data-testid="link-home">
              <Sparkles className="w-7 h-7" />
              <span className="text-xl font-bold">PERSO</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link href="/feed">
                <Button
                  variant={location === "/feed" ? "secondary" : "ghost"}
                  size="icon"
                  data-testid="button-nav-home"
                >
                  <Home className="w-5 h-5" />
                </Button>
              </Link>

              <Link href="/create">
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid="button-nav-create"
                >
                  <PlusCircle className="w-5 h-5" />
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                data-testid="button-theme-toggle"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 w-9 rounded-full p-0" data-testid="button-user-menu">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={currentUser?.avatar} alt={currentUser?.name} />
                      <AvatarFallback>{currentUser?.name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-semibold">{currentUser?.name}</p>
                    <p className="text-xs text-muted-foreground">@{currentUser?.username}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex w-full items-center" data-testid="menu-item-profile">
                      <User className="mr-2 h-4 w-4" />
                      프로필
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" data-testid="menu-item-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
