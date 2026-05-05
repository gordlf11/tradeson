import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Shield } from 'lucide-react';
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
  const [mode, setMode] = useState<'user' | 'admin'>('user');
  const navigate = useNavigate();
  const { login } = useAuth();

  // Only purge demo state. Preserve userRole + hasOnboarded so real users
  // can resume after re-login when the API is briefly unavailable —
  // otherwise they'd be kicked back to /role-selection and forced to redo
  // onboarding every time. (Trade-off: a different user signing in on a
  // shared device would inherit the prior user's local fallback. If
  // multi-user-per-device becomes real, gate this on a stored UID match.)
  useEffect(() => {
    if (localStorage.getItem('demoMode') === 'true') {
      localStorage.removeItem('demoMode');
      localStorage.removeItem('userRole');
      localStorage.removeItem('hasOnboarded');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const profile = await login(email, password);

      // Admin always routes directly to the admin dashboard
      if (profile?.role === 'admin') {
        navigate('/dashboard/admin');
        return;
      }

      // PG profile present — DashboardRedirect routes to the right dashboard
      if (profile) {
        navigate('/dashboard');
        return;
      }

      // No PG profile (API down or row not yet created). Trust the local
      // hasOnboarded flag if set so users aren't bounced back through
      // role-selection on every API hiccup.
      if (localStorage.getItem('hasOnboarded') === 'true' && localStorage.getItem('userRole')) {
        navigate('/dashboard');
      } else {
        navigate('/role-selection');
      }
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
          <TradesOnIcon size={103} variant="icon-light" />
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

      {/* User / Admin toggle */}
      <div style={{
        display: 'flex', gap: '4px', padding: '4px',
        background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)', maxWidth: '400px', margin: '0 auto var(--space-4)',
        width: '100%',
      }}>
        {(['user', 'admin'] as const).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(''); }}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)',
              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '0.85rem', fontWeight: '700', transition: 'all 0.15s',
              background: mode === m ? (m === 'admin' ? 'var(--navy)' : 'var(--primary)') : 'transparent',
              color: mode === m ? 'white' : 'var(--text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            {m === 'admin' && <Shield size={14} />}
            {m === 'user' ? 'User Login' : 'Admin Login'}
          </button>
        ))}
      </div>

      {/* Login Card */}
      <Card elevated className="animate-slideUp" style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
        {mode === 'admin' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(0,28,60,0.06)', borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-3)', marginBottom: 'var(--space-4)',
            border: '1px solid var(--navy)',
          }}>
            <Shield size={16} color="var(--navy)" />
            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--navy)' }}>
              Admin Portal — Restricted Access
            </span>
          </div>
        )}

        <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>
          {mode === 'admin' ? 'Admin Sign In' : 'Welcome Back'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', fontSize: '0.9rem' }}>
          {mode === 'admin' ? 'Sign in to access the admin control center' : 'Sign in to continue to your account'}
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
            style={mode === 'admin' ? { background: 'var(--navy)' } : undefined}
          >
            {mode === 'admin' ? 'Sign In to Admin' : 'Sign In'}
          </Button>
        </form>

        {mode === 'user' && (
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
        )}
      </Card>

      <p className="text-center mt-4" style={{
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)'
      }}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>

      {/* Demo mode — for previewing all screens without an account */}
      <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
        <button
          onClick={() => navigate('/demo')}
          style={{
            background: 'none', border: '1.5px solid var(--border)',
            borderRadius: '20px', padding: '8px 20px',
            fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)',
            cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.02em',
          }}
        >
          View Demo — Flip through all screens
        </button>
      </div>
    </div>
  );
}
