import SignupForm from '../signup-form';
import { Route } from 'wouter';

export default function SignupFormExample() {
  return (
    <Route path="/">
      <div className="max-w-md mx-auto p-6">
        <SignupForm onSubmit={(data) => console.log('회원가입:', data)} />
      </div>
    </Route>
  );
}
