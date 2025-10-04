import BottomNav from '../bottom-nav';
import { Route } from 'wouter';

export default function BottomNavExample() {
  return (
    <Route path="/">
      <div className="pb-20">
        <div className="p-6">
          <p className="text-muted-foreground">하단 네비게이션 바 예시</p>
        </div>
        <BottomNav
          currentUser={{
            name: "김지은",
            username: "jieun_kim",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun"
          }}
        />
      </div>
    </Route>
  );
}
