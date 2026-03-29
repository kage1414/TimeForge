import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Box, Card, CardContent, Typography, TextField, Button } from '@mui/material';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext';

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
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2 }}>
      <Box sx={{ maxWidth: 400, width: '100%' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <img src="/logo.png" alt="TimeForge" style={{ height: 64, width: 64, margin: '0 auto 12px' }} />
          <Typography variant="h4" fontWeight="bold" color="primary">TimeForge</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>Create your account</Typography>
        </Box>
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <TextField fullWidth label="Invite Token" required value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)} sx={{ mb: 2 }} />
              <TextField fullWidth label="Email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} />
              <TextField fullWidth label="Name" value={name}
                onChange={(e) => setName(e.target.value)} sx={{ mb: 2 }} />
              <TextField fullWidth label="Password" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)} helperText="Minimum 8 characters" sx={{ mb: 2 }} />
              <TextField fullWidth label="Confirm Password" type="password" required value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} sx={{ mb: 3 }} />
              <Button fullWidth type="submit" variant="contained" disabled={loading} size="large">
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                Already have an account? <Link to="/login" style={{ color: '#4f46e5' }}>Sign in</Link>
              </Typography>
            </form>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
