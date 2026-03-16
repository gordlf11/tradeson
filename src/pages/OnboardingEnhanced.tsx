import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Wrench, Mail, Lock, ArrowRight, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

export default function OnboardingEnhanced() {
  const [role, setRole] = useState<'homeowner' | 'tradesperson'>('homeowner');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleContinue = () => {
    setIsLoading(true);
    setTimeout(() => {
      if (role === 'homeowner') {
        navigate('/job-creation');
      } else {
        navigate('/job-board');
      }
    }, 1000);
  };

  const features = [
    'AI-powered job matching',
    'Instant price estimates',
    'Verified professionals',
    'Secure payments'
  ];

  return (
    <div className="page-container" style={{ 
      justifyContent: 'center', 
      paddingBottom: 'var(--space-4)',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--bg-base) 0%, var(--bg-surface) 100%)'
    }}>
      <div className="text-center mb-8 animate-slideDown">
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
          borderRadius: 'var(--radius-lg)',
          margin: '0 auto var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <Wrench size={40} color="white" />
        </div>
        <h1 style={{ 
          fontSize: '2.5rem',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--success) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '0.5rem' 
        }}>
          TradesOn
        </h1>
        <p style={{ fontSize: '1.1rem' }}>Your premium home services marketplace</p>
      </div>

      <Card elevated className="animate-slideUp" style={{ maxWidth: '400px', margin: '0 auto' }}>
        <h2 className="text-center" style={{ fontSize: '1.5rem', marginBottom: 'var(--space-6)' }}>
          Create Your Account
        </h2>
        
        <div className="mb-6">
          <label style={{ marginBottom: 'var(--space-3)', display: 'block' }}>I am a...</label>
          <div className="flex flex-col gap-3">
            
            {/* Homeowner Option */}
            <div 
              onClick={() => setRole('homeowner')}
              style={{
                padding: 'var(--space-4)',
                border: `2px solid ${role === 'homeowner' ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                cursor: 'pointer',
                backgroundColor: role === 'homeowner' ? 'var(--primary-light)' : 'var(--bg-surface-elevated)',
                transition: 'var(--transition)',
                position: 'relative'
              }}
            >
              {role === 'homeowner' && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '20px',
                  height: '20px',
                  background: 'var(--primary)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Check size={12} color="white" />
                </div>
              )}
              <div style={{
                background: role === 'homeowner' ? 'var(--primary)' : 'var(--bg-base)',
                padding: '12px',
                borderRadius: 'var(--radius-full)',
                color: role === 'homeowner' ? 'white' : 'var(--text-secondary)',
                transition: 'var(--transition)'
              }}>
                <User size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Homeowner</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  I need to hire a professional
                </div>
              </div>
            </div>

            {/* Tradesperson Option */}
            <div 
              onClick={() => setRole('tradesperson')}
              style={{
                padding: 'var(--space-4)',
                border: `2px solid ${role === 'tradesperson' ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                cursor: 'pointer',
                backgroundColor: role === 'tradesperson' ? 'var(--primary-light)' : 'var(--bg-surface-elevated)',
                transition: 'var(--transition)',
                position: 'relative'
              }}
            >
              {role === 'tradesperson' && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '20px',
                  height: '20px',
                  background: 'var(--primary)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Check size={12} color="white" />
                </div>
              )}
              <div style={{
                background: role === 'tradesperson' ? 'var(--primary)' : 'var(--bg-base)',
                padding: '12px',
                borderRadius: 'var(--radius-full)',
                color: role === 'tradesperson' ? 'white' : 'var(--text-secondary)',
                transition: 'var(--transition)'
              }}>
                <Wrench size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>Tradesperson</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  I want to find local jobs
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <Input
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={18} />}
          />
        </div>

        <div className="mb-6">
          <Input
            type="password"
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={18} />}
          />
        </div>

        <Button 
          variant="primary" 
          size="lg" 
          fullWidth
          onClick={handleContinue}
          loading={isLoading}
          icon={!isLoading ? <ArrowRight size={20} /> : undefined}
        >
          Continue as {role === 'homeowner' ? 'Homeowner' : 'Tradesperson'}
        </Button>

        <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 'var(--space-3)' }}>
            Why choose TradesOn?
          </p>
          <div className="flex flex-col gap-2">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2" style={{ fontSize: '0.875rem' }}>
                <Check size={16} color="var(--success)" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <p className="text-center mt-6" style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  );
}