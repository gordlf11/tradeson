import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import api from '../services/api';

export default function PaymentSettings() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || '';
  const isTrader = userRole === 'licensed-trade' || userRole === 'non-licensed-trade';

  const [connectStatus, setConnectStatus] = useState<{ account_id: string | null; payout_enabled: boolean } | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [statusLoading, setStatusLoading] = useState(isTrader);

  useEffect(() => {
    if (!isTrader) return;
    api.getConnectStatus()
      .then((data: any) => setConnectStatus(data))
      .catch(() => setConnectStatus({ account_id: null, payout_enabled: false }))
      .finally(() => setStatusLoading(false));
  }, [isTrader]);

  const handleConnectPayout = async () => {
    setConnectLoading(true);
    setConnectError('');
    try {
      const data = await api.createConnectAccount() as { onboarding_url: string };
      window.open(data.onboarding_url, '_blank');
      // Refresh status after returning
      setTimeout(async () => {
        const updated: any = await api.getConnectStatus().catch(() => null);
        if (updated) setConnectStatus(updated);
      }, 3000);
    } catch (err: any) {
      setConnectError(err.message || 'Failed to start payout setup');
    } finally {
      setConnectLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--navy)', padding: 'var(--space-4)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        paddingTop: 'max(var(--space-4), env(safe-area-inset-top))',
      }}>
        <button
          onClick={() => navigate('/settings')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', padding: '4px' }}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ color: 'white', fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Payment & Payouts</h1>
      </div>

      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingBottom: '40px' }}>

        {/* Subscription info */}
        <Card style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
              background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CreditCard size={22} color="var(--primary)" />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>TradesOn Membership</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Powered by Stripe</div>
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
            Manage your subscription at any time. Billing is handled securely through Stripe.
          </p>
        </Card>

        {/* Stripe Connect payout section — tradespeople only */}
        {isTrader && (
          <Card style={{
            padding: 'var(--space-5)',
            border: connectStatus?.payout_enabled
              ? '2px solid var(--success)'
              : '2px solid var(--primary)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                background: connectStatus?.payout_enabled ? 'rgba(34,197,94,0.1)' : 'var(--primary-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {connectStatus?.payout_enabled
                  ? <CheckCircle size={24} color="var(--success)" />
                  : <CreditCard size={22} color="var(--primary)" />
                }
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {connectStatus?.payout_enabled ? 'Payouts Enabled' : 'Stripe Payouts'}
                </div>
                <div style={{
                  fontSize: '0.78rem', fontWeight: '600',
                  color: connectStatus?.payout_enabled ? 'var(--success)' : 'var(--text-secondary)',
                }}>
                  {statusLoading
                    ? 'Loading…'
                    : connectStatus?.payout_enabled
                      ? 'Your account is verified and ready to receive payments'
                      : 'Set up your payout account to receive earnings'}
                </div>
              </div>
            </div>

            {!statusLoading && !connectStatus?.payout_enabled && (
              <>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                  Connect a bank account or debit card to receive earnings from completed jobs. Platform payouts are processed automatically on job completion.
                </p>
                {connectError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-3)', color: 'var(--danger)', fontSize: '0.82rem' }}>
                    <AlertCircle size={14} />
                    {connectError}
                  </div>
                )}
                <Button
                  variant="primary"
                  fullWidth
                  loading={connectLoading}
                  icon={<ExternalLink size={16} />}
                  onClick={handleConnectPayout}
                >
                  {connectStatus?.account_id ? 'Continue Payout Setup' : 'Set Up Stripe Payouts'}
                </Button>
              </>
            )}
          </Card>
        )}

        {/* Info card */}
        <Card style={{ padding: 'var(--space-4)', background: 'var(--bg-surface)' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
            How payments work
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {(isTrader ? [
              { label: 'Payout model', value: 'Platform collects · releases on completion' },
              { label: 'Platform fee', value: 'Deducted automatically at payout' },
              { label: 'Direct payments', value: 'Customer → your Stripe account' },
              { label: 'Environment', value: 'Test mode (Stripe sandbox)' },
            ] : [
              { label: 'Billing', value: 'Charged after job completion' },
              { label: 'Processor', value: 'Stripe (test mode)' },
              { label: 'Subscription', value: 'Monthly membership' },
            ]).map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{row.label}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
