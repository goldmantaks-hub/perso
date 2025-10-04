import LoginForm from '../login-form';
import { Route } from 'wouter';

export default function LoginFormExample() {
  return (
    <Route path="/">
      <div className="max-w-md mx-auto p-6">
        <LoginForm onSubmit={(data) => console.log('로그인:', data)} />
      </div>
    </Route>
  );
}
