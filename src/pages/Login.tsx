import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { TradesOnIcon } from '../components/Logo';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate login - in production, this would call an auth API
    setTimeout(() => {
      if (email && password) {
        // TEMPORARY: Clear any existing state for testing
        localStorage.clear();
        
        // Store user session (mock)
        localStorage.setItem('userEmail', email);
        localStorage.setItem('isAuthenticated', 'true');
        
        // FORCE ROUTE TO ROLE SELECTION FOR TESTING
        console.log('TESTING MODE: Always routing to role selection');
        navigate('/role-selection');
      } else {
        setError('Please enter both email and password');
      }
      setIsLoading(false);
    }, 1000);
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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'nowrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <input type="checkbox" style={{ margin: 0, flexShrink: 0 }} />
              Remember me
            </label>
            <Link to="/forgot-password" style={{
              color: 'var(--primary)',
              fontSize: '0.875rem',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
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

      {/* Dev Tool - Remove in production */}
      <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
        <div style={{ 
          fontSize: '0.7rem', 
          color: 'var(--text-tertiary)', 
          marginBottom: '8px',
          fontFamily: 'monospace'
        }}>
          Debug: userRole={localStorage.getItem('userRole')} | hasOnboarded={localStorage.getItem('hasOnboarded')}
        </div>
        <button
          onClick={() => {
            console.log('Clearing localStorage:', {
              userRole: localStorage.getItem('userRole'),
              hasOnboarded: localStorage.getItem('hasOnboarded'),
              userEmail: localStorage.getItem('userEmail')
            });
            localStorage.clear();
            window.location.reload();
          }}
          style={{
            background: 'var(--danger-light)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '6px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          🗑️ Reset User State (Dev)
        </button>
      </div>

      <p className="text-center mt-4" style={{
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)'
      }}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
}