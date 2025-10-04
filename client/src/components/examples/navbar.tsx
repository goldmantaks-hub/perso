import Navbar from '../navbar';
import { Route } from 'wouter';

export default function NavbarExample() {
  return (
    <Route path="/">
      <div>
        <Navbar
          currentUser={{
            name: "김지은",
            username: "jieun_kim",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jieun"
          }}
        />
        <div className="p-6">
          <p className="text-muted-foreground">네비게이션 바 예시</p>
        </div>
      </div>
    </Route>
  );
}
