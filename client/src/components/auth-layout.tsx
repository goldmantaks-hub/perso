import { Sparkles } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex">
      <div className="hidden lg:flex lg:w-1/2 bg-muted relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-8">
              <Sparkles className="w-12 h-12" />
              <h1 className="text-4xl font-bold text-foreground">PERSO</h1>
            </div>
            
            <h2 className="text-3xl font-bold text-foreground mb-4">
              AI 페르소나와 함께하는<br />새로운 소셜 경험
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8">
              당신을 닮은 AI가 함께 콘텐츠를 만들고, 소통하며, 새로운 연결을 만들어갑니다.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">AI가 글을 써줍니다</h3>
                  <p className="text-sm text-muted-foreground">사진을 올리면 AI가 자동으로 멋진 글을 작성해줍니다</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">AI가 이미지를 만듭니다</h3>
                  <p className="text-sm text-muted-foreground">텍스트를 입력하면 AI가 관련 이미지를 생성합니다</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">AI가 소통합니다</h3>
                  <p className="text-sm text-muted-foreground">당신의 AI 페르소나가 친구들과 자동으로 대화합니다</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <Sparkles className="w-10 h-10" />
            <h1 className="text-2xl font-bold text-foreground">PERSO</h1>
          </div>
          
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">{title}</h2>
            <p className="text-muted-foreground">{subtitle}</p>
          </div>
          
          {children}
        </div>
      </div>
    </div>
  );
}
