import AuthLayout from '../auth-layout';
import { Button } from '@/components/ui/button';

export default function AuthLayoutExample() {
  return (
    <AuthLayout 
      title="회원가입" 
      subtitle="PERSO에 오신 것을 환영합니다"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">예시 콘텐츠가 여기에 들어갑니다</p>
        <Button className="w-full">시작하기</Button>
      </div>
    </AuthLayout>
  );
}
