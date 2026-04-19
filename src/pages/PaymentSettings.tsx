import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, LogIn, UserPlus, CheckCircle, ExternalLink } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const PAYBRIGHT_SANDBOX_URL = import.meta.env.VITE_PAYBRIGHT_SANDBOX_URL || 'https://sandbox.paybrightgateway.com';

export default function PaymentSettings() {
  const navigate = useNavigate();
  const [connected, setConnected] = useState(localStorage.getItem('paybrightConnected') === 'true');

  const handleConnect = () => {
    window.open(PAYBRIGHT_SANDBOX_URL, '_blank');
    localStorage.setItem('paybrightConnected', 'true');
    setConnected(true);
  };

  const handleLogin = () => {
    window.open(`${PAYBRIGHT_SANDBOX_URL}/login`, '_blank');
    localStorage.setItem('paybrightConnected', 'true');
    setConnected(true);
  };

  const handleSignup = () => {
    window.open(`${PAYBRIGHT_SANDBOX_URL}/signup`, '_blank');
  };

  const handleDisconnect = () => {
    localStorage.removeItem('paybrightConnected');
    setConnected(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--navy)', padding: 'var(--space-4)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        paddingTop: 'max(var(--space-4), env(safe-area-inset-top))'
      }}>
        <button
          onClick={() => navigate('/settings')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', padding: '4px' }}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ color: 'white', fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Payment Methods</h1>
      </div>

      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingBottom: '40px' }}>

        {/* PayBright Status Card */}
        {connected ? (
          <Card style={{ padding: 'var(--space-5)', border: '2px solid var(--success)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CheckCircle size={24} color="var(--success)" />
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>PayBright Connected</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: '600' }}>Sandbox environment active</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Button
                variant="outline"
                fullWidth
                icon={<ExternalLink size={16} />}
                onClick={() => window.open(PAYBRIGHT_SANDBOX_URL, '_blank')}
              >
                Open PayBright Portal
              </Button>
              <button
                onClick={handleDisconnect}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--danger)', fontSize: '0.82rem', fontWeight: '600',
                  padding: 'var(--space-2)', fontFamily: 'inherit'
                }}
              >
                Disconnect PayBright
              </button>
            </div>
          </Card>
        ) : (
          <Card style={{ padding: 'var(--space-5)', border: '2px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <CreditCard size={22} color="var(--primary)" />
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>PayBright</div>
                  <span style={{ fontSize: '0.65rem', fontWeight: '800', background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '9999px' }}>SANDBOX</span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-5)' }}>
              Connect your PayBright account to enable secure payment processing on TradesOn.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Button variant="primary" fullWidth icon={<LogIn size={18} />} onClick={handleLogin}>
                Log In to PayBright
              </Button>
              <Button variant="outline" fullWidth icon={<UserPlus size={18} />} onClick={handleSignup}>
                Create a PayBright Account
              </Button>
              <Button variant="outline" fullWidth icon={<ExternalLink size={16} />} onClick={handleConnect}>
                Open PayBright Sandbox
              </Button>
            </div>
          </Card>
        )}

        {/* Sandbox credentials info */}
        <Card style={{ padding: 'var(--space-4)', background: 'var(--bg-surface)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
            Sandbox Credentials
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[
              { label: 'Environment', value: 'Sandbox (Test)' },
              { label: 'Portal URL', value: 'sandbox.paybrightgateway.com' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{row.label}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{row.value}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-3)', margin: 'var(--space-3) 0 0' }}>
            Use the sandbox credentials provided by your PayBright account manager for testing.
          </p>
        </Card>
      </div>
    </div>
  );
}
