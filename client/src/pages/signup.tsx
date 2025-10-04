import AuthLayout from "@/components/auth-layout";
import SignupForm from "@/components/signup-form";

export default function SignupPage() {
  const handleSignup = async (data: any) => {
    console.log("회원가입 데이터:", data);
  };

  return (
    <AuthLayout
      title="회원가입"
      subtitle="PERSO에 오신 것을 환영합니다"
    >
      <SignupForm onSubmit={handleSignup} />
    </AuthLayout>
  );
}
