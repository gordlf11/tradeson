import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { TradesOnIcon } from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      // login() now waits for profile fetch to complete
      // Navigate to role-selection — it will redirect to dashboard if onboarding is done
      navigate('/role-selection');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      padding: 'var(--space-4)'
    }}>
      {/* Logo Section */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
          <TradesOnIcon size={72} variant="icon-light" />
        </div>
        <h1 style={{
          fontSize: '2rem',
          color: 'var(--text-primary)',
          fontWeight: '700',
          marginBottom: '0.25rem'
        }}>
          TradesOn
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Your trusted home services marketplace
        </p>
      </div>

      {/* Login Card */}
      <Card elevated className="animate-slideUp" style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>Welcome Back</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', fontSize: '0.9rem' }}>
          Sign in to continue to your account
        </p>

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <Input
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail size={18} />}
              required
            />
          </div>

          <div className="mb-4">
            <Input
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock size={18} />}
              required
            />
          </div>

          {error && (
            <div style={{
              padding: 'var(--space-3)',
              background: 'rgba(255, 74, 107, 0.1)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--danger)',
              fontSize: '0.875rem',
              marginBottom: 'var(--space-4)'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', gap: 'var(--space-4)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer', flexShrink: 0 }}>
              <input type="checkbox" style={{ margin: 0, flexShrink: 0 }} />
              Remember me
            </label>
            <Link to="/forgot-password" style={{
              color: 'var(--primary)',
              fontSize: '0.875rem',
              textDecoration: 'none',
              flexShrink: 0,
            }}>
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            icon={!isLoading ? <ArrowRight size={20} /> : undefined}
          >
            Sign In
          </Button>
        </form>

        <div style={{
          marginTop: 'var(--space-6)',
          paddingTop: 'var(--space-6)',
          borderTop: '1px solid var(--border)',
          textAlign: 'center'
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{
              color: 'var(--primary)',
              fontWeight: 600,
              textDecoration: 'none'
            }}>
              Create Account
            </Link>
          </p>
        </div>
      </Card>

      <p className="text-center mt-4" style={{
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)'
      }}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
}
