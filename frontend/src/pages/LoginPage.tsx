import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  TFButton,
  TFCard,
  TFField,
  TFInput,
  TFLink,
} from '../components/tf';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
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
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>
        <TFCard padding="lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <TFField label="Email" htmlFor="login-email">
              <TFInput
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </TFField>
            <TFField label="Password" htmlFor="login-password">
              <TFInput
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </TFField>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </p>
            )}
            <TFButton type="submit" disabled={loading} block>
              {loading ? 'Signing in...' : 'Sign In'}
            </TFButton>
            <p className="text-center text-sm text-gray-500">
              Have an invite?{' '}
              <TFLink asChild>
                <Link to="/signup">Create an account</Link>
              </TFLink>
            </p>
          </form>
        </TFCard>
      </div>
    </div>
  );
}
