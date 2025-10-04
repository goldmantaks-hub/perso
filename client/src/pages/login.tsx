import AuthLayout from "@/components/auth-layout";
import LoginForm from "@/components/login-form";

export default function LoginPage() {
  const handleLogin = async (data: any) => {
    console.log("로그인 데이터:", data);
  };

  return (
    <AuthLayout
      title="로그인"
      subtitle="다시 만나서 반가워요!"
    >
      <LoginForm onSubmit={handleLogin} />
    </AuthLayout>
  );
}
