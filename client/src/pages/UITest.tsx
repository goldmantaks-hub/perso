import UITestPanel from "@/components/UITestPanel";

export default function UITest() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            UI 테스트 페이지
          </h1>
          <p className="text-muted-foreground">
            페르소나 색상, 애니메이션, 툴팁 기능을 테스트할 수 있습니다.
          </p>
        </div>
        
        <UITestPanel />
      </div>
    </div>
  );
}
