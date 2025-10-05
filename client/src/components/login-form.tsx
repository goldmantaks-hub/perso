import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Lock, LogIn } from "lucide-react";
import { Link } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "사용자명을 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit?: (data: LoginFormData) => Promise<void>;
  error?: string;
}

export default function LoginForm({ onSubmit, error }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    }
  });

  const handleFormSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    
    try {
      if (onSubmit) {
        await onSubmit(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20" data-testid="error-message">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium">
            사용자명
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              id="username"
              type="text"
              placeholder="사용자명을 입력하세요"
              className="pl-10 h-12"
              data-testid="input-username"
              {...register("username")}
            />
          </div>
          {errors.username && (
            <p className="text-sm text-destructive" data-testid="error-username">
              {errors.username.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">
              비밀번호
            </Label>
            <button 
              type="button"
              className="text-sm text-primary hover:underline"
              data-testid="link-forgot-password"
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="pl-10 h-12"
              data-testid="input-password"
              {...register("password")}
            />
          </div>
          {errors.password && (
            <p className="text-sm text-destructive" data-testid="error-password">
              {errors.password.message}
            </p>
          )}
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full h-12 text-base font-semibold"
        disabled={isLoading}
        data-testid="button-login"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            로그인 중...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <LogIn className="w-4 h-4" />
            로그인
          </div>
        )}
      </Button>

      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-primary font-medium hover:underline" data-testid="link-signup">
            회원가입
          </Link>
        </p>
      </div>
    </form>
  );
}
