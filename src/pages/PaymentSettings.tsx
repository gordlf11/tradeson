import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, CheckCircle, AlertCircle, ExternalLink, ArrowDownLeft, ArrowUpRight, Download } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import StripeCheckoutWrapper from '../components/StripeCheckoutWrapper';
import api from '../services/api';

// ── Mock transaction data (replaced when api.listMyPayments() route is live) ──

const MOCK_CUSTOMER_PAYMENTS = [
  { id: 'p1', jobTitle: 'Kitchen Faucet Repair', category: 'Plumbing', amount: 285.00, status: 'completed', date: '2026-04-15', invoiceUrl: null },
  { id: 'p2', jobTitle: 'HVAC Annual Tune-Up', category: 'HVAC', amount: 175.00, status: 'completed', date: '2026-03-22', invoiceUrl: null },
  { id: 'p3', jobTitle: 'Electrical Outlet Install', category: 'Electrical', amount: 390.00, status: 'pending', date: '2026-05-01', invoiceUrl: null },
];

const MOCK_TRADE_EARNINGS = [
  { id: 'e1', jobTitle: 'Bathroom Tile Replacement', gross: 520.00, platformFee: 52.00, net: 468.00, status: 'paid', date: '2026-04-18', invoiceUrl: null },
  { id: 'e2', jobTitle: 'Deck Repair & Staining', gross: 380.00, platformFee: 38.00, net: 342.00, status: 'paid', date: '2026-03-30', invoiceUrl: null },
  { id: 'e3', jobTitle: 'Drywall Patch & Paint', gross: 150.00, platformFee: 15.00, net: 135.00, status: 'processing', date: '2026-05-02', invoiceUrl: null },
];

const statusColor = (s: string) =>
  s === 'completed' || s === 'paid' ? 'var(--success)' :
  s === 'processing' ? 'var(--warning)' :
  s === 'pending' ? 'var(--text-secondary)' : 'var(--danger)';

function fmt(n: number) { return `$${n.toFixed(2)}`; }

export default function PaymentSettings() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || '';
  const isTrader = userRole === 'licensed-trade' || userRole === 'non-licensed-trade';
  const isDemo = localStorage.getItem('demoMode') === 'true';

  const [connectStatus, setConnectStatus] = useState<{ account_id: string | null; payout_enabled: boolean } | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [statusLoading, setStatusLoading] = useState(isTrader && !isDemo);

  const [payments, setPayments]   = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  useEffect(() => {
    if (!isTrader) return;
    if (isDemo) {
      setConnectStatus({ account_id: null, payout_enabled: false });
      return;
    }
    api.getConnectStatus()
      .then((data: any) => setConnectStatus(data))
      .catch(() => setConnectStatus({ account_id: null, payout_enabled: false }))
      .finally(() => setStatusLoading(false));
  }, [isTrader, isDemo]);

  useEffect(() => {
    if (isDemo) {
      setPayments(isTrader ? MOCK_TRADE_EARNINGS : MOCK_CUSTOMER_PAYMENTS);
      setPaymentsLoading(false);
      return;
    }
    api.listMyPayments()
      .then((data: any) => {
        const rows = Array.isArray(data) ? data : (data?.payments ?? []);
        setPayments(rows.length ? rows : (isTrader ? MOCK_TRADE_EARNINGS : MOCK_CUSTOMER_PAYMENTS));
      })
      .catch(() => setPayments(isTrader ? MOCK_TRADE_EARNINGS : MOCK_CUSTOMER_PAYMENTS))
      .finally(() => setPaymentsLoading(false));
  }, [isTrader, isDemo]);

  const handleConnectPayout = async () => {
    if (isDemo) {
      // Simulate the Stripe Connect flow for demo presenters
      setConnectLoading(true);
      setTimeout(() => {
        setConnectStatus({ account_id: 'demo_acct', payout_enabled: true });
        setConnectLoading(false);
      }, 1500);
      return;
    }
    setConnectLoading(true);
    setConnectError('');
    try {
      const data = await api.createConnectAccount() as { onboarding_url: string };
      window.open(data.onboarding_url, '_blank');
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

        {/* Card setup — customers only */}
        {!isTrader && (
          <Card style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CreditCard size={22} color="var(--primary)" />
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>Payment Method</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Saved card for job payments · Powered by Stripe</div>
              </div>
            </div>
            <StripeCheckoutWrapper role={userRole} />
          </Card>
        )}

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

        {/* Transaction History */}
        <div>
          <h3 style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isTrader ? 'Earnings History' : 'Payment History'}
          </h3>

          {paymentsLoading ? (
            <Card style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>Loading transactions…</p>
            </Card>
          ) : payments.length === 0 ? (
            <Card style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                {isTrader ? 'No earnings yet. Complete your first job to see payouts here.' : 'No payments yet. Complete your first job to see transactions here.'}
              </p>
            </Card>
          ) : (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {payments.map((tx, i) => isTrader ? (
                /* Tradesperson earnings row */
                <div key={tx.id} style={{
                  padding: 'var(--space-4)',
                  borderBottom: i < payments.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
                }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: 'var(--radius-md)', flexShrink: 0,
                    background: 'rgba(52,199,89,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ArrowDownLeft size={18} color="var(--success)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.jobTitle}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {tx.date} · Fee: {fmt(tx.platformFee)} · Gross: {fmt(tx.gross)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--success)' }}>{fmt(tx.net)}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: statusColor(tx.status), textTransform: 'capitalize' }}>{tx.status}</div>
                    {tx.invoiceUrl ? (
                      <a href={tx.invoiceUrl} target="_blank" rel="noopener noreferrer" download style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: '700', color: 'var(--primary)', textDecoration: 'none' }}>
                        <Download size={12} /> Invoice
                      </a>
                    ) : (tx.status === 'completed' || tx.status === 'paid') ? (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>Invoice pending</span>
                    ) : null}
                  </div>
                </div>
              ) : (
                /* Customer payment row */
                <div key={tx.id} style={{
                  padding: 'var(--space-4)',
                  borderBottom: i < payments.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
                }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: 'var(--radius-md)', flexShrink: 0,
                    background: 'rgba(255,74,107,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <ArrowUpRight size={18} color="var(--danger)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.jobTitle}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {tx.date} · {tx.category}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{fmt(tx.amount)}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: '600', color: statusColor(tx.status), textTransform: 'capitalize' }}>{tx.status}</div>
                    {tx.invoiceUrl ? (
                      <a href={tx.invoiceUrl} target="_blank" rel="noopener noreferrer" download style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: '700', color: 'var(--primary)', textDecoration: 'none' }}>
                        <Download size={12} /> Invoice
                      </a>
                    ) : tx.status === 'completed' ? (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>Invoice pending</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>

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
              { label: 'Platform fee', value: '10% per completed job' },
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
