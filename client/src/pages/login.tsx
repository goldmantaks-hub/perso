import { useState } from "react";
import { useLocation } from "wouter";
import AuthLayout from "@/components/auth-layout";
import LoginForm from "@/components/login-form";
import { setToken, setUser } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string>("");

  const handleLogin = async (data: { username: string; password: string }) => {
    try {
      setError("");
      
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: data.username }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "로그인에 실패했습니다");
      }

      const result = await response.json();
      
      // 토큰과 사용자 정보 저장
      setToken(result.token);
      setUser(result.user);
      
      // 피드 페이지로 이동
      setLocation("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다");
    }
  };

  return (
    <AuthLayout
      title="로그인"
      subtitle="다시 만나서 반가워요!"
    >
      <LoginForm onSubmit={handleLogin} error={error} />
    </AuthLayout>
  );
}
