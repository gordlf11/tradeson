import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Briefcase, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.acceptTerms) {
      setError('Please accept the terms and conditions');
      return;
    }

    setIsLoading(true);

    // Simulate signup - in production, this would call an auth API
    setTimeout(() => {
      // Store user session (mock)
      localStorage.setItem('userEmail', formData.email);
      localStorage.setItem('userName', formData.name);
      localStorage.setItem('isAuthenticated', 'true');
      
      // Navigate to role selection
      navigate('/role-selection');
      setIsLoading(false);
    }, 1500);
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
      <div className="text-center mb-6">
        <div style={{
          width: '72px',
          height: '72px',
          background: 'var(--primary)',
          borderRadius: 'var(--radius-lg)',
          margin: '0 auto var(--space-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Briefcase size={36} color="white" />
        </div>
        <h1 style={{
          fontSize: '1.75rem',
          color: 'var(--text-primary)',
          fontWeight: '700'
        }}>
          Create Account
        </h1>
      </div>

      {/* Signup Card */}
      <Card elevated className="animate-slideUp" style={{ maxWidth: '420px', margin: '0 auto', width: '100%' }}>
        <div className="mb-6">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Get Started</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Join thousands of homeowners and tradespeople
          </p>
        </div>

        <form onSubmit={handleSignup}>
          <div className="mb-4">
            <Input
              type="text"
              label="Full Name"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              icon={<User size={18} />}
              required
            />
          </div>

          <div className="mb-4">
            <Input
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              icon={<Mail size={18} />}
              required
            />
          </div>

          <div className="mb-4">
            <Input
              type="password"
              label="Password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              icon={<Lock size={18} />}
              required
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              Must be at least 8 characters
            </p>
          </div>

          <div className="mb-4">
            <Input
              type="password"
              label="Confirm Password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
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

          <div className="mb-6">
            <label style={{
              display: 'flex',
              alignItems: 'flex-start',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={(e) => setFormData({...formData, acceptTerms: e.target.checked})}
                style={{ marginRight: '8px', marginTop: '2px' }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>
                I agree to the{' '}
                <Link to="/terms" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link to="/privacy" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isLoading}
            icon={!isLoading ? <ArrowRight size={20} /> : undefined}
          >
            Create Account
          </Button>
        </form>

        {/* Benefits */}
        <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
            Why join TradesOn?
          </p>
          <div className="flex flex-col gap-2">
            {[
              'Verified professionals only',
              'AI-powered job matching',
              'Secure payment protection',
              'Instant price estimates'
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-2" style={{ fontSize: '0.8rem' }}>
                <Check size={14} color="var(--success)" />
                <span style={{ color: 'var(--text-primary)' }}>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          marginTop: 'var(--space-4)',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--border)',
          textAlign: 'center'
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{
              color: 'var(--primary)',
              fontWeight: 600,
              textDecoration: 'none'
            }}>
              Sign In
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}