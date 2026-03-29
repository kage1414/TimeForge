import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { gql } from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, inviteToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }
    gql<{ me: User | null }>('query { me { id email name role created_at } }')
      .then(({ me }) => {
        setUser(me);
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { login: result } = await gql<{ login: { token: string; user: User } }>(
      'mutation($input: LoginInput!) { login(input: $input) { token user { id email name role created_at } } }',
      { input: { email, password } }
    );
    localStorage.setItem('auth_token', result.token);
    setUser(result.user);
    navigate('/');
  };

  const signup = async (email: string, password: string, name: string, inviteToken: string) => {
    const { signup: result } = await gql<{ signup: { token: string; user: User } }>(
      'mutation($input: SignupInput!) { signup(input: $input) { token user { id email name role created_at } } }',
      { input: { email, password, name: name || null, invite_token: inviteToken } }
    );
    localStorage.setItem('auth_token', result.token);
    setUser(result.user);
    navigate('/');
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    qc.clear();
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: user?.role === 'admin', login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
