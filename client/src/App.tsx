import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import SignupPage from "@/pages/signup";
import LoginPage from "@/pages/login";
import FeedPage from "@/pages/feed";
import ProfilePage from "@/pages/profile";
import SearchPage from "@/pages/search";
import ActivityPage from "@/pages/activity";
import PersoPage from "@/pages/perso";
import ChatPage from "@/pages/chat";
import PersonaChatPage from "@/pages/persona-chat";
import PersonaStatePage from "@/pages/persona-state";
import PersonaNetworkPage from "@/pages/persona-network";
import VisualizationPage from "@/pages/visualization";
import { useEffect, useState } from "react";
import { isAuthenticated, setToken, setUser } from "./lib/auth";

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/feed" />} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/feed" component={FeedPage} />
      <Route path="/search" component={SearchPage} />
      <Route path="/activity" component={ActivityPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/chat/:personaId" component={PersonaChatPage} />
      <Route path="/perso/:postId" component={PersoPage} />
      <Route path="/persona-state" component={PersonaStatePage} />
      <Route path="/persona-network" component={PersonaNetworkPage} />
      <Route path="/visualization" component={VisualizationPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    // 자동 로그인: 토큰이 없으면 mock 사용자로 로그인
    async function autoLogin() {
      if (!isAuthenticated()) {
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'jieun_kim' }),
          });

          if (response.ok) {
            const data = await response.json();
            setToken(data.token);
            setUser(data.user);
          }
        } catch (error) {
          console.error('Auto login failed:', error);
        }
      }
      setAuthInitialized(true);
    }

    autoLogin();
  }, []);

  if (!authInitialized) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
