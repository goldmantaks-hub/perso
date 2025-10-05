import { Link, useLocation } from "wouter";
import { Home, Brain, MessageSquare, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PersonaTabs() {
  const [location] = useLocation();

  const tabs = [
    { path: "/feed", label: "Perso", icon: Home, testId: "tab-perso" },
    { path: "/persona-state", label: "Persona", icon: Brain, testId: "tab-persona" },
    { path: "/chat", label: "Chat", icon: MessageSquare, testId: "tab-chat" },
    { path: "/visualization", label: "Growth", icon: TrendingUp, testId: "tab-growth" },
    { path: "/persona-network", label: "Network", icon: Users, testId: "tab-network" },
  ];

  return (
    <div className="flex items-center gap-2 border-b bg-card px-4">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = location === tab.path;
        
        return (
          <Link key={tab.path} href={tab.path}>
            <Button
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className="gap-2"
              data-testid={tab.testId}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}
