import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Card, CardContent, Typography, TextField, Button } from '@mui/material';
import toast from 'react-hot-toast';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
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
          <Typography color="text.secondary" sx={{ mt: 1 }}>Sign in to your account</Typography>
        </Box>
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <TextField fullWidth label="Email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }} />
              <TextField fullWidth label="Password" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)} sx={{ mb: 3 }} />
              <Button fullWidth type="submit" variant="contained" disabled={loading} size="large">
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                Have an invite? <Link to="/signup" style={{ color: '#4f46e5' }}>Create an account</Link>
              </Typography>
            </form>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
