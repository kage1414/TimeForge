import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext';
import {
  TFButton,
  TFCard,
  TFField,
  TFInput,
  TFLink,
} from '../components/tf';

export default function SignupPage() {
  const { signup } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteToken, setInviteToken] = useState(searchParams.get('token') || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await signup(email, password, name, inviteToken);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="TimeForge" className="h-16 w-16 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-indigo-600">TimeForge</h1>
          <p className="text-gray-500 mt-2">Create your account</p>
        </div>
        <TFCard padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <TFField label="Invite Token" required htmlFor="signup-invite">
              <TFInput
                id="signup-invite"
                required
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
              />
            </TFField>
            <TFField label="Email" required htmlFor="signup-email">
              <TFInput
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </TFField>
            <TFField label="Name" htmlFor="signup-name">
              <TFInput
                id="signup-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </TFField>
            <TFField label="Password" required hint="Minimum 8 characters" htmlFor="signup-password">
              <TFInput
                id="signup-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </TFField>
            <TFField label="Confirm Password" required htmlFor="signup-confirm">
              <TFInput
                id="signup-confirm"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </TFField>
            <TFButton type="submit" disabled={loading} block>
              {loading ? 'Creating account...' : 'Create Account'}
            </TFButton>
            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <TFLink asChild>
                <Link to="/login">Sign in</Link>
              </TFLink>
            </p>
          </form>
        </TFCard>
      </div>
    </div>
  );
}
